import { cx } from '@/lib/utils/text';

/**
 * Seamless CSS marquee. Two identical groups + translateX(-50%) means the loop
 * point is exact, and prefers-reduced-motion disables it entirely (globals.css).
 */
export function Marquee({
  children,
  duration = 48,
  reverse = false,
  className,
  groupClassName,
  fade = true,
  pauseOnHover = false,
  ariaLabel,
}: {
  children: React.ReactNode;
  duration?: number;
  reverse?: boolean;
  className?: string;
  groupClassName?: string;
  fade?: boolean;
  pauseOnHover?: boolean;
  ariaLabel?: string;
}) {
  const group = (aria: boolean) => (
    <div
      aria-hidden={aria || undefined}
      className={cx('flex shrink-0 items-stretch gap-3 pr-3 md:gap-4 md:pr-4', groupClassName)}
    >
      {children}
    </div>
  );
  return (
    <div className={cx('group/marquee relative isolate w-full overflow-hidden', className)} aria-label={ariaLabel}>
      <div
        className={cx('flex w-max will-change-transform', pauseOnHover && 'group-hover/marquee:[animation-play-state:paused]')}
        style={{ animation: `cm-marquee ${duration}s linear infinite ${reverse ? 'reverse' : 'normal'}` }}
      >
        {group(false)}
        {group(true)}
      </div>
      {fade ? (
        <>
          <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-10 w-14 bg-gradient-to-r from-[var(--marquee-fade,var(--color-ink-950))] to-transparent md:w-28" />
          <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-10 w-14 bg-gradient-to-l from-[var(--marquee-fade,var(--color-ink-950))] to-transparent md:w-28" />
        </>
      ) : null}
    </div>
  );
}

/** Text band used for capability lists. */
export function MarqueeBand({
  items,
  duration = 44,
  reverse = false,
  rules = true,
  className,
}: {
  items: string[];
  duration?: number;
  reverse?: boolean;
  rules?: boolean;
  className?: string;
}) {
  if (!items.length) return null;
  return (
    <div className={cx('relative isolate overflow-hidden border-y border-[rgba(243,241,236,.08)] py-4 md:py-5', className)} style={{ '--marquee-fade': 'transparent' } as React.CSSProperties}>
      <Marquee duration={duration} reverse={reverse} fade={false}>
        {items.map((item, i) => (
          <span key={`${item}-${i}`} className={cx('flex items-center gap-4 whitespace-nowrap font-display text-lg tracking-[-0.02em] text-fg-muted md:text-2xl', rules && '')}>
            {item}
            <span aria-hidden className="inline-block size-1.5 rounded-full bg-[var(--accent)] opacity-60" />
          </span>
        ))}
      </Marquee>
    </div>
  );
}
