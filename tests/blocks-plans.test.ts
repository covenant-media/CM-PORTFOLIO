/**
 * Two registries have to agree: the block catalogue the composer offers, the renderers that draw
 * those blocks, and the structural plans that stand in until the CMS says otherwise. When they
 * drift, a page silently loses a section — so the agreement is asserted instead of trusted.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { BLOCK_TYPES, BLOCK_TYPE_MAP, BLOCK_TYPES_BY_SURFACE, blockDef, blockProps } from '../src/lib/cms/blocks';
import { PAGE_PLANS, planFor } from '../src/lib/cms/page-plans';

const FIELD_TYPES = new Set([
  'text', 'textarea', 'markdown', 'number', 'money', 'boolean', 'select', 'multiselect', 'tags', 'list',
  'repeat', 'date', 'datetime', 'url', 'email', 'slug', 'color', 'asset', 'image', 'video', 'relation', 'seo', 'json',
]);

/** `page_header` is rendered for every page by the shell, never chosen from the composer. */
const SHELL_OWNED = new Set(['page_header']);

test('the block catalogue is unique, described and scoped to a surface', () => {
  const types = BLOCK_TYPES.map((b) => b.type);
  assert.equal(new Set(types).size, types.length, 'duplicate block type');
  for (const block of BLOCK_TYPES) {
    assert.match(block.type, /^[a-z][a-z0-9_]*$/, `${block.type}: type must be a snake_case key`);
    assert.ok(block.label && block.description, `${block.type}: the composer shows both to a first-time editor`);
    assert.ok(block.icon, `${block.type}: needs an icon`);
    assert.ok(block.surfaces.length > 0, `${block.type}: a block nobody can place`);
    for (const surface of block.surfaces) assert.ok(['main', 'media', 'tech'].includes(surface), `${block.type}: unknown surface ${surface}`);
    const keys = new Set<string>();
    for (const field of block.propFields) {
      assert.ok(FIELD_TYPES.has(field.type), `${block.type}.${field.key}: unknown prop field type "${field.type}"`);
      assert.ok(!keys.has(field.key), `${block.type}.${field.key}: duplicate prop`);
      keys.add(field.key);
      assert.ok(!SHELL_OWNED.has(field.key));
    }
  }
});

test('the surface pickers offer exactly the blocks allowed there, and nothing else', () => {
  for (const surface of ['main', 'media', 'tech'] as const) {
    const offered = BLOCK_TYPES_BY_SURFACE[surface].map((b) => b.type);
    const expected = BLOCK_TYPES.filter((b) => b.surfaces.includes(surface)).map((b) => b.type);
    assert.deepEqual(offered, expected, `${surface}: the picker drifted from the catalogue`);
    for (const type of offered) assert.ok(blockDef(type), `${surface}: offers unknown block "${type}"`);
  }
  // A block that no surface can place could never be added by the composer.
  for (const block of BLOCK_TYPES) {
    assert.ok(block.surfaces.some((surface) => (BLOCK_TYPES_BY_SURFACE[surface] as { type: string }[]).some((b) => b.type === block.type)), `${block.type}: declared but offered nowhere`);
  }
});

test('every planned section exists in the catalogue and renders', () => {
  // The renderer registry is a switch over block.type; reading it is the only way to catch a
  // block that is offered by the composer but never drawn.
  const source = readFileSync(join(import.meta.dirname, '../src/components/blocks/index.tsx'), 'utf8');
  const handled = new Set([...source.matchAll(/case '([a-z0-9_]+)'/g)].map((m) => m[1]));

  for (const block of BLOCK_TYPES) {
    assert.ok(handled.has(block.type) || SHELL_OWNED.has(block.type), `no renderer for "${block.type}"`);
  }
  for (const [slug, steps] of Object.entries(PAGE_PLANS)) {
    // /blog is the one page that queries posts directly instead of assembling sections, so an
    // empty plan there is correct — anywhere else it would mean a page that renders nothing.
    if (!steps.length) {
      assert.equal(slug, 'blog', `${slug}: an empty plan leaves the page blank`);
      continue;
    }
    for (const step of steps) {
      assert.ok(BLOCK_TYPE_MAP[step.type] || SHELL_OWNED.has(step.type), `${slug}: plan uses unknown block "${step.type}"`);
      assert.ok(handled.has(step.type) || SHELL_OWNED.has(step.type), `${slug}: "${step.type}" has no renderer`);
    }
  }
});

test('plans stay structural: no prose hides in the fallbacks', () => {
  for (const [slug, steps] of Object.entries(PAGE_PLANS)) {
    for (const step of steps) {
      for (const [key, value] of Object.entries(step.props ?? {})) {
        if (typeof value !== 'string') continue;
        assert.ok(
          key === 'variant' || key === 'layout' || key === 'division' || value.length <= 48 || /^(cta|button|label|href|tone|style)/i.test(key),
          `${slug}.${step.type}.${key}: fallback props must not carry copy (${value.slice(0, 60)}…)`,
        );
      }
    }
  }
});

test('plan sections are keyed and sample-flagged so placeholders read as placeholders', () => {
  const sections = planFor('home');
  assert.ok(sections.length > 0);
  assert.equal(new Set(sections.map((s) => s.id)).size, sections.length);
  for (const section of sections) {
    assert.equal(section.isSample, true, 'fallback content is never presented as authored content');
    assert.deepEqual(section.media, []);
    assert.equal(section.name, section.type);
  }
  assert.deepEqual(planFor('a-page-nobody-planned'), []);
});

test('block props apply defaults first, then whatever the editor typed', () => {
  const withDefaults = BLOCK_TYPES.find((b) => b.propFields.some((f) => f.default !== undefined));
  assert.ok(withDefaults, 'at least one block should carry a default');
  const props = blockProps(withDefaults.type, {});
  for (const field of withDefaults.propFields) {
    if (field.default !== undefined) assert.deepEqual(props[field.key], field.default, `${withDefaults.type}.${field.key}`);
  }
  const overridden = blockProps(withDefaults.type, { statement: 'From the editor', empty: '', missing: null });
  assert.ok(!('missing' in overridden), 'null from the editor falls back to the default');
  assert.ok(!('empty' in overridden), 'a cleared field does not override a default with an empty string');
  // Keys the catalogue does not declare still pass through: renderers read a handful of props
  // (headline, eyebrow) that come from the block row rather than the composer form.
  assert.equal(blockProps(withDefaults.type, { extra: 'x' }).extra, 'x');
  // A block type removed from the catalogue still round-trips its stored props, so an old row
  // keeps its data for the moment someone renames the type back.
  assert.deepEqual(blockProps('no_such_block', { a: 1 }), { a: 1 });
});
