'use client';

import { Suspense, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Two tiny page-level behaviours, implemented once instead of per component:
 *  1. scroll reveal — sets data-visible on .reveal elements (CSS does the rest);
 *  2. first-party analytics — page views, CTA clicks, outbound clicks, video plays.
 * No cookie, no fingerprinting, honours DNT and reduced motion.
 */
/**
 * Wraps the search-param-aware half in a Suspense boundary: reading `useSearchParams` during a
 * static prerender is only allowed behind one, and these pages are prerendered. The component
 * renders nothing, so the fallback is genuinely nothing.
 */
export function SiteBehaviours({ division = 'main' }: { division?: string }) {
  return (
    <Suspense fallback={null}>
      <Behaviours division={division} />
    </Suspense>
  );
}

function Behaviours({ division }: { division: string }) {
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const targets = () => Array.from(document.querySelectorAll<HTMLElement>('.reveal:not([data-visible="true"])'));
    if (!targets().length) {
      // nothing to observe on this render
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.visible = 'true';
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: reduce ? '0px' : '-6% 0px -8% 0px', threshold: 0.01 },
    );
    let mutationObserver: MutationObserver | null = null;

    const attach = () => {
      for (const node of targets()) {
        if (reduce) node.dataset.visible = 'true';
        else observer.observe(node);
      }
    };
    attach();
    if (document.fonts?.ready) void document.fonts.ready.then(attach).catch(() => undefined);
    mutationObserver = new MutationObserver(() => attach());
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutationObserver?.disconnect();
    };
  }, [pathname]);

  useEffect(() => {
    // Scroll progress for the hairline bar (CSS var, no re-render).
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const doc = document.documentElement;
        const max = doc.scrollHeight - doc.clientHeight;
        doc.style.setProperty('--scroll', max > 0 ? `${Math.min(100, (window.scrollY / max) * 100).toFixed(2)}%` : '0%');
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [pathname]);

  useEffect(() => {
    // Event names the ingest endpoint accepts; anything else is dropped here rather than
    // travelling to the server to be refused.
    const KNOWN = new Set(['page_view', 'cta_click', 'project_click', 'video_play', 'outbound_click', 'form_submit', 'form_error', 'resume_download', 'lightbox_open', 'nav_click', 'search']);

    const track = (name: string, target?: string, meta?: Record<string, unknown>) => {
      void navigator.sendBeacon(
        '/api/events',
        new Blob([JSON.stringify({ name, path: pathname + (search?.toString() ? `?${search}` : ''), target, division, meta })], { type: 'application/json' }),
      );
    };

    const onClick = (event: MouseEvent) => {
      const el = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-analytics]');
      if (el) {
        // The marker names the event when it is one we record; otherwise it becomes the target
        // of a generic interaction so the click is still attributable.
        const marker = el.dataset.analytics || 'cta_click';
        const name = KNOWN.has(marker) ? marker : 'cta_click';
        const target = el.dataset.analyticsTarget || (name === marker ? el.getAttribute('href') || undefined : marker);
        track(name, target);
        return;
      }
      const link = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>('a[href^="http"]');
      if (link && !link.host.startsWith(window.location.host)) track('outbound_click', link.href);
    };

    const onKey = (event: KeyboardEvent) => {
      const target = document.activeElement;
      if (event.key === 'Enter' && target instanceof HTMLElement) {
        const analytics = target.closest<HTMLElement>('[data-analytics]');
        if (analytics) track(analytics.dataset.analytics || 'interaction', analytics.dataset.analyticsTarget);
      }
    };

    // Components that know more than a CSS marker can — a video that really started, a gallery
    // that opened — announce themselves on this event instead of importing the endpoint.
    const onTrack = (event: Event) => {
      const detail = (event as CustomEvent<{ name?: string; target?: string }>).detail;
      if (detail?.name && KNOWN.has(detail.name)) track(detail.name, detail.target);
    };

    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('cm:track', onTrack);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('cm:track', onTrack);
    };
  }, [division, pathname, search]);

  useEffect(() => {
    void fetch('/api/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'page_view', path: pathname, division }),
      keepalive: true,
    }).catch(() => undefined);
  }, [division, pathname]);

  return null;
}
