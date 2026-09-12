'use client';

/**
 * The Media Portfolio's video player.
 *
 * Design rules this component exists to enforce:
 *
 *  1. **Nothing loads until it is needed.** A grid of twelve tiles mounts zero iframes;
 *     the embed is only created once a panel is actually in view or the visitor asked
 *     for it. Page weight stays flat as the catalogue grows.
 *  2. **A click plays, and it plays with sound.** A visitor who opens a piece has already
 *     made the gesture, so the player must not ask for a second one. YouTube in particular
 *     refuses to *start* a fresh frame unmuted in most browsers, which is what used to leave a
 *     play button in the middle of the frame: the embed is now always mounted muted — the one
 *     start every browser honours — and the sound is switched on afterwards by commanding the
 *     player that is already running (`enablejsapi` is already on the embed for exactly this),
 *     so the piece is playing and audible without another tap.
 *  3. **The frame is never rebuilt to change its sound.** The source string is frozen when the
 *     player mounts; unmuting commands the live player instead of reloading it, which is why
 *     there is no reload flash and no lost position.
 *  4. **Restrictions are respected, not faked.** Where a platform exposes no mute control
 *     the first frame is simply not forced muted either; the platform's own player decides,
 *     and if it declines the visitor gets a play button rather than a broken promise.
 *  5. **One control, and only when it is useful.** A single icon button mutes or unmutes a
 *     player that can be controlled. There is no "tap for sound" banner, and no chrome at all
 *     on the ambient previews, which are muted by definition.
 *  6. **One player, one placement.** It renders the stage inside the details card; the card
 *     owns the title, the close button and the link to the original.
 *  7. **No embed, no pretence.** A URL with no supported embed (an arbitrary external host)
 *     renders as an outbound link over its poster instead of a play button that cannot play.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Icon } from '@/components/ui/Icon';
import { PosterFallback } from '@/components/ui/Media';
import { buildEmbed, platformLabel, type PlayableSource } from '@/lib/media/embed';
import { cx } from '@/lib/utils/text';
import { trackClientEvent } from '@/lib/analytics/client';

type Phase = 'idle' | 'muted' | 'sound';

/** The origins a YouTube embed may be served from, for the command channel. */
const YOUTUBE_ORIGINS = ['https://www.youtube.com', 'https://www.youtube-nocookie.com'];

/**
 * The player's own controls.
 *
 * Exactly one button, and only on a player whose mute state we can actually change. It is an
 * icon with an accessible name, not a labelled pill: the state is already obvious from the
 * audio, and the text banner it replaces covered the frame it was asking people to watch.
 */
function PlayerChrome({ playable, phase, onToggleSound }: { playable: PlayableSource; phase: Phase; onToggleSound: () => void }) {
  if (!playable.capability.controllableMute) return null;
  const on = phase === 'sound';
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-center justify-end p-3 md:p-4">
      <button
        type="button"
        onClick={onToggleSound}
        aria-pressed={on}
        aria-label={on ? 'Mute this video' : 'Unmute this video'}
        title={on ? 'Mute' : 'Unmute'}
        className="pointer-events-auto inline-grid size-9 place-items-center rounded-full border border-[rgba(243,241,236,.22)] bg-[rgba(8,8,10,.6)] text-white/85 backdrop-blur-md transition duration-300 hover:border-[var(--accent)] hover:text-[var(--accent)]"
      >
        <Icon name={on ? 'volume' : 'mute'} size={15} />
      </button>
    </div>
  );
}

/**
 * In-page player used for the details card and any panel that opens a piece.
 *
 * `autoStart` starts playback as soon as the panel is on screen. Alone it means a muted
 * ambient preview; with `startWithSound` it means the visitor asked for this piece and should
 * hear it.
 */
export function MediaVideoPlayer({
  playable,
  title,
  poster,
  aspect = 'wide',
  autoStart = false,
  startWithSound = false,
  loop = true,
  showSoundControl = true,
  className,
}: {
  playable: PlayableSource;
  title: string;
  poster?: string | null;
  aspect?: 'wide' | 'vertical';
  autoStart?: boolean;
  /** Open with sound. Only pass this from something the visitor clicked. */
  startWithSound?: boolean;
  loop?: boolean;
  showSoundControl?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>('idle');
  const [src, setSrc] = useState<string | null>(null);
  const [inView, setInView] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const controllable = Boolean(playable.capability.controllableMute);
  const embeddableLater = Boolean(playable.capability.embeddable && playable.embedUrl);
  /**
   * An ambient preview may only auto-start where a silent start genuinely works. A player the
   * visitor opened by clicking is different: the gesture already happened, so it may play with
   * sound — and on a platform with no scriptable mute it may still mount its own player and
   * decide for itself.
   */
  const autoPhase: Phase = startWithSound && controllable ? 'sound' : 'muted';
  const autoAllowed = autoStart && !reduce && (startWithSound ? embeddableLater : Boolean(playable.capability.mutedAutoplay) && controllable);

  // Observe the panel so we never mount an embed off-screen.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setInView(entry.isIntersecting);
      },
      { threshold: 0.35 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Start while visible, stop when scrolled away, so a long page never ends up with several
  // players running at once. Ambient previews come back muted; a clicked piece keeps its sound
  // because the phase is only reset by the idle branch below.
  useEffect(() => {
    if (!autoAllowed) return;
    setPhase((current) => (inView ? (current === 'idle' ? autoPhase : current) : 'idle'));
  }, [autoAllowed, inView, autoPhase]);

  /**
   * The embed's source, built once and then left alone.
   *
   * YouTube is asked for a muted start on purpose (see rule 2 at the top): the frame is created
   * the moment the visitor opens the piece and it begins playing straight away, and the sound is
   * switched on over the command channel a moment later. Every other source keeps the honest
   * phase-driven URL, because their autoplay rules differ and none of them can be commanded.
   */
  useEffect(() => {
    if (phase === 'idle' || !embeddableLater || src) return;
    const youtube = playable.source === 'youtube';
    const built = buildEmbed(playable, youtube ? 'muted' : phase, { loop, controls: true });
    if (!built) return;
    // YouTube's command channel is happier when the embed knows which page is talking to it.
    if (youtube && typeof window !== 'undefined') {
      try {
        const url = new URL(built);
        url.searchParams.set('origin', window.location.origin);
        setSrc(url.toString());
        return;
      } catch {
        /* fall through to the plain URL */
      }
    }
    setSrc(built);
  }, [phase, embeddableLater, playable, loop, src]);

  useEffect(() => {
    if (phase === 'idle') setSrc(null);
  }, [phase]);

  /**
   * Talk to a player that is already running.
   *
   * The embed carries `enablejsapi`, so a command posted to its window changes what it is doing
   * without touching the URL — no reload, no lost position, no second play button.
   */
  const command = useCallback(
    (func: string, args: unknown[] = []) => {
      const frame = frameRef.current;
      if (!frame?.contentWindow || playable.source !== 'youtube') return;
      const message = JSON.stringify({ event: 'command', func, args });
      for (const origin of YOUTUBE_ORIGINS) frame.contentWindow.postMessage(message, origin);
    },
    [playable.source],
  );

  // Sound follows the phase once the frame exists. The player takes a moment to come up, so the
  // command is repeated a few times rather than sent once into the void; unmuting twice is
  // harmless, and this is what removes the extra click on the platform's own play button.
  useEffect(() => {
    if (phase === 'idle') return;
    const apply = () => {
      if (phase === 'sound') {
        command('unMute');
        command('setVolume', [100]);
        command('playVideo');
      } else {
        command('mute');
      }
    };
    apply();
    if (phase !== 'sound') return;
    const timers = [260, 700, 1400, 2400, 4000].map((ms) => window.setTimeout(apply, ms));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [phase, command, src]);

  const start = useCallback(
    (withSound: boolean) => {
      trackClientEvent('video_play', withSound ? 'sound' : 'muted');
      // Unmuted unless the platform gives us no way to be.
      setPhase(withSound && playable.capability.controllableMute ? 'sound' : 'muted');
    },
    [playable.capability.controllableMute],
  );

  // A URL with no supported embed cannot be played here, so it is presented as a link.
  const embeddable = Boolean(playable.capability.embeddable && playable.embedUrl);
  // A direct file (self-hosted / uploaded) plays best in a native <video>: real audio control,
  // no third party, and no iframe between the visitor and the file.
  const direct = Boolean(playable.capability.embeddable && playable.embedUrl && playable.source === 'upload');
  const posterSrc = poster ?? playable.thumbnails[0] ?? null;
  const openLabel = `Open on ${platformLabel(playable.source)}`;
  const showFallback = useMemo(() => phase === 'idle' || !embeddable, [phase, embeddable]);

  return (
    <div
      ref={boxRef}
      className={cx(
        'group/player relative isolate w-full overflow-hidden rounded-4 border border-[rgba(243,241,236,.09)] bg-[color:var(--color-ink-950)]',
        aspect === 'wide' ? 'aspect-video' : 'aspect-[9/16]',
        className,
      )}
    >
      {direct && phase !== 'idle' ? (
        <video
          src={playable.embedUrl ?? undefined}
          poster={posterSrc ?? undefined}
          autoPlay
          loop={loop}
          muted={phase !== 'sound'}
          controls
          playsInline
          className="absolute inset-0 size-full object-cover"
        />
      ) : src ? (
        <iframe
          ref={frameRef}
          src={src}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          loading={autoStart ? 'eager' : 'lazy'}
          className="absolute inset-0 size-full border-0"
        />
      ) : (
        showFallback && (
          <>
            {posterSrc ? (
              <img
                src={posterSrc}
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 size-full object-cover transition duration-700 group-hover/player:scale-[1.03]"
              />
            ) : (
              <PosterFallback seed={title} label={null} ratio={aspect === 'vertical' ? 'vertical' : 'wide'} tone="media" className="absolute inset-0 size-full" showLabel={false} />
            )}
            <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[rgba(5,5,7,.85)] via-transparent to-[rgba(5,5,7,.25)]" />

            {/* Play affordance, or an honest way out when the host cannot be embedded. */}
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              {embeddable ? (
                <button
                  type="button"
                  onClick={() => start(true)}
                  className="inline-grid size-16 place-items-center rounded-full bg-[rgba(8,8,10,.55)] text-white ring-1 ring-[rgba(243,241,236,.3)] backdrop-blur-md transition duration-500 ease-[cubic-bezier(.16,1,.3,1)] hover:scale-105 hover:bg-[var(--accent)] hover:text-[var(--accent-ink)] hover:ring-transparent md:size-20"
                  aria-label={`Play ${title}`}
                >
                  <Icon name="play" size={26} filled className="translate-x-[2px]" />
                </button>
              ) : playable.canonicalUrl ? (
                <a
                  href={playable.canonicalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-analytics="outbound_click"
                  data-analytics-target={playable.canonicalUrl}
                  className="inline-flex items-center gap-2 rounded-pill border border-[rgba(243,241,236,.3)] bg-[rgba(8,8,10,.55)] px-4 py-2.5 text-[0.8125rem] text-white backdrop-blur-md transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  <Icon name="external" size={14} /> {openLabel}
                </a>
              ) : null}
            </div>
          </>
        )
      )}

      {/* Still reachable while it plays: a link back to the original post. */}
      {phase !== 'idle' && embeddable && playable.canonicalUrl ? (
        <a
          href={playable.canonicalUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-analytics="outbound_click"
          data-analytics-target={playable.canonicalUrl}
          aria-label={openLabel}
          title={openLabel}
          className="absolute right-3 top-3 z-20 inline-grid size-9 place-items-center rounded-full border border-[rgba(243,241,236,.2)] bg-[rgba(8,8,10,.55)] text-white/80 backdrop-blur-md transition duration-300 hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          <Icon name="external" size={14} />
        </a>
      ) : null}

      {phase !== 'idle' && showSoundControl ? (
        <PlayerChrome playable={playable} phase={phase} onToggleSound={() => setPhase((p) => (p === 'sound' ? 'muted' : 'sound'))} />
      ) : null}
    </div>
  );
}
