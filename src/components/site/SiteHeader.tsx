'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cx } from '@/lib/utils/text';
import { Icon } from '@/components/ui/Icon';
import { Wordmark } from './Logo';
import type { NavItem, SocialItem } from '@/lib/types/content';

/**
 * Header chrome for all three experiences. Structure comes from the CMS
 * (navigation_item rows per location); only the accent + label differ by surface.
 */
export function SiteHeader({
  surface,
  homeHref,
  wordmark,
  nav,
  cta,
  socials,
  note,
}: {
  surface: 'main' | 'media' | 'tech';
  homeHref: string;
  wordmark: { primary: string; secondary?: string | null };
  nav: NavItem[];
  cta: { label: string; href: string };
  socials: SocialItem[];
  note?: string | null;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

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

  const isActive = (href: string) => {
    if (href === homeHref) return pathname === homeHref;
    return pathname === href || pathname.startsWith(`${href.replace(/\/$/, '')}/`);
  };

  return (
    <>
      <header
        className={cx(
          'sticky top-0 z-50 w-full transition-[background-color,border-color,backdrop-filter] duration-500',
          scrolled ? 'border-b border-[rgba(243,241,236,.09)] bg-[rgba(10,10,13,.78)] backdrop-blur-xl' : 'border-b border-transparent bg-transparent',
        )}
      >
        <div className={cx('container-page flex items-center justify-between gap-6 transition-[height] duration-500', scrolled ? 'h-14 md:h-16' : 'h-16 md:h-20')}>
          <Link href={homeHref} className="group relative z-10 shrink-0" aria-label={`${wordmark.primary} home`} data-analytics="nav_click" data-analytics-target={homeHref}>
            <Wordmark {...wordmark} size={scrolled ? 'sm' : 'md'} className="transition-all duration-500" />
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
            {nav.map((item) => (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                target={item.newTab || item.external ? '_blank' : undefined}
                rel={item.external ? 'noopener noreferrer nofollow' : undefined}
                data-analytics="nav_click"
                data-analytics-target={item.href}
                className={cx(
                  'mask-link relative rounded-pill px-3 py-1.5 text-[0.9375rem] transition-colors duration-300',
                  isActive(item.href) ? 'text-fg' : 'text-fg-muted hover:text-fg',
                )}
                aria-current={isActive(item.href) ? 'page' : undefined}
              >
                {item.label}
                {item.badge ? (
                  <span className="ml-1.5 rounded-pill bg-[color-mix(in_oklab,var(--accent)_20%,transparent)] px-1.5 py-px font-mono text-[0.5625rem] uppercase tracking-[0.12em] text-[var(--accent)]">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2.5">
            {note ? <span className="hidden font-mono text-[0.625rem] uppercase tracking-[0.16em] text-fg-dim xl:inline">{note}</span> : null}
            <Link
              href={cta.href}
              data-analytics="cta_click"
              data-analytics-target={cta.href}
              className="hidden h-9 items-center gap-2 rounded-pill bg-[var(--accent)] px-4 text-sm font-medium text-[var(--accent-ink)] shadow-[0_10px_26px_-14px_var(--accent-glow)] transition duration-300 hover:-translate-y-px hover:brightness-[1.06] sm:inline-flex"
            >
              {cta.label}
              <Icon name="arrow-right" size={15} className="transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
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
            <Wordmark {...wordmark} size="sm" />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-grid size-9 place-items-center rounded-full border border-[rgba(243,241,236,.16)]"
              aria-label="Close menu"
              autoFocus
            >
              <Icon name="close" size={18} />
            </button>
          </div>
          <nav aria-label="Mobile" className="container-page flex flex-1 flex-col justify-center gap-1 py-6">
            {nav.map((item, i) => (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                target={item.newTab || item.external ? '_blank' : undefined}
                className="group flex items-baseline justify-between border-b border-[rgba(243,241,236,.08)] py-3.5 font-display text-2xl tracking-[-0.02em] text-fg transition hover:text-[var(--accent)]"
                style={{ animation: `cm-fade-up .5s cubic-bezier(.16,1,.3,1) ${i * 45}ms both` }}
              >
                {item.label}
                <Icon name="arrow-up-right" size={16} className="text-fg-dim transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            ))}
            <Link href={cta.href} className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-pill bg-[var(--accent)] px-6 text-[0.9375rem] font-medium text-[var(--accent-ink)]">
              {cta.label} <Icon name="arrow-right" size={16} />
            </Link>
            {socials.length ? (
              <ul className="mt-7 flex flex-wrap gap-2">
                {socials.map((s) => (
                  <li key={s.network}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="inline-grid size-9 place-items-center rounded-full border border-[rgba(243,241,236,.12)] text-fg-muted transition hover:text-fg"
                      aria-label={s.label ?? s.network}
                    >
                      <Icon name={socialIcon(s.network)} size={15} />
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </nav>
        </div>
      ) : null}
    </>
  );
}

function socialIcon(network: string): string {
  const map: Record<string, string> = {
    x: 'x',
    twitter: 'x',
    instagram: 'instagram',
    tiktok: 'tiktok',
    youtube: 'youtube',
    facebook: 'facebook',
    linkedin: 'linkedin',
    github: 'github',
    whatsapp: 'whatsapp',
    vimeo: 'vimeo',
  };
  return map[network.toLowerCase()] ?? 'link';
}
