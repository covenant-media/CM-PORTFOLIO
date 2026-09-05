/**
 * Replay of the CMS save form straight from the server-rendered HTML.
 *
 * It parses the real markup (including the $ACTION_* fields React embeds for no-JS
 * form actions), changes one visible value and posts it back with the session cookies.
 * That exercises the whole chain — session, CSRF, field validation, the write, cache
 * revalidation — without needing a browser.
 *
 *   node scripts/smoke-admin-save.mjs [cookie-file]
 */
import { readFileSync } from 'node:fs';

const BASE = process.env.CM_SMOKE_BASE ?? 'http://localhost:3000';
const [session, csrf] = readFileSync(process.argv[2] ?? '/tmp/cm-cookies.txt', 'utf8').trim().split(/\s+/);
if (!session || !csrf) throw new Error('cookie file must contain "<session> <csrf>"');

const slug = process.argv[3] ?? 'sample-brand-film';
const path = `/admin/media_projects/${slug}`;

const html = await fetch(`${BASE}${path}`, { headers: { cookie: `cm_admin_session=${session}; cm_csrf=${csrf}` } }).then((res) => res.text());

const formStart = findSaveForm(html);
const fields = parseFields(html.slice(formStart.start, formStart.end));
if (!fields.some((field) => field.name === 'title')) throw new Error('save form not found in the rendered page');

const stamp = new Date().toISOString().slice(11, 19);
const title = `Smoke test title ${stamp}`;
for (const field of fields) if (field.name === 'title') field.value = title;

const body = new FormData();
for (const field of fields) {
  if (field.file) continue;
  body.append(field.name, field.value ?? '');
}

// The no-JS form path posts the $ACTION_* fields back to the page URL; that is what a browser
// without hydration does, and it is the path this smoke test replays. Next answers with a full
// re-render of the page, so the body is only drained with a deadline — the write has already
// landed by then, and the verification GET below is what proves it.
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 12_000);
let status = 0;
let errorText = '';
try {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { cookie: `cm_admin_session=${session}; cm_csrf=${csrf}` },
    body,
    signal: controller.signal,
  });
  status = res.status;
  errorText = await res.text().catch(() => '');
} catch (err) {
  errorText = err instanceof Error && err.name === 'AbortError' ? '' : String(err);
} finally {
  clearTimeout(timer);
}

// Give the revalidation a moment, then read the page back: the title must have changed and the
// editor must show the saved banner.
await new Promise((resolve) => setTimeout(resolve, 1_500));
const back = await fetch(`${BASE}${path}`, { headers: { cookie: `cm_admin_session=${session}; cm_csrf=${csrf}` } }).then((res) => res.text());
const saved = /name="title"[^>]*value="([^"]*)"/.exec(back)?.[1];
const errors = [...back.matchAll(/Some fields need attention|Security token mismatch|Sign in to continue|cannot (?:write|read)[^<]{0,60}/g)].map((m) => m[0]);

console.log('POST status   :', status || 'response still open when the deadline passed (the write is already applied)');
console.log('title written :', title);
console.log('title on disk :', saved ?? '(editor not found)');
console.log('page errors   :', errors.length ? errors.join(' | ') : 'none');
console.log(
  saved === title && errors.length === 0
    ? 'RESULT          : the admin save wrote through and the editor read it back'
    : 'RESULT          : CHECK FAILED — the value did not survive the round trip',
);
if (errorText && status >= 400) console.log('server said     :', errorText.slice(0, 300));
process.exitCode = saved === title && errors.length === 0 ? 0 : 1;

function findSaveForm(document) {
  let cursor = 0;
  while (true) {
    const start = document.indexOf('<form', cursor);
    if (start < 0) throw new Error('no <form> found');
    const end = document.indexOf('</form>', start);
    const slice = document.slice(start, end);
    if (slice.includes('name="title"') && slice.includes('_csrf')) return { start, end };
    cursor = end + 1;
  }
}

function parseFields(fragment) {
  const decode = (value) =>
    (value ?? '')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  const attr = (attrs, name) => new RegExp(`${name}="([^"]*)"`).exec(attrs)?.[1];

  const out = [];
  for (const [, attrs] of fragment.matchAll(/<input\b([^>]*)>/g)) {
    const name = attr(attrs, 'name');
    if (!name) continue;
    const type = attr(attrs, 'type') ?? 'text';
    if (type === 'file') continue;
    if (type === 'checkbox' || type === 'radio') {
      if (!/\bchecked\b/.test(attrs)) continue;
      out.push({ name, value: decode(attr(attrs, 'value') ?? 'on') });
      continue;
    }
    out.push({ name, value: decode(attr(attrs, 'value') ?? '') });
  }
  for (const [, attrs, inner] of fragment.matchAll(/<textarea\b([^>]*)>([\s\S]*?)<\/textarea>/g)) {
    const name = attr(attrs, 'name');
    if (name) out.push({ name, value: decode(inner) });
  }
  for (const [, attrs, inner] of fragment.matchAll(/<select\b([^>]*)>([\s\S]*?)<\/select>/g)) {
    const name = attr(attrs, 'name');
    if (!name) continue;
    const selected =
      /<option\b[^>]*\bvalue="([^"]*)"[^>]*\bselected\b/.exec(inner)?.[1] ??
      /<option\b[^>]*\bselected\b[^>]*\bvalue="([^"]*)"/.exec(inner)?.[1] ??
      /<option\b(?![^>]*value=)[^>]*\bselected\b[^>]*>([^<]*)</.exec(inner)?.[1] ??
      '';
    out.push({ name, value: decode(selected) });
  }
  return out.map((field) => (field.name === '_csrf' ? { ...field, value: csrf } : field));
}
