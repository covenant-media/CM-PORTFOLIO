/**
 * Platform metadata for social video URLs.
 *
 * **What this can and cannot do.** Every platform below publishes an oEmbed endpoint
 * that returns whatever it chooses to expose:
 *
 * | Platform | Endpoint | Provider | Title | Author | Thumbnail | Duration |
 * |---|---|---|---|---|---|---|
 * | YouTube | `youtube.com/oembed` | yes | yes | yes | yes | **no** (not in the payload) |
 * | Vimeo | `vimeo.com/api/oembed.json` | yes | yes | yes | yes | yes |
 * | TikTok | `tiktok.com/oembed` | yes | yes | yes | yes (when the post has one) | no |
 * | Facebook / Instagram | Graph oEmbed | **requires an app token** | – | – | – | – |
 *
 * So the details card shows only what a platform actually hands over. YouTube duration is
 * not invented to fill the gap: it renders from the record/CMS if the owner has supplied
 * it, and is simply absent otherwise. Facebook and Instagram return `null` here rather
 * than being scraped, and their embeds are used directly, which is the reliable path.
 *
 * **Cost.** `enrichMedia()` only makes a request for an entry that is *missing* something
 * the platform can supply (`metadataFromPlatform: true`), so a record that already carries
 * its title and poster never causes network traffic. Failures are swallowed: a page render
 * must never depend on a third party being up, and the card falls back to the record.
 *
 * Server-only module (it is called from server components).
 */
import { resolvePlayable } from './embed';

export interface PlatformMetadata {
  provider: string | null;
  title: string | null;
  authorName: string | null;
  thumbnailUrl: string | null;
  /** Only Vimeo exposes this publicly. Null everywhere else, never guessed. */
  durationSeconds: number | null;
}

const TIMEOUT_MS = 2500;
const REVALIDATE_SECONDS = 86_400;

function endpointFor(url: string): string | null {
  const playable = resolvePlayable(url);
  if (!playable.canonicalUrl) return null;
  const target = encodeURIComponent(playable.canonicalUrl);
  switch (playable.source) {
    case 'youtube':
      return `https://www.youtube.com/oembed?url=${target}&format=json`;
    case 'vimeo':
      return `https://vimeo.com/api/oembed.json?url=${target}`;
    case 'tiktok':
      return `https://www.tiktok.com/oembed?url=${target}`;
    // Facebook and Instagram only answer with a client token, which this project does not
    // hold. Returning null keeps the caller on the embedded-player path.
    default:
      return null;
  }
}

function num(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
}

function str(value: unknown): string | null {
  const text = typeof value === 'string' ? value.trim() : '';
  return text ? text : null;
}

/** Resolve one URL. Never throws, never blocks a render for longer than `TIMEOUT_MS`. */
export async function fetchPlatformMetadata(url: string): Promise<PlatformMetadata | null> {
  const endpoint = endpointFor(url);
  if (!endpoint) return null;
  try {
    const response = await fetch(endpoint, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!response.ok) return null;
    const body = (await response.json()) as Record<string, unknown>;
    return {
      provider: str(body.provider_name),
      title: str(body.title),
      authorName: str(body.author_name),
      thumbnailUrl: str(body.thumbnail_url),
      durationSeconds: num(body.duration),
    };
  } catch {
    return null;
  }
}

/** True when the entry is asking for platform metadata and is missing something it could supply. */
export function wantsMetadata(item: { metadataFromPlatform?: boolean; videoUrl: string | null }): boolean {
  return Boolean(item.metadataFromPlatform && item.videoUrl);
}

/**
 * Fill in only the fields a platform can supply and the record does not already have.
 * The record always wins: an owner-typed title is never overwritten by a platform title.
 */
export async function enrichItem<T extends { videoUrl: string | null; title: string; thumbnail: string | null; metadataFromPlatform?: boolean }>(
  item: T,
): Promise<T & { platform: PlatformMetadata | null }> {
  if (!wantsMetadata(item)) return { ...item, platform: null };
  const platform = await fetchPlatformMetadata(item.videoUrl as string);
  if (!platform) return { ...item, platform: null };
  return {
    ...item,
    platform,
    title: item.title?.trim() ? item.title : (platform.title ?? ''),
    thumbnail: item.thumbnail ?? platform.thumbnailUrl,
  };
}

/** Enrich a list, skipping entries that do not need it (so no request is made for them). */
export async function enrichMedia<T extends { videoUrl: string | null; title: string; thumbnail: string | null; metadataFromPlatform?: boolean }>(
  items: T[],
): Promise<(T & { platform: PlatformMetadata | null })[]> {
  return Promise.all(items.map((item) => enrichItem(item)));
}
