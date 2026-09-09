'use client';

/**
 * Dedicated header for the single-page /tech portfolio.
 *
 * Replaces the shared SiteHeader for this surface with a cleaner, reference-style
 * lockup: a professional "Covenant Nsikan" wordmark and the nine section anchors
 * (Home · About · Skills · Services · Portfolio · Experience · Testimonials ·
 * Contact · Resume). Clicking a link smooth-scrolls to that section and the
 * menu highlights whichever section is currently in view. On small screens the
 * hamburger opens a full-screen drawer of the same anchors (not just a CTA).
 */
import { useEffect, useState } from 'react';
import { cx } from '@/lib/utils/text';
import { Icon } from '@/components/ui/Icon';

export interface TechAnchor {
  id: string;
  label: string;
}

export function TechHeader({ name, anchors }: { name: string; anchors: TechAnchor[] }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>(anchors[0]?.id ?? '');

  const first = name.trim().split(' ')[0] || 'Covenant';
  const rest = name.trim().split(' ').slice(1).join(' ');

  // Frost the header once the page leaves the very top.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Highlight the section currently in view (drives the desktop underline).
  useEffect(() => {
    const sections = anchors
      .map((a) => document.getElementById(a.id))
      .filter((el): el is HTMLElement => !!el);
    if (!sections.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-40% 0px -55% 0px', threshold: [0, 0.25, 0.5, 1] },
    );
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [anchors]);

  // Smooth-scroll to a section and (for the drawer) close it.
  const go = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    event.preventDefault();
    const top = el.getBoundingClientRect().top + window.scrollY - 64;
    window.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' });
    history.replaceState(null, '', `#${id}`);
    setOpen(false);
  };

  // Lock body scroll while the mobile drawer is open; Escape closes it.
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
          'sticky top-0 z-50 w-full transition-[background-color,border-color,backdrop-filter,height] duration-300',
          scrolled
            ? 'h-14 border-b border-[rgba(243,241,236,.09)] bg-[rgba(10,10,13,.82)] backdrop-blur-xl'
            : 'h-16 border-b border-transparent bg-transparent',
        )}
      >
        <div className="container-page flex h-full items-center justify-between gap-6">
          {/* Wordmark */}
          <a
            href="#home"
            onClick={(e) => go(e, 'home')}
            aria-label={`${name} — back to top`}
            className="group relative z-10 inline-flex shrink-0 items-center gap-2.5"
          >
            <span className="grid size-8 place-items-center rounded-2 border border-[var(--accent)]/40 bg-[var(--accent)]/10 font-mono text-[0.7rem] font-semibold tracking-wide text-[var(--accent)] transition group-hover:bg-[var(--accent)]/20">
              {first[0]?.toUpperCase()}
              {(rest.split('')[0] || '').toUpperCase()}
            </span>
            <span className="flex flex-col leading-none">
              <span className="font-display text-[1.02rem] font-medium tracking-[-0.02em] text-fg">
                {first} <span className="text-[var(--accent)]">{rest}</span>
              </span>
              <span className="mt-[3px] font-mono text-[0.5rem] uppercase tracking-[0.26em] text-fg-dim">
                Portfolio
              </span>
            </span>
          </a>

          {/* Desktop nav */}
          <nav aria-label="Portfolio sections" className="hidden items-center gap-0.5 lg:flex">
            {anchors.map((a) => {
              const isActive = active === a.id;
              return (
                <a
                  key={a.id}
                  href={`#${a.id}`}
                  onClick={(e) => go(e, a.id)}
                  aria-current={isActive ? 'true' : undefined}
                  className={cx(
                    'relative px-3 py-2 text-[0.74rem] font-medium transition-colors',
                    isActive ? 'text-[var(--accent)]' : 'text-fg-muted hover:text-fg',
                  )}
                >
                  {a.label}
                  <span
                    aria-hidden
                    className={cx(
                      'absolute inset-x-3 -bottom-[1px] h-px transition-colors duration-300',
                      isActive ? 'bg-[var(--accent)]' : 'bg-transparent',
                    )}
                  />
                </a>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <a
              href="#contact"
              onClick={(e) => go(e, 'contact')}
              className="hidden items-center gap-1.5 rounded-pill bg-[var(--accent)] px-4 py-2 text-[0.8rem] font-medium text-[var(--accent-ink)] transition hover:brightness-[1.07] sm:inline-flex"
            >
              Hire Me <Icon name="arrow-right" size={13} />
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
{/* Mobile drawer — the nine anchors, not just a CTA */}
      {open ? (
        <div className="fixed inset-0 z-[60] flex flex-col bg-[rgba(8,8,10,.97)] backdrop-blur-xl lg:hidden" role="dialog" aria-modal="true" aria-label="Site menu">
          <div className="container-page flex h-16 items-center justify-between">
            <span className="inline-flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-2 border border-[var(--accent)]/40 bg-[var(--accent)]/10 font-mono text-[0.7rem] font-semibold text-[var(--accent)]">
                {first[0]?.toUpperCase()}
                {(rest.split('')[0] || '').toUpperCase()}
              </span>
              <span className="font-display text-[1.05rem] font-medium tracking-[-0.02em] text-fg">
                {first} <span className="text-[var(--accent)]">{rest}</span>
              </span>
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-grid size-9 place-items-center rounded-full border border-[rgba(243,241,236,.16)] text-fg"
              aria-label="Close menu"
              autoFocus
            >
              <Icon name="close" size={18} />
            </button>
          </div>
          <nav aria-label="Mobile" className="container-page flex flex-1 flex-col justify-center gap-0.5 py-6">
            {anchors.map((a, i) => (
              <a
                key={a.id}
                href={`#${a.id}`}
                onClick={(e) => go(e, a.id)}
                className="group flex items-center justify-between border-b border-[rgba(243,241,236,.08)] py-3 font-display text-xl tracking-[-0.02em] text-fg transition hover:text-[var(--accent)]"
                style={{ animation: `cm-fade-up .5s cubic-bezier(.16,1,.3,1) ${i * 40}ms both` }}
              >
                <span className="flex items-center gap-3">
                  <span className="tnum font-mono text-[0.625rem] text-fg-dim">{String(i + 1).padStart(2, '0')}</span>
                  {a.label}
                </span>
                <Icon name="arrow-right" size={16} className="text-fg-dim transition group-hover:translate-x-0.5 group-hover:text-[var(--accent)]" />
              </a>
            ))}
            <a
              href="#contact"
              onClick={(e) => go(e, 'contact')}
              className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-pill bg-[var(--accent)] px-6 text-[0.9375rem] font-medium text-[var(--accent-ink)]"
            >
              Hire Me <Icon name="arrow-right" size={16} />
            </a>
          </nav>
        </div>
      ) : null}
    </>
  );
}