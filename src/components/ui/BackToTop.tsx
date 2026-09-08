'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cx } from '@/lib/utils/text';

/**
 * Bottom-right floating "Back to top" button. A solid accent circle with an
 * up-arrow icon that appears once the user has scrolled past ~600px.
 * Smooth-scrolls to #home on click.
 */
export function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toTop = () => {
    if (window.location.hash !== '#home') {
      window.location.hash = '#home';
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <button
      type="button"
      onClick={toTop}
      aria-label="Back to top"
      title="Back to top"
      className={cx(
        'fixed bottom-6 right-6 z-40 grid h-12 w-12 place-items-center rounded-full bg-[var(--accent)] text-[var(--accent-ink)] shadow-[0_18px_40px_-18px_var(--accent-glow)] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:brightness-95',
        show ? 'pointer-events-auto translate-y-0 scale-100 opacity-100' : 'pointer-events-none translate-y-3 scale-90 opacity-0',
      )}
    >
      <Icon name="arrow-up" size={20} strokeWidth={2.4} />
    </button>
  );
}
