/**
 * First-party analytics.
 *
 * No third-party script and no cookie banner: only an event name, the path, an
 * optional target and an anonymised visitor id (hash of IP + UA + daily salt).
 * Do Not Track is honoured and the writer never throws into a page render.
 */
import { createHash } from 'node:crypto';
import { getDb } from '@/lib/db';

export type EventName =
  | 'page_view'
  | 'cta_click'
  | 'project_click'
  | 'video_play'
  | 'outbound_click'
  | 'form_submit'
  | 'form_error'
  | 'resume_download'
  | 'lightbox_open'
  | 'nav_click'
  | 'search';

export interface EventInput {
  name: EventName;
  path?: string | null;
  target?: string | null;
  division?: string | null;
  visitorId?: string | null;
  meta?: Record<string, unknown>;
}

const MAX_META_KEYS = 24;

function hashIp(ip: string, salt: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return createHash('sha256').update(`${ip}|${salt}|${day}`).digest('hex').slice(0, 32);
}

export function clientIp(request: Request): string | null {
  for (const key of ['x-forwarded-for', 'x-real-ip', 'cf-connecting-ip']) {
    const value = request.headers.get(key);
    if (!value) continue;
    const first = value.split(',')[0]?.trim();
    if (first) return first;
  }
  return null;
}

/** Salted, daily-rotating client identifier — nothing persistent is stored. */
export function visitorIdFrom(request: Request): string | null {
  try {
    const ip = clientIp(request) ?? 'unknown';
    const ua = request.headers.get('user-agent') ?? '';
    return hashIp(`${ip}|${ua.slice(0, 120)}`, process.env.ANALYTICS_SALT || 'covenant-media-analytics');
  } catch {
    return null;
  }
}

export function shouldTrack(request: Request, respectDnt = true): boolean {
  if (!respectDnt) return true;
  const dnt = request.headers.get('dnt') ?? request.headers.get('sec-gpc');
  return dnt !== '1' && dnt !== 'true';
}

/** Fire-and-forget write; measurement must never break a page. */
export async function recordEvent(input: EventInput): Promise<void> {
  try {
    const db = await getDb();
    await db.execute(
      `INSERT INTO cm_event (id, name, path, target, division, visitor_id, meta)
       VALUES ($1::text, $2::text, $3::text, $4::text, $5::text, $6::text, $7::jsonb)`,
      [
        `evt_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
        input.name,
        (input.path ?? '').slice(0, 400) || null,
        (input.target ?? '').slice(0, 400) || null,
        input.division ?? null,
        input.visitorId?.slice(0, 64) ?? null,
        JSON.stringify(trimMeta(input.meta ?? {})),
      ],
    );
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.warn('[analytics]', (error as Error).message?.slice(0, 120));
  }
}

function trimMeta(meta: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta).slice(0, MAX_META_KEYS)) {
    if (value === null || value === undefined) continue;
    out[key] = typeof value === 'string' ? value.slice(0, 200) : value;
  }
  return out;
}

/** Aggregates for the admin dashboard. */
export async function eventSummary(days = 30): Promise<{ total: number; byName: { name: string; count: number }[]; topPaths: { path: string; count: number }[] }> {
  try {
    const db = await getDb();
    const [names, paths, totals] = await Promise.all([
      db.select<{ name: string; n: number | string }>(
        `SELECT name, count(*)::int AS n FROM cm_event WHERE created_at > now() - ($1::int * interval '1 day') GROUP BY name ORDER BY n DESC`,
        [days],
      ),
      db.select<{ path: string | null; n: number | string }>(
        `SELECT path, count(*)::int AS n FROM cm_event WHERE name = 'page_view' AND created_at > now() - ($1::int * interval '1 day') GROUP BY path ORDER BY n DESC LIMIT 8`,
        [days],
      ),
      db.select<{ n: number | string }>(`SELECT count(*)::int AS n FROM cm_event WHERE created_at > now() - ($1::int * interval '1 day')`, [days]),
    ]);
    return {
      total: Number(totals[0]?.n ?? 0),
      byName: names.map((row) => ({ name: row.name, count: Number(row.n) })),
      topPaths: paths.map((row) => ({ path: row.path ?? '/', count: Number(row.n) })),
    };
  } catch {
    return { total: 0, byName: [], topPaths: [] };
  }
}
