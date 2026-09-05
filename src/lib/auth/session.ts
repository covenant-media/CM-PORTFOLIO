/**
 * Admin session management.
 *
 * Cookie holds a 256-bit random token; the database stores only its SHA-256
 * digest, so a DB dump never yields a usable session. Sessions are revocable
 * server-side and expire on a rolling + absolute deadline.
 */
import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { getDb, newId, nowIso, insertRow, execute } from '../db';
import { hashPassword, verifyPassword } from './password';

export const SESSION_COOKIE = 'cm_admin_session';
export const CSRF_COOKIE = 'cm_csrf';
export const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12h rolling
export const SESSION_ABSOLUTE_MS = 1000 * 60 * 60 * 24 * 14; // 14 days max

function secret(): string {
  return process.env.AUTH_SECRET || 'covenant-media-dev-secret-change-me';
}

export function sign(value: string): string {
  return createHmac('sha256', secret()).update(value).digest('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export interface AdminUserRecord {
  id: string;
  email: string;
  name: string;
  title?: string | null;
  role: string;
  status: string;
  password_hash: string;
  last_login_at?: string | null;
  locked_until?: string | null;
  failed_attempts?: number | null;
}

export interface AdminContext {
  user: { id: string; email: string; name: string; role: string; title?: string | null };
  sessionId: string;
  csrfToken: string;
}

function cookieOptions(maxAgeSeconds: number) {
  const secure = process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    path: '/',
    maxAge: maxAgeSeconds,
  };
}

export async function findUserByEmail(email: string): Promise<AdminUserRecord | undefined> {
  const db = await getDb();
  const rows = await db.select<Record<string, unknown>>('SELECT * FROM admin_user WHERE lower(email) = $1::text', [email.toLowerCase()]);
  return rows[0] as unknown as AdminUserRecord | undefined;
}

export async function findUserById(id: string): Promise<AdminUserRecord | undefined> {
  const db = await getDb();
  const rows = await db.select<Record<string, unknown>>('SELECT * FROM admin_user WHERE id = $1::text', [id]);
  return rows[0] as unknown as AdminUserRecord | undefined;
}

export async function createUser(input: { email: string; name: string; password: string; role?: string; title?: string }): Promise<{ ok: boolean; error?: string }> {
  const db = await getDb();
  const existing = await findUserByEmail(input.email);
  if (existing) return { ok: false, error: 'That email already has an account' };
  const password_hash = await hashPassword(input.password);
  // Credentials are deliberately non-writable through the generic CMS data layer,
  // so an account is created with an explicit statement here and nowhere else.
  await db.execute(
    `INSERT INTO admin_user (id, email, name, title, password_hash, role, status, email_verified, password_set_at, created_at, updated_at)
     VALUES ($1::text, $2::text, $3::text, $4::text, $5::text, $6::text, 'active', TRUE, $7::timestamptz, $7::timestamptz, $7::timestamptz)`,
    [newId('usr'), input.email.toLowerCase(), input.name, input.title ?? null, password_hash, input.role ?? 'owner', nowIso()],
  );
  return { ok: true };
}

export async function createSession(userId: string, meta: { ip?: string; userAgent?: string } = {}): Promise<{ token: string; csrfToken: string; expiresAt: number }> {
  const db = await getDb();
  const token = randomBytes(32).toString('base64url');
  const expiresAt = Date.now() + SESSION_TTL_MS;
  await insertRow('admin_session', {
    id: newId('ses'),
    user_id: userId,
    token_hash: hashToken(token),
    ip: meta.ip ?? null,
    user_agent: (meta.userAgent ?? '').slice(0, 300),
    expires_at: new Date(expiresAt).toISOString(),
    created_at: nowIso(),
  });
  const csrfToken = sign(`${userId}:${randomUUID()}`);
  return { token, csrfToken, expiresAt };
}

/** Writes the session + CSRF cookies (call from the login route handler). */
export async function setSessionCookies(token: string, csrfToken: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, cookieOptions(Math.floor(SESSION_TTL_MS / 1000)));
  jar.set(CSRF_COOKIE, csrfToken, { ...cookieOptions(Math.floor(SESSION_TTL_MS / 1000)), httpOnly: false });
}

export async function clearSessionCookies(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(CSRF_COOKIE);
}

export async function destroyCurrentSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.execute('UPDATE admin_session SET revoked_at = $1::timestamptz WHERE token_hash = $2::text', [nowIso(), hashToken(token)]);
  }
  await clearSessionCookies();
}

export async function readSession(): Promise<AdminContext | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const rows = await db.select<Record<string, unknown>>(
    `SELECT s.id AS session_id, s.expires_at, s.revoked_at, u.id, u.email, u.name, u.role, u.status, u.title
       FROM admin_session s JOIN admin_user u ON u.id = s.user_id
      WHERE s.token_hash = $1::text`,
    [hashToken(token)],
  );
  const row = rows[0] as
    | { session_id: string; expires_at: string; revoked_at: string | null; id: string; email: string; name: string; role: string; status: string; title: string | null }
    | undefined;
  if (!row || row.revoked_at || row.status !== 'active') return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await db.execute('UPDATE admin_session SET revoked_at = $1::timestamptz WHERE id = $2::text', [nowIso(), row.session_id]);
    return null;
  }
  // rolling expiry
  await db.execute('UPDATE admin_session SET expires_at = $1::timestamptz WHERE id = $2::text', [
    new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    row.session_id,
  ]);
  return {
    user: { id: row.id, email: row.email, name: row.name, role: row.role, title: row.title },
    sessionId: row.session_id,
    csrfToken: (await jar.get(CSRF_COOKIE)?.value) ?? sign(row.session_id),
  };
}

/** Verifies the double-submit CSRF pair for state-changing requests. */
export async function verifyCsrf(request: Request): Promise<boolean> {
  const header = request.headers.get('x-csrf-token');
  if (!header) return false;
  const jar = await cookies();
  const cookieValue = jar.get(CSRF_COOKIE)?.value;
  return Boolean(cookieValue) && cookieValue === header;
}

export async function verifyLogin(email: string, password: string): Promise<{ ok: boolean; user?: AdminUserRecord; error?: string; locked?: boolean }> {
  const user = await findUserByEmail(email);
  if (!user) {
    // Constant-ish work even for unknown accounts.
    await verifyPassword(password, 'scrypt$16384$8$1$AAAA$AAAA');
    return { ok: false, error: 'Email or password is incorrect' };
  }
  if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
    return { ok: false, error: 'Too many attempts. Try again later.', locked: true };
  }
  const good = await verifyPassword(password, user.password_hash);
  const db = await getDb();
  if (!good) {
    const attempts = (user.failed_attempts ?? 0) + 1;
    const lock = attempts >= 10 ? new Date(Date.now() + 1000 * 60 * 30).toISOString() : null;
    await db.execute('UPDATE admin_user SET failed_attempts = $1::int, locked_until = $2::timestamptz WHERE id = $3::text', [attempts, lock, user.id]);
    return { ok: false, error: 'Email or password is incorrect', locked: Boolean(lock) };
  }
  await db.execute('UPDATE admin_user SET failed_attempts = 0, locked_until = NULL, last_login_at = $1::timestamptz WHERE id = $2::text', [nowIso(), user.id]);
  return { ok: true, user };
}

export async function changePassword(userId: string, currentPassword: string, nextPassword: string): Promise<{ ok: boolean; error?: string }> {
  const user = await findUserById(userId);
  if (!user) return { ok: false, error: 'Account not found' };
  if (!(await verifyPassword(currentPassword, user.password_hash))) return { ok: false, error: 'Current password is incorrect' };
  const db = await getDb();
  const password_hash = await hashPassword(nextPassword);
  await db.execute('UPDATE admin_user SET password_hash = $1::text, password_set_at = $2::timestamptz, updated_at = $2::timestamptz WHERE id = $3::text', [
    password_hash,
    nowIso(),
    userId,
  ]);
  await execute('DELETE FROM admin_session WHERE user_id = $1::text', [userId]);
  return { ok: true };
}

export function clientIp(request: Request): string {
  const headers = request.headers;
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') ||
    '0.0.0.0'
  );
}
