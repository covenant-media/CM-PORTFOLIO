/**
 * The CMS registry is the single source of truth for both the admin UI and the write path,
 * so a wrong key there is a runtime failure somewhere nobody thought to click. These tests
 * keep the registry internally consistent and consistent with the database.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CMS_MODULES, CMS_MODULE_MAP, MODULE_GROUPS, getCmsModule } from '../src/lib/cms/modules';
import { TABLES } from '../src/lib/db/tables';
import { CMS_MODULE_KEYS } from '../src/lib/auth/permissions';

const FIELD_TYPES = new Set([
  'text', 'textarea', 'markdown', 'number', 'money', 'boolean', 'select', 'multiselect', 'tags', 'list',
  'repeat', 'date', 'datetime', 'url', 'email', 'slug', 'color', 'asset', 'image', 'video', 'relation', 'seo', 'json',
]);

const EDITORS = new Set(['collection', 'media-library', 'videos', 'projects', 'navigation', 'settings', 'seo', 'resume', 'submissions', 'featured', 'blocks']);

/** Columns the CMS layer never writes but the list/sort queries are allowed to read. */
function columnsOf(tableName: string): Set<string> {
  const spec = TABLES[tableName as keyof typeof TABLES] as { columns: Record<string, unknown>; pk: string; timestamps?: boolean } | undefined;
  assert.ok(spec, `module "${tableName}" points at a table that is not in the schema`);
  const set = new Set(Object.keys(spec.columns));
  set.add(spec.pk);
  if (spec.timestamps) {
    set.add('created_at');
    set.add('updated_at');
  }
  return set;
}

test('every module is registered once and resolvable by key', () => {
  const keys = CMS_MODULES.map((m) => m.key);
  assert.equal(new Set(keys).size, keys.length, 'duplicate module keys');
  assert.ok(keys.length >= 24, `expected the full registry, found ${keys.length}`);
  for (const key of keys) assert.equal(getCmsModule(key), CMS_MODULE_MAP[key]);
  assert.equal(getCmsModule('not_a_module'), undefined);
});

test('module metadata is complete enough to render a list and an editor', () => {
  for (const mod of CMS_MODULES) {
    assert.ok(mod.label && mod.singular && mod.description, `${mod.key}: needs label, singular and description`);
    assert.ok(mod.icon, `${mod.key}: needs an icon name`);
    assert.ok(MODULE_GROUPS.some((g) => g.key === mod.group), `${mod.key}: group "${mod.group}" is not declared`);
    assert.ok(EDITORS.has(mod.editor), `${mod.key}: unknown editor "${mod.editor}"`);
    assert.ok(mod.primary, `${mod.key}: the list needs a primary column`);
  }
});

test('every column the registry references exists in the database', () => {
  for (const mod of CMS_MODULES) {
    const cols = columnsOf(mod.table);
    const note = (what: string) => `${mod.key}: ${what} is not a column of ${mod.table}`;

    assert.ok(cols.has(mod.primary), note(`primary "${mod.primary}"`));
    if (mod.secondary) assert.ok(cols.has(mod.secondary), note(`secondary "${mod.secondary}"`));
    if (mod.previewImage) assert.ok(cols.has(mod.previewImage), note(`previewImage "${mod.previewImage}"`));

    for (const column of mod.columns) assert.ok(cols.has(column.key), note(`list column "${column.key}"`));
    const filters = mod.filterBy ? (Array.isArray(mod.filterBy) ? mod.filterBy : [mod.filterBy]) : [];
    for (const filter of filters) assert.ok(cols.has(filter.key), note(`filter "${filter.key}"`));
    for (const fragment of mod.search ?? []) {
      for (const token of fragment.split(/[^A-Za-z0-9_]+/)) {
        if (token && !token.startsWith('%')) assert.ok(cols.has(token), note(`search fragment "${token}"`));
      }
    }
    for (const token of (mod.defaultSort ?? '').replace(/order\s+by/ig, '').split(/[^A-Za-z0-9_]+/)) {
      if (!token || /^(asc|desc|nulls|first|last|coalesce)$/i.test(token)) continue;
      assert.ok(cols.has(token), note(`default sort references "${token}"`));
    }
  }
});

test('field definitions are renderable and map onto real columns', () => {
  for (const mod of CMS_MODULES) {
    const cols = columnsOf(mod.table);
    const seen = new Set<string>();
    for (const field of mod.fields) {
      assert.ok(field.key && field.label, `${mod.key}: a field is missing key or label`);
      assert.ok(!seen.has(field.key), `${mod.key}: duplicate field "${field.key}"`);
      seen.add(field.key);
      assert.ok(FIELD_TYPES.has(field.type), `${mod.key}.${field.key}: unknown type "${field.type}"`);
      assert.ok(cols.has(field.key), `${mod.key}.${field.key}: no such column on ${mod.table}`);
      if (field.type === 'select' || field.type === 'multiselect') {
        assert.ok(field.options?.length, `${mod.key}.${field.key}: a select needs options`);
      }
      if (field.options) {
        for (const option of field.options) assert.ok(option.value && option.label, `${mod.key}.${field.key}: option needs value + label`);
      }
      if (field.type === 'relation') assert.ok(field.module, `${mod.key}.${field.key}: a relation must name its module`);
      if (field.module) assert.ok(getCmsModule(field.module), `${mod.key}.${field.key}: relation points at unknown module "${field.module}"`);
      if (field.itemFields) {
        for (const sub of field.itemFields) assert.ok(FIELD_TYPES.has(sub.type), `${mod.key}.${field.key}.${sub.key}: unknown subfield type`);
      }
      if (field.showIf) {
        assert.ok(seen.has(field.showIf.key) || mod.fields.some((f) => f.key === field.showIf?.key), `${mod.key}.${field.key}: showIf targets "${field.showIf.key}" which does not exist`);
      }
    }
  }
});

test('permission keys exist in the permission catalogue', () => {
  const catalogue = new Set<string>(CMS_MODULE_KEYS);
  for (const mod of CMS_MODULES) {
    const permission = mod.permission ?? mod.key;
    assert.ok(catalogue.has(permission), `${mod.key}: permission "${permission}" is not a known module key`);
  }
});

test('fixed scopes and public links stay well formed', () => {
  for (const mod of CMS_MODULES) {
    if (mod.publicBase) assert.match(mod.publicBase, /^\//, `${mod.key}: publicBase must be a path`);
    if (mod.slugFrom) {
      assert.ok(columnsOf(mod.table).has(mod.slugFrom), `${mod.key}: slugFrom "${mod.slugFrom}" is not a column`);
    }
    for (const key of Object.keys(mod.fixed ?? {})) {
      assert.ok(columnsOf(mod.table).has(key), `${mod.key}: fixed scope "${key}" is not a column`);
    }
  }
});
