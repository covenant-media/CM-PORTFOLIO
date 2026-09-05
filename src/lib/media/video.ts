/**
 * Video source detection + metadata derivation (PRD §9 YouTube/social workflow).
 *
 * Flow: paste URL → detect source → derive what the platform publicly allows
 * (oEmbed for YouTube/Vimeo/TikTok/Facebook, which needs no API key) → build a
 * preview + embed config → everything stays editable → save draft → publish.
 *
 * Graceful fallbacks everywhere: a blocked/failed lookup never blocks saving.
 */

export type VideoSource = 'youtube' | 'tiktok' | 'facebook' | 'vimeo' | 'instagram' | 'upload' | 'external';

export interface DetectedSource {
  source: VideoSource;
  sourceId: string | null;
  canonicalUrl: string | null;
  embedUrl: string | null;
  thumbnailCandidates: string[];
  oEmbedUrl: string | null;
  playableDirectly: boolean;
  notes?: string;
}

const YOUTUBE_PATTERNS = [
  /(?:youtube\.com\/watch\?[^#]*v=)([\w-]{6,})/i,
  /(?:youtu\.be\/)([\w-]{6,})/i,
  /youtube\.com\/shorts\/([\w-]{6,})/i,
  /youtube\.com\/embed\/([\w-]{6,})/i,
  /youtube\.com\/live\/([\w-]{6,})/i,
];

function safeUrl(raw: string): URL | null {
  try {
    return new URL(raw.trim());
  } catch {
    try {
      return new URL(`https://${raw.trim().replace(/^\/+/, '')}`);
    } catch {
      return null;
    }
  }
}

export function detectVideoSource(input: string): DetectedSource {
  const raw = (input ?? '').trim();
  const url = safeUrl(raw);
  if (!url) {
    return {
      source: 'external',
      sourceId: null,
      canonicalUrl: null,
      embedUrl: null,
      thumbnailCandidates: [],
      oEmbedUrl: null,
      playableDirectly: false,
      notes: 'Could not parse that URL. You can still save the video and fill the fields manually.',
    };
  }
  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  const href = url.toString();

  if (/youtube\.com|youtu\.be/i.test(host)) {
    const match = YOUTUBE_PATTERNS.map((re) => raw.match(re)).find(Boolean);
    const id = match?.[1] ?? url.searchParams.get('v');
    return {
      source: 'youtube',
      sourceId: id,
      canonicalUrl: id ? `https://www.youtube.com/watch?v=${id}` : href,
      embedUrl: id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1` : null,
      thumbnailCandidates: id
        ? [`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`, `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, `https://i.ytimg.com/vi/${id}/mqdefault.jpg`]
        : [],
      oEmbedUrl: `https://www.youtube.com/oembed?url=${encodeURIComponent(href)}&format=json`,
      playableDirectly: true,
    };
  }

  if (host === 'vimeo.com' || host.endsWith('.vimeo.com')) {
    const id = url.pathname.match(/(\d{6,})/)?.[1] ?? url.pathname.split('/').filter(Boolean).pop() ?? null;
    return {
      source: 'vimeo',
      sourceId: id,
      canonicalUrl: href,
      embedUrl: id ? `https://player.vimeo.com/video/${id}?dnt=1&title=0&byline=0&portrait=0` : null,
      thumbnailCandidates: [],
      oEmbedUrl: `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(href)}`,
      playableDirectly: true,
    };
  }

  if (/tiktok\.com/i.test(host)) {
    const id = url.pathname.match(/video\/(\d{6,})/)?.[1] ?? url.pathname.match(/photo\/(\d{6,})/)?.[1] ?? null;
    return {
      source: 'tiktok',
      sourceId: id,
      canonicalUrl: id ? `https://www.tiktok.com/@creator/video/${id}` : href,
      embedUrl: id ? `https://www.tiktok.com/embed/v2/${id}` : null,
      thumbnailCandidates: [],
      oEmbedUrl: `https://www.tiktok.com/oembed?url=${encodeURIComponent(href)}`,
      playableDirectly: true,
      notes: id ? undefined : 'TikTok embeds need the full video URL (e.g. /@user/video/123…).',
    };
  }

  if (/facebook\.com|fb\.watch/i.test(host)) {
    const id =
      url.searchParams.get('v') ??
      url.pathname.match(/\/videos\/[^/]+\/(\d{8,})/)?.[1] ??
      url.pathname.match(/(\d{10,})/)?.[1] ??
      null;
    const isReel = /\/reels?\//i.test(url.pathname);
    return {
      source: 'facebook',
      sourceId: id,
      canonicalUrl: href,
      embedUrl: id ? `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(href)}&show_text=false&autoplay=false` : null,
      thumbnailCandidates: [],
      // Facebook's oEmbed requires an access token; we intentionally do not rely on it.
      oEmbedUrl: null,
      playableDirectly: Boolean(id),
      notes: id
        ? isReel
          ? 'Reel detected — embed renders via the Facebook plugin.'
          : 'Facebook embeds load through the plugin; no poster is derivable, so add a thumbnail for the grid.'
        : 'Use a direct video URL (facebook.com/…/videos/… or fb.watch/…).',
    };
  }

  if (/instagram\.com/i.test(host)) {
    const id = url.pathname.match(/\/(?:p|reel|tv)\/([\w-]+)/)?.[1] ?? null;
    return {
      source: 'instagram',
      sourceId: id,
      canonicalUrl: href,
      embedUrl: id ? `https://www.instagram.com/p/${id}/embed` : null,
      thumbnailCandidates: [],
      oEmbedUrl: null,
      playableDirectly: false,
      notes: 'Instagram embeds render as a post card. For a grid preview, upload a poster image.',
    };
  }

  if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(url.pathname)) {
    return {
      source: 'upload',
      sourceId: null,
      canonicalUrl: href,
      embedUrl: href,
      thumbnailCandidates: [],
      oEmbedUrl: null,
      playableDirectly: true,
      notes: 'Direct file URL — it will play inline with native controls.',
    };
  }

  return {
    source: 'external',
    sourceId: null,
    canonicalUrl: href,
    embedUrl: null,
    thumbnailCandidates: [],
    oEmbedUrl: null,
    playableDirectly: false,
    notes: 'This host has no supported embed. It will render as a link card.',
  };
}

export interface OEmbedMeta {
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
  width?: number;
  height?: number;
  html?: string;
  duration?: number;
}

/**
 * Fetch public oEmbed metadata. Always time-boxed, never trusted for markup,
 * and returns null instead of throwing so saving a video can never fail because
 * a third party is down or rate-limited.
 */
export async function fetchOEmbed(detected: DetectedSource, timeoutMs = 3500): Promise<{ meta: OEmbedMeta | null; error?: string }> {
  if (!detected.oEmbedUrl) return { meta: null, error: 'This platform does not offer keyless oEmbed metadata.' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(detected.oEmbedUrl, {
      signal: controller.signal,
      headers: { accept: 'application/json', 'user-agent': 'CovenantMedia/1.0 (+CMS metadata lookup)' },
      cache: 'no-store',
    });
    if (!res.ok) return { meta: null, error: `${res.status} from ${new URL(detected.oEmbedUrl).hostname}` };
    const data = (await res.json()) as OEmbedMeta;
    return {
      meta: {
        title: typeof data.title === 'string' ? data.title.slice(0, 200) : undefined,
        author_name: typeof data.author_name === 'string' ? data.author_name.slice(0, 120) : undefined,
        thumbnail_url: typeof data.thumbnail_url === 'string' && /^https:/.test(data.thumbnail_url) ? data.thumbnail_url : undefined,
        width: Number.isFinite(data.width) ? Number(data.width) : undefined,
        height: Number.isFinite(data.height) ? Number(data.height) : undefined,
        duration: Number.isFinite(data.duration) ? Number(data.duration) : undefined,
        // `html` is deliberately NOT stored: embeds are built from our own template.
      },
    };
  } catch (err) {
    return { meta: null, error: err instanceof Error ? err.message.slice(0, 120) : 'network error' };
  } finally {
    clearTimeout(timer);
  }
}

/** Optional YouTube Data API enrichment — only used when a key is configured. */
export async function fetchYouTubeStats(videoId: string): Promise<{ views?: number; duration?: string; title?: string } | null> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key || !videoId) return null;
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${encodeURIComponent(videoId)}&part=statistics,contentDetails,snippet&key=${encodeURIComponent(key)}`,
      { cache: 'no-store', signal: AbortSignal.timeout(4000) },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { items?: { statistics?: { viewCount?: string }; contentDetails?: { duration?: string }; snippet?: { title?: string } }[] };
    const item = data.items?.[0];
    if (!item) return null;
    return {
      views: item.statistics?.viewCount ? Number(item.statistics.viewCount) : undefined,
      duration: item.contentDetails?.duration,
      title: item.snippet?.title,
    };
  } catch {
    return null;
  }
}

/** Aspect ratio hint so vertical short-form keeps its shape in layouts. */
export function aspectForForm(form: string | null | undefined): 'vertical' | 'wide' | 'square' {
  if (form === 'short_form') return 'vertical';
  if (form === 'photo') return 'square';
  return 'wide';
}

export function isVertical(detected: DetectedSource, form?: string | null): boolean {
  if (form === 'short_form') return true;
  return detected.source === 'tiktok' || (detected.source === 'youtube' && /shorts/i.test(detected.canonicalUrl ?? ''));
}

/** ISO-8601 duration (PT1M30S) → seconds. */
export function isoDurationToSeconds(value?: string | null): number | null {
  if (!value) return null;
  const match = value.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/i);
  if (!match) return null;
  const [, h, m, s] = match;
  return Number(h ?? 0) * 3600 + Number(m ?? 0) * 60 + Math.round(Number(s ?? 0));
}
