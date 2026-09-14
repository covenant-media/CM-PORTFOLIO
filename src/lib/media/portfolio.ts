/**
 * Media Portfolio content, read from the CMS.
 *
 * This is the bridge the media surface was missing: `/media` used to render the arrays in
 * `sample-portfolio.ts` directly, so nothing an editor saved in `/admin` could ever reach the
 * page. Everything here reads the same tables the CMS writes — `media_video` for films and
 * vertical edits, `gallery` (division=media, kind=photo) for the photography wall — and maps
 * rows onto the `MediaItem` shape the components already speak, so no component had to learn a
 * second shape.
 *
 * **Fallbacks are deliberate and one-directional.** These loaders return an empty array when the
 * database has nothing published; the *caller* then renders the studio's published fallback set
 * from `sample-portfolio.ts`. That keeps a fresh install (and a database outage) showing real,
 * honest work instead of an empty page, while a CMS-published record always wins.
 *
 * Every read goes through `lib/db`, so it is parameterised, cached by the `content` tag and
 * revalidated by the CMS on save — the same path as every other public loader.
 */
import { getDb } from '../db';
import { assetsByIds } from '../cms/content';
import { MEDIA_CATEGORIES } from '../cms/options';
import { deriveStory } from './story';
import { humanize } from '../utils/text';
import { detectVideoSource } from './video';
import {
  LONG_FORM_ITEMS,
  MEDIA_CAPABILITIES,
  PHOTO_ITEMS,
  SHORT_FORM_ITEMS,
  type MediaFormat,
  type MediaItem,
  type MediaTestimonial,
} from './sample-portfolio';

export interface MediaVideoRow {
  id: string;
  title: string;
  description: string | null;
  source: string | null;
  sourceUrl: string | null;
  embedUrl: string | null;
  externalUrl: string | null;
  posterUrl: string | null;
  posterAssetId: string | null;
  form: string | null;
  category: string | null;
  client: string | null;
  services: string[];
  tags: string[];
  durationS: number | null;
  year: number | null;
  isFeatured: boolean;
  heroPreview: boolean;
  isSample: boolean;
  sortOrder: number;
  status: string;
  storyClient: string | null;
  storyKind: string | null;
  storyQuote: string | null;
}

/* ── small helpers ───────────────────────────────────────────────────────── */

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : String((entry as { label?: string })?.label ?? '').trim()))
    .filter(Boolean);
}

/** The catalog filter bars group on `item.category`, so a stored option value becomes its label. */
function categoryLabel(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  return MEDIA_CATEGORIES.find((option) => option.value === value)?.label ?? humanize(value);
}

export function formatDuration(seconds: number | null | undefined): string | null {
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return null;
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
  }
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

/**
 * A year is only shown when the record actually knows one. The row's `published_at` is the
 * honest signal available; `shot_on` wins when the owner recorded it.
 */
function yearFor(row: Record<string, unknown>): number | null {
  const shot = row.shot_on ? new Date(String(row.shot_on)) : null;
  if (shot && Number.isFinite(shot.getTime())) return shot.getUTCFullYear();
  const published = row.published_at ? new Date(String(row.published_at)) : null;
  if (published && Number.isFinite(published.getTime())) return published.getUTCFullYear();
  return null;
}

function isShortForm(form: string | null | undefined, source: string | null | undefined): boolean {
  if (form === 'short_form') return true;
  if (form === 'long_form') return false;
  // No explicit format recorded: a vertical-first platform means vertical work.
  return source === 'tiktok' || source === 'instagram';
}

function toRow(raw: Record<string, unknown>): MediaVideoRow {
  return {
    id: String(raw.id),
    title: String(raw.title ?? 'Untitled'),
    description: (raw.description as string) ?? null,
    source: (raw.source as string) ?? null,
    sourceUrl: (raw.source_url as string) ?? null,
    embedUrl: (raw.embed_url as string) ?? null,
    externalUrl: (raw.external_url as string) ?? null,
    posterUrl: (raw.poster_url as string) ?? null,
    posterAssetId: (raw.poster_asset_id as string) ?? null,
    form: (raw.form as string) ?? null,
    category: (raw.category as string) ?? null,
    client: (raw.client as string) ?? null,
    services: stringList(raw.services),
    tags: stringList(raw.tags),
    durationS: raw.duration_s == null ? null : Number(raw.duration_s),
    year: yearFor(raw),
    isFeatured: raw.is_featured === true,
    heroPreview: raw.hero_preview === true,
    isSample: raw.is_sample === true,
    sortOrder: Number(raw.sort_order ?? 0),
    status: String(raw.status ?? 'draft'),
    storyClient: (raw.story_client as string) ?? null,
    storyKind: (raw.story_kind as string) ?? null,
    storyQuote: (raw.story_quote as string) ?? null,
  };
}

/** Published media videos, newest order first — the shape the CMS hub and the loaders share. */
export async function mediaVideoRows(input: { includeDrafts?: boolean } = {}): Promise<MediaVideoRow[]> {
  const db = await getDb();
  const where = input.includeDrafts ? '1=1' : "status = 'published'";
  const rows = await db.select<Record<string, unknown>>(
    `SELECT * FROM media_video WHERE ${where} ORDER BY sort_order ASC, created_at DESC LIMIT 200`,
    [],
  );
  return rows.map(toRow);
}

/* ── rows → MediaItem ────────────────────────────────────────────────────── */

function toMediaItem(row: MediaVideoRow, poster: string | null): MediaItem {
  const short = isShortForm(row.form, row.source);
  const videoUrl = row.sourceUrl ?? row.embedUrl ?? row.externalUrl;
  const kind = short ? 'Short-form edit' : 'Long-form film';
  return {
    id: row.id,
    // `media_video` has no slug of its own; the platform id is stable and unique, and falls
    // back to the record id for uploaded files.
    slug: detectVideoSource(videoUrl ?? '').sourceId ?? row.id,
    title: row.title,
    description: row.description ?? '',
    format: short ? 'short' : 'long',
    kindLabel: categoryLabel(row.category, kind),
    role: row.services.length ? row.services.slice(0, 3).join(' · ') : short ? 'Edit · Vertical cut' : 'Coverage · Edit',
    tags: row.tags,
    year: row.year,
    featured: row.isFeatured,
    videoUrl,
    thumbnail: poster ?? row.posterUrl,
    image: null,
    caption: null,
    width: null,
    height: null,
    category: categoryLabel(row.category, short ? 'Short-form' : 'Long-form'),
    duration: formatDuration(row.durationS),
    isSample: row.isSample,
  };
}

/**
 * The films and vertical edits for one format, newest first. `format` omitted returns both,
 * with long-form first so a mixed list still reads as a portfolio.
 */
export async function mediaVideoItems(input: { format?: MediaFormat; limit?: number } = {}): Promise<MediaItem[]> {
  const rows = await mediaVideoRows();
  const wanted = rows.filter((row) => {
    if (!input.format || input.format === 'photo') return true;
    return input.format === 'short' ? isShortForm(row.form, row.source) : !isShortForm(row.form, row.source);
  });
  const ordered = [...wanted].sort((a, b) => {
    if (input.format === 'short' || input.format === 'long') return 0;
    const rank = (row: MediaVideoRow) => (isShortForm(row.form, row.source) ? 1 : 0);
    return rank(a) - rank(b);
  });
  const limited = input.limit ? ordered.slice(0, input.limit) : ordered;
  if (!limited.length) return [];
  const posters = await assetsByIds(limited.map((row) => row.posterAssetId));
  return limited.map((row) => toMediaItem(row, row.posterAssetId ? (posters[row.posterAssetId]?.url ?? null) : null));
}

/**
 * The pieces the hero card rolls through: published short-form work the owner has explicitly
 * toggled into the hero (`hero_preview`), in their own order. Empty when nothing is toggled —
 * the page then falls back to its published default set.
 */
export async function mediaHeroItems(limit = 6): Promise<MediaItem[]> {
  const rows = (await mediaVideoRows()).filter((row) => row.heroPreview && isShortForm(row.form, row.source));
  const limited = rows.slice(0, Math.max(1, limit));
  if (!limited.length) return [];
  const posters = await assetsByIds(limited.map((row) => row.posterAssetId));
  return limited.map((row) => toMediaItem(row, row.posterAssetId ? (posters[row.posterAssetId]?.url ?? null) : null));
}

/* ── photography ─────────────────────────────────────────────────────────── */

/**
 * The photography wall, read from the published `gallery` rows the Photos module owns
 * (division=media, kind=photo). Each gallery item contributes one frame, carrying the asset's
 * own intrinsic size so mixed portrait and landscape sit together uncropped.
 */
export async function mediaPhotoItems(input: { limit?: number } = {}): Promise<MediaItem[]> {
  const db = await getDb();
  const rows = await db.select<Record<string, unknown>>(
    `SELECT * FROM gallery
      WHERE division = 'media' AND kind = 'photo' AND status = 'published'
      ORDER BY is_featured DESC NULLS LAST, sort_order ASC LIMIT 24`,
    [],
  );
  if (!rows.length) return [];
  const items = rows.flatMap((row) =>
    (Array.isArray(row.items) ? (row.items as Record<string, unknown>[]) : []).map((item) => ({
      gallery: row,
      assetId: (item.asset_id as string) ?? (item.assetId as string) ?? '',
      caption: (item.caption as string) ?? null,
      alt: (item.alt as string) ?? null,
    })),
  );
  const filtered = items.filter((item) => item.assetId);
  if (!filtered.length) return [];
  const assets = await assetsByIds(filtered.map((item) => item.assetId));
  const out: MediaItem[] = [];
  filtered.forEach((item, index) => {
    const asset = assets[item.assetId];
    if (!asset?.url) return; // a gallery row pointing at a missing asset renders nothing, never a broken frame
    const gallery = item.gallery;
    out.push({
      id: `${String(gallery.id)}-${index}`,
      slug: `${String(gallery.slug ?? gallery.id)}-${index + 1}`,
      title: asset.alt ?? asset.caption ?? item.caption ?? String(gallery.title ?? 'Photograph'),
      description: String(gallery.description ?? ''),
      format: 'photo',
      kindLabel: 'Event photography',
      role: 'Photography',
      tags: [],
      year: yearFor(gallery),
      featured: gallery.is_featured === true,
      videoUrl: null,
      thumbnail: null,
      image: asset.url,
      caption: item.caption ?? asset.caption ?? asset.alt ?? null,
      width: asset.width ?? null,
      height: asset.height ?? null,
      category: 'Event photography',
      duration: null,
      isSample: gallery.is_sample === true,
    });
  });
  return input.limit ? out.slice(0, input.limit) : out;
}

/** Photo galleries for the CMS hub: title, frame count and publish state. */
export async function mediaPhotoGalleries(): Promise<
  { id: string; title: string; slug: string; status: string; frames: number; isFeatured: boolean }[]
> {
  const db = await getDb();
  const rows = await db.select<Record<string, unknown>>(
    `SELECT id, title, slug, status, items, is_featured FROM gallery
      WHERE division = 'media' AND kind = 'photo' ORDER BY sort_order ASC`,
    [],
  );
  return rows.map((row) => ({
    id: String(row.id),
    title: String(row.title ?? 'Untitled'),
    slug: String(row.slug ?? ''),
    status: String(row.status ?? 'draft'),
    frames: Array.isArray(row.items) ? (row.items as unknown[]).length : 0,
    isFeatured: row.is_featured === true,
  }));
}

/* ── options for the CMS selects ─────────────────────────────────────────── */

/** `id` + label pairs for the admin panels (hero board, story board). */
export async function mediaVideoOptions(input: { format?: MediaFormat } = {}): Promise<
  { value: string; label: string; format: 'long' | 'short' }[]
> {
  const rows = await mediaVideoRows();
  return rows
    .filter((row) => {
      if (!input.format || input.format === 'photo') return true;
      return isShortForm(row.form, row.source) === (input.format === 'short');
    })
    .map((row) => ({
      value: row.id,
      label: row.title,
      format: isShortForm(row.form, row.source) ? ('short' as const) : ('long' as const),
    }));
}

/* ── client stories ──────────────────────────────────────────────────────── */

/**
 * Client stories built from the videos: published pieces that carry a client name, a quote or a
 * detectable context. Quote-less pieces still contribute their attribution when a client name
 * was supplied — the rail shows the story, never an empty quotation.
 */
export { deriveStory };

export async function mediaVideoStories(): Promise<MediaTestimonial[]> {
  const rows = await mediaVideoRows();
  return rows.flatMap((row) => {
    const story = deriveStory({
      title: row.title,
      description: row.description,
      client: row.client,
      storyClient: row.storyClient,
      storyKind: row.storyKind,
    });
    const quote = (row.storyQuote ?? '').trim();
    if (!quote) return []; // no words, no story: an empty quote is never rendered
    return [
      {
        id: `story_${row.id}`,
        quote,
        author: story.author || 'Client',
        context: story.context,
        isSample: row.isSample,
      } satisfies MediaTestimonial,
    ];
  });
}

/* ── the page's content, CMS first ───────────────────────────────────────────
 *
 * The media surface renders exactly one of two things per rail: the rows the owner has
 * published in the CMS, or — only while that rail is empty — the studio's written set, which
 * carries the `is_sample` flags that put a Placeholder badge on every card. The two are never
 * mixed, so a real piece can never sit beside simulated copy pretending to be the same thing.
 */

export interface MediaRails {
  hero: MediaItem[];
  long: MediaItem[];
  short: MediaItem[];
  photos: MediaItem[];
  /** Rail name → where its rows came from, for the CMS and for debugging a quiet page. */
  source: { hero: 'cms' | 'sample'; long: 'cms' | 'sample'; short: 'cms' | 'sample'; photos: 'cms' | 'sample' };
}

/**
 * The hero rail when the owner has not toggled anything on: the studio's own published order for
 * the card, which is the short-form library re-ordered rather than the rail's order.
 */
function sampleHero(): MediaItem[] {
  const order = [3, 0, 2, 1, 4];
  const picks = order.map((index) => SHORT_FORM_ITEMS[index]).filter((item): item is MediaItem => Boolean(item));
  return picks.length ? picks : SHORT_FORM_ITEMS.slice(0, 5);
}

export async function mediaRails(): Promise<MediaRails> {
  const [hero, long, short, photos] = await Promise.all([
    mediaHeroItems(6).catch(() => []),
    mediaVideoItems({ format: 'long' }).catch(() => []),
    mediaVideoItems({ format: 'short' }).catch(() => []),
    mediaPhotoItems().catch(() => []),
  ]);
  return {
    hero: hero.length ? hero : sampleHero(),
    long: long.length ? long : LONG_FORM_ITEMS,
    short: short.length ? short : SHORT_FORM_ITEMS,
    photos: photos.length ? photos : PHOTO_ITEMS,
    source: {
      hero: hero.length ? 'cms' : 'sample',
      long: long.length ? 'cms' : 'sample',
      short: short.length ? 'cms' : 'sample',
      photos: photos.length ? 'cms' : 'sample',
    },
  };
}

/** `media.capabilities` — one capability per line, falling back to the written eight. */
export function capabilityList(value: unknown): string[] {
  const lines = String(value ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length ? lines : MEDIA_CAPABILITIES;
}

/** `founder.bio_paragraphs` — one paragraph per line, falling back to the written biography. */
export function biographyParagraphs(value: unknown, fallback: string[]): string[] {
  const lines = String(value ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length ? lines : fallback;
}
