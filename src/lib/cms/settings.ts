/**
 * Site settings: typed, CMS-editable global configuration.
 * Stored in `site_setting` as key/value JSON so nothing has to be hardcoded.
 */
import { getDb, nowIso } from '../db';
import type { FieldType } from '../cms/fields';

export interface SettingDef {
  key: string;
  label: string;
  type: FieldType;
  group: 'brand' | 'identity' | 'contact' | 'forms' | 'media' | 'tech' | 'seo' | 'legal' | 'analytics' | 'system';
  default: string | number | boolean;
  help?: string;
  options?: { value: string; label: string }[];
  rows?: number;
  maxLength?: number;
  is_public: boolean;
  sort_order: number;
}

export const SETTINGS_SCHEMA: SettingDef[] = [
  // ── brand ────────────────────────────────────────────────────────────────
  { key: 'brand.name', label: 'Brand name', type: 'text', group: 'brand', default: 'Covenant Media', is_public: true, sort_order: 1 },
  { key: 'brand.legal_name', label: 'Legal / registered name', type: 'text', group: 'brand', default: '', is_public: true, sort_order: 2, help: 'Shown in the footer and transactional copy when set.' },
  { key: 'brand.tagline', label: 'Brand tagline', type: 'text', group: 'brand', default: 'Media and technology, under one roof.', is_public: true, sort_order: 3 },
  { key: 'brand.media_tagline', label: 'Media tagline', type: 'text', group: 'brand', default: 'WE CAPTURE. WE CREATE. WE INSPIRE.', is_public: true, sort_order: 4 },
  { key: 'brand.statement', label: 'Homepage brand statement', type: 'textarea', group: 'brand', default: '', rows: 3, is_public: true, sort_order: 5, help: 'The single line under the homepage headline. Empty = the headline stands alone.' },
  { key: 'brand.headline', label: 'Homepage headline', type: 'text', group: 'brand', default: '', maxLength: 120, is_public: true, sort_order: 6, help: 'Overrides the hero section headline when set.' },
  { key: 'brand.footer_note', label: 'Footer note', type: 'textarea', group: 'brand', default: '', rows: 2, is_public: true, sort_order: 7 },
  { key: 'brand.og_image', label: 'Default social share image', type: 'asset', group: 'brand', default: '', is_public: false, sort_order: 8, help: 'Used for Open Graph when a page has no image of its own.' },
  // ── identity ──────────────────────────────────────────────────────────────
  { key: 'founder.name', label: 'Founder name', type: 'text', group: 'identity', default: 'Covenant Nsikan', is_public: true, sort_order: 1 },
  { key: 'founder.title', label: 'Founder title', type: 'text', group: 'identity', default: 'Founder, Digital Creative Director & Technology Professional', is_public: true, sort_order: 2 },
  { key: 'founder.portrait', label: 'Founder portrait', type: 'image', group: 'identity', default: '', is_public: true, sort_order: 3 },
  { key: 'founder.bio_short', label: 'Short bio', type: 'textarea', group: 'identity', default: '', rows: 3, is_public: true, sort_order: 4 },
  { key: 'founder.bio', label: 'Full bio', type: 'markdown', group: 'identity', default: '', rows: 12, is_public: true, sort_order: 5 },
  { key: 'founder.availability', label: 'Availability note', type: 'text', group: 'identity', default: '', maxLength: 120, is_public: true, sort_order: 6, help: 'e.g. "Booking weddings and brand work for Q2".' },
  // ── contact ──────────────────────────────────────────────────────────────
  { key: 'contact.email', label: 'Email', type: 'email', group: 'contact', default: '', is_public: true, sort_order: 1 },
  { key: 'contact.email_alt', label: 'Secondary email', type: 'email', group: 'contact', default: '', is_public: true, sort_order: 2 },
  { key: 'contact.phone', label: 'Phone', type: 'text', group: 'contact', default: '', is_public: true, sort_order: 3 },
  { key: 'contact.whatsapp', label: 'WhatsApp number', type: 'text', group: 'contact', default: '', is_public: true, sort_order: 4, help: 'International format without + or spaces, e.g. 2348012345678' },
  { key: 'contact.whatsapp_label', label: 'WhatsApp button label', type: 'text', group: 'contact', default: 'Chat on WhatsApp', is_public: true, sort_order: 5 },
  { key: 'contact.location', label: 'Base location', type: 'text', group: 'contact', default: '', is_public: true, sort_order: 6 },
  { key: 'contact.service_areas', label: 'Service areas', type: 'text', group: 'contact', default: '', is_public: true, sort_order: 7 },
  { key: 'contact.response_time', label: 'Response promise', type: 'text', group: 'contact', default: '', is_public: true, sort_order: 8, help: 'Only state something you will actually keep, e.g. "Replies within 1 business day".' },
  { key: 'contact.hours', label: 'Working hours', type: 'text', group: 'contact', default: '', is_public: true, sort_order: 9 },
  // ── forms ────────────────────────────────────────────────────────────────
  { key: 'forms.notify_email', label: 'Send enquiries to', type: 'email', group: 'forms', default: '', is_public: false, sort_order: 1, help: 'Blank = store in the database only, no email sent.' },
  { key: 'forms.success_main', label: 'Main form — success message', type: 'textarea', group: 'forms', default: 'Thanks — your message is in the queue. Expect a reply within one business day.', rows: 2, is_public: true, sort_order: 2 },
  { key: 'forms.success_media', label: 'Media form — success message', type: 'textarea', group: 'forms', default: 'Thanks — shoot details received. Confirming availability shortly.', rows: 2, is_public: true, sort_order: 3 },
  { key: 'forms.success_tech', label: 'Tech form — success message', type: 'textarea', group: 'forms', default: 'Thanks — brief received. Expect scoping notes and next steps.', rows: 2, is_public: true, sort_order: 4 },
  { key: 'forms.turnstile_site_key', label: 'Cloudflare Turnstile site key', type: 'text', group: 'forms', default: '', is_public: true, sort_order: 5, help: 'Optional. Leave blank to use the built-in honeypot + timing + rate-limit defence.' },
  { key: 'forms.max_message_length', label: 'Max message length', type: 'number', group: 'forms', default: 4000, is_public: false, sort_order: 6 },
  // ── media portfolio ──────────────────────────────────────────────────────
  { key: 'media.intro', label: 'Media portfolio intro', type: 'textarea', group: 'media', default: '', rows: 3, is_public: true, sort_order: 1 },
  { key: 'media.cta_primary', label: 'Primary CTA label', type: 'text', group: 'media', default: 'View work', is_public: true, sort_order: 2 },
  { key: 'media.cta_secondary', label: 'Secondary CTA label', type: 'text', group: 'media', default: 'Hire Covenant', is_public: true, sort_order: 3 },
  { key: 'media.pricing_note', label: 'Pricing note', type: 'textarea', group: 'media', default: 'Every shoot is scoped. Packages appear here once confirmed.', rows: 2, is_public: true, sort_order: 4 },
  { key: 'media.delivery_promise', label: 'Delivery promise', type: 'text', group: 'media', default: '', maxLength: 160, is_public: true, sort_order: 5 },
  // ── tech portfolio ───────────────────────────────────────────────────────
  { key: 'tech.intro', label: 'Tech portfolio intro', type: 'textarea', group: 'tech', default: '', rows: 3, is_public: true, sort_order: 1 },
  { key: 'tech.role', label: 'Role headline', type: 'text', group: 'tech', default: 'Full-stack developer & cybersecurity specialist', is_public: true, sort_order: 2 },
  { key: 'tech.github_username', label: 'GitHub username', type: 'text', group: 'tech', default: '', is_public: true, sort_order: 3, help: 'Used for profile links. Repository data is only shown when fetched successfully.' },
  { key: 'tech.open_to', label: 'Open-to note', type: 'textarea', group: 'tech', default: '', rows: 2, is_public: true, sort_order: 4 },
  { key: 'tech.pricing_note', label: 'Pricing note', type: 'text', group: 'tech', default: 'Scoped per engagement — request a quote.', is_public: true, sort_order: 5 },
  // ── analytics / system ───────────────────────────────────────────────────
  // ── seo / indexing ─────────────────────────────────────────────────────
  { key: 'site.url', label: 'Canonical site URL', type: 'text', group: 'seo', default: '', is_public: false, sort_order: 1, maxLength: 200, help: 'Absolute origin, e.g. https://covenantmedia.studio. Used for canonicals, sitemap and share cards. Falls back to the deployment URL.' },
  { key: 'seo.title_template', label: 'Title template', type: 'text', group: 'seo', default: '%s — Covenant Media', is_public: false, sort_order: 2, help: '%s is replaced with the page title. The homepage keeps its raw title.' },
  { key: 'seo.default_description', label: 'Default meta description', type: 'textarea', group: 'seo', default: 'Covenant Media — cinematic media production and full-stack software, security and web engineering from one studio.', rows: 2, maxLength: 200, is_public: false, sort_order: 3 },
  { key: 'seo.twitter_handle', label: 'X / Twitter handle', type: 'text', group: 'seo', default: '', is_public: false, sort_order: 4, help: 'With the leading @. Leave blank until the account is confirmed.' },
  { key: 'seo.noindex', label: 'Ask search engines not to index', type: 'boolean', group: 'seo', default: false, is_public: false, sort_order: 5, help: 'For pre-launch builds only. Turn off when the site goes public.' },
  { key: 'seo.organization_logo', label: 'Organisation logo', type: 'asset', group: 'seo', default: '', is_public: false, sort_order: 6, help: 'Used in structured data. Only set once a real logo file exists.' },
  { key: 'pricing.disclaimer', label: 'Pricing footnote', type: 'textarea', group: 'media', default: '', rows: 2, is_public: true, sort_order: 6, help: 'Shown under published packages. Keep it factual — travel and extra crew are typical additions.' },
  { key: 'tech.experience_since', label: 'Working since (year)', type: 'number', group: 'tech', default: 0, is_public: true, sort_order: 6, help: 'Only a year you can stand behind. Used for the “years building” figure; 0 hides it.' },
  // ── legal / security page ──────────────────────────────────────────────
  { key: 'legal.summary', label: 'Security page — summary', type: 'textarea', group: 'legal', default: 'Covenant Media is a small studio, not a data platform. This site stores what you send us and nothing else: no advertising trackers, no third-party analytics, no tracking cookies.', rows: 3, is_public: true, sort_order: 1 },
  { key: 'legal.collected', label: 'What we store', type: 'markdown', group: 'legal', default: '- Enquiries you submit: name, email, phone/WhatsApp if given, and the project details you type.\n- Basic abuse control: a salted hash of your IP address and your browser signature, used only to stop flooding the form.\n- First-party page events (which section was opened, which video was played) against an anonymised, daily-rotating id.\n- Nothing is bought in from third parties.', rows: 10, is_public: true, sort_order: 2 },
  { key: 'legal.not_collected', label: 'What we do not do', type: 'markdown', group: 'legal', default: '- No advertising pixels, no cross-site trackers, no session recording.\n- No sale, rental or resale of enquiry data.\n- No storage of payment card details; invoices are agreed and paid offline.\n- No password storage in plain text — CMS accounts use salted hashes only.', rows: 8, is_public: true, sort_order: 3 },
  { key: 'legal.practices', label: 'How the platform is protected', type: 'markdown', group: 'legal', default: '- Admin access requires a signed session, and every content change is written to an audit log with the author and timestamp.\n- Form submissions are rate-limited per connection and guarded by a honeypot, a signed render-time token, and optionally Cloudflare Turnstile.\n- Uploads are checked for type and size, and served from a storage bucket rather than executed.\n- Rendered rich text is sanitised; user-supplied HTML is never trusted.\n- Secrets live in environment variables, never in the codebase or the database.', rows: 12, is_public: true, sort_order: 4 },
  { key: 'legal.rights', label: 'Your data, your call', type: 'markdown', group: 'legal', default: 'Ask and we will send you a copy of what we hold about you, correct it, or delete it — including an enquiry you no longer want on file. Write to the address on the contact page and quote the approximate date you sent it.', rows: 5, is_public: true, sort_order: 5 },
  { key: 'legal.terms', label: 'Working terms', type: 'markdown', group: 'legal', default: 'Scope, schedule, deliverables and price are agreed in writing before work starts. A deposit books dates for shoots; software work is billed in stages. You own the delivered work on final payment; we keep the right to show the work in our portfolio unless you ask us not to.', rows: 6, is_public: true, sort_order: 6 },
  { key: 'analytics.site_id', label: 'Analytics property id', type: 'text', group: 'analytics', default: '', is_public: false, sort_order: 1, help: 'Optional external provider. First-party events are recorded regardless.' },
  { key: 'analytics.provider', label: 'Analytics provider', type: 'select', group: 'analytics', default: 'first-party', options: [{ value: 'first-party', label: 'First-party only (default)' }, { value: 'ga4', label: 'Google Analytics 4' }, { value: 'plausible', label: 'Plausible' }], is_public: false, sort_order: 2 },
  { key: 'analytics.respect_dnt', label: 'Respect Do Not Track', type: 'boolean', group: 'analytics', default: true, is_public: false, sort_order: 3 },
  { key: 'system.show_sample_badges', label: 'Show placeholder badges', type: 'boolean', group: 'system', default: true, is_public: true, sort_order: 1, help: 'Labels seeded placeholder content publicly. Turn off once real content replaces it.' },
  { key: 'system.maintenance', label: 'Maintenance mode', type: 'boolean', group: 'system', default: false, is_public: false, sort_order: 2 },
  { key: 'system.maintenance_message', label: 'Maintenance message', type: 'textarea', group: 'system', default: 'Rebuilding something better. Back shortly.', rows: 2, is_public: true, sort_order: 3 },
  { key: 'system.search_index_note', label: 'Search console verification', type: 'text', group: 'system', default: '', is_public: false, sort_order: 4 },
];

export const SETTINGS_GROUPS: { key: SettingDef['group']; label: string; hint: string; icon: string }[] = [
  { key: 'brand', label: 'Brand', hint: 'Name, taglines, share image', icon: 'brand' },
  { key: 'identity', label: 'Founder identity', hint: 'Covenant Nsikan profile copy', icon: 'user' },
  { key: 'contact', label: 'Contact', hint: 'Email, phone, WhatsApp, hours', icon: 'mail' },
  { key: 'forms', label: 'Forms & notifications', hint: 'Success copy, spam defence, routing', icon: 'form' },
  { key: 'media', label: 'Media portfolio', hint: 'Intro and CTAs for /media', icon: 'film' },
  { key: 'tech', label: 'Tech portfolio', hint: 'Intro and profile links for /tech', icon: 'code' },
  { key: 'seo', label: 'SEO & indexing', hint: 'Canonical URL, titles, robots', icon: 'search' },
  { key: 'legal', label: 'Legal & security', hint: 'The public security / privacy page', icon: 'shield' },
  { key: 'analytics', label: 'Analytics', hint: 'Privacy-friendly measurement', icon: 'chart' },
  { key: 'system', label: 'System', hint: 'Sample badges, maintenance', icon: 'settings' },
];

const cache = new Map<string, { value: unknown; at: number }>();
const CACHE_MS = 15_000;

export type SettingValue = string | number | boolean | null;

/** Reads merged settings: DB values over schema defaults. */
export async function getSettings(opts: { includePrivate?: boolean } = {}): Promise<Record<string, SettingValue>> {
  const out: Record<string, SettingValue> = {};
  for (const def of SETTINGS_SCHEMA) {
    if (!opts.includePrivate && !def.is_public) continue;
    out[def.key] = def.default as SettingValue;
  }
  try {
    const db = await getDb();
    const rows = await db.select<{ key: string; value: unknown }>('SELECT key, value FROM site_setting');
    for (const row of rows) {
      const parsed = typeof row.value === 'string' ? safeJson(row.value) : row.value;
      const unwrapped = parsed && typeof parsed === 'object' && 'value' in (parsed as object) ? (parsed as { value: unknown }).value : parsed;
      out[row.key] = (unwrapped ?? null) as SettingValue;
    }
  } catch {
    /* DB unavailable → defaults keep the site rendering */
  }
  return out;
}

export async function getSetting<T extends SettingValue = string>(key: string): Promise<T | null> {
  const cached = cache.get(key);
  if (cached && cached.at > Date.now() - CACHE_MS) return cached.value as T;
  const all = await getSettings({ includePrivate: true });
  const value = (all[key] ?? null) as T | null;
  cache.set(key, { value, at: Date.now() });
  return value;
}

export function settingDefs(group?: SettingDef['group']): SettingDef[] {
  return SETTINGS_SCHEMA.filter((s) => (group ? s.group === group : true)).sort((a, b) => a.sort_order - b.sort_order);
}

export async function saveSetting(key: string, value: unknown): Promise<void> {
  const db = await getDb();
  const def = SETTINGS_SCHEMA.find((s) => s.key === key);
  const payload = JSON.stringify({ value });
  await db.execute(
    `INSERT INTO site_setting (key, value, type, "group", label, help, options, is_public, sort_order, updated_at)
     VALUES ($1::text,$2::jsonb,$3::text,$4::text,$5::text,$6::text,$7::jsonb,$8::boolean,$9::int,$10::timestamptz)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at,
       label = COALESCE(site_setting.label, EXCLUDED.label), type = EXCLUDED.type`,
    [
      key,
      payload,
      def?.type ?? 'text',
      def?.group ?? 'custom',
      def?.label ?? key,
      def?.help ?? null,
      JSON.stringify(def?.options ?? []),
      def?.is_public ?? true,
      def?.sort_order ?? 0,
      nowIso(),
    ],
  );
  cache.clear();
}

/** Custom (non-schema) settings still round-trip so nothing is lost. */
export async function listCustomSettings(): Promise<{ key: string; label: string; value: unknown }[]> {
  const db = await getDb();
  const known = new Set(SETTINGS_SCHEMA.map((s) => s.key));
  const rows = await db.select<{ key: string; label: string | null; value: unknown }>('SELECT key, label, value FROM site_setting ORDER BY key');
  return rows
    .filter((r) => !known.has(r.key))
    .map((r) => ({ key: r.key, label: r.label ?? r.key, value: typeof r.value === 'string' ? safeJson(r.value) : r.value }));
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export function whatsappUrl(number: string | null | undefined, message?: string): string | null {
  const digits = (number ?? '').replace(/[^\d]/g, '');
  if (digits.length < 7) return null;
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function telHref(number: string | null | undefined): string | null {
  const clean = (number ?? '').replace(/[^\d+]/g, '');
  return clean.length > 5 ? `tel:${clean}` : null;
}
