import { cx } from '@/lib/utils/text';

/**
 * Scroll reveal. CSS-first (a tiny IO script sets data-visible) so it costs no
 * React runtime on simple sections; animation respects prefers-reduced-motion
 * globally via globals.css.
 */
export function Reveal({
  children,
  delay = 0,
  as: Tag = 'div',
  className,
  y = 18,
}: {
  children: React.ReactNode;
  /** milliseconds */
  delay?: number;
  as?: 'div' | 'section' | 'li' | 'article' | 'span' | 'header' | 'footer' | 'aside';
  className?: string;
  y?: number;
}) {
  return (
    <Tag
      className={cx('reveal', className)}
      style={delay ? ({ '--reveal-delay': String(delay), '--reveal-y': `${y}px` } as React.CSSProperties) : ({ '--reveal-y': `${y}px` } as React.CSSProperties)}
    >
      {children}
    </Tag>
  );
}

export function RevealGroup({
  children,
  step = 70,
  className,
  as: Tag = 'div',
}: {
  children: React.ReactNode;
  step?: number;
  className?: string;
  as?: 'div' | 'ul';
}) {
  void step;
  return <Tag className={className}>{children}</Tag>;
}
