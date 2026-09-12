'use client';

/**
 * Client controls for the media showcase blocks.
 *
 * The showcase blocks themselves are server components; these are the two
 * pieces that need browser APIs — opening the shared lightbox from inside the
 * featured-work lead panel (a span with role=button, so it can live inside the
 * panel's <Link> without invalid nesting) and dispatching analytics on play.
 */
import type { LightboxItem } from '@/components/ui/Lightbox';
import { emitLightbox } from '@/components/ui/Lightbox';
import { trackClientEvent } from '@/lib/analytics/client';
import { Icon } from '@/components/ui/Icon';

export function LeadPlayControl({ items, label }: { items: LightboxItem[]; label: string }) {
  if (!items.length) return null;
  return (
    <span
      data-play
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        trackClientEvent('video_play', 'featured-lead');
        emitLightbox(items, 0);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          event.stopPropagation();
          trackClientEvent('video_play', 'featured-lead');
          emitLightbox(items, 0);
        }
      }}
      className="absolute right-4 top-4 inline-flex cursor-pointer items-center gap-2 rounded-pill bg-[rgba(10,10,13,.66)] px-3.5 py-2 text-[0.8125rem] font-medium text-white ring-1 ring-[rgba(243,241,236,.22)] backdrop-blur-md transition duration-500 ease-[cubic-bezier(.16,1,.3,1)] hover:bg-[var(--accent)] hover:text-[var(--accent-ink)] hover:ring-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] md:right-6 md:top-6"
    >
      <Icon name="play" size={13} filled /> Play reel ({items.length})
    </span>
  );
}
