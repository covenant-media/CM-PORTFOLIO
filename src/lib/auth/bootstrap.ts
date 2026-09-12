/**
 * First-run owner bootstrap for a freshly provisioned database.
 *
 * A hosted deploy usually starts against an empty PostgreSQL. The schema can migrate itself
 * (`ensureSchema`), but nothing can create the first account, because the seed scripts only run
 * from a developer machine. This closes that gap without weakening any rule:
 *
 *   • it does exactly one thing — create the first owner;
 *   • only when the account table is completely empty;
 *   • only when the operator has deliberately set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in the
 *     environment (there is no built-in default, unlike the dev seed);
 *   • it never updates or overwrites an existing account, and is a no-op on a seeded local
 *     database, which already has an owner.
 */
import { randomUUID } from 'node:crypto';
import { hashPassword } from './password';
import type { DbDriver } from '../db/driver';

export async function ensureFirstOwner(db: DbDriver): Promise<void> {
  const email = (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? '';
  if (!email || !password) return;

  const rows = await db.select<{ n: string }>('SELECT count(*)::text AS n FROM admin_user');
  if (Number(rows[0]?.n ?? 0) > 0) return;

  const now = new Date().toISOString();
  const hash = await hashPassword(password);
  await db.execute(
    `INSERT INTO admin_user (id, email, name, title, password_hash, role, status, email_verified, password_set_at, created_at, updated_at)
     VALUES ($1::text, $2::text, $3::text, $4::text, $5::text, 'owner', 'active', TRUE, $6::timestamptz, $6::timestamptz, $6::timestamptz)`,
    [`usr_${randomUUID().replace(/-/g, '').slice(0, 20)}`, email, 'Owner', 'Owner', hash, now],
  );
  console.warn(`[db] created the first CMS owner (${email}) from ADMIN_EMAIL / ADMIN_PASSWORD — change the password in /admin → Account.`);
}
