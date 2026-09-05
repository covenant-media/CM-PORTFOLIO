import Link from 'next/link';
import { Section, SectionHeader, Eyebrow, EmptyState, SampleTag } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { FadeIn } from '@/components/ui/Motion';
import { blockProps } from '@/lib/cms/blocks';
import { cx, formatDate, formatBytes, truncate } from '@/lib/utils/text';
import type { CertificationItem, PricingPackage, ResumeInfo, TestimonialItem } from '@/lib/types/content';
import { pb, ps, pn } from './helpers';
import type { Props } from './helpers';

function Author({ item }: { item: TestimonialItem }) {
  const line = [item.authorName, item.authorRole, item.authorOrg].filter(Boolean).join(' · ');
  return (
    <div className="mt-5 flex items-center gap-3 border-t border-[rgba(243,241,236,.09)] pt-4">
      {item.avatar?.url ? (
        <img src={item.avatar.url} alt={item.authorName ?? ''} className="size-9 rounded-full object-cover" loading="lazy" width={36} height={36} />
      ) : item.authorName ? (
        <span className="grid size-9 shrink-0 place-items-center rounded-full border border-[rgba(243,241,236,.14)] font-mono text-[0.6875rem] text-fg-muted">
          {item.authorName.slice(0, 1).toUpperCase()}
        </span>
      ) : null}
      <div className="min-w-0">
        <p className="truncate text-[0.875rem] text-fg">{line || 'Name withheld'}</p>
        {item.location ? <p className="truncate font-mono text-[0.625rem] uppercase tracking-[0.14em] text-fg-dim">{item.location}</p> : null}
      </div>
      {item.rating ? (
        <span className="ml-auto flex shrink-0 gap-0.5" aria-label={`${item.rating} out of 5`}>
          {Array.from({ length: item.rating }).map((_, i) => (
            <Icon key={i} name="star" size={11} className="text-[var(--accent)]" filled />
          ))}
        </span>
      ) : null}
    </div>
  );
}

export function TestimonialWall({ block, items }: { block: { props: Props; headline: string | null; eyebrow: string | null; body: string | null }; items: TestimonialItem[] }) {
  const props = blockProps('testimonial_wall', block.props);
  const layout = ps(props, 'layout', 'wall');

  if (!items.length) {
    return (
      <Section>
        <div className="container-page">
          <SectionHeader eyebrow={block.eyebrow ?? 'Referred work'} title={block.headline ?? 'What clients say'} />
          <EmptyState
            className="mt-10"
            icon="quote"
            compact
            title="Nothing to quote yet"
            body="Real testimonials are added in the CMS → Testimonials. They will not appear until you publish them, so nothing here is invented."
          />
        </div>
      </Section>
    );
  }

  if (layout === 'featured') {
    const item = items[0]!;
    return (
      <Section>
        <div className="container-page">
          <figure className="mx-auto max-w-4xl text-center">
            <Icon name="quote" size={26} className="mx-auto text-[var(--accent)] opacity-60" />
            <blockquote className="mt-7 font-display text-[clamp(1.5rem,3.4vw,2.5rem)] leading-[1.22] tracking-[-0.025em]">
              {item.quote}
            </blockquote>
            <figcaption className="mt-7 text-[0.875rem] text-fg-muted">
              {[item.authorName, item.authorRole, item.authorOrg].filter(Boolean).join(' · ') || 'Client'}
              {item.isSample ? <SampleTag className="ml-3 align-middle" /> : null}
            </figcaption>
            {items.length > 1 ? (
              <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-fg-dim">
                {items.slice(1, 4).map((other) => (
                  <li key={other.id} className="max-w-xs truncate">
                    “{truncate(other.quote, 54)}”
                  </li>
                ))}
              </ul>
            ) : null}
          </figure>
        </div>
      </Section>
    );
  }

  if (layout === 'carousel') {
    return (
      <Section>
        <div className="container-page">
          <SectionHeader eyebrow={block.eyebrow ?? 'Referred work'} title={block.headline ?? 'What clients say'} lede={block.body} />
          <ul className="mt-10 -mx-[4.5vw] flex snap-x snap-mandatory gap-4 overflow-x-auto px-[4.5vw] pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {items.map((item) => (
              <li key={item.id} className="w-[86vw] max-w-md shrink-0 snap-center rounded-4 border border-[rgba(243,241,236,.09)] bg-[var(--color-ink-900)] p-6 sm:w-[60vw] md:w-[42vw]">
                <blockquote className="font-display text-[1.15rem] leading-snug tracking-[-0.018em] text-fg">“{item.quote}”</blockquote>
                <Author item={item} />
              </li>
            ))}
          </ul>
        </div>
      </Section>
    );
  }

  return (
    <Section>
      <div className="container-page">
        <SectionHeader eyebrow={block.eyebrow ?? 'Referred work'} title={block.headline ?? 'What clients say'} lede={block.body} />
        <ul className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {items.slice(0, pn(props, 'limit', 6)).map((item, i) => (
            <FadeIn key={item.id} delay={(i % 3) * 70} as="li" className="h-full">
              <figure className="relative flex h-full flex-col rounded-4 border border-[rgba(243,241,236,.09)] bg-[var(--color-ink-900)] p-6">
                <span aria-hidden className="font-display text-4xl leading-none text-[var(--accent)] opacity-40">“</span>
                <blockquote className={cx('mt-3 flex-1 text-[1rem] leading-relaxed text-fg', item.isSample && 'opacity-80')}>{item.quote}</blockquote>
                {item.isSample ? <SampleTag className="mt-4 self-start" /> : null}
                <Author item={item} />
              </figure>
            </FadeIn>
          ))}
        </ul>
      </div>
    </Section>
  );
}

/* ── pricing ──────────────────────────────────────────────────────────────── */
export function PricingTable({
  block,
  packages,
  note,
}: {
  block: { props: Props; headline: string | null; eyebrow: string | null; body: string | null };
  packages: PricingPackage[];
  note?: string | null;
}) {
  const props = blockProps('pricing_table', block.props);
  const ctaLabel = ps(props, 'ctaLabel', 'Request a quote');
  const ctaHref = ps(props, 'ctaHref', '/media/contact');

  if (!packages.length) {
    return (
      <Section id="pricing">
        <div className="container-page">
          <SectionHeader eyebrow={block.eyebrow ?? 'Investment'} title={block.headline ?? 'Pricing is a conversation, not a menu'} lede={block.body ?? note ?? undefined} />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              { title: 'Scoped per engagement', body: 'Length, crew, location and turnaround set the number. Nothing is padded and nothing is hidden.' },
              { title: 'Fixed once agreed', body: 'You get one page: deliverables, dates, price, revision rounds. Changes are quoted, never assumed.' },
              { title: 'Pay in stages', body: 'A deposit books the date, the balance lands before final handover of masters.' },
            ].map((card) => (
              <div key={card.title} className="rounded-4 border border-[rgba(243,241,236,.09)] bg-[var(--color-ink-900)] p-6">
                <h3 className="font-display text-[1.15rem] tracking-[-0.02em]">{card.title}</h3>
                <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-fg-muted">{card.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <Button href={ctaHref} iconEnd="arrow-right">
              {ctaLabel}
            </Button>
          </div>
        </div>
      </Section>
    );
  }

  return (
    <Section id="pricing">
      <div className="container-page">
        <SectionHeader eyebrow={block.eyebrow ?? 'Investment'} title={block.headline ?? 'Packages'} lede={block.body} />
        <ul className={cx('mt-12 grid gap-5', packages.length > 2 ? 'lg:grid-cols-3' : 'lg:grid-cols-2')}>
          {packages.map((pkg, i) => (
            <FadeIn key={pkg.id} delay={i * 70} as="div" className="h-full">
              <div
                className={cx(
                  'relative flex h-full flex-col rounded-4 border p-6 md:p-7',
                  pkg.isFeatured
                    ? 'border-[color-mix(in_oklab,var(--accent)_45%,transparent)] bg-[color-mix(in_oklab,var(--accent)_7%,var(--color-ink-900))]'
                    : 'border-[rgba(243,241,236,.09)] bg-[var(--color-ink-900)]',
                )}
              >
                {pkg.isFeatured ? (
                  <span className="absolute -top-2.5 left-6 rounded-pill bg-[var(--accent)] px-2.5 py-0.5 font-mono text-[0.5625rem] uppercase tracking-[0.16em] text-[var(--accent-ink)]">
                    Most booked
                  </span>
                ) : null}
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-[1.35rem] leading-tight tracking-[-0.02em]">{pkg.name}</h3>
                  {pkg.isSample ? <SampleTag /> : null}
                </div>
                {pkg.tagline ? <p className="mt-2 text-[0.9375rem] text-fg-muted">{pkg.tagline}</p> : null}

                <p className="mt-6 flex items-baseline gap-2">
                  <span className="tnum font-display text-[clamp(1.6rem,3vw,2.2rem)] leading-none tracking-[-0.03em]">
                    {pkg.priceLabel ?? 'On request'}
                  </span>
                  {pkg.priceLabel && pkg.mode === 'day_rate' ? <span className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-fg-dim">per day</span> : null}
                </p>

                {pkg.includes.length ? (
                  <ul className="mt-6 space-y-2.5 border-t border-[rgba(243,241,236,.09)] pt-5">
                    {pkg.includes.map((line) => (
                      <li key={line} className="flex gap-2.5 text-[0.9rem] text-fg-muted">
                        <Icon name="check" size={14} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {pkg.exclusions.length ? (
                  <ul className="mt-4 space-y-2">
                    {pkg.exclusions.map((line) => (
                      <li key={line} className="flex gap-2.5 text-[0.8125rem] text-fg-dim line-through decoration-[rgba(243,241,236,.2)]">
                        <Icon name="minus" size={13} className="mt-0.5 shrink-0" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-6">
                  {pkg.turnaround ? <span className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-fg-dim">{pkg.turnaround}</span> : null}
                  <Button href={ctaHref} size="sm" variant={pkg.isFeatured ? 'primary' : 'outline'} data-analytics="cta_click" data-analytics-target={ctaHref}>
                    {pkg.priceLabel ? ctaLabel : 'Get a quote'}
                  </Button>
                </div>
                {pkg.notes ? <p className="mt-4 text-[0.75rem] leading-relaxed text-fg-dim">{pkg.notes}</p> : null}
              </div>
            </FadeIn>
          ))}
        </ul>
        {pb(props, 'showNote', true) && note ? (
          <p className="mt-8 max-w-2xl text-[0.875rem] leading-relaxed text-fg-dim">{note}</p>
        ) : null}
      </div>
    </Section>
  );
}

/* ── certifications ───────────────────────────────────────────────────────── */
export function Certifications({ block, items }: { block: { props: Props; headline: string | null; eyebrow: string | null; body: string | null }; items: CertificationItem[] }) {
  if (!items.length) return null;
  return (
    <Section size="tight">
      <div className="container-page">
        <SectionHeader eyebrow={block.eyebrow ?? 'Credentials'} title={block.headline ?? 'Certifications & training'} lede={block.body} />
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((cert) => (
            <li key={cert.id} className="rounded-4 border border-[rgba(243,241,236,.09)] bg-[var(--color-ink-900)] p-5">
              <div className="flex items-start justify-between gap-3">
                <span className={cx('inline-flex items-center gap-1.5 rounded-pill px-2 py-0.5 font-mono text-[0.5625rem] uppercase tracking-[0.14em]', cert.completed ? 'bg-[rgba(116,201,160,.14)] text-[var(--color-ok-400)]' : 'bg-[rgba(243,241,236,.06)] text-fg-dim')}>
                  <Icon name={cert.completed ? 'check' : 'clock'} size={11} /> {cert.displayLabel}
                </span>
                {cert.verifyUrl && cert.completed ? (
                  <a href={cert.verifyUrl} target="_blank" rel="noopener noreferrer nofollow" className="shrink-0 text-fg-dim transition hover:text-fg" aria-label={`Verify ${cert.name}`}>
                    <Icon name="external" size={14} />
                  </a>
                ) : null}
              </div>
              <p className="mt-4 text-[0.9375rem] leading-snug text-fg">{cert.name}</p>
              {cert.issuer ? <p className="mt-1 text-[0.8125rem] text-fg-muted">{cert.issuer}</p> : null}
              {cert.description ? <p className="mt-3 text-[0.8125rem] leading-relaxed text-fg-dim">{cert.description}</p> : null}
            </li>
          ))}
        </ul>
        <p className="mt-5 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-fg-dim">
          Only completed, verifiable credentials are shown as earned.
        </p>
      </div>
    </Section>
  );
}

/* ── resume ───────────────────────────────────────────────────────────────── */
export function ResumeBlock({ block, resume }: { block: { props: Props; headline: string | null; eyebrow: string | null; body: string | null }; resume: ResumeInfo }) {
  if (!resume.available || !resume.url) return null;
  const props = blockProps('resume_block', block.props);
  const showMeta = pb(props, 'showMeta', true);
  return (
    <Section size="tight">
      <div className="container-page">
        <div className="flex flex-col items-start justify-between gap-6 rounded-4 border border-[rgba(243,241,236,.1)] bg-[var(--color-ink-900)] p-6 md:flex-row md:items-center md:p-8">
          <div className="flex items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-3 border border-[rgba(243,241,236,.12)] text-[var(--accent)]">
              <Icon name="download" size={19} />
            </span>
            <div>
              <Eyebrow>{block.eyebrow ?? 'Résumé'}</Eyebrow>
              <p className="mt-2.5 font-display text-[1.3rem] leading-tight tracking-[-0.02em]">{block.headline ?? resume.label ?? 'Download the current résumé'}</p>
              {showMeta ? (
                <p className="mt-2 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-fg-dim">
                  {[resume.version ? `v${resume.version}` : null, resume.publishedAt ? formatDate(resume.publishedAt, 'medium') : null, resume.bytes ? formatBytes(resume.bytes) : 'PDF'].filter(Boolean).join(' · ')}
                </p>
              ) : null}
              {block.body ? <p className="mt-3 max-w-xl text-[0.9375rem] text-fg-muted">{block.body}</p> : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Button href={resume.url} icon="download" download data-analytics="cta_click" data-analytics-target="resume_download">
              {ps(props, 'ctaLabel', 'Download résumé')}
            </Button>
            <Link href="/tech/contact" className="text-[0.875rem] text-fg-muted underline-offset-4 transition hover:text-fg hover:underline">
              or enquire directly
            </Link>
          </div>
        </div>
      </div>
    </Section>
  );
}
