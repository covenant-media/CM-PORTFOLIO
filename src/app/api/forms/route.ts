/**
 * POST /api/forms — the single endpoint behind all three public enquiry forms.
 *
 * Order matters: reject the invisible traps first (honeypot, timing, rate limit)
 * so abusive traffic never reaches the database, then validate strictly against
 * the same field configuration the browser used, then store, then notify.
 * A bot is always answered with a 200 so it learns nothing.
 */
import { FORM_CONFIGS, type FormVariant } from '@/lib/cms/forms';
import { getSetting } from '@/lib/cms/settings';
import { cleanLine, looksSpammy, normaliseMultiline, verifyFormToken, verifyTurnstile } from '@/lib/security/forms';
import { clientIp, recordEvent, visitorIdFrom } from '@/lib/analytics/events';
import { checkRate, RATE_RULES, hashIp } from '@/lib/auth/rate-limit';
import { getDb, insertRow } from '@/lib/db';
import { revalidateContent } from '@/lib/cms/repository';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^@\s]+@[^@\s.]+\.[^@\s]+$/;

async function readPayload(request: Request): Promise<Record<string, unknown>> {
  const type = request.headers.get('content-type') ?? '';
  if (type.includes('application/json')) return (await request.json()) as Record<string, unknown>;
  const form = await request.formData().catch(() => null);
  const out: Record<string, unknown> = {};
  if (form) for (const [key, value] of form.entries()) out[key] = value;
  return out;
}

function respond(request: Request, native: boolean, to: string, init?: { status?: number; error?: string }) {
  if (native) {
    return new Response(null, { status: 303, headers: { location: init?.error ? `${to}?error=1` : to } });
  }
  return Response.json(init?.error ? { ok: false, error: init.error } : { ok: true, message: 'Received' }, {
    status: init?.status ?? 200,
    headers: { 'cache-control': 'no-store' },
  });
}

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type') ?? '';
  const native = contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data');
  const payload = await readPayload(request);
  const variant = String(payload.form ?? 'main') as FormVariant;
  const config = FORM_CONFIGS[variant];
  const fallbackPath = variant === 'media' ? '/media/contact' : variant === 'tech' ? '/tech/contact' : '/contact';

  if (!config) return respond(request, native, fallbackPath, { status: 400, error: 'Unknown form.' });

  // 1. honeypot — hidden field must stay empty
  if (String(payload._gotcha ?? '').length > 0) return respond(request, native, fallbackPath);

  // 2. signed timing token (issued when the form rendered)
  const tokenCheck = verifyFormToken(payload._token ? String(payload._token) : null);
  if (!tokenCheck.ok) {
    return respond(request, native, fallbackPath, {
      status: 422,
      error:
        tokenCheck.reason === 'too_fast'
          ? 'That was quick — please fill the form in and send it again.'
          : 'This form expired. Please refresh the page and try again.',
    });
  }

  // 3. rate limit per IP
  const ip = clientIp(request);
  const bucket = `${RATE_RULES.contactForm!.bucket}:${ip ? hashIp(ip) : 'unknown'}`;
  const rate = checkRate(bucket, RATE_RULES.contactForm!);
  if (!rate.ok) {
    return respond(request, native, fallbackPath, {
      status: 429,
      error: `Too many messages from this connection. Try again in ${Math.ceil(rate.retryAfterMs / 60000)} minute${Math.ceil(rate.retryAfterMs / 60000) === 1 ? '' : 's'} or use the contact details on this page.`,
    });
  }

  // 4. optional Turnstile
  const turnstile = await verifyTurnstile(payload.turnstileToken ? String(payload.turnstileToken) : null, ip ?? '');
  if (turnstile === false) return respond(request, native, fallbackPath, { status: 403, error: 'Human verification failed. Please try again.' });

  // 5. field validation, driven by the shared config
  const details: Record<string, string> = {};
  const values: Record<string, string> = {};
  for (const field of config.fields) {
    const raw = payload[field.name];
    const value = field.type === 'textarea' ? normaliseMultiline(raw, field.maxLength ?? 6000) : cleanLine(raw, field.maxLength ?? 240);
    if (field.required && !value) details[field.name] = `${field.label} is required`;
    else if (field.type === 'email' && value && !EMAIL_RE.test(value)) details[field.name] = 'Enter a valid email address';
    else if (field.type === 'date' && value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) details[field.name] = 'Use the date picker';
    else if (field.options?.length && value && !field.options.some((option) => option.value === value)) details[field.name] = 'Choose one of the listed options';
    values[field.name] = value;
  }
  const maxMessage = Number(await getSetting('forms.max_message_length').catch(() => 4000)) || 4000;
  if (values.message && values.message.length > maxMessage) details.message = `Keep it under ${maxMessage} characters`;
  if (Object.keys(details).length) {
    return respond(request, native, fallbackPath, { status: 422, error: 'Please check the highlighted fields.' });
  }
  if (!values.name || !EMAIL_RE.test(values.email ?? '')) return respond(request, native, fallbackPath, { status: 422, error: 'Name and a valid email are required.' });
  const message = values.message || values.requirements || '';
  if (!message && !values.project_type) return respond(request, native, fallbackPath, { status: 422, error: 'Add a short description so we can help.' });
  if (looksSpammy(`${message} ${values.requirements ?? ''}`)) return respond(request, native, fallbackPath);

  // 6. store
  const referer = request.headers.get('referer');
  let pagePath: string | null = null;
  try {
    pagePath = referer ? new URL(referer).pathname.slice(0, 300) : null;
  } catch {
    pagePath = null;
  }

  try {
    await insertRow('contact_submission', {
      form: variant,
      name: values.name.slice(0, 90),
      email: values.email.toLowerCase().slice(0, 160),
      phone: values.phone || null,
      organization: values.organization || null,
      service: values.service || null,
      project_type: values.project_type || null,
      event_date: values.event_date || null,
      location: values.location || null,
      budget_band: values.budget_band || null,
      timeline: values.timeline || null,
      requirements: values.requirements || null,
      message: message.slice(0, maxMessage),
      page_path: pagePath,
      user_agent: (request.headers.get('user-agent') ?? '').slice(0, 240) || null,
      ip_hash: ip ? hashIp(ip) : null,
      consent: payload.consent === true || payload.consent === 'on' || payload.consent === 'true',
      status: 'new',
      meta: { turnstile: turnstile === null ? 'not-configured' : 'passed', referrer: referer ? new URL(referer).host : null },
    });
  } catch (error) {
    const detail = (error as Error).message ?? '';
    if (process.env.NODE_ENV !== 'production') console.warn('[forms]', detail.slice(0, 160));
    if (/does not exist|no such table|relation/i.test(detail)) {
      return respond(request, native, fallbackPath, { status: 503, error: 'The database is not ready yet. Run `npm run setup`, or email us directly.' });
    }
    return respond(request, native, fallbackPath, { status: 500, error: 'We could not save your message. Please try again or use email.' });
  }

  // 7. best-effort notification + analytics, never blocking the response
  void notify(variant, values, request);
  void recordEvent({ name: 'form_submit', path: pagePath ?? fallbackPath, target: variant, division: variant === 'main' ? 'main' : variant });
  void revalidateContent('submissions', '', 'create').catch(() => undefined);

  return respond(request, native, fallbackPath);
}

async function notify(variant: FormVariant, values: Record<string, string>, request: Request) {
  const to = String((await getSetting('forms.notify_email').catch(() => null)) ?? process.env.NOTIFY_EMAIL ?? '').trim();
  if (!to) return;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV !== 'production') console.info(`[forms] would notify ${to} — set RESEND_API_KEY to enable email.`);
    return;
  }
  const lines = Object.entries(values)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: process.env.NOTIFY_FROM ?? 'Covenant CMS <onboarding@resend.dev>',
        to: [to],
        subject: `New ${variant} enquiry — ${values.name}`,
        text: `${lines}\n\nPage: ${request.headers.get('referer') ?? 'unknown'}`,
        reply_to: values.email,
      }),
      signal: AbortSignal.timeout(8000),
    });
    const db = await getDb();
    await db.execute(`UPDATE contact_submission SET notified_at = now() WHERE form = $1::text AND notified_at IS NULL`, [variant]);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.warn('[forms] notify failed', (error as Error).message?.slice(0, 120));
  }
}

/** GET is deliberately not allowed — no enumeration of submissions. */
export async function GET() {
  return Response.json({ ok: false, error: 'Method not allowed' }, { status: 405 });
}
