/**
 * Pricing screen for the Media Portfolio.
 *
 * The only standalone page the brief allows, and built to feel like part of the single page:
 * the same media header, footer, quick links, back-to-top control and lightbox host.
 *
 * Every project here is quoted individually, so no fee is invented. Each package states what
 * it covers, who it suits and the factors that move the number, and every card leads to the
 * enquiry form, which is what a client actually needs from a pricing page.
 */
import { Section, SectionHeader } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { FadeIn } from '@/components/ui/Motion';
import { MediaHeader, type MediaAnchor } from './MediaHeader';
import { MediaBackToTop } from './MediaBackToTop';
import { SiteFooter, ScrollProgress } from './SiteFooter';
import { SiteBehaviours } from '@/components/ui/SiteBehaviours';
import { LightboxHost } from '@/components/ui/Lightbox';
import { contactDetails, siteContext } from '@/lib/cms/content';
import { MEDIA_SOCIALS } from '@/lib/media/sample-portfolio';
import type { SocialItem } from '@/lib/types/content';
import { MEDIA_PRICING, MEDIA_PROCESS, MEDIA_QUOTE_FACTORS, MEDIA_STUDIO } from '@/lib/media/sample-portfolio';
import { cx } from '@/lib/utils/text';

export const revalidate = 60;

const ANCHORS: MediaAnchor[] = [
  { id: 'home', label: 'Home' },
  { id: 'work', label: 'Work' },
  { id: 'services', label: 'Services' },
  { id: 'process', label: 'Process' },
  { id: 'stories', label: 'Client Stories' },
  { id: 'about', label: 'About' },
  { id: 'contact', label: 'Contact' },
];

export async function MediaPricingPage() {
  const [ctx, contact] = await Promise.all([siteContext(), contactDetails()]);
  // CMS rows first, the studio's published profiles otherwise (the CMS rows are still drafts),
  // so the footer's social row is never empty.
  const socials: SocialItem[] = (ctx.social.length ? ctx.social : MEDIA_SOCIALS).map((entry) => ({
    network: entry.network,
    url: entry.url,
    label: entry.label,
    handle: null,
  }));
  const settings = ctx.settings;
  const brandName = String(settings['brand.name'] ?? '').trim() || MEDIA_STUDIO.brand;

  const studio = {
    phone: contact.phone ?? MEDIA_STUDIO.phone,
    email: contact.email ?? MEDIA_STUDIO.email,
    whatsapp: (contact.whatsappHref as string) ?? `https://wa.me/${MEDIA_STUDIO.whatsapp}`,
    location: contact.location ?? MEDIA_STUDIO.location,
  };
  const whatsappHref = studio.whatsapp.includes('?') ? studio.whatsapp : `${studio.whatsapp}?text=${encodeURIComponent('Hello Covenant, I would like a quote for a shoot.')}`;
  const mailHref = `mailto:${studio.email}?subject=${encodeURIComponent('Project enquiry and quote request')}`;

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

            <div className="max-w-3xl">
              <SectionHeader
                eyebrow="Investment"
                title="Clear scope, quoted per project"
                lede="Every production is different, so each one is quoted on what it actually needs rather than a flat rate. Tell me the date and the scope and you get a fixed figure, with nothing added later."
              />
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              <Button href="/media#contact" iconEnd="arrow-right">
                Request a quote
              </Button>
              <Button href={whatsappHref} variant="outline" icon="whatsapp" newTab>
                Ask on WhatsApp
              </Button>
              <Button href={mailHref} variant="ghost" icon="mail">
                Email the studio
              </Button>
            </div>
          </div>
        </Section>

        {/* Package groups: long-form, short-form, photography and the extras clients add. */}
        {MEDIA_PRICING.map((group, groupIndex) => (
          <Section key={group.id} id={group.id} tone={groupIndex % 2 === 0 ? 'raised' : 'sunken'} size="compact">
            <div className="container-page">
              <div className="flex items-start gap-4">
                <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-3 border border-[var(--accent)]/25 bg-[var(--accent)]/8 text-[var(--accent)]">
                  <Icon name={group.icon} size={18} />
                </span>
                <div className="min-w-0">
                  <h2 className="display-4">{group.title}</h2>
                  <p className="lede mt-3 max-w-3xl text-[0.9375rem]">{group.lede}</p>
                </div>
              </div>

              <ul className={cx('mt-9 grid gap-5', group.packages.length >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2')}>
                {group.packages.map((entry, index) => (
                  <FadeIn key={entry.name} as="li" delay={index * 70}>
                    <article
                      className={cx(
                        'flex h-full flex-col rounded-4 border p-6 backdrop-blur transition duration-400 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]',
                        entry.featured
                          ? 'border-[var(--accent)]/35 bg-[color:var(--color-ink-950)]/85'
                          : 'border-[rgba(243,241,236,.09)] bg-[color:var(--color-ink-900)]/70 hover:border-[rgba(243,241,236,.2)]',
                      )}
                    >
                      {entry.featured ? (
                        <span className="mb-4 inline-flex w-fit rounded-pill bg-[var(--accent)]/12 px-2.5 py-1 font-mono text-[0.5625rem] uppercase tracking-[0.16em] text-[var(--accent)]">
                          Most requested
                        </span>
                      ) : null}
                      <h3 className="font-display text-[1.2rem] leading-tight tracking-[-0.02em] text-fg">{entry.name}</h3>
                      <p className="mt-2.5 text-[0.875rem] leading-relaxed text-fg-muted">{entry.summary}</p>

                      <ul className="mt-5 flex-1 space-y-2.5">
                        {entry.includes.map((line) => (
                          <li key={line} className="flex items-start gap-2.5 text-[0.875rem] leading-snug text-fg-muted">
                            <Icon name="check" size={13} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                            <span>{line}</span>
                          </li>
                        ))}
                      </ul>

                      <p className="mt-5 border-t border-[rgba(243,241,236,.08)] pt-4 text-[0.75rem] leading-relaxed text-fg-dim">
                        <span className="text-fg-muted">Best for:</span> {entry.bestFor}
                      </p>
                      <p className="mt-1 font-mono text-[0.5625rem] uppercase tracking-[0.16em] text-[var(--accent)]">Quoted per project</p>
                    </article>
                  </FadeIn>
                ))}
              </ul>
            </div>
          </Section>
        ))}

        {/* What moves the number: stated plainly so nobody has to guess. */}
        <Section id="quote" size="compact">
          <div className="container-page">
            <SectionHeader
              eyebrow="How quotes work"
              title="What shapes the figure"
              lede="Five things decide the cost of a production. Send them with your enquiry and the quote comes back accurate the first time."
            />
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {MEDIA_QUOTE_FACTORS.map((factor, index) => (
                <FadeIn key={factor.label} as="li" delay={index * 60}>
                  <div className="flex h-full flex-col rounded-4 border border-[rgba(243,241,236,.08)] bg-[color:var(--color-ink-900)]/60 p-5">
                    <span className="font-mono text-[0.5625rem] uppercase tracking-[0.18em] text-[var(--accent)]">{factor.label}</span>
                    <p className="mt-3 text-[0.875rem] leading-relaxed text-fg-muted">{factor.body}</p>
                  </div>
                </FadeIn>
              ))}
            </ul>
          </div>
        </Section>

        {/* The same five-step process as the main page, so pricing never floats free of it. */}
        <Section tone="raised" size="compact">
          <div className="container-page">
            <SectionHeader eyebrow="How it runs" title="The same five steps, every time" />
            <ol className="mt-10 grid gap-4 md:grid-cols-3 lg:grid-cols-5">
              {MEDIA_PROCESS.map((step) => (
                <li key={step.step} className="rounded-4 border border-[rgba(243,241,236,.08)] bg-[color:var(--color-ink-950)]/60 p-5">
                  <span className="font-mono text-[1.5rem] leading-none text-[var(--accent)]/35">{step.step}</span>
                  <h3 className="mt-3 font-display text-[1rem] leading-tight tracking-[-0.02em]">{step.title}</h3>
                  <p className="mt-2 text-[0.8125rem] leading-relaxed text-fg-muted">{step.body}</p>
                </li>
              ))}
            </ol>

            <div className="mt-10 rounded-4 border border-[rgba(243,241,236,.1)] bg-[color:var(--color-ink-900)]/70 p-6 backdrop-blur md:p-8">
              <div className="flex flex-wrap items-center justify-between gap-6">
                <div className="min-w-0">
                  <p className="eyebrow">Next step</p>
                  <p className="mt-3 max-w-xl text-[1.0625rem] leading-relaxed text-fg">
                    Send the date, the location and what the footage is for. You will get a fixed quote and a clear plan for the day.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button href="/media#contact" iconEnd="arrow-right">
                    Start a Project
                  </Button>
                  <Button href={whatsappHref} variant="outline" icon="whatsapp" newTab>
                    WhatsApp
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Section>
      </main>

      <SiteFooter
        surface="media"
        wordmark={{ primary: brandName, secondary: 'Media Portfolio' }}
        nav={ctx.nav.media_footer ?? []}
        socials={socials}
        contact={{
          email: studio.email,
          phone: studio.phone,
          whatsappHref,
          whatsappLabel: MEDIA_STUDIO.whatsappLabel,
          location: studio.location,
          responseTime: (contact.responseTime as string) ?? null,
        }}
        cta={{
          headline: 'Not sure which package fits?',
          body: 'Describe the project and I will recommend the right scope, then quote it.',
          primary: { label: 'Ask a question', href: '/media#contact' },
        }}
        legal={{
          privacyHref: '/security',
          termsHref: '/security#working-terms',
          brandLine: String(settings['brand.legal_name'] ?? '').trim() || brandName,
          tagline: MEDIA_STUDIO.statement,
        }}
      />

      <MediaBackToTop />
      <SiteBehaviours division="media" />
      <LightboxHost />
    </div>
  );
}
