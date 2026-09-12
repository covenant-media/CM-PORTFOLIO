/**
 * Shared chrome for the three media catalogs.
 *
 * The catalogs are the only screens outside the single page, and they are per format on
 * purpose: long-form work is not mixed with vertical edits, and neither is mixed with
 * photography. Each catalog keeps the media header, the media footer and the same cards, so
 * it reads as part of the portfolio rather than as a separate site.
 */
import { Section, SectionHeader } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { MediaHeader, type MediaAnchor } from './MediaHeader';
import { MediaCatalogGrid } from './MediaCatalogGrid';
import { MediaBackToTop } from './MediaBackToTop';
import { MediaSocialButtons } from './MediaSocialButtons';
import { SiteFooter, ScrollProgress } from './SiteFooter';
import { SiteBehaviours } from '@/components/ui/SiteBehaviours';
import { LightboxHost } from '@/components/ui/Lightbox';
import type { MediaFormat, MediaItem } from '@/lib/media/sample-portfolio';

const ANCHORS: MediaAnchor[] = [
  { id: 'home', label: 'Home' },
  { id: 'work', label: 'Work' },
  { id: 'services', label: 'Services' },
  { id: 'process', label: 'Process' },
  { id: 'about', label: 'About' },
  { id: 'contact', label: 'Contact' },
];

const SIBLINGS: { format: MediaFormat; label: string; href: string }[] = [
  { format: 'long', label: 'Long-form', href: '/media/long-form' },
  { format: 'short', label: 'Short-form', href: '/media/short-form' },
  { format: 'photo', label: 'Photography', href: '/media/photography' },
];

export function MediaCatalogView({
  format,
  eyebrow,
  title,
  lede,
  items,
  footer,
  inquiry,
}: {
  format: MediaFormat;
  eyebrow: string;
  title: string;
  lede: string;
  items: MediaItem[];
  /** CMS-driven contact details and footer nav, resolved by the route. */
  footer: React.ReactNode;
  /** The studio's enquiry form, so a catalog ends on the same call to action as the front page. */
  inquiry?: React.ReactNode;
}) {
  const others = SIBLINGS.filter((entry) => entry.format !== format);

  return (
    <div className="theme-media relative flex min-h-dvh flex-col overflow-x-clip">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:inline-flex focus:h-10 focus:items-center focus:rounded-pill focus:bg-[var(--accent)] focus:px-4 focus:text-sm focus:font-medium focus:text-[var(--accent-ink)]"
      >
        Skip to content
      </a>
      <ScrollProgress />
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10" style={{ backgroundImage: 'var(--surface-tone, none)' }} />
      <div aria-hidden className="grain pointer-events-none fixed inset-0 -z-10 opacity-[0.5]" />

      <MediaHeader anchors={ANCHORS} variant="subpage" />

      <main id="main" className="flex-1">
        <Section size="compact" className="pt-12 md:pt-16">
          <div className="container-page">
            <Button href="/media" variant="ghost" size="sm" icon="arrow-left" className="-ml-2 mb-6">
              Back to the portfolio
            </Button>

            <SectionHeader eyebrow={eyebrow} title={title} lede={lede} />

            <p className="mt-5 font-mono text-[0.625rem] uppercase tracking-[0.16em] text-fg-dim">
              {items.length} {items.length === 1 ? 'piece' : 'pieces'} in the library
            </p>

            <MediaCatalogGrid items={items} format={format} />

            <div className="mt-14 flex flex-wrap items-center justify-between gap-6 border-t border-[rgba(243,241,236,.08)] pt-8">
              <div>
                <p className="eyebrow">Keep browsing</p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {others.map((entry) => (
                    <li key={entry.href}>
                      <Button href={entry.href} variant="outline" size="sm" iconEnd="arrow-right">
                        {entry.label}
                      </Button>
                    </li>
                  ))}
                  <li>
                    <Button href="/media/pricing" variant="ghost" size="sm">
                      Pricing
                    </Button>
                  </li>
                </ul>
              </div>
              <p className="flex max-w-sm items-start gap-2 text-[0.8125rem] leading-relaxed text-fg-dim">
                <Icon name="info" size={14} className="mt-0.5 shrink-0" />
                <span>Prefer to see everything on one page? The full portfolio is a single scroll away.</span>
              </p>
            </div>
          </div>
        </Section>

        {/* ── INQUIRY ──────────────────────────────────────────────────────────────
            The same form, the same endpoint and the same token handling as the front page,
            placed where a reader who has just finished browsing the library actually is. */}
        {inquiry ? (
          <Section tone="raised" size="compact">
            <div className="container-page">
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14">
                <div>
                  <p className="eyebrow">Start a project</p>
                  <h2 className="display-3 mt-4">Tell me what you are making.</h2>
                  <p className="lede mt-4 max-w-md">
                    Share the date, the location and what the footage is for. Every brief gets a personal reply, usually the same day.
                  </p>
                  <div className="mt-7">
                    <MediaSocialButtons />
                  </div>
                </div>
                <div className="min-w-0 rounded-4 border border-[rgba(243,241,236,.09)] bg-[color:var(--color-ink-950)]/70 p-6 backdrop-blur md:p-8">
                  {inquiry}
                </div>
              </div>
            </div>
          </Section>
        ) : null}
      </main>

      {footer}

      {/* A long library needs a way back up, and this is the only persistent control on the
          surface: the floating contact rail and the mobile action band are gone. */}
      <MediaBackToTop />
      <SiteBehaviours division="media" />
      <LightboxHost />
    </div>
  );
}

/** Footer for the catalog screens, kept in one place so all three match exactly. */
export function MediaCatalogFooter(props: React.ComponentProps<typeof SiteFooter>) {
  return <SiteFooter {...props} />;
}
