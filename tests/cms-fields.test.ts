/**
 * Field coercion is the boundary between a browser form and the database: everything the admin
 * posts passes through validateFields before the repository writes it. These cases pin the
 * behaviour the editor UI relies on — and the rejections that keep junk out of the schema.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { fieldDefault, fieldsForGroup, isSafeUrl, validateFields, withDefault, type FieldDef } from '../src/lib/cms/fields';

const field = (over: Partial<FieldDef> & { key: string; type: FieldDef['type'] }): FieldDef => ({ label: over.key, ...over });

test('blank optional fields become null, not empty strings', () => {
  const { value, errors } = validateFields([field({ key: 'summary', type: 'textarea' })], { summary: '   ' });
  assert.equal(errors.summary, undefined);
  assert.equal(value.summary, null);
});

test('required fields report instead of defaulting', () => {
  const { ok, errors } = validateFields([field({ key: 'title', type: 'text', required: true })], { title: '' });
  assert.equal(ok, false);
  assert.match(String(errors.title), /required/);
});

test('a required field hidden by showIf is not enforced', () => {
  const fields = [
    field({ key: 'mode', type: 'select', options: [{ value: 'quote', label: 'Quote' }, { value: 'fixed', label: 'Fixed' }] }),
    field({ key: 'amount', type: 'number', required: true, showIf: { key: 'mode', equals: 'fixed' } }),
  ];
  assert.equal(validateFields(fields, { mode: 'quote' }).ok, true, 'amount is hidden, so it must not be demanded');
  const shown = validateFields(fields, { mode: 'fixed' });
  assert.equal(shown.ok, false);
  assert.match(String(shown.errors.amount), /required/);
});

test('urls are restricted to schemes we are willing to render', () => {
  assert.equal(isSafeUrl('https://covenant.example/work'), true);
  assert.equal(isSafeUrl('/media/work'), true);
  assert.equal(isSafeUrl('mailto:hello@covenant.example'), true);
  assert.equal(isSafeUrl('tel:+2348000000000'), true);
  assert.equal(isSafeUrl('javascript:alert(1)'), false);
  assert.equal(isSafeUrl('data:text/html;base64,PHNjcmlwdD4='), false);
  assert.equal(isSafeUrl(''), false);

  const fields = [field({ key: 'website', type: 'url' })];
  assert.notEqual(validateFields(fields, { website: 'javascript:alert(1)' }).errors.website, undefined);
  assert.equal(validateFields(fields, { website: 'https://covenant.example' }).value.website, 'https://covenant.example');
});

test('slugs are normalised, not trusted', () => {
  const { value, errors } = validateFields([field({ key: 'slug', type: 'slug' })], { slug: '  Our New Film!! ' });
  assert.equal(errors.slug, undefined);
  assert.equal(value.slug, 'our-new-film');
  const bad = validateFields([field({ key: 'slug', type: 'slug', required: true })], { slug: '***' });
  assert.notEqual(bad.errors.slug, undefined);
});

test('emails are validated and numbers tolerate formatted input', () => {
  assert.notEqual(validateFields([field({ key: 'email', type: 'email' })], { email: 'nope' }).errors.email, undefined);
  assert.equal(validateFields([field({ key: 'email', type: 'email' })], { email: 'studio@covenant.example' }).value.email, 'studio@covenant.example');

  const money = field({ key: 'amount', type: 'money', min: 0, max: 10_000_000 });
  assert.equal(validateFields([money], { amount: '1,200' }).value.amount, 1200);
  assert.equal(validateFields([money], { amount: '' }).value.amount, null);
  assert.match(String(validateFields([money], { amount: 'free' }).errors.amount), /number/);
  assert.equal(validateFields([money], { amount: '₦1,200' }).value.amount, 1200, 'a currency symbol is typing convenience');
  assert.match(String(validateFields([field({ key: 'n', type: 'number', max: 10 })], { n: 42 }).errors.n), /10 or less/);
});

test('selects reject values outside their options', () => {
  const fields = [field({ key: 'status', type: 'select', options: [{ value: 'draft', label: 'Draft' }, { value: 'published', label: 'Published' }] })];
  assert.equal(validateFields(fields, { status: 'published' }).value.status, 'published');
  assert.match(String(validateFields(fields, { status: 'whatever' }).errors.status), /must be one of/);
  assert.equal(validateFields(fields, { status: '' }).value.status, null);
});

test('tags deduplicate and lower-case; lists keep the author’s casing', () => {
  const tags = validateFields([field({ key: 'tags', type: 'tags' })], { tags: 'Brand,  film\n, Brand\n' }).value.tags;
  assert.deepEqual(tags, ['brand', 'film']);
  const list = validateFields([field({ key: 'deliverables', type: 'list' })], { deliverables: 'Feature film\nCutdowns' }).value.deliverables;
  assert.deepEqual(list, ['Feature film', 'Cutdowns']);
  assert.equal((validateFields([field({ key: 'tags', type: 'tags' })], { tags: [] }).value.tags as unknown[]).length, 0);
});

test('json and seo accept parsed objects but hand bad JSON to the validator', () => {
  assert.deepEqual(validateFields([field({ key: 'meta', type: 'json' })], { meta: '{"a":1}' }).value.meta, { a: 1 });
  assert.deepEqual(validateFields([field({ key: 'meta', type: 'json' })], { meta: '' }).value.meta, {});
  assert.match(String(validateFields([field({ key: 'meta', type: 'json' })], { meta: '{oops' }).errors.meta), /valid JSON/);
  assert.equal(validateFields([field({ key: 'body', type: 'markdown' })], { body: '# Hi' }).value.body, '# Hi');
});

test('repeat rows validate per subfield and drop empty rows', () => {
  const metric = field({
    key: 'metrics',
    type: 'repeat',
    itemFields: [
      field({ key: 'label', type: 'text', required: true }),
      field({ key: 'value', type: 'text' }),
      field({ key: 'tone', type: 'select', options: [{ value: 'good', label: 'Good' }] }),
    ],
  });
  const ok = validateFields([metric], { metrics: [{ label: 'Reach', value: '1.2M' }, { label: '', value: '' }] });
  assert.deepEqual(ok.value.metrics, [{ label: 'Reach', value: '1.2M', tone: null }], 'the abandoned row must not be saved');
  assert.equal(ok.ok, true);
  const bad = validateFields([metric], { metrics: [{ value: 'orphan' }] });
  assert.match(String(bad.errors.metrics), /row 1: .* is required/);
});

test('maxLength guards the column, and defaults fill what the form omitted', () => {
  assert.match(String(validateFields([field({ key: 'title', type: 'text', maxLength: 5 })], { title: 'far too long' }).errors.title), /5 characters/);
  assert.equal(fieldDefault(field({ key: 'flag', type: 'boolean' })), false);
  assert.deepEqual(fieldDefault(field({ key: 'tags', type: 'tags' })), []);
  assert.deepEqual(fieldDefault(field({ key: 'seo', type: 'seo' })), {});
  assert.equal(fieldDefault(field({ key: 'title', type: 'text', default: 'Untitled' })), 'Untitled');
  assert.equal(withDefault(field({ key: 'sort_order', type: 'number', default: 0 }), null), 0);
});

test('grouping keeps the sidebar and the main column consistent', () => {
  const fields = [field({ key: 'a', type: 'text' }), field({ key: 'b', type: 'text', group: 'seo' }), field({ key: 'c', type: 'text', group: 'seo' })];
  assert.deepEqual(fieldsForGroup(fields, undefined).map((f) => f.key), ['a']);
  assert.deepEqual(fieldsForGroup(fields, 'seo').map((f) => f.key), ['b', 'c']);
});
