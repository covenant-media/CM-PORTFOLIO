import Link from 'next/link';
import { cx } from '@/lib/utils/text';
import { Icon } from '@/components/ui/Icon';
import { Wordmark, CovenantMark } from './Logo';
import type { NavItem, SocialItem } from '@/lib/types/content';

export interface FooterProps {
  surface: 'main' | 'media' | 'tech';
  wordmark: { primary: string; secondary?: string | null };
  nav: NavItem[];
  socials: SocialItem[];
  contact: { email: string | null; phone: string | null; whatsappHref: string | null; whatsappLabel: string | null; location: string | null; responseTime: string | null };
  cta: { headline: string; body: string | null; primary: { label: string; href: string } };
  legal: { privacyHref: string; termsHref: string; brandLine: string; tagline?: string | null };
}

const NETWORK_ICON: Record<string, string> = {
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
  behance: 'behance',
  dribbble: 'dribbble',
  email: 'mail',
  phone: 'phone',
};

export function SiteFooter({ surface, wordmark, nav, socials, contact, cta, legal }: FooterProps) {
  const year = new Date().getFullYear();
  const columns = chunkNav(nav);
  return (
    <footer className="relative isolate mt-px border-t border-[rgba(243,241,236,.09)] bg-[var(--color-ink-1000)]">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/40 to-transparent" />

      <div className="container-page py-14 md:py-20">
        <div className="grid gap-10 md:grid-cols-[1.35fr_1fr] md:gap-16">
          <div>
            <p className="font-display text-[clamp(1.7rem,3.6vw,2.9rem)] leading-[1.06] tracking-[-0.028em]">{cta.headline}</p>
            {cta.body ? <p className="lede mt-4 max-w-md text-[1.0625rem]">{cta.body}</p> : null}
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href={cta.primary.href}
                data-analytics="cta_click"
                data-analytics-target={cta.primary.href}
                className="group inline-flex h-11 items-center gap-2.5 rounded-pill bg-[var(--accent)] px-5 text-[0.9375rem] font-medium text-[var(--accent-ink)] transition duration-300 hover:brightness-[1.06]"
              >
                {cta.primary.label}
                <Icon name="arrow-right" size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              {contact.whatsappHref ? (
                <a
                  href={contact.whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-analytics="cta_click"
                  data-analytics-target="whatsapp"
                  className="inline-flex h-11 items-center gap-2 rounded-pill border border-[rgba(243,241,236,.16)] px-4.5 text-[0.9375rem] text-fg transition hover:border-[rgba(243,241,236,.32)]"
                >
                  <Icon name="whatsapp" size={16} /> {contact.whatsappLabel ?? 'WhatsApp'}
                </a>
              ) : null}
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {socials.map((item) => (
                <a
                  key={`${item.network}-${item.url}`}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  data-analytics="outbound_click"
                  data-analytics-target={item.url}
                  aria-label={item.label ?? item.network}
                  className="inline-grid size-10 place-items-center rounded-full border border-[rgba(243,241,236,.1)] text-fg-muted transition duration-300 hover:-translate-y-0.5 hover:border-[rgba(243,241,236,.28)] hover:text-fg"
                >
                  <Icon name={NETWORK_ICON[item.network] ?? 'link'} size={16} />
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:gap-10">
            {columns.map((column) => (
              <nav key={column.label} aria-label={column.label}>
                <p className="eyebrow">{column.label}</p>
                <ul className="mt-4 space-y-2.5">
                  {column.items.map((item) => (
                    <li key={`${item.href}-${item.label}`}>
                      <Link
                        href={item.href}
                        target={item.newTab || item.external ? '_blank' : undefined}
                        rel={item.external ? 'noopener noreferrer nofollow' : undefined}
                        className="text-[0.9375rem] text-fg-muted transition hover:text-fg"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
            <div>
              <p className="eyebrow">Direct</p>
              <ul className="mt-4 space-y-2.5 text-[0.9375rem]">
                {contact.email ? (
                  <li>
                    <a href={`mailto:${contact.email}`} className="mask-link text-fg-muted transition hover:text-fg">
                      {contact.email}
                    </a>
                  </li>
                ) : null}
                {contact.phone ? (
                  <li>
                    <a href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`} className="mask-link text-fg-muted transition hover:text-fg">
                      {contact.phone}
                    </a>
                  </li>
                ) : null}
                {contact.location ? <li className="text-fg-muted">{contact.location}</li> : null}
                {contact.responseTime ? <li className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-fg-dim">{contact.responseTime}</li> : null}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="container-page flex flex-col gap-4 border-t border-[rgba(243,241,236,.07)] py-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          {surface === 'main' ? <CovenantMark size={22} className="text-fg-dim" /> : <Wordmark {...wordmark} size="sm" showMark={false} />}
          <p className="text-xs text-fg-dim">
            © {year} {legal.brandLine}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-fg-dim">
          {legal.tagline ? <span className="font-mono uppercase tracking-[0.16em]">{legal.tagline}</span> : null}
          <Link href={legal.privacyHref} className="transition hover:text-fg-muted">
            Privacy
          </Link>
          <Link href={legal.termsHref} className="transition hover:text-fg-muted">
            Terms
          </Link>
          {surface === 'main' ? (
            <Link href="/security" className="transition hover:text-fg-muted">
              Security
            </Link>
          ) : (
            <Link href="/security" className="transition hover:text-fg-muted">
              Security &amp; privacy
            </Link>
          )}
          <Link href="/admin" className="inline-flex items-center gap-1.5 rounded-pill border border-[rgba(243,241,236,.1)] px-2.5 py-1 transition hover:border-[rgba(243,241,236,.24)] hover:text-fg-muted" aria-label="Covenant CMS sign in">
            <Icon name="lock" size={12} /> CMS
          </Link>
        </div>
      </div>
    </footer>
  );
}

/** Split a flat footer nav into labelled columns using "— " group prefixes or in twos. */
function chunkNav(nav: NavItem[]): { label: string; items: NavItem[] }[] {
  if (!nav.length) return [];
  const grouped = new Map<string, NavItem[]>();
  let bucket = 'Explore';
  for (const item of nav) {
    if (item.label.startsWith('— ') || item.label.startsWith('- ')) {
      bucket = item.label.replace(/^[—-]\s*/, '');
      continue;
    }
    grouped.set(bucket, [...(grouped.get(bucket) ?? []), item]);
  }
  if (grouped.size === 1) {
    const items = nav;
    const size = Math.ceil(items.length / 2);
    return [
      { label: 'Explore', items: items.slice(0, size) },
      { label: 'Portfolios', items: items.slice(size) },
    ];
  }
  return Array.from(grouped.entries()).map(([label, items]) => ({ label, items }));
}

export function ScrollProgress({ className }: { className?: string }) {
  return (
    <div className={cx('pointer-events-none fixed inset-x-0 top-0 z-[70] h-px bg-[rgba(243,241,236,.06)]', className)} aria-hidden>
      <div className="h-full w-[var(--scroll,0%)] bg-[var(--accent)]" id="cm-scroll-bar" />
    </div>
  );
}
