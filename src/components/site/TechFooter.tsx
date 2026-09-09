import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import type { NavItem, SocialItem } from '@/lib/types/content';

export interface TechFooterProps {
  name: string;
  role: string;
  nav: NavItem[];
  socials: SocialItem[];
  contact: {
    email: string;
    phone: string;
    whatsappHref: string | null;
    location: string | null;
    responseTime: string | null;
  };
  ctaLabel: string;
  ctaHref: string;
}

/**
 * Tech footer — three columns (Brand · Services · Stay in Touch). The
 * "Quick links" column is removed per user request so the Services list
 * gets more horizontal room.
 */
export function TechFooter({ name, role, nav, socials, contact, ctaLabel, ctaHref }: TechFooterProps) {
  const services = nav.filter(
    (n) =>
      !n.label.startsWith('—') &&
      /development|ui|grc|cloud|cyber|security|design|api|database|support|network|consulting|deploy/i.test(n.label),
  );
  const servicesFallback = [
    { label: 'Full Stack Development', href: '/tech-portfolio#services' },
    { label: 'Frontend Development', href: '/tech-portfolio#services' },
    { label: 'Backend Development', href: '/tech-portfolio#services' },
    { label: 'Website Design', href: '/tech-portfolio#services' },
    { label: 'UI/UX Design', href: '/tech-portfolio#services' },
    { label: 'REST API Development', href: '/tech-portfolio#services' },
    { label: 'Database Design', href: '/tech-portfolio#services' },
    { label: 'Cloud Deployment', href: '/tech-portfolio#services' },
    { label: 'Cybersecurity', href: '/tech-portfolio#services' },
    { label: 'GRC Analysis', href: '/tech-portfolio#services' },
    { label: 'IT Support', href: '/tech-portfolio#services' },
    { label: 'Networking', href: '/tech-portfolio#services' },
    { label: 'Digital Consulting', href: '/tech-portfolio#services' },
  ];
  const servicesList = services.length >= 6 ? services : servicesFallback;
  const year = new Date().getFullYear();

  const socialMap: Record<string, string> = {
    x: 'x', twitter: 'x', instagram: 'instagram', tiktok: 'tiktok',
    youtube: 'youtube', facebook: 'facebook', linkedin: 'linkedin',
    github: 'github', whatsapp: 'whatsapp', email: 'mail',
  };

  return (
    <footer className="relative isolate mt-px border-t border-[rgba(243,241,236,.09)] bg-[var(--color-ink-1000)]">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/40 to-transparent" />
      <div className="container-page py-14 md:py-18">
        <div className="grid gap-10 md:grid-cols-12 md:gap-8">
          {/* Brand column */}
          <div className="md:col-span-4">
            <p className="font-display text-[1.8rem] leading-none tracking-[-0.03em]">{name}.</p>
            <p className="mt-3 max-w-sm text-[0.875rem] leading-relaxed text-fg-muted">{role}</p>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              {socials.slice(0, 6).map((s) => (
                <a
                  key={`${s.network}-${s.url}`}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  aria-label={s.label ?? s.network}
                  className="inline-grid size-9 place-items-center rounded-full border border-[rgba(243,241,236,.1)] text-fg-muted transition hover:-translate-y-0.5 hover:border-[var(--accent)]/40 hover:text-[var(--accent)]"
                >
                  <Icon name={socialMap[s.network] ?? 'link'} size={14} />
                </a>
              ))}
            </div>
          </div>

          {/* Services column (no Quick Links column per request) */}
          <div className="md:col-span-3">
            <p className="eyebrow">Services</p>
            <ul className="mt-4 grid grid-cols-1 gap-y-2.5 sm:grid-cols-1">
              {servicesList.slice(0, 8).map((s) => (
                <li key={s.label}>
                  <Link href={s.href} className="text-[0.875rem] text-fg-muted transition hover:text-fg">{s.label}</Link>
                </li>
              ))}
            </ul>
            {servicesList.length > 8 ? (
              <Link href="/tech#services" className="mt-3 inline-flex items-center gap-1 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-[var(--accent)] transition hover:brightness-110">
                All services <Icon name="arrow-right" size={10} />
              </Link>
            ) : null}
          </div>

          {/* Stay in Touch */}
          <div className="md:col-span-5">
            <p className="eyebrow">Stay in Touch</p>
            <ul className="mt-4 space-y-2.5 text-[0.875rem]">
              {contact.phone ? (
                <li><a href={`tel:${contact.phone.replace(/\D/g, '')}`} className="text-fg-muted transition hover:text-fg">{contact.phone}</a></li>
              ) : null}
              {contact.email ? (
                <li><a href={`mailto:${contact.email}`} className="text-fg-muted transition hover:text-fg">{contact.email}</a></li>
              ) : null}
              {contact.location ? <li className="text-fg-muted">{contact.location}</li> : null}
              {contact.responseTime ? <li className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-fg-dim">{contact.responseTime}</li> : null}
            </ul>

            <form action="#" method="post" className="mt-5">
              <label htmlFor="tech-nl" className="eyebrow block">Newsletter</label>
              <p className="mt-1 text-[0.8125rem] text-fg-dim">Subscribe for insights and updates.</p>
              <div className="mt-3 flex overflow-hidden rounded-pill border border-[rgba(243,241,236,.14)] bg-[rgba(243,241,236,.03)] p-1 transition focus-within:border-[var(--accent)]/50">
                <input
                  id="tech-nl"
                  type="email"
                  name="email"
                  required
                  placeholder="Your email"
                  aria-label="Email for newsletter"
                  className="min-w-0 flex-1 bg-transparent px-3 py-1.5 text-[0.8rem] text-fg placeholder:text-fg-dim focus:outline-none"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-pill bg-[var(--accent)] px-3 py-1.5 text-[0.7rem] font-medium uppercase tracking-[0.1em] text-[var(--accent-ink)] transition hover:brightness-105"
                >
                  Subscribe
                </button>
              </div>
            </form>

            <Link href={ctaHref} className="mt-5 inline-flex items-center gap-2 rounded-pill border border-[var(--accent)]/25 px-4 py-2 text-[0.8rem] font-medium text-[var(--accent)] transition hover:bg-[var(--accent)]/10">
              {ctaLabel} <Icon name="arrow-right" size={12} />
            </Link>
          </div>
        </div>
      </div>

      <div className="container-page flex flex-col gap-3 border-t border-[rgba(243,241,236,.07)] py-5 text-[0.75rem] text-fg-dim md:flex-row md:items-center md:justify-between">
        <p>© {year} {name}. All rights reserved. Designed &amp; Built with precision.</p>
        <p className="font-mono uppercase tracking-[0.16em]">Covenant Media · Technology</p>
      </div>
    </footer>
  );
}
