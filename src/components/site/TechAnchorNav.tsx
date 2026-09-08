'use client';

/**
 * Sticky anchor nav rendered only on the single-page /tech portfolio.
 * Highlights the currently-in-view section using IntersectionObserver and
 * smooth-scrolls on click. Hidden on small screens where the header already
 * collapses into a drawer.
 */
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { cx } from '@/lib/utils/text';

export interface Anchor {
  id: string;
  label: string;
}

export function TechAnchorNav({ anchors }: { anchors: Anchor[] }) {
  const [active, setActive] = useState<string>(anchors[0]?.id ?? '');

  useEffect(() => {
    const sections = anchors
      .map((a) => document.getElementById(a.id))
      .filter((el): el is HTMLElement => !!el);
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the topmost section that is mostly on screen.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          setActive(visible[0].target.id);
        }
      },
      { rootMargin: '-35% 0px -55% 0px', threshold: [0, 0.25, 0.5, 1] },
    );
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [anchors]);

  const onClick = useCallback((event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    event.preventDefault();
    const top = el.getBoundingClientRect().top + window.scrollY - 72;
    window.scrollTo({ top, behavior: 'smooth' });
    history.replaceState(null, '', `#${id}`);
  }, []);

  return (
    <nav
      aria-label="Portfolio sections"
      className="pointer-events-auto fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-1 lg:flex"
    >
      <ul className="flex flex-col items-end gap-1">
        {anchors.map((a) => {
          const isActive = active === a.id;
          return (
            <li key={a.id}>
              <Link
                href={`#${a.id}`}
                onClick={(e) => onClick(e, a.id)}
                aria-current={isActive ? 'true' : undefined}
                className={cx(
                  'group flex items-center gap-2 py-1 pr-1 text-[0.6875rem] uppercase tracking-[0.16em] transition-colors',
                  isActive ? 'text-fg' : 'text-fg-dim hover:text-fg-muted',
                )}
              >
                <span
                  className={cx(
                    'block h-px transition-all duration-300',
                    isActive ? 'w-8 bg-[var(--accent)]' : 'w-4 bg-[rgba(243,241,236,.22)] group-hover:w-6 group-hover:bg-[rgba(243,241,236,.4)]',
                  )}
                />
                <span className={cx('transition-opacity', isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-70')}>
                  {a.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
