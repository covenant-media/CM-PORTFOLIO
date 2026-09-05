'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { cx } from '@/lib/utils/text';
import { Icon } from '@/components/ui/Icon';

/**
 * Mobile-only action bar. Appears once the hero is off-screen so the primary
 * conversion path is always one thumb-tap away on social traffic.
 */
export function MediaBand({
  primary = { label: 'Hire me', href: '/media/contact' },
  whatsapp,
  whatsappLabel = 'WhatsApp',
}: {
  primary?: { label: string; href: string };
  whatsapp?: string | null;
  whatsappLabel?: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.85);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      className={cx(
        'fixed inset-x-0 bottom-0 z-40 border-t border-[rgba(243,241,236,.1)] bg-[rgba(10,10,13,.86)] px-3 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-xl transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] md:hidden',
        visible ? 'translate-y-0' : 'translate-y-full',
      )}
      aria-hidden={!visible}
    >
      <div className="flex items-center gap-2">
        <Link
          href={primary.href}
          tabIndex={visible ? 0 : -1}
          className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-pill bg-[var(--accent)] text-sm font-medium text-[var(--accent-ink)]"
          data-analytics="cta_click"
          data-analytics-target={primary.href}
        >
          {primary.label} <Icon name="arrow-right" size={15} />
        </Link>
        {whatsapp ? (
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            tabIndex={visible ? 0 : -1}
            className="inline-flex h-10 items-center gap-2 rounded-pill border border-[rgba(243,241,236,.18)] px-4 text-sm text-fg"
            data-analytics="cta_click"
            data-analytics-target="whatsapp"
          >
            <Icon name="whatsapp" size={15} /> {whatsappLabel}
          </a>
        ) : null}
      </div>
    </div>
  );
}
