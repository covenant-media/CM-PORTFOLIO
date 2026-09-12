'use client';

/**
 * Back-to-top control for the Media Portfolio.
 *
 * Media-specific on purpose: the shared `ui/BackToTop` jumps to the `#home` anchor, which only
 * exists on the single-page surfaces. The catalogue and pricing screens have no such section, so
 * this version scrolls the window itself and works identically on every media screen. It stays
 * hidden until the visitor has scrolled past the opening view, and it is now the only persistent
 * control on the surface — the floating contact rail and the mobile action band are gone.
 */
import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cx } from '@/lib/utils/text';

export function MediaBackToTop({ offset = 640 }: { offset?: number }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > offset);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [offset]);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      title="Back to top"
      className={cx(
        'fixed bottom-4 right-4 z-40 grid size-11 place-items-center rounded-full bg-[var(--accent)] text-[var(--accent-ink)] shadow-[0_18px_40px_-18px_var(--accent-glow)] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:brightness-95 lg:bottom-6 lg:right-5 lg:size-12',
        show ? 'pointer-events-auto translate-y-0 scale-100 opacity-100' : 'pointer-events-none translate-y-3 scale-90 opacity-0',
      )}
    >
      <Icon name="arrow-up" size={18} strokeWidth={2.4} />
    </button>
  );
}
