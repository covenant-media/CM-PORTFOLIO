/**
 * Read layer for the redesigned CMS console.
 *
 * The console screens (`/admin/media/**`, `/admin/site/**`, `/admin/social`) load their
 * data from here rather than reaching into SQL from a component, which keeps the same
 * split the rest of the CMS uses: pages render, this module reads, `app/admin/actions.ts`
 * writes. Nothing here mutates anything.
 *
 * Two rules shape the shape of these functions:
 *
 *   1. **A missing row is not an error.** A brand-new database has no hero row and no
 *      about row, so every loader returns a fully-formed default instead of null. The
 *      console renders an empty form; it never renders a crash.
 *   2. **Nothing is invented.** Empty stays empty so the public surface can decide what
 *      an empty field means. The console never substitutes a plausible value.
 */
import { getDb, select, selectOne } from '../db';

export type Surface = 'media' | 'main' | 'tech';

export const SURFACES: Surface[] = ['media', 'main', 'tech'];

export const PHOTO_FOLDER = 'event-photography';

// ── hero ────────────────────────────────────────────────────────────────────

export interface SurfaceHero {
  id: string | null;
  surface: Surface;
  eyebrow: string;
  name_given: string;
  name_family: string;
  roles: string[];
  intro: string;
  capabilities: string[];
  primary_label: string;
  primary_href: string;
  secondary_label: string;
  secondary_href: string;
  updated_at: string | null;
}

const EMPTY_HERO: SurfaceHero = {
  id: null,
  surface: 'media',
  eyebrow: '',
  name_given: '',
  name_family: '',
  roles: [],
  intro: '',
  capabilities: [],
  primary_label: '',
  primary_href: '',
  secondary_label: '',
  secondary_href: '',
  updated_at: null,
};

export async function surfaceHero(surface: Surface): Promise<SurfaceHero> {
  const db = await getDb();
  const rows = await db.select<Record<string, unknown>>(
    'SELECT * FROM surface_hero WHERE surface = $1::text LIMIT 1',
    [surface],
  );
  const row = rows[0];
  if (!row) return { ...EMPTY_HERO, surface };
  return {
    id: String(row.id ?? ''),
    surface,
    eyebrow: text(row.eyebrow),
    name_given: text(row.name_given),
    name_family: text(row.name_family),
    roles: stringList(row.roles),
    intro: text(row.intro),
    capabilities: stringList(row.capabilities),
    primary_label: text(row.primary_label),
    primary_href: text(row.primary_href),
    secondary_label: text(row.secondary_label),
    secondary_href: text(row.secondary_href),
    updated_at: row.updated_at ? String(row.updated_at) : null,
  };
}

// ── about the studio ────────────────────────────────────────────────────────

export interface StudioAbout {
  id: string | null;
  surface: Surface;
  heading: string;
  subheading: string;
  bio: string;
  portrait_asset_id: string;
  portrait_url: string;
  credit_name: string;
  credit_role: string;
  statement: string;
  updated_at: string | null;
}

const EMPTY_ABOUT: StudioAbout = {
  id: null,
  surface: 'media',
  heading: '',
  subheading: '',
  bio: '',
  portrait_asset_id: '',
  portrait_url: '',
  credit_name: '',
  credit_role: '',
  statement: '',
  updated_at: null,
};

export async function studioAbout(surface: Surface): Promise<StudioAbout> {
  const db = await getDb();
  const rows = await db.select<Record<string, unknown>>(
    'SELECT * FROM studio_about WHERE surface = $1::text LIMIT 1',
    [surface],
  );
  const row = rows[0];
  if (!row) return { ...EMPTY_ABOUT, surface };
  return {
    id: String(row.id ?? ''),
    surface,
    heading: text(row.heading),
    subheading: text(row.subheading),
    bio: text(row.bio),
    portrait_asset_id: text(row.portrait_asset_id),
    portrait_url: text(row.portrait_url),
    credit_name: text(row.credit_name),
    credit_role: text(row.credit_role),
    statement: text(row.statement),
    updated_at: row.updated_at ? String(row.updated_at) : null,
  };
}

// ── videos ──────────────────────────────────────────────────────────────────

export type VideoForm = 'short_form' | 'long_form' | 'other';

export interface VideoRow {
  id: string;
  title: string;
  source: string;
  source_url: string | null;
  embed_url: string | null;
  poster_url: string | null;
  external_url: string | null;
  form: VideoForm;
  duration_s: number | null;
  status: string;
  hero_preview: boolean;
  sort_order: number;
  updated_at: string | null;
}

export const VIDEO_FORMS: { value: VideoForm; label: string }[] = [
  { value: 'short_form', label: 'Short-form (vertical)' },
  { value: 'long_form', label: 'Long-form (widescreen)' },
  { value: 'other', label: 'Other' },
];

export function isVideoForm(value: unknown): value is VideoForm {
  return value === 'short_form' || value === 'long_form' || value === 'other';
}

export async function videosForConsole(): Promise<{ short: VideoRow[]; long: VideoRow[]; other: VideoRow[] }> {
  const rows = await allVideos();
  return {
    short: rows.filter((r) => r.form === 'short_form'),
    long: rows.filter((r) => r.form === 'long_form'),
    other: rows.filter((r) => r.form === 'other'),
  };
}

export async function allVideos(): Promise<VideoRow[]> {
  const db = await getDb();
  const rows = await db.select<Record<string, unknown>>(
    `SELECT id, title, source, source_url, embed_url, poster_url, external_url, form,
            duration_s, status, hero_preview, sort_order, updated_at
       FROM media_video
      ORDER BY form ASC, sort_order ASC, created_at DESC`,
  );
  return rows.map(toVideoRow);
}

export async function videoOptions(): Promise<{ value: string; label: string; meta: string }[]> {
  const rows = await allVideos();
  return rows.map((row) => ({
    value: row.id,
    label: row.title,
    meta: row.form === 'short_form' ? 'Short-form' : row.form === 'long_form' ? 'Long-form' : 'Other',
  }));
}

function toVideoRow(row: Record<string, unknown>): VideoRow {
  const form = row.form;
  return {
    id: String(row.id ?? ''),
    title: text(row.title),
    source: text(row.source),
    source_url: row.source_url ? text(row.source_url) : null,
    embed_url: row.embed_url ? text(row.embed_url) : null,
    poster_url: row.poster_url ? text(row.poster_url) : null,
    external_url: row.external_url ? text(row.external_url) : null,
    form: isVideoForm(form) ? form : 'other',
    duration_s: row.duration_s == null ? null : Number(row.duration_s),
    status: text(row.status) || 'draft',
    hero_preview: row.hero_preview === true,
    sort_order: Number(row.sort_order ?? 0),
    updated_at: row.updated_at ? String(row.updated_at) : null,
  };
}

// ── event photography ───────────────────────────────────────────────────────

export interface PhotoRow {
  id: string;
  url: string;
  filename: string;
  title: string;
  alt: string;
  caption: string;
  width: number | null;
  height: number | null;
  bytes: number;
  created_at: string | null;
}

export async function eventPhotos(limit = 120): Promise<PhotoRow[]> {
  const db = await getDb();
  const rows = await db.select<Record<string, unknown>>(
    `SELECT id, url, filename, title, alt, caption, width, height, bytes, created_at
       FROM media_asset
      WHERE kind = 'image' AND folder = $1::text
      ORDER BY created_at DESC
      LIMIT $2::int`,
    [PHOTO_FOLDER, Math.min(Math.max(limit, 1), 400)],
  );
  return rows.map((row) => ({
    id: String(row.id ?? ''),
    url: text(row.url),
    filename: text(row.filename),
    title: text(row.title),
    alt: text(row.alt),
    caption: text(row.caption),
    width: row.width == null ? null : Number(row.width),
    height: row.height == null ? null : Number(row.height),
    bytes: Number(row.bytes ?? 0),
    created_at: row.created_at ? String(row.created_at) : null,
  }));
}

// ── client stories ──────────────────────────────────────────────────────────

export interface StoryRow {
  id: string;
  video_id: string | null;
  video_title: string | null;
  client_name: string;
  video_type: string;
  quote: string;
  role_label: string;
  origin: 'manual' | 'auto';
  status: string;
  sort_order: number;
  updated_at: string | null;
}

export async function stories(): Promise<StoryRow[]> {
  const db = await getDb();
  const rows = await db.select<Record<string, unknown>>(
    `SELECT s.id, s.video_id, s.client_name, s.video_type, s.quote, s.role_label,
            s.origin, s.status, s.sort_order, s.updated_at, v.title AS video_title
       FROM media_testimonial s
       LEFT JOIN media_video v ON v.id = s.video_id
      ORDER BY s.sort_order ASC, s.created_at DESC`,
  );
  return rows.map((row) => ({
    id: String(row.id ?? ''),
    video_id: row.video_id ? String(row.video_id) : null,
    video_title: row.video_title ? String(row.video_title) : null,
    client_name: text(row.client_name),
    video_type: text(row.video_type),
    quote: text(row.quote),
    role_label: text(row.role_label),
    origin: row.origin === 'auto' ? 'auto' : 'manual',
    status: text(row.status) || 'draft',
    sort_order: Number(row.sort_order ?? 0),
    updated_at: row.updated_at ? String(row.updated_at) : null,
  }));
}

// ── social profiles ─────────────────────────────────────────────────────────

export interface SocialRow {
  id: string;
  network: string;
  label: string;
  url: string;
  handle: string;
  icon: string;
  placements: string[];
  is_verified: boolean;
  status: string;
  sort_order: number;
}

export async function socialProfiles(): Promise<SocialRow[]> {
  const db = await getDb();
  const rows = await db.select<Record<string, unknown>>(
    `SELECT id, network, label, url, handle, icon, placements, is_verified, status, sort_order
       FROM social_link
      ORDER BY sort_order ASC, network ASC`,
  );
  return rows.map((row) => ({
    id: String(row.id ?? ''),
    network: text(row.network),
    label: text(row.label),
    url: text(row.url),
    handle: text(row.handle),
    icon: text(row.icon),
    placements: stringList(row.placements),
    is_verified: row.is_verified === true,
    status: text(row.status) || 'draft',
    sort_order: Number(row.sort_order ?? 0),
  }));
}

// ── overview ────────────────────────────────────────────────────────────────

export interface ConsoleCounts {
  videos_total: number;
  videos_published: number;
  short_form: number;
  long_form: number;
  hero_previews: number;
  photos: number;
  stories: number;
  stories_published: number;
  socials: number;
  socials_verified: number;
  services: number;
  team: number;
  enquiries_new: number;
  enquiries_total: number;
}

/**
 * One round trip for the dashboard. A single row with named counts beats a dozen
 * count queries, and a missing table degrades to zeros rather than throwing — the
 * dashboard is the first thing an owner sees and it must never be the thing that
 * breaks.
 */
export async function consoleCounts(): Promise<ConsoleCounts> {
  const row = await selectOne<Record<string, unknown>>(
      `SELECT
         (SELECT count(*) FROM media_video)                                   AS videos_total,
         (SELECT count(*) FROM media_video WHERE status = 'published')        AS videos_published,
         (SELECT count(*) FROM media_video WHERE form = 'short_form')         AS short_form,
         (SELECT count(*) FROM media_video WHERE form = 'long_form')          AS long_form,
         (SELECT count(*) FROM media_video WHERE hero_preview = TRUE)         AS hero_previews,
         (SELECT count(*) FROM media_asset WHERE kind = 'image' AND folder = $1::text) AS photos,
         (SELECT count(*) FROM media_testimonial)                             AS stories,
         (SELECT count(*) FROM media_testimonial WHERE status = 'published')  AS stories_published,
         (SELECT count(*) FROM social_link)                                   AS socials,
         (SELECT count(*) FROM social_link WHERE is_verified = TRUE)          AS socials_verified,
         (SELECT count(*) FROM service)                                       AS services,
         (SELECT count(*) FROM team_member)                                   AS team,
         (SELECT count(*) FROM contact_submission)                            AS enquiries_total,
         (SELECT count(*) FROM contact_submission WHERE status = 'new')       AS enquiries_new`,
      [PHOTO_FOLDER],
    )
    .catch(() => undefined);
  const num = (key: string) => Number(row?.[key] ?? 0);
  return {
    videos_total: num('videos_total'),
    videos_published: num('videos_published'),
    short_form: num('short_form'),
    long_form: num('long_form'),
    hero_previews: num('hero_previews'),
    photos: num('photos'),
    stories: num('stories'),
    stories_published: num('stories_published'),
    socials: num('socials'),
    socials_verified: num('socials_verified'),
    services: num('services'),
    team: num('team'),
    enquiries_total: num('enquiries_total'),
    enquiries_new: num('enquiries_new'),
  };
}

/** The hero preview reel: the toggled short-form pieces, in sort order. */
export async function heroPreviewVideos(): Promise<VideoRow[]> {
  const rows = await allVideos();
  return rows.filter((row) => row.hero_preview).sort((a, b) => a.sort_order - b.sort_order);
}

// ── small helpers ───────────────────────────────────────────────────────────

function text(value: unknown): string {
  return value == null ? '' : String(value);
}

/** JSONB arrays arrive as arrays from `pg` and as strings from PGlite. */
function stringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v ?? '').trim()).filter(Boolean);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) return parsed.map((v) => String(v ?? '').trim()).filter(Boolean);
    } catch {
      /* fall through */
    }
  }
  return [];
}

/** Re-exported so screens can share one select helper without importing the db layer. */
export { select };

/** The raw text a story extraction can read from, for every video. */
export interface StorySourceRow {
  id: string;
  title: string;
  description: string | null;
  client: string | null;
}

/**
 * Everything the client-name extractor is allowed to read, per video.
 *
 * Loaded as its own list so the console can show the owner exactly what it would derive
 * before they save — a preview beats a surprise, and it makes the extraction auditable.
 */
export async function storySources(): Promise<StorySourceRow[]> {
  const db = await getDb();
  const rows = await db
    .select<Record<string, unknown>>('SELECT id, title, description, client FROM media_video ORDER BY created_at DESC')
    .catch(() => [] as Record<string, unknown>[]);
  return rows.map((row) => ({
    id: String(row.id ?? ''),
    title: text(row.title),
    description: row.description ? text(row.description) : null,
    client: row.client ? text(row.client) : null,
  }));
}

/** Image assets the studio-portrait picker can offer, newest first. */
export async function imageAssetOptions(limit = 60): Promise<{ value: string; label: string; url: string }[]> {
  const db = await getDb();
  const rows = await db
    .select<Record<string, unknown>>(
      `SELECT id, title, filename, url FROM media_asset
        WHERE kind = 'image' ORDER BY created_at DESC LIMIT $1::int`,
      [Math.min(Math.max(limit, 1), 200)],
    )
    .catch(() => [] as Record<string, unknown>[]);
  return rows.map((row) => ({
    value: String(row.id ?? ''),
    label: text(row.title) || text(row.filename) || 'Untitled image',
    url: text(row.url),
  }));
}

/** Resolves whatever the portrait field holds to a URL the <img> can use. */
export async function resolvePortrait(about: { portrait_asset_id: string; portrait_url: string }): Promise<string> {
  const url = about.portrait_url.trim();
  if (url) return url;
  const id = about.portrait_asset_id.trim();
  if (!id) return '';
  const row = await selectOne<{ url: string }>('SELECT url FROM media_asset WHERE id = $1::text', [id]).catch(() => undefined);
  return row?.url ? String(row.url) : '';
}

// ── main website content ────────────────────────────────────────────────────

export interface ServiceRow {
  id: string;
  title: string;
  slug: string;
  summary: string;
  division: string;
  status: string;
  is_featured: boolean;
  sort_order: number;
}

export async function servicesForConsole(): Promise<ServiceRow[]> {
  const db = await getDb();
  const rows = await db
    .select<Record<string, unknown>>(
      `SELECT id, title, slug, summary, division, status, is_featured, sort_order
         FROM service ORDER BY division ASC, sort_order ASC, title ASC`,
    )
    .catch(() => [] as Record<string, unknown>[]);
  return rows.map((row) => ({
    id: String(row.id ?? ''),
    title: text(row.title),
    slug: text(row.slug),
    summary: text(row.summary),
    division: text(row.division),
    status: text(row.status) || 'draft',
    is_featured: row.is_featured === true,
    sort_order: Number(row.sort_order ?? 0),
  }));
}

export interface TeamRow {
  id: string;
  name: string;
  role: string;
  bio: string;
  division: string;
  status: string;
  is_placeholder: boolean;
  is_visible: boolean;
  sort_order: number;
}

export async function teamForConsole(): Promise<TeamRow[]> {
  const db = await getDb();
  const rows = await db
    .select<Record<string, unknown>>(
      `SELECT id, name, role, bio, division, status, is_placeholder, is_visible, sort_order
         FROM team_member ORDER BY sort_order ASC, name ASC`,
    )
    .catch(() => [] as Record<string, unknown>[]);
  return rows.map((row) => ({
    id: String(row.id ?? ''),
    name: text(row.name),
    role: text(row.role),
    bio: text(row.bio),
    division: text(row.division),
    status: text(row.status) || 'draft',
    is_placeholder: row.is_placeholder === true,
    is_visible: row.is_visible !== false,
    sort_order: Number(row.sort_order ?? 0),
  }));
}
