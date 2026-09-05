/**
 * parseForm is the wire contract between the admin form controls and the validator: a checkbox
 * that is unticked must arrive as false, a repeater must arrive as structured rows, and nothing
 * the browser invented may leak through as a column. Getting these wrong produces silent data
 * loss, so they are pinned here.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseForm } from '../src/lib/cms/admin';

const form = (entries: [string, string][]) => {
  const data = new FormData();
  for (const [key, value] of entries) data.append(key, value);
  return data;
};

test('a boolean only exists when it is ticked', () => {
  const fields = [{ key: 'is_featured', type: 'boolean' }];
  assert.equal(parseForm(form([['is_featured', 'on']]), fields).is_featured, true);
  assert.equal(parseForm(form([]), fields).is_featured, false);
  assert.equal(parseForm(form([['is_featured', 'true']]), fields).is_featured, true);
});

test('multi-value fields accept repeated inputs or a JSON blob', () => {
  const fields = [{ key: 'services', type: 'multiselect' }, { key: 'related', type: 'relation', multiple: true }];
  assert.deepEqual(parseForm(form([['services', 'film'], ['services', 'photo']]), fields).services, ['film', 'photo']);
  assert.deepEqual(parseForm(form([['services__json', '["film","photo"]']]), fields).services, ['film', 'photo']);
  assert.deepEqual(parseForm(form([]), fields).services, []);
  assert.deepEqual(parseForm(form([['related__json', 'not json']]), fields).related, [], 'broken JSON must not become a string');
});

test('structured fields arrive as JSON text and bad payloads are handed to the validator', () => {
  const fields = [
    { key: 'metrics', type: 'repeat' },
    { key: 'meta', type: 'json' },
    { key: 'seo', type: 'seo' },
  ];
  const parsed = parseForm(
    form([
      ['metrics', '[{"label":"Reach","value":"1.2M"}]'],
      ['meta', '{"source":"import"}'],
      ['seo', ''],
    ]),
    fields,
  );
  assert.deepEqual(parsed.metrics, [{ label: 'Reach', value: '1.2M' }]);
  assert.deepEqual(parsed.meta, { source: 'import' });
  assert.deepEqual(parsed.seo, {}, 'an empty seo block is an object, never an empty string');

  const broken = parseForm(form([['metrics', '{oops']]), fields);
  assert.equal(broken.metrics, '{oops', 'the raw text stays so the validator can name the field');
  assert.deepEqual(parseForm(form([]), fields).metrics, []);
});

test('list-like text is passed through untouched for the field type to split', () => {
  const fields = [{ key: 'tags', type: 'tags' }, { key: 'deliverables', type: 'list' }];
  const parsed = parseForm(form([['tags', 'brand, film'], ['deliverables', 'A\nB']]), fields);
  assert.equal(parsed.tags, 'brand, film');
  assert.equal(parsed.deliverables, 'A\nB');
});

test('only declared fields are read out of the submission', () => {
  const parsed = parseForm(form([['title', 'Real'], ['status', 'published'], ['id', 'hijacked'], ['created_at', '1999-01-01']]), [
    { key: 'title', type: 'text' },
    { key: 'status', type: 'select' },
  ]);
  assert.deepEqual(parsed, { title: 'Real', status: 'published' });
});

test('an absent text input becomes an empty string so the validator can clear a value', () => {
  const parsed = parseForm(form([]), [{ key: 'summary', type: 'textarea' }]);
  assert.equal(parsed.summary, '');
});
