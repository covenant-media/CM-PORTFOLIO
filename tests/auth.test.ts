/**
 * Roles decide what the CMS will do; passwords decide who gets a role. Both are enforced on the
 * server for every mutation, so this suite pins the ladder (viewer ⊂ editor ⊂ manage), the
 * per-module overrides and the hash format — no browser-side check is trusted anywhere.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { can, CMS_MODULE_KEYS, levelFor, SYSTEM_ROLES } from '../src/lib/auth/permissions';
import { hashPassword, passwordIssues, verifyPassword } from '../src/lib/auth/password';
import { CMS_MODULES } from '../src/lib/cms/modules';

test('the role ladder is ordered and never grants by accident', () => {
  assert.equal(levelFor('owner', 'media_projects'), 'manage');
  assert.equal(can('owner', 'settings', 'manage'), true);

  assert.equal(can('viewer', 'media_projects', 'read'), true);
  assert.equal(can('viewer', 'media_projects', 'write'), false);
  assert.equal(can('viewer', 'media_projects', 'manage'), false);

  assert.equal(can('editor', 'media_projects', 'write'), true);
  assert.equal(can('editor', 'media_projects', 'manage'), false, 'publishing a row is write; deleting a section is manage');
  assert.equal(can('editor', 'settings', 'write'), false);

  assert.equal(can('media_editor', 'media_projects', 'write'), true);
  assert.equal(can('media_editor', 'tech_projects', 'write'), false, 'the media team must not reach the tech division');
  assert.equal(can('media_editor', 'blog', 'read'), false);

  // An unknown role has no rights at all, and neither does a missing one.
  assert.equal(levelFor('contractor', 'media_projects'), 'none');
  assert.equal(levelFor(undefined, 'media_projects'), 'none');
  assert.equal(can(undefined, 'media_projects', 'read'), false, 'a session whose user row has no role must not inherit the owner');
});

test('explicit none on a module beats the wildcard', () => {
  assert.equal(can('editor', 'account', 'read'), false);
  assert.equal(levelFor('editor', 'account'), 'none');
  const overrides = { '*': 'write', submissions: 'read' } as const;
  assert.equal(levelFor('custom', 'submissions', overrides), 'read');
  assert.equal(levelFor('custom', 'blog', overrides), 'write');
  assert.equal(can('custom', 'submissions', 'write', overrides), false);
});

test('every role only names modules that exist', () => {
  const modules = new Set<string>(CMS_MODULE_KEYS);
  for (const role of SYSTEM_ROLES) {
    assert.ok(role.key && role.label && role.description, 'a role needs a name and a description for the admin UI');
    for (const key of Object.keys(role.permissions)) {
      if (key === '*') continue;
      assert.ok(modules.has(key), `${role.key}: unknown permission module "${key}"`);
    }
  }
  assert.equal(new Set(SYSTEM_ROLES.map((r) => r.key)).size, SYSTEM_ROLES.length);
});

test('the CMS never edits the columns that guard an account', () => {
  // password_hash / failed_attempts / locked_until are writable:false in the table spec, and no
  // module may expose them as a field — otherwise a form could set a password in plain text.
  const guarded = ['password_hash', 'failed_attempts', 'locked_until', 'last_login_at', 'password_set_at'];
  for (const mod of CMS_MODULES) {
    for (const field of mod.fields) {
      assert.ok(!guarded.includes(field.key), `module "${mod.key}" exposes "${field.key}" to the editor`);
    }
  }
});

test('passwords round-trip and never compare in the open', async () => {
  const stored = await hashPassword('a long decent phrase 2026');
  assert.match(stored, /^scrypt\$/);
  assert.ok(!stored.includes('a long decent phrase'), 'the plaintext must not appear in the digest');
  assert.equal(await verifyPassword('a long decent phrase 2026', stored), true);
  assert.equal(await verifyPassword('a long decent phrase 2027', stored), false);
  assert.equal(await verifyPassword('anything', null), false);
  assert.equal(await verifyPassword('', stored), false);
});

test('weak passwords are named before they are stored', () => {
  assert.deepEqual(passwordIssues('a long decent phrase 2026'), []);
  assert.match(passwordIssues('short 1').join(' '), /12 characters/);
  assert.match(passwordIssues('covenantcovenant1').join(' '), /common words/);
  assert.match(passwordIssues('012345678901234567').join(' '), /at least one letter/);
  assert.match(passwordIssues('a long decent phrase 2026 covenant').join(' '), /common words/);
});
