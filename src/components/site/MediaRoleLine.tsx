'use client';

/**
 * The Media Portfolio's animated role line.
 *
 * A vertical ticker with a static article: the word **videographer** slides up out of the
 * line and **video editor** rises into its place, again and again, so the motion reads as film
 * rolling through a gate rather than text being typed. The "A" never moves, which keeps the
 * line grammatical at every step without the article travelling with the word.
 *
 * **It never scrolls backwards.** The obvious implementation — wrap the index and animate
 * everything by its offset — makes the last transition travel *down*, because the first word
 * has to come back from above. This one keeps a monotonically increasing position over three
 * copies of the list and, once the middle copy is behind the reader, rebases the track by one
 * copy with the transition switched off. The rebase happens well outside the visible line, so
 * the movement is always upward and the reset is invisible.
 *
 * Every word is stacked in one grid cell and the tallest one reserves the height, so the
 * surrounding layout never reflows. When motion is not welcome the line simply becomes a
 * readable list of roles.
 */
import { useEffect, useRef, useState } from 'react';
import { cx } from '@/lib/utils/text';

interface Props {
  phrases: string[];
  className?: string;
  /** The word that stays still, in the same weight and colour as the rolling word. */
  prefix?: string;
  /** ms a role stays fully visible */
  holdMs?: number;
  /** ms the upward travel takes */
  travelMs?: number;
}

const COPIES = 3;

export function MediaRoleLine({ phrases, className, prefix, holdMs = 2400, travelMs = 760 }: Props) {
  const count = phrases.length;
  const [position, setPosition] = useState(count);
  const [instant, setInstant] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const regionRef = useRef<HTMLSpanElement | null>(null);
  const [onScreen, setOnScreen] = useState(true);

  // Motion is opt-out, and reading the preference in an effect keeps the server render plain.
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!query) return;
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener?.('change', sync);
    return () => query.removeEventListener?.('change', sync);
  }, []);

  // Rolling stops while the line is off screen, so nothing animates where nobody is looking.
  useEffect(() => {
    const element = regionRef.current;
    if (!element) return;
    const observer = new IntersectionObserver((entries) => setOnScreen(Boolean(entries[0]?.isIntersecting)), { rootMargin: '80px 0px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const animate = !reduced && count > 1;

  useEffect(() => {
    if (!animate || paused || !onScreen) return;
    const timer = window.setTimeout(() => setPosition((current) => current + 1), holdMs + travelMs);
    return () => window.clearTimeout(timer);
  }, [position, animate, paused, onScreen, holdMs, travelMs]);

  // Silent rebase, one full copy back once the middle copy has been passed. Only ever subtracts
  // a copy, and only after the transition that carried the line has finished, so the reader
  // never sees the track move down — there is nothing to see, it happens outside the line.
  useEffect(() => {
    if (!animate || instant) return;
    if (position < count * 2) return;
    const timer = window.setTimeout(() => {
      setInstant(true);
      setPosition((current) => current - count);
    }, travelMs);
    return () => window.clearTimeout(timer);
  }, [position, animate, instant, count, travelMs]);

  useEffect(() => {
    if (!instant) return;
    const frame = requestAnimationFrame(() => setInstant(false));
    return () => cancelAnimationFrame(frame);
  }, [instant]);

  if (!animate) {
    return (
      <span className={className}>
        {prefix ? `${prefix} ` : ''}
        {phrases.join(' · ')}
      </span>
    );
  }

  const longest = phrases.reduce((widest, phrase) => (phrase.length > widest.length ? phrase : widest), '');

  return (
    <span
      ref={regionRef}
      className={cx('inline-flex items-baseline gap-[0.32em]', className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {prefix ? <span aria-hidden>{prefix}</span> : null}
      {/* One readable sentence for assistive technology; the rolling words are decoration. */}
      <span className="sr-only">
        {prefix ? `${prefix} ` : ''}
        {phrases.join(', ')}
      </span>
      <span className="relative grid overflow-hidden align-baseline" aria-hidden>
        {/* Reserve the tallest word so the line never changes height mid-cycle. */}
        <span className="invisible col-start-1 row-start-1 whitespace-nowrap">{longest}</span>
        {Array.from({ length: COPIES }).flatMap((_, copy) =>
          phrases.map((phrase, index) => {
            const offset = copy * count + index - position;
            const nearest = Math.abs(offset) <= 1;
            return (
              <span
                key={`${copy}-${phrase}`}
                className="col-start-1 row-start-1 whitespace-nowrap will-change-transform"
                style={{
                  transform: `translateY(${offset * 100}%)`,
                  opacity: offset === 0 ? 1 : nearest ? 0.35 : 0,
                  transition: instant ? 'none' : `transform ${travelMs}ms cubic-bezier(.16,1,.3,1), opacity ${travelMs}ms cubic-bezier(.16,1,.3,1)`,
                }}
              >
                {phrase}
              </span>
            );
          }),
        )}
      </span>
    </span>
  );
}
