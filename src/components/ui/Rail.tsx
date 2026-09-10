'use client';

/**
 * Horizontal snap rail with keyboard/pointer-accessible arrow controls.
 *
 * Used by the media surface to showcase portrait tiles (short-form edits) and
 * other wide collections without paginating the page. Native scrolling does
 * the work — touch swipe, trackpad, shift+wheel and keyboard all behave as the
 * platform intends — the buttons only fast-forward by a rail's worth of width.
 * `prefers-reduced-motion` swaps smooth scrolling for instant jumps.
 */
import { Children, useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { cx } from '@/lib/utils/text';
import { Icon } from './Icon';

export function Rail({
  children,
  label,
  className,
  itemClassName,
  edgeFade = true,
  fadeTo = 'var(--color-ink-950)',
}: {
  children: React.ReactNode;
  /** Announced to screen readers — what the rail contains. */
  label: string;
  className?: string;
  /** Applied to each direct child slot (snap alignment + width live here). */
  itemClassName?: string;
  edgeFade?: boolean;
  /** Background the edge fades blend into — matches the section tone. */
  fadeTo?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState({ prev: false, next: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setState({ prev: el.scrollLeft > 8, next: el.scrollLeft < max - 8 });
  }, []);

  useEffect(() => {
    measure();
    const el = ref.current;
    if (!el) return;
    el.addEventListener('scroll', measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    for (const child of Array.from(el.children)) observer.observe(child);
    return () => {
      el.removeEventListener('scroll', measure);
      observer.disconnect();
    };
  }, [measure]);

  const nudge = (direction: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.82, behavior: reduce ? 'auto' : 'smooth' });
  };

  return (
    <div className={cx('relative', className)}>
      <div
        ref={ref}
        role="group"
        aria-label={label}
        className={cx(
          'flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:gap-5',
          !reduce && 'scroll-smooth',
        )}
      >
        {Children.toArray(children).map((child, i) => (
          <div key={i} className={cx('snap-start shrink-0', itemClassName)}>
            {child}
          </div>
        ))}
      </div>

      {edgeFade ? (
        <>
          <div
            aria-hidden
            style={{ background: `linear-gradient(to right, ${fadeTo}, transparent)` }}
            className={cx(
              'pointer-events-none absolute inset-y-0 left-0 w-10 transition-opacity duration-300',
              state.prev ? 'opacity-100' : 'opacity-0',
            )}
          />
          <div
            aria-hidden
            style={{ background: `linear-gradient(to left, ${fadeTo}, transparent)` }}
            className={cx(
              'pointer-events-none absolute inset-y-0 right-0 w-10 transition-opacity duration-300',
              state.next ? 'opacity-100' : 'opacity-0',
            )}
          />
        </>
      ) : null}

      {state.prev ? (
        <button
          type="button"
          onClick={() => nudge(-1)}
          aria-label="Scroll left"
          className="absolute left-1 top-1/2 z-10 hidden size-10 -translate-y-1/2 place-items-center rounded-full border border-[rgba(243,241,236,.16)] bg-[rgba(10,10,13,.72)] text-fg backdrop-blur-md transition duration-300 hover:bg-[rgba(10,10,13,.95)] md:grid"
        >
          <Icon name="arrow-left" size={17} />
        </button>
      ) : null}
      {state.next ? (
        <button
          type="button"
          onClick={() => nudge(1)}
          aria-label="Scroll right"
          className="absolute right-1 top-1/2 z-10 hidden size-10 -translate-y-1/2 place-items-center rounded-full border border-[rgba(243,241,236,.16)] bg-[rgba(10,10,13,.72)] text-fg backdrop-blur-md transition duration-300 hover:bg-[rgba(10,10,13,.95)] md:grid"
        >
          <Icon name="arrow-right" size={17} />
        </button>
      ) : null}
    </div>
  );
}
