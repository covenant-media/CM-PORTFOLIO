/**
 * Form abuse controls (server side only).
 *
 * Three cheap, effective layers instead of a third-party tracker:
 *   1. honeypot — bots fill hidden inputs;
 *   2. signed timing token — the form must be submitted between 3s and 30min
 *      after render, which stops instant POSTs and stale replays;
 *   3. per-IP rate limiting (see lib/auth/rate-limit).
 * A Cloudflare Turnstile secret, if configured, is verified as a 4th layer.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

const MAX_AGE_MS = 1000 * 60 * 30;
const MIN_AGE_MS = 3000;

function secret(): string {
  return process.env.AUTH_SECRET || 'covenant-media-dev-secret-change-me';
}

export function issueFormToken(): string {
  const ts = Date.now();
  return `${ts}.${createHmac('sha256', secret()).update(String(ts)).digest('hex').slice(0, 32)}`;
}

export function verifyFormToken(token: string | null | undefined): { ok: boolean; reason?: string } {
  if (!token) return { ok: false, reason: 'missing' };
  const [raw, signature] = String(token).split('.');
  const ts = Number(raw);
  if (!raw || !signature || !Number.isFinite(ts)) return { ok: false, reason: 'malformed' };
  const expected = createHmac('sha256', secret()).update(raw).digest('hex').slice(0, 32);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: 'signature' };
  const age = Date.now() - ts;
  if (age < MIN_AGE_MS) return { ok: false, reason: 'too_fast' };
  if (age > MAX_AGE_MS) return { ok: false, reason: 'expired' };
  return { ok: true };
}

/** Turnstile is optional; when unset we rely on the layers above. */
export async function verifyTurnstile(token: string | null | undefined, ip: string): Promise<boolean | null> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) return null;
  if (!token) return false;
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: secretKey, response: token, remoteip: ip }).toString(),
      signal: AbortSignal.timeout(4500),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    // A provider outage must not block a genuine enquiry; DB rate limits still apply.
    return true;
  }
}

const BLOCKED: RegExp[] = [
  /\b(cialis|viagra|porn|xxx|casino|crypto pump|litecoin transfer|seo service|nigerian prince|sponsored backlink)\b/,
  /(https?:\/\/){3,}/,
];

export function looksSpammy(value: string): boolean {
  const text = (value ?? '').toLowerCase();
  if (text.length > 1600 && !/\s/.test(text.slice(0, 60))) return true;
  // Bulk senders paste a trail of links; one or two are a genuine enquiry pointing at their own
  // site, so the threshold sits deliberately above that.
  const links = text.match(/https?:\/\//g);
  if (links && links.length > 2) return true;
  return BLOCKED.some((re) => re.test(text));
}

export function normaliseMultiline(value: unknown, max = 6000): string {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .trim()
    .slice(0, max);
}

export function cleanLine(value: unknown, max = 240): string {
  return String(value ?? '')
    .replace(/[\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}
