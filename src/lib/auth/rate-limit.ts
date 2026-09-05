/**
 * Rate limiting.
 *
 * In-memory token buckets are the fast path (per instance). Login attempts are
 * additionally recorded in the database so throttling survives restarts and
 * scales when more than one instance runs.
 */
import { createHash } from 'node:crypto';
import { getDb, newId } from '../db';

export interface RateRule {
  /** window in milliseconds */
  windowMs: number;
  /** allowed events per window */
  limit: number;
  /** suffix used to namespace the bucket */
  bucket: string;
}

export const RATE_RULES: Record<string, RateRule> = {
  login: { bucket: 'login', windowMs: 15 * 60_000, limit: 8 },
  contactForm: { bucket: 'form', windowMs: 10 * 60_000, limit: 6 },
  mediaEvents: { bucket: 'events', windowMs: 60_000, limit: 120 },
  upload: { bucket: 'upload', windowMs: 60_000, limit: 40 },
  adminWrite: { bucket: 'admin', windowMs: 60_000, limit: 300 },
};

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

export function hashIp(ip: string): string {
  const salt = process.env.AUTH_SECRET || 'covenant-media-dev-secret';
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32);
}

export function checkRate(key: string, rule: RateRule): { ok: boolean; retryAfterMs: number; remaining: number } {
  const now = Date.now();
  const composite = `${rule.bucket}:${key}`;
  const existing = store.get(composite);
  if (!existing || existing.resetAt <= now) {
    store.set(composite, { count: 1, resetAt: now + rule.windowMs });
    if (store.size > 5000) {
      for (const [k, v] of store) if (v.resetAt <= now) store.delete(k);
    }
    return { ok: true, retryAfterMs: 0, remaining: rule.limit - 1 };
  }
  existing.count += 1;
  if (existing.count > rule.limit) {
    return { ok: false, retryAfterMs: Math.max(0, existing.resetAt - now), remaining: 0 };
  }
  return { ok: true, retryAfterMs: 0, remaining: rule.limit - existing.count };
}

export async function recordAuthAttempt(key: string, success: boolean, meta: { ip?: string; userAgent?: string } = {}): Promise<void> {
  try {
    const db = await getDb();
    await db.execute(
      `INSERT INTO auth_attempt (id, key, success, ip, user_agent, created_at)
       VALUES ($1::text, $2::text, $3::boolean, $4::text, $5::text, $6::timestamptz)`,
      [newId('att'), key, success, meta.ip ?? null, (meta.userAgent ?? '').slice(0, 300), new Date().toISOString()],
    );
  } catch {
    /* best effort — never let telemetry break a login */
  }
}

/**
 * Recent-failure count across instances. Returns the number of failed attempts
 * for `key` within the rule window; used as a durable backstop for logins.
 */
export async function recentFailures(key: string, windowMs: number): Promise<number> {
  try {
    const db = await getDb();
    const rows = await db.select<{ n: number | string }>(
      `SELECT count(*)::int AS n FROM auth_attempt
        WHERE key = $1::text AND success = FALSE AND created_at > $2::timestamptz`,
      [key, new Date(Date.now() - windowMs).toISOString()],
    );
    return Number(rows[0]?.n ?? 0);
  } catch {
    return 0;
  }
}

export async function enforceLoginRate(key: string): Promise<{ ok: boolean; retryAfterMs: number; message?: string }> {
  const rule = RATE_RULES.login;
  const local = checkRate(key, rule);
  if (!local.ok) {
    return { ok: false, retryAfterMs: local.retryAfterMs, message: 'Too many attempts. Wait a moment before trying again.' };
  }
  const durable = await recentFailures(key, rule.windowMs);
  if (durable >= rule.limit * 2) {
    return { ok: false, retryAfterMs: rule.windowMs, message: 'This account is temporarily locked after repeated failures.' };
  }
  return { ok: true, retryAfterMs: 0 };
}
