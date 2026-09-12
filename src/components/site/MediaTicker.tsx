'use client';

/**
 * Seamless media ticker for the Media Portfolio.
 *
 * Used by both long-form rows (opposite directions), the short-form rail and the client
 * stories, so every rolling strip shares one motion language instead of four hand-tuned ones.
 *
 * **How the loop stays seamless.** The items are rendered once as a measured "group", then
 * repeated exactly enough times to cover the viewport (measured with a ResizeObserver, so
 * it adapts on rotate/resize). The offset advances by `speed × elapsed` every frame and wraps
 * modulo the *measured group width*, which includes the trailing gap: the loop point is
 * therefore exact and the duplicate that arrives under the cursor is pixel-identical to the
 * one that left. No keyframes, no `translateX(-50%)` assumption about item widths, no jump.
 *
 * **Why the offset lives in a ref and the DOM is written directly.** A state update per frame
 * would re-render every card 60 times a second. The transform is written straight to the
 * track; React only re-renders when the copy count changes.
 *
 * **Pausing is deliberate, never accidental.** The loop stops when the strip scrolls out of
 * view (so an off-screen row costs nothing), when the tab is hidden, on hover where the caller
 * asks for it, while anything inside it has keyboard focus, while a `paused` prop is set (a
 * details card being open), and entirely under `prefers-reduced-motion`, which renders a single
 * static row the visitor can still scroll and tab through.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { cx } from '@/lib/utils/text';

interface Props {
  children: React.ReactNode;
  /** Pixels per second. Positive moves right to left; negative moves left to right. */
  speed?: number;
  gap?: number;
  pauseOnHover?: boolean;
  /** Allow swipe/drag. Vertical page scrolling is preserved, horizontal gestures belong to the strip. */
  draggable?: boolean;
  /** External pause, e.g. while a details card is open. */
  paused?: boolean;
  ariaLabel?: string;
  className?: string;
  groupClassName?: string;
}

const MAX_COPIES = 8;

/**
 * Wrap a running offset into `[0, width)`.
 *
 * This is the whole loop: the track is translated by `-wrapOffset(offset, groupWidth)`, so the
 * moment the offset reaches one full group the transform is back at zero with a pixel-identical
 * group in its place. Exported because it is the one piece of the ticker that must be provably
 * right, and it is cheaper to test a pure function than to eyeball a marquee.
 */
export function wrapOffset(offset: number, width: number): number {
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(offset)) return 0;
  const wrapped = ((offset % width) + width) % width;
  return Object.is(wrapped, -0) ? 0 : wrapped;
}

export function MediaTicker({
  children,
  speed = 40,
  gap = 20,
  pauseOnHover = false,
  draggable = false,
  paused = false,
  ariaLabel,
  className,
  groupClassName,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const groupRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const offset = useRef(0);
  const groupWidth = useRef(0);
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, offset: 0 });
  const resumeAt = useRef(0);

  const [copies, setCopies] = useState(2);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [moved, setMoved] = useState(false);

  // Reduced motion: one static group, no animation at all.
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!query) return;
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener?.('change', sync);
    return () => query.removeEventListener?.('change', sync);
  }, []);


  // Measure once mounted, and again whenever the strip or its items change size.
  useEffect(() => {
    const container = containerRef.current;
    const group = groupRef.current;
    if (!container || !group) return;
    const measure = () => {
      groupWidth.current = group.scrollWidth;
      const width = container.clientWidth;
      if (!groupWidth.current || !width) return;
      const needed = Math.ceil(width / groupWidth.current) + 2;
      setCopies(Math.max(2, Math.min(MAX_COPIES, needed)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(group);
    return () => observer.disconnect();
  }, [gap]);

  // Only animate what is on screen.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver((entries) => setVisible(Boolean(entries[0]?.isIntersecting)), { rootMargin: '200px 0px' });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const pausedRef = useRef(paused);
  useEffect(() => {
    pausedRef.current = paused || hovered || focused || !visible || reduced;
  }, [paused, hovered, focused, visible, reduced]);

  // The loop. Writes the transform directly; wrapping is modulo the measured group width.
  useEffect(() => {
    if (reduced) return;
    let frame = 0;
    let last = performance.now();
    const step = (now: number) => {
      frame = requestAnimationFrame(step);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const width = groupWidth.current;
      if (!width) return;
      if (!pausedRef.current && !dragging.current && now > resumeAt.current && !document.hidden) {
        offset.current += speed * dt;
      }
      // Keep the offset in [0, width) so it can never drift into float error or a gap.
      const wrapped = wrapOffset(offset.current, width);
      if (trackRef.current) trackRef.current.style.transform = `translate3d(${-wrapped}px, 0, 0)`;
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [speed, reduced]);

  // Pointer handling. `touch-action: pan-y` below leaves vertical scrolling to the browser and
  // hands horizontal gestures to the strip, so a swipe works on touch without hijacking the
  // page. A movement threshold separates a real swipe from a tap, so clicking a card never
  // counts as a drag and never stops the roll.
  const DRAG_THRESHOLD = 6;

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (reduced) return;
      dragging.current = true;
      setMoved(false);
      dragStart.current = { x: event.clientX, offset: offset.current };
    },
    [reduced],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging.current) return;
      const dx = event.clientX - dragStart.current.x;
      if (Math.abs(dx) > DRAG_THRESHOLD) {
        if (!moved) setMoved(true);
        offset.current = dragStart.current.offset - dx;
      }
    },
    [moved],
  );

  const onPointerUp = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    // Resume the automatic roll shortly after the finger leaves, so a swipe does not fight it.
    if (moved) resumeAt.current = performance.now() + 1400;
    setMoved(false);
  }, [moved]);

  return (
    <div
      ref={containerRef}
      className={cx('relative w-full', reduced ? 'overflow-x-auto' : 'overflow-hidden', className)}
      // A bare label on a plain div is not announced, so the label comes with a group role.
      role={ariaLabel ? 'group' : undefined}
      aria-label={ariaLabel}
      onMouseEnter={pauseOnHover ? () => setHovered(true) : undefined}
      onMouseLeave={pauseOnHover ? () => setHovered(false) : undefined}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={() => setFocused(false)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{ touchAction: draggable ? 'pan-y' : undefined, cursor: draggable ? 'grab' : undefined }}
    >
      {/* The track is the element the loop transforms; every group after the first is a
          pixel-identical duplicate that exists only to cover the wrap point. */}
      <div ref={trackRef} className="flex w-max will-change-transform">
        {Array.from({ length: reduced ? 1 : copies }, (_, index) => (
          <div
            key={index}
            ref={index === 0 ? groupRef : undefined}
            aria-hidden={index > 0 || undefined}
            className={cx('flex w-max shrink-0 items-stretch', groupClassName)}
            style={{ gap, paddingRight: gap }}
          >
            {children}
          </div>
        ))}
      </div>
    </div>
  );
}
