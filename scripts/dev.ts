/**
 * `npm run dev` — one command, two processes.
 *
 *   1. a PGlite instance serving `.cm-data/pgdata` over a local PostgreSQL socket
 *   2. `next dev`, pointed at it through DATABASE_URL
 *
 * That keeps zero-setup (no database to install) while the app itself always talks
 * to Postgres through node-postgres — exactly the path production takes, so there
 * is no "works in dev, breaks in prod" driver gap. Set CM_DB_EXTERNAL=1 to skip the
 * socket and use your own DATABASE_URL.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { connect } from 'node:net';
import { join } from 'node:path';

const ROOT = process.cwd();
const INFO = join(ROOT, process.env.CM_DATA_DIR || '.cm-data', 'socket.json');
const PORT = Number(process.env.CM_DB_PORT || 55432);
const HOST = process.env.CM_DB_HOST || '127.0.0.1';
const APP_PORT = process.env.PORT || '3000';

const children: ChildProcess[] = [];
let closing = false;

function log(prefix: string, line: string) {
  process.stdout.write(`${line.split('\n').join(`\n${prefix} `)}\n`);
}

function shutdown(code = 0) {
  if (closing) return;
  closing = true;
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }
  setTimeout(() => process.exit(code), 250);
}

function portOpen(): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ host: HOST, port: PORT });
    const done = (value: boolean) => {
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(400, () => done(false));
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
  });
}

function infoUrl(): string | null {
  if (!existsSync(INFO)) return null;
  try {
    return String(JSON.parse(readFileSync(INFO, 'utf8')).url ?? '');
  } catch {
    return null;
  }
}

/** The port answering is not the same as Postgres being ready: PGlite still has
 * to boot its WASM backend. Handing the app a database that only half exists is
 * how a cold start ends up with a page full of empty states. */
async function queryable(url: string): Promise<boolean> {
  try {
    const pg = await import('pg');
    const client = new pg.Client({ connectionString: url });
    await client.connect();
    await client.query('select 1');
    await client.end();
    return true;
  } catch {
    return false;
  }
}

async function waitForDb(timeoutMs = 120_000): Promise<string> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await portOpen()) {
      const url = infoUrl() ?? `postgres://postgres@${HOST}:${PORT}/postgres`;
      if (await queryable(url)) return url;
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`the local database did not come up on ${HOST}:${PORT} in time`);
}

function run(command: string, args: string[], prefix: string, env: Record<string, string> = {}): ChildProcess {
  const child = spawn(command, args, { cwd: ROOT, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout?.on('data', (chunk: Buffer) => log(prefix, chunk.toString()));
  child.stderr?.on('data', (chunk: Buffer) => log(prefix, chunk.toString()));
  child.on('exit', (code) => {
    if (!closing) {
      log(prefix, `exited with code ${code ?? 'null'}`);
      shutdown(code ?? 1);
    }
  });
  children.push(child);
  return child;
}

async function main() {
  const external = process.env.CM_DB_EXTERNAL === '1' || process.argv.includes('--external-db');
  let url = process.env.DATABASE_URL ?? process.env.CM_DB_URL ?? '';

  if (!external) {
    const alreadyUp = await portOpen();
    if (!alreadyUp) {
      run('node', ['--import', 'tsx', join(ROOT, 'scripts/pglite-socket.ts')], '[db]');
      log('[db]', 'starting embedded PGlite on port ' + PORT);
    } else {
      log('[db]', `reusing the database already listening on ${HOST}:${PORT}`);
    }
    url = await waitForDb();
  }

  // The sandbox this runs in has ~4 GB for everything, so the bundler and the
  // server heap are both capped: turbopack dev uses roughly half the memory of
  // webpack dev, and a bounded heap means V8 collects instead of OOM-killing the box.
  // CM_BUNDLER=webpack switches back if a webpack-only config is being tested.
  const bundler = process.env.CM_BUNDLER === 'webpack' ? 'webpack' : 'turbopack';
  run(
    'node',
    [
      join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next'),
      'dev',
      ...(bundler === 'turbopack' ? ['--turbopack'] : []),
      '-p',
      APP_PORT,
      '-H',
      '0.0.0.0',
    ],
    '[app]',
    {
      DATABASE_URL: url,
      DB_DRIVER: url ? 'postgres' : 'pglite',
      NEXT_TELEMETRY_DISABLED: '1',
      NODE_OPTIONS: process.env.NODE_OPTIONS ?? '--max-old-space-size=2048',
    },
  );
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

main().catch((err) => {
  console.error(String((err as Error).message ?? err));
  shutdown(1);
});
