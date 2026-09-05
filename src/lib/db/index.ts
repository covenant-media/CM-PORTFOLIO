/**
 * Core data layer: connection access, SQL builders and row coercion.
 * All writes flow through here so casting, null-handling and timestamps stay consistent.
 */
import { randomUUID } from 'node:crypto';
import { getDriver, driverKind, type DbDriver, type SqlParam } from './driver';
import { TABLES, type ColumnSpec, type TableSpec, type TableName } from './tables';

export { driverKind };

let schemaReady: Promise<void> | null = null;

/** Applies schema.sql (idempotent) once per process — keeps dev/demo bootstrapping trivial. */
export async function ensureSchema(): Promise<void> {
  if (process.env.CM_AUTO_MIGRATE === 'false') return;
  if (!schemaReady) {
    schemaReady = (async () => {
      const fs = await import('node:fs/promises');
      const path = await import('node:path');
      const driver = await getDriver();
      const candidates = [
        path.join(process.cwd(), 'src/lib/db/schema.sql'),
        path.join(process.cwd(), 'schema.sql'),
      ];
      let sql = '';
      for (const file of candidates) {
        try {
          sql = await fs.readFile(file, 'utf8');
          break;
        } catch {
          /* try next */
        }
      }
      if (!sql) {
        // Production image without the source file present: assume migrations were run.
        return;
      }
      await driver.execMulti(sql);
    })().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}

export async function getDb(): Promise<DbDriver> {
  const driver = await getDriver();
  await ensureSchema();
  return driver;
}

export function newId(prefix = 'id'): string {
  const raw = randomUUID().replace(/-/g, '').slice(0, 20);
  return `${prefix}_${raw}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

// ── value coercion ──────────────────────────────────────────────────────────

function isEmpty(v: unknown): boolean {
  return v === undefined || v === null || v === '';
}

function coerceForDb(spec: ColumnSpec, value: unknown): { sql: string; param: SqlParam } | null {
  if (value === null) return { sql: 'NULL', param: null };
  switch (spec.type) {
    case 'text':
      return { sql: 'text', param: String(value) };
    case 'int': {
      const num = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
      if (Number.isNaN(num)) return isEmpty(value) ? null : { sql: 'int', param: null };
      return { sql: 'int', param: num };
    }
    case 'numeric': {
      if (isEmpty(value)) return { sql: 'numeric', param: null };
      const num = typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.\-]/g, ''));
      return { sql: 'numeric', param: Number.isFinite(num) ? num : null };
    }
    case 'bool':
      return {
        sql: 'boolean',
        param: value === true || value === 'true' || value === 1 || value === '1' || value === 'on',
      };
    case 'date': {
      if (isEmpty(value)) return { sql: 'date', param: null };
      const iso = String(value).slice(0, 10);
      return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? { sql: 'date', param: iso } : { sql: 'date', param: null };
    }
    case 'timestamptz': {
      if (isEmpty(value)) return { sql: 'timestamptz', param: null };
      const date = value instanceof Date ? value : new Date(String(value));
      return Number.isNaN(date.getTime()) ? { sql: 'timestamptz', param: null } : { sql: 'timestamptz', param: date.toISOString() };
    }
    case 'jsonb':
      return {
        sql: 'jsonb',
        param: JSON.stringify(typeof value === 'string' ? safeParse(value) : value ?? null),
      };
    default:
      return { sql: 'text', param: String(value) };
  }
}

function safeParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export function coerceFromDb<T extends Record<string, unknown>>(spec: TableSpec, row: Record<string, unknown> | undefined): T | undefined {
  if (!row) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const col = spec.columns[key as keyof typeof spec.columns];
    if (!col) {
      out[key] = value;
      continue;
    }
    if (value === null || value === undefined) {
      out[key] = null;
      continue;
    }
    switch (col.type) {
      case 'int':
        out[key] = value === null ? null : Number(value);
        break;
      case 'numeric':
        out[key] = value === null ? null : Number(value);
        break;
      case 'jsonb':
        out[key] = typeof value === 'string' ? safeParse(value) : value;
        break;
      case 'date':
        out[key] = value instanceof Date
          ? value.toISOString().slice(0, 10)
          : typeof value === 'string'
            ? value.slice(0, 10)
            : value;
        break;
      case 'timestamptz':
        out[key] = value instanceof Date ? value.toISOString() : String(value).replace(' ', 'T');
        break;
      default:
        out[key] = value;
    }
  }
  return out as T;
}

// ── query helpers ───────────────────────────────────────────────────────────

export async function select<T = Record<string, unknown>>(
  sql: string,
  params: SqlParam[] = [],
  tx?: DbDriver,
): Promise<T[]> {
  const driver = tx ?? (await getDb());
  return driver.select<T>(sql, params);
}

export async function selectOne<T = Record<string, unknown>>(
  sql: string,
  params: SqlParam[] = [],
  tx?: DbDriver,
): Promise<T | undefined> {
  const rows = await select<Record<string, unknown>>(sql, params, tx);
  return rows[0] ? (rows[0] as T) : undefined;
}

export async function execute(sql: string, params: SqlParam[] = [], tx?: DbDriver): Promise<{ affectedRows: number }> {
  const driver = tx ?? (await getDb());
  return driver.execute(sql, params);
}

export async function transaction<T>(fn: (tx: DbDriver) => Promise<T>): Promise<T> {
  const driver = await getDb();
  return driver.transaction(fn);
}

// ── generic CRUD built on the table registry ────────────────────────────────

export interface WriteOptions {
  id?: string;
  tx?: DbDriver;
  /** skip automatic updated_at (e.g. for ordering-only bulk updates) */
  raw?: boolean;
}

function writableColumns(spec: TableSpec, patch: Record<string, unknown>): string[] {
  return Object.keys(patch).filter((key) => {
    const col = spec.columns[key as keyof typeof spec.columns];
    return col && col.writable !== false;
  });
}

export async function insertRow(
  name: TableName,
  values: Record<string, unknown>,
  opts: WriteOptions = {},
): Promise<Record<string, unknown>> {
  const spec = TABLES[name];
  const columns: string[] = [];
  const placeholders: string[] = [];
  const params: SqlParam[] = [];

  const data: Record<string, unknown> = { ...values };
  if (spec.pk === 'id') data.id = opts.id ?? data.id ?? newId(spec.idPrefix ?? name.slice(0, 3));
  else if (opts.id) data[spec.pk] = opts.id;
  if (spec.timestamps) {
    const stamp = nowIso();
    if (!data.created_at) data.created_at = stamp;
    if (!data.updated_at) data.updated_at = stamp;
  }

  const columnEntries: Array<[string, ColumnSpec]> = Object.entries(spec.columns).map(([key, col]) => [key, col]);
  if (!(spec.pk in data) || !spec.columns[spec.pk as keyof typeof spec.columns]) {
    columnEntries.unshift([spec.pk, { type: 'text', writable: true, nullable: false }]);
  }
  for (const [key, col] of columnEntries) {
    if (col.writable === false) continue;
    if (!(key in data)) continue;
    let value = data[key];
    if (isEmpty(value) && col.nullable && col.type !== 'jsonb') {
      columns.push(quote(key));
      placeholders.push('NULL');
      continue;
    }
    if (isEmpty(value) && col.type === 'jsonb') {
      value = key === 'seo' || key === 'props' || key === 'overrides' || key === 'embed_config' || key === 'metadata' || key === 'variants' || key === 'extra' || key === 'permissions' || key === 'value' ? {} : [];
    }
    const coerced = coerceForDb(col, value);
    if (!coerced) continue;
    columns.push(quote(key));
    if (coerced.sql === 'NULL') {
      placeholders.push('NULL');
      continue;
    }
    params.push(coerced.param);
    placeholders.push(`$${params.length}::${coerced.sql}`);
  }

  const sql = `INSERT INTO ${quote(spec.table)} (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
  const rows = await select<Record<string, unknown>>(sql, params, opts.tx);
  return coerceFromDb(spec, rows[0]) ?? {};
}

export async function updateRow(
  name: TableName,
  id: string,
  patch: Record<string, unknown>,
  opts: WriteOptions = {},
): Promise<Record<string, unknown> | undefined> {
  const spec = TABLES[name];
  const data: Record<string, unknown> = {};
  for (const key of writableColumns(spec, patch)) data[key] = patch[key];
  if (spec.timestamps) data.updated_at = nowIso();
  if (Object.keys(data).length === 0) return getById(name, id, opts.tx);

  const sets: string[] = [];
  const params: SqlParam[] = [];
  for (const [key, col] of Object.entries(spec.columns)) {
    if (!(key in data)) continue;
    if (col.writable === false) continue;
    const coerced = isEmpty(data[key]) && col.nullable ? null : coerceForDb(col, data[key]);
    if (!coerced) continue;
    if (coerced.sql === 'NULL') {
      sets.push(`${quote(key)} = NULL`);
      continue;
    }
    params.push(coerced.param);
    sets.push(`${quote(key)} = $${params.length}::${coerced.sql}`);
  }
  if (sets.length === 0) return getById(name, id, opts.tx);

  const pkCol = spec.pk;
  const pkSpec = spec.columns[pkCol as keyof typeof spec.columns];
  params.push(id);
  const cast = pkSpec?.type === 'text' ? '::text' : '';
  const sql = `UPDATE ${quote(spec.table)} SET ${sets.join(', ')} WHERE ${quote(pkCol)} = $${params.length}${cast} RETURNING *`;
  const rows = await select<Record<string, unknown>>(sql, params, opts.tx);
  return coerceFromDb(spec, rows[0]);
}

export async function getById<T = Record<string, unknown>>(
  name: TableName,
  id: string,
  tx?: DbDriver,
): Promise<T | undefined> {
  const spec = TABLES[name];
  const row = await selectOne<Record<string, unknown>>(
    `SELECT * FROM ${quote(spec.table)} WHERE ${quote(spec.pk)} = $1::text`,
    [id],
    tx,
  );
  return coerceFromDb(spec, row) as T | undefined;
}

export async function deleteRow(name: TableName, id: string, tx?: DbDriver): Promise<boolean> {
  const spec = TABLES[name];
  const res = await execute(`DELETE FROM ${quote(spec.table)} WHERE ${quote(spec.pk)} = $1::text`, [id], tx);
  return res.affectedRows > 0;
}

export function quote(identifier: string): string {
  if (!/^[a-z_][a-z0-9_]*$/i.test(identifier)) throw new Error(`Unsafe identifier: ${identifier}`);
  return identifier === 'group' ? '"group"' : identifier;
}

export interface OrderTerm {
  column: string;
  direction?: 'asc' | 'desc';
  nulls?: 'first' | 'last';
}

export function orderBy(spec: TableSpec, terms: OrderTerm[]): string {
  const parts = terms
    .filter((term) => term.column in spec.columns)
    .map((term) => `${quote(term.column)} ${term.direction === 'desc' ? 'DESC' : 'ASC'} NULLS ${term.nulls === 'last' ? 'LAST' : 'FIRST'}`);
  return parts.length ? `ORDER BY ${parts.join(', ')}` : '';
}

/** Escape user text for ILIKE patterns. */
export function likeParam(term: string): string {
  return `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}
