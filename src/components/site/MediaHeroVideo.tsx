'use client';

/**
 * The hero's short-form showcase: one vertical piece at a time, in a framed phone-style card.
 *
 * **What it does, and why.** Each piece plays for eight seconds, then the reel rolls on by itself:
 * the piece that was on screen slides out to the left and the next piece — which has been waiting
 * just off the right-hand edge, already loaded and already playing — slides straight into the
 * frame. Nothing has to load at the moment of the switch, so there is no pause, no spinner and no
 * second of black between two pieces.
 *
 * **How the roll is built.** One strip of slides sits under the card. The card's frame is painted
 * with an opaque ring and the strip is masked to the window plus a narrow strip *outside* the
 * card on both sides, so the incoming piece shows as a slim column of moving video past the right
 * edge and the outgoing piece keeps its place as the same slim column on the left — the previous
 * frame of the reel stays visible until it rolls back in. Because the same masked strip carries
 * the outgoing piece out through the frame's left edge, the movement reads as one continuous
 * film rather than as two elements swapping places.
 *
 * **Nothing else sits behind the card.** The dimmed poster plates that used to flank the frame are
 * gone; the only thing around the card is the surface's own brass light.
 *
 * **Weight.** Three players are mounted at a time — the piece on screen and the two waiting beside
 * it, previous and next — and all three are torn down while the card is off screen. Every other
 * slide is a still.
 *
 * **Sound.** The reel is muted, always: it is an ambient preview nobody asked for. Selecting a
 * piece opens it in the details card, where sound belongs, and that is a deliberate click.
 *
 * **Motion.** `prefers-reduced-motion` stops the automatic advance, the roll and the players,
 * leaving a still card whose controls and dots still work.
 *
 * **Laying the film out.** `--cm-ring` is the frame's border plus padding (3px + 8px), `--cm-gap`
 * the space between two slides and `--cm-peek` how much of the waiting pieces shows outside the
 * card. Everything below is expressed in those three numbers, so the card can be resized from one
 * place.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { buildEmbed, posterCandidates, resolvePlayable } from '@/lib/media/embed';
import { MediaDetailsCard, useDetailsCard } from './MediaCards';
import type { MediaItem } from '@/lib/media/sample-portfolio';
import { cx } from '@/lib/utils/text';

/** How long a piece plays before the reel rolls on. The brief asks for eight seconds. */
const ADVANCE_MS = 8000;
/** After a manual step the card stays put long enough for the chosen piece to be watched. */
const HOLD_AFTER_STEP_MS = 14000;

const RING = '0.6875rem';
const GAP = '0.5rem';
const PEEK = '2.5rem';

/**
 * What the strip is allowed to show: a slim column of the previous piece outside the card's left
 * edge (fading in at the strip's own start), nothing under the frame's ring on either side (the
 * film runs *under* the card there), the window itself, and the same slim column of the next
 * piece outside the right edge, fading out so the strip reads as continuing rather than ending.
 */
const RAIL_MASK =
  'linear-gradient(to right,' +
  ' transparent 0, #000 calc(0.85rem + 0.5px), #000 var(--cm-peek),' +
  ' transparent calc(var(--cm-peek) + 0.5px), transparent calc(var(--cm-peek) + var(--cm-ring)),' +
  ' #000 calc(var(--cm-peek) + var(--cm-ring) + 0.5px), #000 calc(100% - var(--cm-peek) - var(--cm-ring)),' +
  ' transparent calc(100% - var(--cm-peek) - var(--cm-ring) + 0.5px), transparent calc(100% - var(--cm-peek)),' +
  ' #000 calc(100% - var(--cm-peek) + 0.5px), #000 calc(100% - 0.85rem), transparent 100%)';

function posterFor(item: MediaItem): string | null {
  const playable = item.videoUrl ? resolvePlayable(item.videoUrl, item.thumbnail) : null;
  if (!playable) return item.image;
  return posterCandidates(playable, item.thumbnail ?? item.image)[0] ?? null;
}

export function MediaHeroVideo({ items }: { items: MediaItem[] }) {
  const { item: openItem, open, close } = useDetailsCard();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);
  const [paused, setPaused] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const [reduced, setReduced] = useState(false);

  const count = items.length;
  const active = items[index] ?? null;

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!query) return;
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener?.('change', sync);
    return () => query.removeEventListener?.('change', sync);
  }, []);

  // The card only runs while it can be seen.
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new IntersectionObserver((entries) => setOnScreen(Boolean(entries[0]?.isIntersecting)), { rootMargin: '160px 0px', threshold: 0.2 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Every slide lives in a fixed slot relative to the piece on screen: the previous piece parks
  // one slide to the LEFT (its right edge flush with the card's, so it stays visible past the
  // frame), the next parks one slide to the RIGHT, and both mount live players so stepping either
  // direction is instant. Everything else sleeps off-screen until it is called.
  type Slot = 'current' | 'next' | 'prev' | 'rest';
  const twoUp = count > 2;
  const slotFor = (position: number): Slot => {
    const distance = (position - index + count) % count;
    if (distance === 0) return 'current';
    if (twoUp && distance === count - 1) return 'prev';
    if (distance === 1) return 'next';
    return 'rest';
  };
  const SLOT_TRANSFORM: Record<Slot, string> = {
    current: 'translate3d(0,0,0)',
    next: 'translate3d(calc(100% + var(--cm-gap)),0,0)',
    prev: 'translate3d(calc(-100% - var(--cm-gap)),0,0)',
    rest: 'translate3d(calc(100% + var(--cm-gap)),0,0)',
  };
  const SLOT_LAYER: Record<Slot, string> = {
    current: 'z-30',
    next: 'z-10',
    prev: 'z-20',
    rest: 'z-10',
  };

  const step = useCallback(
    (direction: -1 | 1) => {
      if (count < 2) return;
      setIndex((current) => (current + direction + count) % count);
      setHeld(true);
      window.setTimeout(() => setHeld(false), HOLD_AFTER_STEP_MS);
    },
    [count],
  );

  // Auto-advance: only on screen, only while nothing else is holding it, and never under
  // reduced motion.
  useEffect(() => {
    if (reduced || paused || held || !onScreen || count < 2) return;
    const timer = window.setTimeout(() => setIndex((current) => (current + 1) % count), ADVANCE_MS);
    return () => window.clearTimeout(timer);
  }, [index, reduced, paused, held, onScreen, count]);

  // Keyboard support for the two controls when focus is inside the card.
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      step(1);
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      step(-1);
    }
  };

  if (!active) return null;

  return (
    <div
      ref={containerRef}
      className="relative mx-auto w-full max-w-[21.5rem] sm:max-w-[22.5rem] lg:max-w-[22rem]"
      style={{ '--cm-ring': RING, '--cm-gap': GAP, '--cm-peek': PEEK } as React.CSSProperties}
      role="group"
      aria-label="Short-form showcase"
      aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onKeyDown={onKeyDown}
    >
      {/* Ambient light behind the card, in the surface's own brass. */}
      <div aria-hidden className="pointer-events-none absolute -inset-10 -z-10 rounded-[3rem] bg-[radial-gradient(70%_60%_at_65%_25%,rgba(228,190,107,.16),transparent_70%)] blur-[2px]" />

      {/* The card, and the reel running under it. */}
      <div className="relative mx-auto w-[calc(100%-var(--cm-peek))]">
        {/* The card as a physical object: a plate with a brass rim, and the shadow it casts. */}
        <div
          aria-hidden
          className="absolute inset-0 rounded-[2rem] border-[3px] border-[var(--accent)]/75 bg-[color:var(--color-ink-950)] shadow-[0_50px_120px_-50px_rgba(0,0,0,1)]"
        />

        {/* The reel: every slide in one strip, masked to the window and the peeks on both sides. */}
        <div
          className="absolute inset-y-0 left-[calc(-1*var(--cm-peek))] w-[calc(100%+2*var(--cm-peek))] overflow-hidden"
          style={{ maskImage: RAIL_MASK, WebkitMaskImage: RAIL_MASK }}
        >
          {items.map((item, position) => {
            const itemPlayable = item.videoUrl ? resolvePlayable(item.videoUrl, item.thumbnail) : null;
            const state = slotFor(position);
            // Only the piece on screen and the two waiting beside it — previous and next — ever
            // mount a player, and all three are already playing when an arrow is pressed, which
            // is what removes the pause.
            const runs = onScreen && !reduced && (state === 'current' || state === 'next' || state === 'prev');
            const showVideo = runs && Boolean(itemPlayable?.capability.mutedAutoplay && itemPlayable.embedUrl);
            const still = posterFor(item);
            return (
              <div
                key={item.id}
                aria-hidden={state !== 'current'}
                className={cx(
                  'absolute top-[var(--cm-ring)] bottom-[var(--cm-ring)] left-[calc(var(--cm-peek)+var(--cm-ring))] w-[calc(100%-2*var(--cm-peek)-2*var(--cm-ring))] overflow-hidden rounded-[1.6rem] bg-black will-change-transform',
                  SLOT_LAYER[state],
                  state === 'rest' && 'opacity-0',
                  reduced ? 'transition-none' : 'transition-transform duration-[780ms] ease-[cubic-bezier(.22,.68,.24,1)]',
                )}
                style={{ transform: SLOT_TRANSFORM[state] }}
              >
                {still ? (
                  <img src={still} alt="" className="absolute inset-0 size-full object-cover" loading={state === 'current' ? 'eager' : 'lazy'} decoding="async" />
                ) : (
                  <div aria-hidden className="absolute inset-0 bg-[radial-gradient(120%_100%_at_20%_0%,rgba(228,190,107,.16),transparent_60%),linear-gradient(160deg,rgba(243,241,236,.06),transparent_65%)]" />
                )}
                {showVideo && itemPlayable ? (
                  <iframe
                    src={buildEmbed(itemPlayable, 'muted', { loop: true, controls: false }) ?? undefined}
                    title={`${item.title}, preview`}
                    aria-hidden
                    tabIndex={-1}
                    allow="autoplay; encrypted-media; picture-in-picture"
                    referrerPolicy="strict-origin-when-cross-origin"
                    className="pointer-events-none absolute inset-0 size-full border-0"
                  />
                ) : null}
                <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[rgba(5,5,7,.55)] via-transparent to-[rgba(5,5,7,.12)]" />
              </div>
            );
          })}
        </div>

        {/* The window itself: the scrim the frame always had, and the two round controls, which
            now sit just inside the rim so nothing covers the incoming preview. */}
        <div className="absolute inset-[var(--cm-ring)] z-40">
          <div className="relative size-full overflow-hidden rounded-[1.6rem]">
            <button
              type="button"
              onClick={() => open(active)}
              aria-label={`Watch ${active.title} in full`}
              data-analytics="project_click"
              data-analytics-target={active.slug}
              className="group/hero absolute inset-0 flex items-end justify-center p-4"
            >
              <span className="inline-flex items-center gap-2 rounded-pill border border-[rgba(243,241,236,.24)] bg-[rgba(8,8,10,.62)] px-3.5 py-2 text-[0.75rem] text-white backdrop-blur-md transition duration-500 group-hover/hero:border-[var(--accent)] group-hover/hero:text-[var(--accent)] md:opacity-0 md:group-hover/hero:opacity-100 md:group-focus-visible/hero:opacity-100">
                <Icon name="play" size={13} filled />
                Watch in full
              </span>
            </button>

            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous short-form piece"
              className="absolute left-2 top-1/2 z-20 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-[rgba(243,241,236,.18)] bg-[rgba(8,8,10,.72)] text-fg backdrop-blur-md transition duration-300 hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              <Icon name="arrow-left" size={16} />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next short-form piece"
              className="absolute right-2 top-1/2 z-20 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-[rgba(243,241,236,.18)] bg-[rgba(8,8,10,.72)] text-fg backdrop-blur-md transition duration-300 hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              <Icon name="arrow-right" size={16} />
            </button>
          </div>
        </div>

        {/* The window's size: this box is the stage, and everything above is placed against it. */}
        <div aria-hidden className="mx-[var(--cm-ring)] my-[var(--cm-ring)] aspect-[9/16]" />
      </div>

      {/* What is playing, and where the card is in the set. */}
      <div className="mx-auto mt-5 w-[calc(100%-2*var(--cm-peek))] text-center">
        <p className="truncate font-display text-[0.9375rem] leading-tight tracking-[-0.015em] text-fg">{active.title}</p>
        <p className="mt-1 font-mono text-[0.5625rem] uppercase tracking-[0.16em] text-fg-dim">
          {[active.kindLabel, active.duration].filter(Boolean).join(' · ')}
        </p>
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {items.map((item, position) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setIndex(position);
                setHeld(true);
                window.setTimeout(() => setHeld(false), HOLD_AFTER_STEP_MS);
              }}
              aria-label={`Show ${item.title}`}
              aria-current={position === index ? 'true' : undefined}
              className={cx('h-1 rounded-pill transition-all duration-500', position === index ? 'w-6 bg-[var(--accent)]' : 'w-2.5 bg-[rgba(243,241,236,.22)] hover:bg-[rgba(243,241,236,.4)]')}
            />
          ))}
        </div>
      </div>

      {openItem ? <MediaDetailsCard item={openItem} onClose={close} /> : null}
    </div>
  );
}
