/**
 * Request guards shared by every admin route handler and the admin pages.
 * Authorization is enforced server-side on every mutation (PRD §17).
 */
import { NextResponse } from 'next/server';
import { readSession, verifyCsrf, type AdminContext } from './session';
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

export async function getAdminContext(request: Request): Promise<AdminContext | null> {
  return readSession();
}

/** Throws 401/403 unless the caller may perform `required` on `module`. */
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
