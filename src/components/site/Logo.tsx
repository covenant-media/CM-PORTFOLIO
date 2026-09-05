import { cx } from '@/lib/utils/text';

/**
 * Covenant Media mark: one aperture (media) and one bracket (engineering) sharing
 * a single container — the brand idea in 32px. Monochrome + accent dot only.
 */
export function CovenantMark({ size = 30, className, tone = 'accent' }: { size?: number; className?: string; tone?: 'accent' | 'mono' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      className={cx('shrink-0', className)}
      focusable="false"
    >
      <rect x="0.6" y="0.6" width="30.8" height="30.8" rx="9" stroke="currentColor" strokeOpacity="0.28" />
      <circle cx="12.4" cy="16" r="5.2" stroke="currentColor" strokeOpacity="0.62" />
      <circle cx="12.4" cy="16" r="1.9" fill={tone === 'accent' ? 'var(--accent)' : 'currentColor'} />
      <path d="M20.2 10.6 24.6 16l-4.4 5.4" stroke="currentColor" strokeOpacity="0.62" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Wordmark({
  primary,
  secondary,
  className,
  size = 'md',
  showMark = true,
}: {
  primary: string;
  secondary?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showMark?: boolean;
}) {
  const sizes = {
    sm: { mark: 22, title: 'text-[0.95rem]', sub: 'text-[0.5625rem]' },
    md: { mark: 26, title: 'text-[1.125rem]', sub: 'text-[0.625rem]' },
    lg: { mark: 34, title: 'text-[1.5rem]', sub: 'text-[0.6875rem]' },
  }[size];
  return (
    <span className={cx('inline-flex items-center gap-2.5', className)}>
      {showMark ? <CovenantMark size={sizes.mark} /> : null}
      <span className="flex flex-col leading-none">
        <span className={cx('font-display tracking-[-0.02em] text-fg', sizes.title)}>{primary}</span>
        {secondary ? (
          <span className={cx('mt-1 font-mono uppercase tracking-[0.22em] text-fg-dim', sizes.sub)}>{secondary}</span>
        ) : null}
      </span>
    </span>
  );
}
