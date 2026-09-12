/**
 * Platform-aware embed building for the Media Portfolio.
 *
 * Media items are hosted on social platforms (YouTube, TikTok, Facebook, …) rather than
 * uploaded here, so a media record stores a *URL* and this module turns that URL into
 * (a) a preview poster and (b) the embed the platform actually permits.
 *
 * The capability flags are the honest part: only some platforms let us start a player
 * muted without a gesture. Where they do not, the tile stays a poster and the player
 * waits for an explicit click — that is the reliable path, and it avoids pretending a
 * platform supports something it does not.
 *
 * Adding a platform later = add a branch in `platformFrom()` + one row in `CAPABILITIES`.
 * Nothing else in the portfolio needs to change.
 */
import { detectVideoSource, type VideoSource } from './video';

export type PlayerMode = 'muted' | 'sound';

export interface PlatformCapability {
  /** Can the platform start playback muted with no user gesture? */
  mutedAutoplay: boolean;
  /** Can the platform's player be muted/unmuted after it has started? */
  controllableMute: boolean;
  /** Is a still poster derivable from the URL alone? */
  posterDerivable: boolean;
  /** Is an embeddable player available at all? */
  embeddable: boolean;
  /** Natural aspect of the platform's dominant content. */
  aspect: 'wide' | 'vertical';
  label: string;
}

const CAPABILITIES: Record<VideoSource, PlatformCapability> = {
  youtube: { mutedAutoplay: true, controllableMute: true, posterDerivable: true, embeddable: true, aspect: 'wide', label: 'YouTube' },
  vimeo: { mutedAutoplay: true, controllableMute: true, posterDerivable: false, embeddable: true, aspect: 'wide', label: 'Vimeo' },
  tiktok: { mutedAutoplay: false, controllableMute: false, posterDerivable: false, embeddable: true, aspect: 'vertical', label: 'TikTok' },
  facebook: { mutedAutoplay: false, controllableMute: false, posterDerivable: false, embeddable: true, aspect: 'wide', label: 'Facebook' },
  instagram: { mutedAutoplay: false, controllableMute: false, posterDerivable: false, embeddable: true, aspect: 'vertical', label: 'Instagram' },
  upload: { mutedAutoplay: true, controllableMute: true, posterDerivable: false, embeddable: true, aspect: 'wide', label: 'Uploaded file' },
  external: { mutedAutoplay: false, controllableMute: false, posterDerivable: false, embeddable: false, aspect: 'wide', label: 'External link' },
};

export interface PlayableSource {
  source: VideoSource;
  sourceId: string | null;
  /** Canonical watch URL on the host platform — used for "open original" links. */
  canonicalUrl: string | null;
  /** Base embed URL with no playback params; `buildEmbed` adds them. */
  embedUrl: string | null;
  /** Best available still, in preference order (may be empty). */
  thumbnails: string[];
  capability: PlatformCapability;
  notes?: string;
}

/** Resolve a social URL into everything the portfolio needs to present it. */
export function resolvePlayable(url: string, givenThumbnail?: string | null): PlayableSource {
  const detected = detectVideoSource(url);
  const capability = CAPABILITIES[detected.source] ?? CAPABILITIES.external;
  const thumbnails = [givenThumbnail, ...detected.thumbnailCandidates].filter(
    (value): value is string => typeof value === 'string' && value.length > 0,
  );
  return {
    source: detected.source,
    sourceId: detected.sourceId,
    canonicalUrl: detected.canonicalUrl,
    embedUrl: detected.embedUrl,
    thumbnails,
    capability,
    notes: detected.notes,
  };
}

/**
 * Build the embed URL for a specific playback intent.
 *
 * `muted` is only honoured where the platform allows it; elsewhere the flag is dropped
 * rather than faked, and the caller shows a poster + explicit click instead.
 */
export function buildEmbed(
  playable: Pick<PlayableSource, 'source' | 'sourceId' | 'embedUrl' | 'capability'>,
  mode: PlayerMode,
  options: { loop?: boolean; controls?: boolean } = {},
): string | null {
  const { source, sourceId, embedUrl, capability } = playable;
  if (!embedUrl || !capability.embeddable) return null;
  const loop = options.loop ?? false;
  const controls = options.controls ?? true;
  const muted = mode === 'muted' && capability.controllableMute;

  // The base URLs come from lib/media/video.ts; we append playback params per platform
  // because each one spells "autoplay / mute / loop" differently.
  const join = (base: string, params: Record<string, string | number | undefined>) => {
    const url = new URL(base);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
    return url.toString();
  };

  switch (source) {
    case 'youtube':
      return join(embedUrl, {
        autoplay: 1,
        mute: muted ? 1 : 0,
        loop: loop ? 1 : undefined,
        // YouTube only honours `loop` when the video is also listed in `playlist`.
        playlist: loop && sourceId ? sourceId : undefined,
        controls: controls ? 1 : 0,
        playsinline: 1,
        // Subtitles start off for every visitor; the player's own menu still lets them turn
        // them on whenever they like.
        cc_load_policy: 0,
        // Lets the hero card's own control talk to a player that is already running instead of
        // rebuilding the frame to change its sound.
        enablejsapi: 1,
        rel: 0,
        modestbranding: 1,
      });
    case 'vimeo':
      return join(embedUrl, {
        autoplay: 1,
        muted: muted ? 1 : 0,
        loop: loop ? 1 : undefined,
        controls: controls ? 1 : 0,
        background: !controls && muted ? 1 : undefined,
        dnt: 1,
      });
    case 'facebook':
      // Facebook's player accepts an autoplay flag (the base URL ships `autoplay=false`,
      // which `set` overrides). It exposes no mute parameter, so sound behaviour is the
      // platform's own decision — which is exactly why it only ever mounts after a click.
      return join(embedUrl, { autoplay: 1 });
    case 'tiktok':
    case 'instagram':
    default:
      // These players expose no playback parameters we can rely on, so we return the plain
      // embed: it only ever mounts after a deliberate click.
      return embedUrl;
  }
}

/**
 * Poster candidates for a playable source, best first and de-duplicated.
 *
 * YouTube's oEmbed is not used here (it costs a request per card) because the still URLs
 * are derivable from the video id. `maxresdefault` is not available for every upload, so the
 * card renders down the chain until one loads and only then falls back to placeholder art.
 */
export function posterCandidates(playable: Pick<PlayableSource, 'source' | 'sourceId' | 'thumbnails'>, given?: string | null): string[] {
  const derived: string[] = [];
  if (playable.source === 'youtube' && playable.sourceId) {
    derived.push(
      `https://i.ytimg.com/vi/${playable.sourceId}/maxresdefault.jpg`,
      `https://i.ytimg.com/vi/${playable.sourceId}/hqdefault.jpg`,
      `https://i.ytimg.com/vi/${playable.sourceId}/mqdefault.jpg`,
    );
  }
  return Array.from(new Set([given, ...playable.thumbnails, ...derived].filter((value): value is string => typeof value === 'string' && value.length > 0)));
}

/** Days/weeks of work are not the point, a human-readable platform name is. */
export function platformLabel(source: VideoSource): string {
  return (CAPABILITIES[source] ?? CAPABILITIES.external).label;
}
