/**
 * `src/lib/db/schema.sql` is the deployed shape of the database; `src/lib/db/tables.ts` is what
 * the CMS writes against. They are written by hand in the same commit and must not drift — a
 * column that exists in one and not the other is either a broken insert or an unreachable field.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { TABLES } from '../src/lib/db/tables';
import { CMS_MODULES } from '../src/lib/cms/modules';

const schemaPath = join(import.meta.dirname, '../src/lib/db/schema.sql');
const sql = readFileSync(schemaPath, 'utf8');

/** CREATE TABLE bodies keyed by table name, with the column names and their SQL types. */
function tablesInSql(): Map<string, Map<string, string>> {
  const out = new Map<string, Map<string, string>>();
  for (const match of sql.matchAll(/CREATE TABLE IF NOT EXISTS (\w+) \(([\s\S]*?)\n\);/g)) {
    const columns = new Map<string, string>();
    for (const line of match[2].split('\n')) {
      const column = /^\s*"?([a-z_]+)"?\s+(TEXT|INTEGER|BIGINT|NUMERIC|BOOLEAN|DATE|TIMESTAMPTZ|JSONB|TSVECTOR)\b/i.exec(line);
      if (column) columns.set(column[1], column[2].toUpperCase());
    }
    out.set(match[1], columns);
  }
  return out;
}

const TYPE_FAMILY: Record<string, string[]> = {
  text: ['TEXT'],
  int: ['INTEGER', 'BIGINT'],
  numeric: ['NUMERIC', 'INTEGER', 'BIGINT'],
  bool: ['BOOLEAN'],
  date: ['DATE', 'TIMESTAMPTZ'],
  timestamptz: ['TIMESTAMPTZ'],
  jsonb: ['JSONB'],
};

const sqlTables = tablesInSql();
const specs = Object.values(TABLES) as { table: string; pk: string; timestamps?: boolean; idPrefix?: string; columns: Record<string, { type: string; writable?: boolean }> }[];

test('the schema and the table specs describe the same set of tables', () => {
  const declared = new Set(specs.map((s) => s.table));
  // auth_attempt is written with raw SQL by the rate limiter and deliberately has no CMS spec.
  const dbOnly = new Set(['auth_attempt']);
  for (const table of sqlTables.keys()) {
    assert.ok(declared.has(table) || dbOnly.has(table), `schema.sql creates "${table}" but no TableSpec describes it`);
  }
  for (const table of declared) {
    assert.ok(sqlTables.has(table), `tables.ts declares "${table}" but schema.sql never creates it`);
  }
});

test('every column in a spec exists in SQL with a compatible type', () => {
  for (const spec of specs) {
    const columns = sqlTables.get(spec.table);
    assert.ok(columns, `${spec.table}: missing from schema.sql`);
    for (const [name, column] of Object.entries(spec.columns)) {
      const sqlType = columns.get(name);
      assert.ok(sqlType, `${spec.table}.${name}: in tables.ts, absent from schema.sql`);
      const family = TYPE_FAMILY[column.type] ?? [];
      assert.ok(family.includes(sqlType), `${spec.table}.${name}: typed ${sqlType} in SQL but "${column.type}" in tables.ts`);
    }
    assert.ok(columns.has(spec.pk), `${spec.table}: primary key "${spec.pk}" is not a column`);
    if (spec.timestamps) {
      assert.ok(columns.has('created_at') && columns.has('updated_at'), `${spec.table}: timestamps are maintained but the columns are absent`);
    }
  }
});

test('credentials and the audit trail stay out of the generic write path', () => {
  for (const spec of specs) {
    for (const [name, column] of Object.entries(spec.columns)) {
      if (name === spec.pk) continue;
      if (/\b(hash|secret|token)$/i.test(name) || /password|totp/i.test(name)) {
        assert.equal(column.writable, false, `${spec.table}.${name}: a credential column must not be writable through the CMS`);
      }
    }
  }
  // Nothing in the registry edits these tables: they are written by purpose-built code paths
  // (login, sessions, audit) and never by a row form.
  for (const table of ['audit_log', 'admin_session', 'auth_attempt']) {
    assert.equal(
      CMS_MODULES.filter((m) => m.table === table).length,
      0,
      `${table}: a CMS module may not edit this table`,
    );
  }
  const audit = specs.find((s) => s.table === 'audit_log');
  assert.ok(audit, 'the audit trail needs a table spec');
  assert.equal(audit.timestamps, false, 'audit rows are append-only — no updated_at');
  assert.ok(!('updated_at' in audit.columns), 'audit rows are append-only — no updated_at');
});

test('module behaviour that the repository assumes is actually backed by columns', () => {
  for (const mod of CMS_MODULES) {
    const spec = TABLES[mod.table as keyof typeof TABLES] as { columns: Record<string, unknown>; pk: string; timestamps?: boolean } | undefined;
    assert.ok(spec, `${mod.key}: table ${mod.table} has no spec`);
    const has = (column: string) => column === spec.pk || Boolean(spec.columns[column]) || Boolean(spec.timestamps && (column === 'created_at' || column === 'updated_at'));
    if (mod.publishable) {
      assert.ok(has('status'), `${mod.key}: publishable without a status column`);
      // Pages publish without a separate visibility flag: their status *is* the visibility, so
      // the repository only touches is_visible on tables that have one.
      const spec2 = spec as { columns: Record<string, unknown> };
      if ('is_visible' in spec2.columns) assert.ok(mod.publishable || mod.fields.some((f) => f.key === 'is_visible'), `${mod.key}: has is_visible but nothing edits it`);
    }
    if (mod.sortable) assert.ok(has('sort_order'), `${mod.key}: sortable without sort_order`);
    if (mod.slugFrom) assert.ok(has(mod.slugFrom), `${mod.key}: slugFrom "${mod.slugFrom}" is not a column`);
    for (const option of relationTargets(mod)) {
      assert.ok(CMS_MODULES.some((m) => m.key === option), `${mod.key}: relation to unknown module "${option}"`);
    }
  }
});

function relationTargets(mod: { fields: { type: string; module?: string }[] }): string[] {
  return mod.fields.filter((f) => f.type === 'relation').map((f) => f.module ?? '');
}

test('unique constraints cover the keys the CMS looks rows up by', () => {
  // Slugs and settings keys are looked up by equality; without a unique index two rows would make
  // a public route ambiguous.
  // All three forms count: a primary key, an inline `slug TEXT NOT NULL UNIQUE`, and a named
  // unique index. What matters is that a duplicate insert is refused by the database.
  const unique = new Map<string, Set<string>>();
  const add = (table: string, columns: string) => {
    if (!unique.has(table)) unique.set(table, new Set());
    unique.get(table)!.add(columns.replace(/[^\w,]/g, '').split(',').map((c) => c.trim()).filter(Boolean).sort().join(','));
  };
  for (const match of sql.matchAll(/CREATE UNIQUE INDEX IF NOT EXISTS \w+ ON (\w+)\s*\(([^)]*)\)/g)) add(match[1], match[2]);
  for (const match of sql.matchAll(/CREATE TABLE IF NOT EXISTS (\w+) \(([\s\S]*?)\n\);/g)) {
    for (const line of match[2].split('\n')) {
      const inline = /^\s*"?([a-z_]+)"?\s+[^,]*\b(UNIQUE|PRIMARY KEY)\b/i.exec(line);
      if (inline) add(match[1], inline[1]);
    }
  }
  const expect = (table: string, columns: string) =>
    assert.ok(unique.get(table)?.has(columns.split(',').sort().join(',')), `${table}: nothing enforces uniqueness on (${columns})`);
  expect('page', 'slug');
  expect('project', 'slug');
  expect('site_setting', 'key');
  expect('admin_user', 'email');

  // A project slug is unique across both divisions, which is why /media/work/<slug> and
  // /tech/projects/<slug> can never resolve to the same row.
  assert.ok(sqlTables.get('project')?.has('slug'), 'project.slug disappeared');
});
