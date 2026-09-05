/**
 * Request guards shared by every admin route handler and the admin pages.
 * Authorization is enforced server-side on every mutation (PRD §17).
 */
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { CSRF_COOKIE, readSession, verifyCsrf, type AdminContext } from './session';
import { can, levelFor, type ModuleKey, type PermissionLevel } from './permissions';
import { getDb, newId, nowIso } from '../db';

export class ApiError extends Error {
  status: number;
  details?: Record<string, string>;
  constructor(status: number, message: string, details?: Record<string, string>) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export interface AuthedContext extends AdminContext {
  request: Request;
  permission: PermissionLevel;
}

/** Throws 401/403 unless the caller may perform `required` on `module`.
 *
 * `request` is only needed to read the CSRF token off the posted body; the session itself
 * comes from cookies, which is why the page-level guards do not take a request at all.
 */
export async function requireAdmin(request: Request, module: ModuleKey, required: PermissionLevel = 'write'): Promise<AuthedContext> {
  const ctx = await readSession();
  if (!ctx) throw new ApiError(401, 'Sign in to continue');
  const roleMap = await loadRolePermissions(ctx.user.role);
  if (!can(ctx.user.role, module, required, roleMap)) {
    throw new ApiError(403, `Your role (${ctx.user.role}) cannot ${required} this section`);
  }
  if (required !== 'read' && !(await verifyCsrf(request))) {
    throw new ApiError(403, 'Security token missing or expired. Reload the page and try again.');
  }
  return { ...ctx, request, permission: levelFor(ctx.user.role, module, roleMap) };
}

/** Session + permission check for server actions (no Request object available). */
export async function requirePermission(
  module: ModuleKey,
  required: PermissionLevel = 'write',
): Promise<AdminContext & { permission: PermissionLevel }> {
  const ctx = await readSession();
  if (!ctx) throw new ApiError(401, 'Sign in to continue');
  const roleMap = await loadRolePermissions(ctx.user.role);
  if (!can(ctx.user.role, module, required, roleMap)) {
    throw new ApiError(403, `Your role (${ctx.user.role}) cannot ${required} this section`);
  }
  return { ...ctx, permission: levelFor(ctx.user.role, module, roleMap) };
}

/**
 * The role's permission map as customised in the database, when one exists.
 *
 * Page-level permission checks pass this through so what the CMS offers matches what the
 * mutations accept: without it the UI would fall back to the built-in role definitions and a
 * customised role would end up arguing with itself.
 */
export async function permissionsForRole(role: string): Promise<Record<string, PermissionLevel> | undefined> {
  return loadRolePermissions(role);
}

/**
 * Server actions are already same-origin-only and the session cookie is Lax; the token
 * check is the explicit second lock so a forged cross-site POST cannot write.
 */
export async function assertCsrf(token: string | null | undefined): Promise<void> {
  const jar = await cookies();
  const cookieValue = jar.get(CSRF_COOKIE)?.value;
  if (!cookieValue || !token || cookieValue !== token) {
    throw new ApiError(403, 'Security token missing or expired. Reload the page and try again.');
  }
}

const roleCache = new Map<string, { at: number; map: Record<string, PermissionLevel> | undefined }>();

async function loadRolePermissions(role: string): Promise<Record<string, PermissionLevel> | undefined> {
  if (role === 'owner') return undefined;
  const cached = roleCache.get(role);
  if (cached && cached.at > Date.now() - 30_000) return cached.map;
  try {
    const db = await getDb();
    const rows = await db.select<{ permissions: Record<string, PermissionLevel> }>('SELECT permissions FROM admin_role WHERE key = $1::text', [role]);
    const map = rows[0]?.permissions ?? undefined;
    roleCache.set(role, { at: Date.now(), map });
    return map;
  } catch {
    return undefined;
  }
}

/** Audit-friendly content changes (PRD §9). */
export async function audit(
  ctx: { user: { id: string } } | null,
  entry: { action: string; module?: string; entity?: string; entityId?: string; summary?: string; meta?: Record<string, unknown>; request?: Request },
): Promise<void> {
  try {
    const db = await getDb();
    await db.execute(
      `INSERT INTO audit_log (id, user_id, action, module, entity, entity_id, summary, meta, ip, created_at)
       VALUES ($1::text,$2::text,$3::text,$4::text,$5::text,$6::text,$7::text,$8::jsonb,$9::text,$10::timestamptz)`,
      [
        newId('aud'),
        ctx?.user.id ?? null,
        entry.action,
        entry.module ?? null,
        entry.entity ?? null,
        entry.entityId ?? null,
        (entry.summary ?? '').slice(0, 400),
        JSON.stringify(entry.meta ?? {}),
        entry.request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
        nowIso(),
      ],
    );
  } catch {
    /* never fail a user action because of telemetry */
  }
}

export function json<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data as never, init);
}

export function fail(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message, details: error.details ?? null }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : 'Unexpected error';
  if (process.env.NODE_ENV !== 'production') console.error('[api]', error);
  return NextResponse.json({ error: message.slice(0, 300) }, { status: 500 });
}

/** Wraps a handler with consistent error → response mapping. */
export function route<T extends unknown[]>(handler: (...args: T) => Promise<NextResponse>) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return fail(error);
    }
  };
}

export function noStore(headers?: Headers): Record<string, string> {
  return {
    'Cache-Control': 'no-store, max-age=0',
    Vary: 'Cookie',
    ...(headers ? Object.fromEntries(headers.entries()) : {}),
  };
}
