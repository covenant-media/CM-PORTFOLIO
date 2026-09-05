/**
 * POST /api/events — first-party measurement ingest (beacon endpoint).
 * Accepts a small batch, never stores IPs, cookies or cross-site ids, and
 * refuses anything that is not a known event name.
 */
import { recordEvent, shouldTrack, visitorIdFrom, type EventName } from '@/lib/analytics/events';
import { getSetting } from '@/lib/cms/settings';
import { checkRate, RATE_RULES } from '@/lib/auth/rate-limit';

export const dynamic = 'force-dynamic';

const ALLOWED = new Set<EventName>([
  'page_view',
  'cta_click',
  'project_click',
  'video_play',
  'outbound_click',
  'form_submit',
  'form_error',
  'resume_download',
  'lightbox_open',
  'search',
]);

const SAFE_PATH = /^\/[A-Za-z0-9\-_/?.=]{0,180}$/;

function clean(value: unknown, max = 200): string | null {
  const text = typeof value === 'string' ? value.trim() : '';
  return text ? text.slice(0, max) : null;
}

export async function POST(request: Request) {
  const respectDnt = (await getSetting('analytics.respect_dnt').catch(() => true)) !== false;
  if (!shouldTrack(request, respectDnt)) return Response.json({ ok: true, ignored: true });

  const body = await request
    .json()
    .then((value) => (Array.isArray(value) ? value : [value]))
    .catch(() => [] as unknown[]);
  const events = body.slice(0, 10);
  if (!events.length) return Response.json({ ok: true, stored: 0 });

  const visitorId = visitorIdFrom(request);
  const bucket = `${RATE_RULES.mediaEvents!.bucket}:${visitorId ?? 'anon'}`;
  const rate = checkRate(bucket, RATE_RULES.mediaEvents!);
  if (!rate.ok) return Response.json({ ok: true, throttled: true });

  let stored = 0;
  for (const raw of events) {
    const event = (raw ?? {}) as Record<string, unknown>;
    const name = clean(event.name, 32) as EventName | null;
    if (!name || !ALLOWED.has(name)) continue;
    const path = clean(event.path, 200);
    await recordEvent({
      name,
      path: path && SAFE_PATH.test(path) ? path : null,
      target: clean(event.target, 200),
      division: ['main', 'media', 'tech'].includes(String(event.division)) ? String(event.division) : null,
      visitorId,
      meta: typeof event.meta === 'object' && event.meta ? (event.meta as Record<string, unknown>) : {},
    });
    stored += 1;
  }
  return Response.json({ ok: true, stored }, { headers: { 'cache-control': 'no-store' } });
}
