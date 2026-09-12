'use client';

/**
 * Dedicated header for the single-page /media portfolio.
 *
 * Media-only: it is not SiteHeader (used by the main and tech surfaces) and not
 * TechHeader. The lockup reads as a small production house — a film-perforation mark,
 * a "Media Portfolio" sub-label — and the navigation is the single page's sections, with a
 * sliding underline on the section currently in view, a Pricing link and a "Start a Project"
 * call to action. On sub-pages the same nav resolves to `/media#section` so it still works.
 */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { cx } from '@/lib/utils/text';
import { Icon } from '@/components/ui/Icon';

export interface MediaAnchor {
  id: string;
  label: string;
}

export function MediaHeader({
  anchors,
  /** `page` on /media itself (in-page anchors); `subpage` on the catalogs and the pricing page. */
  variant = 'page',
}: {
  anchors: MediaAnchor[];
  variant?: 'page' | 'subpage';
}) {
  const subpage = variant === 'subpage';
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(anchors[0]?.id ?? '');
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (subpage) return;
    const sections = anchors.map((a) => document.getElementById(a.id)).filter((el): el is HTMLElement => !!el);
    if (!sections.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: [0, 0.2, 0.6, 1] },
    );
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [anchors, subpage]);

  // Position the sliding underline under the active link.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const link = nav.querySelector<HTMLElement>(`[data-anchor="${active}"]`);
    if (!link) {
      setPill(null);
      return;
    }
    setPill({ left: link.offsetLeft, width: link.offsetWidth });
  }, [active, subpage]);

  const go = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    event.preventDefault();
    // 96px of clearance: the sticky header is 64-72px tall, and the section's first line needs
    // the rest so a heading never tucks under the bar when a nav link is used.
    window.scrollTo({ top: Math.max(el.getBoundingClientRect().top + window.scrollY - 96, 0), behavior: 'smooth' });
    history.replaceState(null, '', `#${id}`);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      <header
        className={cx(
          'sticky top-0 z-50 w-full transition-[background-color,border-color,height] duration-300',
          scrolled ? 'h-14 border-b border-[rgba(243,241,236,.09)] bg-[rgba(10,10,13,.8)] backdrop-blur-xl' : 'h-16 border-b border-transparent',
        )}
      >
        <div className="container-page flex h-full items-center justify-between gap-6">
          {/* Wordmark: a strip of sprocket holes reads as "media" without a logo file. */}
          <Link href="/media" aria-label="Covenant Media, back to top of the portfolio" className="group relative z-10 inline-flex shrink-0 items-center gap-3">
            <span aria-hidden className="flex h-8 w-8 flex-col justify-center gap-[3px] rounded-2 border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-[5px] transition group-hover:bg-[var(--accent)]/20">
              {[0, 1, 2].map((row) => (
                <span key={row} className="flex gap-[3px]">
                  <span className="size-[4px] rounded-[1px] bg-[var(--accent)]/80" />
                  <span className="size-[4px] rounded-[1px] bg-[var(--accent)]/80" />
                </span>
              ))}
            </span>
            <span className="flex flex-col leading-none">
              <span className="font-display text-[1.02rem] font-medium tracking-[-0.02em] text-fg">
                Covenant <span className="text-[var(--accent)]">Media</span>
              </span>
              <span className="mt-[3px] font-mono text-[0.5rem] uppercase tracking-[0.26em] text-fg-dim">Media Portfolio</span>
            </span>
          </Link>

          <nav ref={navRef} aria-label="Portfolio sections" className="relative hidden items-center gap-0.5 lg:flex">
            {anchors.map((a) => {
              const isActive = !subpage && active === a.id;
              return (
                <a
                  key={a.id}
                  data-anchor={a.id}
                  href={subpage ? `/media#${a.id}` : `#${a.id}`}
                  onClick={(e) => (subpage ? undefined : go(e, a.id))}
                  aria-current={isActive ? 'true' : undefined}
                  className={cx('relative px-3 py-2 text-[0.74rem] font-medium transition-colors', isActive ? 'text-fg' : 'text-fg-muted hover:text-fg')}
                >
                  {a.label}
                </a>
              );
            })}
            <span
              aria-hidden
              className="absolute -bottom-[1px] h-px bg-[var(--accent)] transition-[left,width] duration-500 ease-[cubic-bezier(.16,1,.3,1)]"
              style={{ left: pill?.left ?? 0, width: pill?.width ?? 0, opacity: pill ? 1 : 0 }}
            />
          </nav>

          <div className="flex items-center gap-2">
            <a
              href="/media/pricing"
              data-analytics="cta_click"
              data-analytics-target="/media/pricing"
              className="hidden rounded-pill border border-[rgba(243,241,236,.16)] px-3.5 py-2 text-[0.78rem] text-fg-muted transition hover:border-[var(--accent)] hover:text-[var(--accent)] sm:inline-flex"
            >
              Pricing
            </a>
            <a
              href={subpage ? '/media#contact' : '#contact'}
              onClick={(e) => (subpage ? undefined : go(e, 'contact'))}
              className="hidden items-center gap-1.5 rounded-pill bg-[var(--accent)] px-4 py-2 text-[0.8rem] font-medium text-[var(--accent-ink)] transition hover:brightness-[1.07] sm:inline-flex"
            >
              Start a Project <Icon name="arrow-right" size={13} />
            </a>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-grid size-9 place-items-center rounded-full border border-[rgba(243,241,236,.14)] text-fg transition hover:bg-[rgba(243,241,236,.06)] lg:hidden"
              aria-label="Open menu"
              aria-expanded={open}
            >
              <Icon name="menu" size={18} />
            </button>
          </div>
        </div>
      </header>

      {open ? (
        <div className="fixed inset-0 z-[60] flex flex-col bg-[rgba(8,8,10,.97)] backdrop-blur-xl lg:hidden" role="dialog" aria-modal="true" aria-label="Site menu">
          <div className="container-page flex h-16 items-center justify-between">
            <span className="font-display text-[1.05rem] font-medium tracking-[-0.02em] text-fg">
              Covenant <span className="text-[var(--accent)]">Media</span>
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              autoFocus
              className="inline-grid size-9 place-items-center rounded-full border border-[rgba(243,241,236,.16)] text-fg"
              aria-label="Close menu"
            >
              <Icon name="close" size={18} />
            </button>
          </div>
          <nav aria-label="Mobile" className="container-page flex flex-1 flex-col justify-center gap-0.5 py-6">
            {anchors.map((a, i) => (
              <a
                key={a.id}
                href={subpage ? `/media#${a.id}` : `#${a.id}`}
                onClick={(e) => (subpage ? setOpen(false) : go(e, a.id))}
                className="group flex items-center justify-between border-b border-[rgba(243,241,236,.08)] py-3.5 font-display text-xl tracking-[-0.02em] text-fg transition hover:text-[var(--accent)]"
                style={{ animation: `cm-fade-up .5s cubic-bezier(.16,1,.3,1) ${i * 40}ms both` }}
              >
                <span className="flex items-center gap-3">
                  <span aria-hidden className="size-1.5 rounded-full bg-[var(--accent)]/50 transition group-hover:bg-[var(--accent)]" />
                  {a.label}
                </span>
                <Icon name="arrow-right" size={16} className="text-fg-dim transition group-hover:translate-x-0.5 group-hover:text-[var(--accent)]" />
              </a>
            ))}
            <a
              href="/media/pricing"
              onClick={() => setOpen(false)}
              className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-pill border border-[rgba(243,241,236,.18)] px-6 text-[0.9375rem] font-medium text-fg"
            >
              Pricing
            </a>
            <a
              href={subpage ? '/media#contact' : '#contact'}
              onClick={(e) => (subpage ? setOpen(false) : go(e, 'contact'))}
              className="mt-3 inline-flex h-11 items-center justify-center gap-2 rounded-pill bg-[var(--accent)] px-6 text-[0.9375rem] font-medium text-[var(--accent-ink)]"
            >
              Start a Project <Icon name="arrow-right" size={16} />
            </a>
          </nav>
        </div>
      ) : null}
    </>
  );
}
