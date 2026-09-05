/**
 * Serves the local PGlite database over the PostgreSQL wire protocol.
 *
 * Why this exists: PGlite's in-process boot relies on Node's module/FS layer,
 * which Next replaces inside the React Server Module graph — a page render would
 * then fail while a route handler on the same code works. Running one PGlite
 * process and connecting to it with node-postgres gives dev the same driver and
 * SQL dialect production uses, with no server to install.
 *
 * Started automatically by `npm run dev`; run it alone with `npm run db:serve`.
 */
process.env.CM_SCRIPT = '1';

import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const DATA_DIR = process.env.CM_DATA_DIR || join(ROOT, '.cm-data');
const PG_DIR = join(DATA_DIR, 'pgdata');
const INFO = join(DATA_DIR, 'socket.json');
const HOST = process.env.CM_DB_HOST || '127.0.0.1';
const BASE_PORT = Number(process.env.CM_DB_PORT || 55432);

mkdirSync(PG_DIR, { recursive: true });

function alreadyRunning(): { port: number; url: string; pid: number } | null {
  if (!existsSync(INFO)) return null;
  try {
    const info = JSON.parse(readFileSync(INFO, 'utf8')) as { port: number; url: string; pid: number };
    process.kill(info.pid, 0);
    return info;
  } catch {
    return null;
  }
}

async function findFreePort(start: number, host: string): Promise<number> {
  const net = await import('node:net');
  for (let offset = 0; offset < 8; offset += 1) {
    const port = start + offset;
    const ok = await new Promise<boolean>((resolve) => {
      const probe = net.createServer();
      probe.once('error', () => resolve(false));
      probe.listen({ port, host }, () => probe.close(() => resolve(true)));
    });
    if (ok) return port;
  }
  return start;
}

async function main() {
  const existing = alreadyRunning();
  if (existing) {
    console.log(`PGlite socket already running on port ${existing.port} (pid ${existing.pid})`);
    return;
  }

  const { PGlite } = await import('@electric-sql/pglite');
  const { PGLiteSocketServer } = await import('@electric-sql/pglite-socket');

  console.log(`starting PGlite (${PG_DIR})…`);
  const db = await PGlite.create({ dataDir: PG_DIR });
  const port = await findFreePort(BASE_PORT, HOST);
  const server = new PGLiteSocketServer({
    db: db as never,
    host: HOST,
    port,
    maxConnections: Number(process.env.CM_DB_MAX_CONN ?? 32),
  });
  await server.start();

  const url = `postgres://postgres@${HOST}:${port}/postgres`;
  writeFileSync(INFO, JSON.stringify({ port, url, pid: process.pid, startedAt: new Date().toISOString() }, null, 2));
  server.addEventListener('close', () => {
    try {
      rmSync(INFO);
    } catch {
      /* already gone */
    }
  });

  console.log(`ready — postgres://${HOST}:${port}`);
  console.log(`connect with:  DATABASE_URL="${url}" DB_DRIVER=postgres`);
  void server.getServerConn();

  const shutdown = async () => {
    try {
      await server.stop();
      await db.close();
    } finally {
      try {
        rmSync(INFO);
      } catch {
        /* already gone */
      }
      process.exit(0);
    }
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // keep the process alive
  await new Promise<void>(() => undefined);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
