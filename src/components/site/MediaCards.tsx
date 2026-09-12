'use client';

/**
 * Cards and the details card for the Media Portfolio.
 *
 * Two pieces:
 *   • `MediaPreviewCard`  the card used by the long-form rows, the short-form rail, the
 *     photography wall and every catalog grid.
 *   • `MediaDetailsCard`  the modal opened from a card: title, meta, close button, then the
 *     player. Long-form gets a 16:9 stage, short-form a portrait one.
 *
 * Playback rules, unchanged from the rest of the surface:
 *
 *   • **Nothing ambient ever makes a sound.** The hero card and the rolling rows start muted
 *     and stay muted unless the visitor turns sound on themselves.
 *   • **Nothing ambient loads a player it cannot use.** A card mounts an embed only where the
 *     platform genuinely allows a silent start (YouTube, Vimeo, direct files); everywhere else
 *     it stays a poster, which is also what keeps a row of cards from mounting twelve iframes.
 *   • **A card the visitor opened plays.** Clicking a card opens the details card, which starts
 *     the piece unmuted — the click is the gesture that permits it — and falls back to a play
 *     button if the browser or the platform declines.
 *   • **The description is never printed.** A card and the modal show the title, the format and
 *     the running time. The written description is CMS copy that stays in the database.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { Icon } from '@/components/ui/Icon';
import { PosterFallback, plainSrc } from '@/components/ui/Media';
import { SampleTag } from '@/components/ui/Section';
import { MediaVideoPlayer } from './MediaVideoPlayer';
import { buildEmbed, platformLabel, posterCandidates, resolvePlayable } from '@/lib/media/embed';
import type { MediaItem } from '@/lib/media/sample-portfolio';
import { cx } from '@/lib/utils/text';

type Aspect = 'video' | 'portrait' | 'photo' | 'square';
type PreviewMode = 'none' | 'in-view' | 'hover';

const ASPECT: Record<Aspect, string> = {
  video: 'aspect-video',
  portrait: 'aspect-[9/16]',
  photo: 'aspect-[4/5]',
  square: 'aspect-square',
};

const RATIO: Record<Aspect, 'wide' | 'vertical' | 'square' | 'tall'> = {
  video: 'wide',
  portrait: 'vertical',
  photo: 'tall',
  square: 'square',
};

/**
 * The card's poster.
 *
 * A poster is fetched from the host platform, and the best-quality still is not always
 * available for every upload, so the component walks down a chain of candidates and stops on
 * the first one that loads. Two details matter more than they look:
 *
 *   • **A skeleton holds the frame while the file arrives.** Previously the card was simply
 *     empty until the image decoded, which read as a slow, blurry card — particularly in the
 *     long-form rows, where the largest still is the first candidate tried.
 *   • **The still fades in over the skeleton**, so the swap is a soft one rather than a pop.
 */
function Poster({ item, aspect, sizes }: { item: MediaItem; aspect: Aspect; sizes?: string }) {
  const playable = item.videoUrl ? resolvePlayable(item.videoUrl, item.thumbnail) : null;
  const chain = playable ? posterCandidates(playable, item.thumbnail ?? item.image) : [item.image].filter((value): value is string => Boolean(value));
  const key = chain.join('|');
  const [step, setStep] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => setStep(0), [key]);
  useEffect(() => setLoaded(false), [key, step]);

  // An image already in the cache can finish before React attaches its handler.
  useEffect(() => {
    const node = imgRef.current;
    if (node?.complete) setLoaded(true);
  }, [step, key]);

  const src = chain[step] ?? null;

  if (!src) {
    return <PosterFallback seed={item.id} label={null} ratio={RATIO[aspect]} tone="media" className="size-full" showLabel={false} />;
  }

  return (
    <>
      <span aria-hidden className={cx('skeleton absolute inset-0 transition-opacity duration-500', loaded ? 'opacity-0' : 'opacity-100')} />
      <Image
        ref={imgRef}
        src={src}
        alt={item.image ? (item.caption ?? item.title) : ''}
        fill
        unoptimized={plainSrc(src)}
        sizes={sizes ?? '(max-width: 640px) 78vw, (max-width: 1024px) 42vw, 30vw'}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setStep((current) => current + 1)}
        className={cx(
          'size-full object-cover transition-[opacity,transform] duration-[1200ms] ease-[cubic-bezier(.16,1,.3,1)] group-hover/card:scale-[1.04]',
          loaded ? 'opacity-100' : 'opacity-0',
        )}
      />
    </>
  );
}

/**
 * Is this environment allowed to run an automatic preview?
 *
 * Only the long-form rows preview automatically, and only on hover. That requires a real
 * pointer as well as a welcome for motion, because on a touch screen a tap fires mouseenter as
 * well as the click, and a preview starting under a tap is noise rather than intent. A phone
 * therefore never sees an ambient player at all, which is what the short-form rail requires of
 * every device.
 */
function usePreviewReady(requireFinePointer: boolean) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const fine = window.matchMedia?.('(hover: hover) and (pointer: fine)');
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!fine || !reduce) return;
    const sync = () => setReady(!reduce.matches && (requireFinePointer ? fine.matches : true));
    sync();
    fine.addEventListener?.('change', sync);
    reduce.addEventListener?.('change', sync);
    return () => {
      fine.removeEventListener?.('change', sync);
      reduce.removeEventListener?.('change', sync);
    };
  }, [requireFinePointer]);
  return ready;
}

export function MediaPreviewCard({
  item,
  aspect = 'video',
  preview = 'none',
  onOpen,
  sizes,
  className,
  showMeta = true,
  previewPaused = false,
}: {
  item: MediaItem;
  aspect?: Aspect;
  preview?: PreviewMode;
  /** Omit for a non-interactive card. */
  onOpen?: (item: MediaItem) => void;
  sizes?: string;
  className?: string;
  showMeta?: boolean;
  /** Set while a details card is open so nothing plays behind the overlay. */
  previewPaused?: boolean;
}) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [armed, setArmed] = useState(false);
  const previewReady = usePreviewReady(preview === 'hover');

  const playable = item.videoUrl ? resolvePlayable(item.videoUrl, item.thumbnail) : null;
  const canPreview = Boolean(
    playable && playable.capability.mutedAutoplay && preview !== 'none' && previewReady && !previewPaused,
  );

  // in-view previews: mount only while the card is actually on screen.
  useEffect(() => {
    if (!canPreview || preview !== 'in-view') return;
    const element = cardRef.current;
    if (!element) return;
    const observer = new IntersectionObserver((entries) => setInView(Boolean(entries[0]?.isIntersecting)), {
      threshold: 0.6,
      rootMargin: '-8% 0px -8% 0px',
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [canPreview, preview]);

  // hover previews: a short intent delay, so skimming across a row does not start anything.
  useEffect(() => {
    if (!canPreview || preview !== 'hover' || !hovered) {
      setArmed(false);
      return;
    }
    const timer = window.setTimeout(() => setArmed(true), 420);
    return () => window.clearTimeout(timer);
  }, [canPreview, preview, hovered]);

  const previewSrc =
    canPreview && ((preview === 'in-view' && inView) || (preview === 'hover' && armed)) && playable
      ? buildEmbed(playable, 'muted', { loop: true, controls: false })
      : null;

  const clickable = Boolean(onOpen);
  const shell =
    'group/card relative block w-full overflow-hidden rounded-4 border border-[rgba(243,241,236,.08)] bg-[color:var(--color-ink-900)] text-left shadow-[var(--shadow-2)] transition-[transform,border-color,box-shadow] duration-500 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-1 hover:border-[rgba(243,241,236,.18)] hover:shadow-[var(--shadow-lift)] focus-visible:-translate-y-1';

  const inner = (
    <>
      <div className={cx('relative isolate w-full overflow-hidden', ASPECT[aspect])}>
        <Poster item={item} aspect={aspect} sizes={sizes} />

        {previewSrc ? (
          <iframe
            src={previewSrc}
            title={`${item.title}, preview`}
            aria-hidden
            tabIndex={-1}
            allow="autoplay; encrypted-media; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            className="pointer-events-none absolute inset-0 size-full border-0 opacity-0 motion-safe:animate-[cm-fade-in_.6s_cubic-bezier(.16,1,.3,1)_forwards]"
          />
        ) : null}

        <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[rgba(5,5,7,.94)] via-[rgba(5,5,7,.16)] to-transparent" />

        {/* Badges: category on the left, honesty badge on the right. */}
        <span className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3 md:p-4">
          <span className="rounded-pill border border-[rgba(243,241,236,.16)] bg-[rgba(8,8,10,.55)] px-2.5 py-1 font-mono text-[0.5625rem] uppercase tracking-[0.16em] text-white/80 backdrop-blur-md">
            {item.kindLabel}
          </span>
          {item.isSample ? <SampleTag /> : null}
        </span>

        {clickable && !previewSrc ? (
          <span className="absolute left-1/2 top-1/2 grid size-12 -translate-x-1/2 -translate-y-1/2 scale-90 place-items-center rounded-full bg-[rgba(8,8,10,.5)] text-white opacity-0 ring-1 ring-[rgba(243,241,236,.3)] backdrop-blur-md transition-all duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-hover/card:scale-100 group-hover/card:opacity-100 group-focus-visible/card:scale-100 group-focus-visible/card:opacity-100">
            <Icon name="expand" size={17} />
          </span>
        ) : null}

        {showMeta ? (
          <span className="absolute inset-x-0 bottom-0 p-3 md:p-4">
            <span className="block font-display text-[1.05rem] leading-tight tracking-[-0.02em] text-white md:text-[1.2rem]">
              {item.title}
            </span>
            <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[0.5625rem] uppercase tracking-[0.16em] text-white/55">
              {item.role ? <span>{item.role}</span> : null}
              {item.duration ? <span className="text-white/40">{item.duration}</span> : null}
              {playable ? <span className="text-white/40">{platformLabel(playable.source)}</span> : null}
            </span>
          </span>
        ) : null}
      </div>
    </>
  );

  const hoverHandlers =
    preview === 'hover'
      ? { onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false), onFocus: () => setHovered(true), onBlur: () => setHovered(false) }
      : {};

  if (!clickable) {
    // A card with no destination: it may preview, but nothing is clickable.
    return (
      <div ref={cardRef} className={cx(shell, 'cursor-default hover:translate-y-0 hover:shadow-[var(--shadow-2)]', className)} {...hoverHandlers}>
        {inner}
      </div>
    );
  }

  return (
    <button
      ref={cardRef as unknown as React.RefObject<HTMLButtonElement>}
      type="button"
      onClick={() => onOpen?.(item)}
      aria-label={`Open details for ${item.title}`}
      data-analytics="project_click"
      data-analytics-target={item.slug}
      className={cx(shell, className)}
      {...hoverHandlers}
    >
      {inner}
    </button>
  );
}

/* ── details card ───────────────────────────────────────────────────────────── */

function MetaChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-pill border border-[rgba(243,241,236,.12)] px-2.5 py-1 font-mono text-[0.5625rem] uppercase tracking-[0.16em] text-fg-muted">
      {children}
    </span>
  );
}

/**
 * The modal. One component for both formats: the stage aspect and the card's width change,
 * everything else (header, close button, meta, focus and scroll handling) is shared, so
 * long-form and short-form read as the same design system at different proportions.
 *
 * **It is mounted on `document.body`, above everything.** The card is opened from inside cards
 * that animate and transform, and a fixed overlay inside a transformed ancestor is neither fixed
 * nor full-screen: that is what let parts of the page show around and behind the panel. A portal
 * removes the question entirely — the card covers the viewport from its own layer, whatever the
 * page is doing underneath.
 *
 * **Nothing about it is translucent, not even for its first frame.** The backdrop is painted
 * opaque immediately and the panel animates on transform alone, because an opacity fade on the
 * overlay is a fade of the page behind it, which is exactly the bleed-through this card is
 * supposed to stop.
 *
 * **Short-form is measured from its video, not from a frame around it.** A vertical piece is
 * exactly 9:16, bounded by the viewport in both directions, and the card is that width plus its
 * own padding: the stage, its border and the card all end where the video ends, and the whole
 * thing resizes with the window instead of leaving a shelf of empty panel either side.
 */
/**
 * The short-form stage: exactly 9:16, and never wider than the viewport leaves for it, nor taller
 * than the comfortable part of the screen. The card is sized from this, so the two can never
 * disagree.
 */
const VERTICAL_STAGE_WIDTH = 'min(calc(96vw - 3.5rem), calc(min(56svh, 34rem) * 9 / 16))';
/** The card's own horizontal padding, which the width above is built around. */
const VERTICAL_CARD_PADDING = '2rem';

export function MediaDetailsCard({ item, onClose }: { item: MediaItem; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const playable = item.videoUrl ? resolvePlayable(item.videoUrl, item.thumbnail) : null;
  const vertical = item.format === 'short';
  const isPhoto = item.format === 'photo';

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  const meta = [
    playable ? platformLabel(playable.source) : null,
    item.kindLabel,
    item.year ? String(item.year) : null,
    item.duration ?? null,
    item.role || null,
  ].filter(Boolean) as string[];

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="media-details-title"
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-hidden overscroll-none bg-[color:var(--color-ink-1000)] p-3 sm:p-6"
      onClick={(event) => {
        if (!panelRef.current?.contains(event.target as Node)) onClose();
      }}
    >
      {/* A single scoped wash over the solid backdrop: it keeps the panel from sitting on a
          flat sheet of black without reintroducing anything that could show through. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(120%_70%_at_50%_-10%,rgba(228,190,107,.07),transparent_62%)]"
      />
      <div
        ref={panelRef}
        className={cx(
          // The wide panel is bounded by three things: its own maximum, the viewport width, and
          // the viewport height — a 16:9 stage plus roughly 9rem of header, meta and padding has
          // to fit, so a short laptop screen gets a smaller card rather than a clipped one.
          'relative flex max-h-[calc(100svh-1.5rem)] flex-col overflow-hidden rounded-4 border border-[rgba(243,241,236,.12)] bg-[color:var(--color-ink-950)] shadow-[0_40px_120px_-40px_rgba(0,0,0,1)]',
          vertical
            ? 'shrink-0'
            : isPhoto
              ? 'w-full max-w-[min(94vw,460px)]'
              : 'w-full max-w-[min(96vw,1080px,calc((100svh_-_9rem)*16/9))]',
        )}
        style={{
          // A vertical card is its stage plus its padding, nothing more: the border wraps the
          // video exactly, and the pair resizes together.
          ...(vertical
            ? { width: `calc(${VERTICAL_STAGE_WIDTH} + ${VERTICAL_CARD_PADDING})`, maxWidth: '96vw' }
            : null),
          animation: 'cm-panel-in .3s cubic-bezier(.16,1,.3,1) both',
        }}
      >
        {/* Header: the title and the facts about the piece. The written description is CMS
            copy and is deliberately not printed here — see the note at the top of the file. */}
        <div className={cx('flex shrink-0 items-start justify-between gap-3 px-4 pb-3 pt-4', !vertical && 'md:px-5 md:pt-4')}>
          <div className="min-w-0">
            <h2 id="media-details-title" className="break-words font-display text-[1.0625rem] leading-tight tracking-[-0.02em] text-fg md:text-[1.2rem]">
              {item.title}
            </h2>
            <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[0.5625rem] uppercase tracking-[0.16em] text-fg-dim">
              {[item.kindLabel, item.role, item.duration].filter(Boolean).map((entry, position) => (
                <span key={String(entry)} className={position ? 'flex items-center gap-2.5' : undefined}>
                  {position ? <span aria-hidden className="size-1 rounded-full bg-[var(--accent)]/60" /> : null}
                  {entry}
                </span>
              ))}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            autoFocus
            aria-label="Close details"
            className="inline-grid size-9 shrink-0 place-items-center rounded-full border border-[rgba(243,241,236,.18)] text-fg-muted transition hover:border-[rgba(243,241,236,.34)] hover:text-fg"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Stage. Long-form and photography keep the wide stage; vertical work gets a portrait
            stage that is bounded by the frame's height, so the whole card always fits inside the
            viewport and the page behind it never scrolls. */}
        <div className={cx('min-h-0 overflow-y-auto overscroll-contain px-4 pb-4', !vertical && 'md:px-5 md:pb-5', vertical && 'flex justify-center')}>
          {playable ? (
            vertical ? (
              <div className="relative shrink-0" style={{ width: VERTICAL_STAGE_WIDTH, aspectRatio: '9 / 16' }}>
                <MediaVideoPlayer
                  playable={playable}
                  title={item.title}
                  poster={item.thumbnail}
                  aspect="vertical"
                  autoStart
                  startWithSound
                  loop={false}
                  className="size-full"
                />
              </div>
            ) : (
              <MediaVideoPlayer playable={playable} title={item.title} poster={item.thumbnail} aspect="wide" autoStart startWithSound loop={false} />
            )
          ) : (
            <div
              className={cx('relative mx-auto overflow-hidden rounded-4 border border-[rgba(243,241,236,.09)]', vertical ? 'shrink-0' : 'aspect-video w-full')}
              style={vertical ? { width: VERTICAL_STAGE_WIDTH, aspectRatio: '9 / 16' } : undefined}
            >
              <Poster item={item} aspect={vertical ? 'portrait' : 'video'} sizes="(max-width: 640px) 92vw, 60vw" />
            </div>
          )}
        </div>

        {/* Meta: only what is actually known. */}
        <div className={cx('flex shrink-0 flex-wrap items-center gap-2 border-t border-[rgba(243,241,236,.09)] px-4 py-3.5', !vertical && 'md:px-5')}>
          {meta.map((entry) => (
            <MetaChip key={entry}>{entry}</MetaChip>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Local state helper shared by the sections that open the modal. */
export function useDetailsCard() {
  const [item, setItem] = useState<MediaItem | null>(null);
  const open = useCallback((next: MediaItem) => setItem(next), []);
  const close = useCallback(() => setItem(null), []);
  return { item, open, close };
}
