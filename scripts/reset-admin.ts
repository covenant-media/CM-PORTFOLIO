/**
 * Reset / create the CMS admin account.
 *
 *   node --import tsx scripts/reset-admin.ts
 *
 * Why this exists: the embedded database is often brought up with `db:migrate`
 * (schema only) and the seed's account block is skipped the moment any other
 * admin user exists — either way an "Email or password is incorrect" is really
 * "there is no account, or the stored password is not the one you remember."
 *
 * This upserts one guaranteed owner: it re-creates the system roles if they are
 * missing and sets the admin user to `ADMIN_EMAIL` / `ADMIN_PASSWORD` (defaults:
 * `covenant@example.test` / `covenant-demo-2026`, the same defaults the seed and
 * the dev login hint use). It never touches any content — it only guarantees a
 * working sign-in. Change the password afterwards in /admin → Account.
 */
process.env.CM_SCRIPT = '1';

import { getDriver } from '../src/lib/db/driver';
import { ensureSchema, newId, nowIso } from '../src/lib/db/index';
import { hashPassword } from '../src/lib/auth/password';
import { SYSTEM_ROLES } from '../src/lib/auth/permissions';

async function main(): Promise<void> {
  const email = (process.env.ADMIN_EMAIL || 'covenant@example.test').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'covenant-demo-2026';

  const db = await getDriver();
  await ensureSchema();

  // ── system roles (owner needs none, but keep the role table consistent) ────
  let roles = 0;
  for (const role of SYSTEM_ROLES) {
    const id = `role_${role.key}`;
    const existing = await db.select<{ id: string }>('SELECT id FROM admin_role WHERE id = $1::text', [id]);
    if (existing.length) continue;
    await db.execute(
      `INSERT INTO admin_role (id, key, label, description, permissions, is_system, created_at, updated_at)
       VALUES ($1::text, $2::text, $3::text, $4::text, $5::jsonb, TRUE, $6::timestamptz, $6::timestamptz)`,
      [id, role.key, role.label, role.description, JSON.stringify(role.permissions), nowIso()],
    );
    roles += 1;
  }

  // ── upsert the owner account ───────────────────────────────────────────────
  const passwordHash = await hashPassword(password);
  const stamp = nowIso();
  const existing = await db.select<{ id: string }>('SELECT id FROM admin_user WHERE lower(email) = $1::text', [email]);
  let action: 'created' | 'updated' | 'unchanged';
  if (!existing.length) {
    await db.execute(
      `INSERT INTO admin_user (id, email, name, title, password_hash, role, status, email_verified, password_set_at, created_at, updated_at)
       VALUES ($1::text, $2::text, $3::text, $4::text, $5::text, 'owner', 'active', TRUE, $6::timestamptz, $6::timestamptz, $6::timestamptz)`,
      [newId('usr'), email, 'Covenant Nsikan', 'Owner', passwordHash, stamp],
    );
    action = 'created';
  } else {
    const res = await db.execute(
      `UPDATE admin_user
          SET password_hash = $1::text, status = 'active', email_verified = TRUE,
              locked_until = NULL, failed_attempts = 0,
              password_set_at = $2::timestamptz, updated_at = $2::timestamptz
        WHERE id = $3::text`,
      [passwordHash, stamp, existing[0].id],
    );
    action = res.affectedRows > 0 ? 'updated' : 'unchanged';
    if (action === 'unchanged') {
      const weak = await db.select<{ id: string }>('SELECT id FROM admin_user WHERE lower(email) = $1::text AND password_hash = $2::text', [email, passwordHash]);
      action = weak.length ? 'unchanged' : 'updated';
    }
    // Reset any sessions so stale tokens cannot bypass the new password.
    await db.execute('DELETE FROM admin_session WHERE user_id = $1::text', [existing[0].id]);
  }

  console.log(JSON.stringify({ action, email, rolesSeeded: roles, note: 'Change the password in /admin → Account after signing in.' }, null, 2));
  await db.close();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });