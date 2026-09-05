/**
 * Database driver abstraction.
 *
 * Two implementations share a single PostgreSQL dialect:
 *   • postgres — node-postgres, used whenever a connection string (or the local
 *                dev socket) is available: production, preview and `npm run dev`.
 *   • pglite   — embedded PostgreSQL (WASM), used directly by the CLI scripts so
 *                `npm run db:migrate && npm run db:seed` needs nothing installed.
 *
 * Every statement is parameterized. No user data is ever interpolated into SQL.
 */

import nodePath from 'node:path';

export type SqlParam = unknown;

export interface DbDriver {
  readonly kind: 'pglite' | 'postgres';
  select<T = Record<string, unknown>>(sql: string, params?: SqlParam[]): Promise<T[]>;
  execute(sql: string, params?: SqlParam[]): Promise<{ affectedRows: number }>;
  /** Runs fn inside a transaction. PGlite is single-connection so queries serialize. */
  transaction<T>(fn: (tx: DbDriver) => Promise<T>): Promise<T>;
  execMulti(sql: string): Promise<void>;
  close(): Promise<void>;
}

/**
 * PGlite has to be loaded through Node's own module loader when it runs inside
 * the React Server Module graph: Next evaluates server components in a sandboxed
 * realm, and PGlite's WASM/protocol layer misbehaves there (it mis-detects the
 * environment, then fails on buffer transfer). Requiring the CJS build gives it
 * a plain Node realm to work in; the ESM import stays as the fallback for
 * scripts, where neither path matters.
 */
/**
 * PGlite is an embedded engine: it is used directly by the CLI scripts
 * (`npm run db:*`), while `npm run dev` serves the same data directory over a
 * local PostgreSQL socket so Next's React Server module graph never has to boot
 * the WASM engine itself. See scripts/pglite-socket.ts.
 */
async function loadPglite(): Promise<{ PGlite: typeof import('@electric-sql/pglite').PGlite }> {
  return import('@electric-sql/pglite');
}

async function createPgliteDriver(dataDir: string): Promise<DbDriver> {
  const { PGlite } = await loadPglite();
  const db = await PGlite.create(dataDir ? { dataDir } : undefined);

  const driver: DbDriver = {
    kind: 'pglite',
    async select<T>(sql: string, params: SqlParam[] = []) {
      const res = await db.query<T>(sql, params as never[]);
      return res.rows as T[];
    },
    async execute(sql: string, params: SqlParam[] = []) {
      // PGlite exposes `query` (parameterised) and `exec` (multi-statement, no
      // params). `query` reports affectedRows for writes, so it serves both.
      const res = await db.query(sql, params as never[]);
      return { affectedRows: Number((res as unknown as { affectedRows?: number }).affectedRows ?? 0) };
    },
    async transaction<T>(fn: (tx: DbDriver) => Promise<T>) {
      // Same connection → the scoped driver *is* the transaction.
      return (await db.transaction(async () => fn(driver))) as T;
    },
    async execMulti(sql: string) {
      await db.exec(sql);
    },
    async close() {
      await db.close();
    },
  };
  return driver;
}

function isConnectionError(err: unknown): boolean {
  const e = err as { code?: string; message?: string };
  const text = `${e.code ?? ''} ${e.message ?? ''}`;
  return (
    text.includes('ECONNRESET') ||
    text.includes('ECONNREFUSED') ||
    text.includes('Connection terminated') ||
    text.includes('Client has encountered a connection error')
  );
}

/**
 * A pooled client can go away while idle (the local PGlite socket recycles
 * connections, a hosted pooler will do it on a schedule). Retrying once against
 * the pool — which hands out a live client — keeps a read from turning into an
 * empty state on a page.
 */
async function withReconnect<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (!isConnectionError(err)) throw err;
    return await run();
  }
}

async function createPostgresDriver(connectionString: string, poolMax?: number): Promise<DbDriver> {
  const pg = await import('pg');
  const pool = new pg.Pool({
    connectionString,
    max: Number(process.env.PG_POOL_MAX ?? poolMax ?? 8),
    ssl: process.env.PGSSLROOTCERT === 'disable' ? false : undefined,
    statement_timeout: Number(process.env.PG_STATEMENT_TIMEOUT_MS ?? 15000),
  });

  const driver: DbDriver = {
    kind: 'postgres',
    async select<T>(sql: string, params: SqlParam[] = []) {
      const res = await withReconnect(() => pool.query(sql, params as never[]));
      return res.rows as T[];
    },
    async execute(sql: string, params: SqlParam[] = []) {
      const res = await withReconnect(() => pool.query(sql, params as never[]));
      return { affectedRows: res.rowCount ?? 0 };
    },
    async transaction<T>(fn: (tx: DbDriver) => Promise<T>) {
      const client = await pool.connect();
      const scoped: DbDriver = {
        kind: 'postgres',
        async select<S>(sql: string, params: SqlParam[] = []) {
          const res = await client.query(sql, params as never[]);
          return res.rows as S[];
        },
        async execute(sql: string, params: SqlParam[] = []) {
          const res = await client.query(sql, params as never[]);
          return { affectedRows: res.rowCount ?? 0 };
        },
        async transaction(inner) {
          return inner(scoped);
        },
        async execMulti(sql: string) {
          await client.query(sql);
        },
        async close() {},
      };
      try {
        await client.query('BEGIN');
        const out = await fn(scoped);
        await client.query('COMMIT');
        return out;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },
    async execMulti(sql: string) {
      await pool.query(sql);
    },
    async close() {
      await pool.end();
    },
  };
  return driver;
}

let instance: DbDriver | null = null;
let pending: Promise<DbDriver> | null = null;

export type DriverKind = 'pglite' | 'postgres';

function dataDir(): string {
  const dir = process.env.CM_DATA_DIR || '.cm-data';
  return nodePath.isAbsolute(dir) ? nodePath.join(dir, 'pgdata') : nodePath.join(process.cwd(), dir, 'pgdata');
}

/** `.cm-data/socket.json` written by scripts/pglite-socket.ts while dev is running. */
async function devSocketUrl(): Promise<string | null> {
  if (process.env.CM_DISABLE_PGLITE_SOCKET === '1') return null;
  const fs = await import('node:fs');
  const infoPath = `${dataDir().replace(/\/pgdata$/, '')}/socket.json`;
  if (!fs.existsSync(infoPath)) return null;
  try {
    const info = JSON.parse(fs.readFileSync(infoPath, 'utf8')) as { url?: string; pid?: number; port?: number };
    if (info.pid) {
      try {
        process.kill(info.pid, 0);
      } catch {
        return null; // stale file from a server that exited
      }
    }
    if (info.url) return info.url;
    if (info.port) return `postgres://postgres@127.0.0.1:${info.port}/postgres`;
    return null;
  } catch {
    return null;
  }
}

export type DriverName = 'postgres' | 'pglite';

export function driverKind(): DriverName {
  return configuredTarget() ? 'postgres' : 'pglite';
}

function configuredTarget(): string | null {
  const explicit = (process.env.DB_DRIVER ?? '').trim().toLowerCase();
  if (explicit === 'pglite') return null;
  const url = (process.env.DATABASE_URL ?? process.env.CM_DB_URL ?? '').trim();
  if (explicit === 'postgres') return url || null;
  return url || null;
}

/** Lazily creates (and caches) the process-wide driver. */
export function getDriver(): Promise<DbDriver> {
  if (instance) return Promise.resolve(instance);
  if (pending) return pending;

  pending = (async () => {
    const target = configuredTarget();
    const socketUrl = target ?? (await devSocketUrl());
    const isDevSocket = socketUrl !== target;
    if (socketUrl) {
      // The embedded dev socket serialises queries anyway; a small pool keeps it
      // from ever seeing more concurrent connections than it accepts.
      instance = await createPostgresDriver(socketUrl, isDevSocket ? 2 : undefined);
    } else {
      const fs = await import('node:fs/promises');
      const dir = dataDir();
      await fs.mkdir(dir, { recursive: true });
      instance = await createPgliteDriver(dir);
    }
    return instance;
  })().catch((err) => {
    pending = null;
    throw err;
  });

  return pending;
}
