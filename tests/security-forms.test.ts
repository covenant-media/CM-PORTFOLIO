/**
 * The public forms are the only unauthenticated write path in the platform, so the abuse
 * controls around them are load-bearing. Timing tokens, spam heuristics and cleaning all run on
 * the server before anything is stored — this suite covers the pure parts of that.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { cleanLine, issueFormToken, looksSpammy, normaliseMultiline, verifyFormToken } from '../src/lib/security/forms';
import { checkRate, hashIp, RATE_RULES } from '../src/lib/auth/rate-limit';
import { createHmac } from 'node:crypto';

const secret = () => process.env.AUTH_SECRET || 'covenant-media-dev-secret-change-me';
const tokenAt = (ms: number) => `${ms}.${createHmac('sha256', secret()).update(String(ms)).digest('hex').slice(0, 32)}`;

test('a freshly issued token is rejected as too fast', () => {
  const token = issueFormToken();
  assert.match(token, /^\d+\.[0-9a-f]{32}$/);
  const verdict = verifyFormToken(token);
  assert.equal(verdict.ok, false);
  assert.equal(verdict.reason, 'too_fast', 'an instant POST is a bot');
});

test('a token becomes usable a few seconds later and expires after half an hour', () => {
  assert.equal(verifyFormToken(tokenAt(Date.now() - 8_000)).ok, true);
  assert.equal(verifyFormToken(tokenAt(Date.now() - 1000 * 60 * 31)).reason, 'expired');
});

test('tokens cannot be forged or replayed from another page', () => {
  assert.equal(verifyFormToken(null).reason, 'missing');
  assert.equal(verifyFormToken('').reason, 'missing');
  assert.equal(verifyFormToken('nonsense').reason, 'malformed');
  assert.equal(verifyFormToken('1234567890123.deadbeef').reason, 'signature');
  const [ts] = issueFormToken().split('.');
  assert.equal(verifyFormToken(`${ts}.${'0'.repeat(32)}`).reason, 'signature');
});

test('the spam heuristics fire on the shapes we actually see, not on prose', () => {
  assert.equal(looksSpammy('Hello dear sir, I offer you cheap cialis and sponsored backlinks'), true);
  assert.equal(looksSpammy('https://a.example https://b.example https://c.example'), true);
  assert.equal(looksSpammy('x'.repeat(1700)), true);
  assert.equal(
    looksSpammy('We need a nine-minute edit of our wedding footage plus three social cutdowns, delivery in May.'),
    false,
  );
  assert.equal(looksSpammy(''), false);
});

test('stored text is single-line for names, paragraph-preserving for messages', () => {
  assert.equal(cleanLine('  Ada\r\nOkafor   \u0007' as unknown as string), 'Ada Okafor');
  assert.equal(cleanLine('a'.repeat(400), 240).length, 240);
  assert.equal(cleanLine(null), '');
  assert.equal(normaliseMultiline('line one\r\nline two\u0000'), 'line one\nline two');
  assert.equal(normaliseMultiline('x'.repeat(7000), 6000).length, 6000);
  assert.equal(normaliseMultiline(undefined), '');
});

test('rate buckets count, then reset', () => {
  const rule = RATE_RULES.form ?? { limit: 3, windowMs: 60_000 };
  const key = `test:${Date.now()}`;
  for (let i = 0; i < rule.limit; i += 1) assert.equal(checkRate(key, rule).ok, true, `attempt ${i + 1} should pass`);
  const blocked = checkRate(key, rule);
  assert.equal(blocked.ok, false);
  assert.ok(blocked.retryAfterMs > 0);
  assert.equal(checkRate(`${key}:other`, rule).ok, true, 'one bucket must not lock out another');
});

test('ip addresses are only ever kept as a salted hash', () => {
  const a = hashIp('196.201.1.1');
  assert.equal(a, hashIp('196.201.1.1'));
  assert.notEqual(a, hashIp('196.201.1.2'));
  assert.match(a, /^[0-9a-f]{16,}$/);
  assert.ok(!a.includes('196'), 'the address must not be recoverable from what we store');
});

test('the three ends of the analytics pipe agree on the event names', async () => {
  // A name the browser sends but the endpoint refuses is a silently lost measurement, and one
  // the endpoint accepts but nothing sends is dead weight. All three lists are read as written.
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const read = (relative: string) => readFileSync(join(import.meta.dirname, '..', relative), 'utf8');

  const union = /export type EventName =([\s\S]*?);/.exec(read('src/lib/analytics/events.ts'))?.[1] ?? '';
  const names = new Set([...union.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]));
  assert.ok(names.size >= 8, 'the EventName union was not found — the test needs updating with it');

  const route = read('src/app/api/events/route.ts');
  const allowed = new Set([...( /const ALLOWED = new Set<EventName>\(\[([\s\S]*?)\]\);/.exec(route)?.[1] ?? '').matchAll(/'([a-z_]+)'/g)].map((m) => m[1]));

  const client = read('src/components/ui/SiteBehaviours.tsx');
  const known = new Set([...( /const KNOWN = new Set\[?\w*\]?\(\[([\s\S]*?)\]\);/.exec(client)?.[1] ?? '').matchAll(/'([a-z_]+)'/g)].map((m) => m[1]));

  assert.deepEqual([...allowed].sort(), [...names].sort(), 'the ingest endpoint accepts a different set than the type allows');
  assert.deepEqual([...known].sort(), [...names].sort(), 'the page sends a different set than the endpoint accepts');

  // The beacon must go where the route is, or nothing is ever recorded.
  assert.match(client, /'\/api\/events'/);
  assert.ok(!/\/api\/track/.test(client), 'SiteBehaviours still posts to a route that does not exist');
});
