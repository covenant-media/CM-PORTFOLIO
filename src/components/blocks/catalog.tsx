import Link from 'next/link';
import type { Props } from './helpers';
import { pb, ps, pn, pstrs, safeHref } from './helpers';
import { Section, SectionHeader, Eyebrow, EmptyState, SampleTag, StatBlock } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { CmImage } from '@/components/ui/Media';
import { MarqueeBand } from '@/components/ui/Marquee';
import { WorkGrid } from '@/components/site/WorkCard';
import { cx, truncate } from '@/lib/utils/text';
import { blockProps } from '@/lib/cms/blocks';
import type { SectionData, ServiceItem } from '@/lib/types/content';
import { projectCards, crossDisciplineWork } from '@/lib/cms/content';
import { SpotlightCard, FadeIn, CountUp } from '@/components/ui/Motion';
import { renderMarkdown } from '@/lib/utils/markdown';

/* ── two worlds ───────────────────────────────────────────────────────────── */
export async function TwoWorlds({ block }: { block: { props: Props; headline: string | null; eyebrow: string | null; body: string | null } }) {
  const props = blockProps('two_worlds', block.props);
  const [media, tech] = await Promise.all([projectCards({ division: 'media', limit: 1 }), projectCards({ division: 'tech', limit: 1 })]);
  return (
    <Section>
      <div className="container-page">
        <SectionHeader eyebrow={block.eyebrow ?? 'Two disciplines'} title={block.headline ?? 'One studio. Two disciplines.'} lede={block.body} />
        <div className="mt-12 grid gap-5 md:grid-cols-2 md:gap-6">
          {[
            {
              tone: 'media',
              title: ps(props, 'mediaTitle', 'Media'),
              blurb: ps(props, 'mediaBlurb'),
              href: safeHref(ps(props, 'mediaHref', '/media'), '/media'),
              icon: 'film',
              sample: media.cards[0],
              count: media.total,
            },
            {
              tone: 'tech',
              title: ps(props, 'techTitle', 'Technology'),
              blurb: ps(props, 'techBlurb'),
              href: safeHref(ps(props, 'techHref', '/tech'), '/tech'),
              icon: 'code',
              sample: tech.cards[0],
              count: tech.total,
            },
          ].map((world) => (
            <FadeIn key={world.tone}>
              <Link
                href={world.href}
                className={cx(
                  'theme-ctx group relative flex h-full min-h-[22rem] flex-col justify-between overflow-hidden rounded-4 border border-[rgba(243,241,236,.1)] bg-[var(--color-ink-900)] p-6 transition duration-500 hover:-translate-y-1 hover:border-[rgba(243,241,236,.2)] hover:shadow-[var(--shadow-lift)] md:p-8',
                  `theme-${world.tone}`,
                )}
                data-analytics="cta_click"
                data-analytics-target={world.href}
              >
                <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-700 group-hover:opacity-100" style={{ backgroundImage: 'var(--surface-tone)' }} />
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Eyebrow>{world.tone === 'media' ? 'Media portfolio' : 'Tech portfolio'}</Eyebrow>
                    <p className={cx('mt-4 font-display text-[clamp(1.8rem,3.4vw,2.6rem)] leading-[1.05] tracking-[-0.03em]', world.tone === 'tech' && 'font-mono text-[clamp(1.1rem,2.2vw,1.6rem)] uppercase tracking-[0.02em]')}>
                      {world.title}
                    </p>
                  </div>
                  <span className="grid size-10 shrink-0 place-items-center rounded-full border border-[rgba(243,241,236,.12)] text-[var(--accent)]">
                    <Icon name={world.icon} size={18} />
                  </span>
                </div>

                {world.blurb ? <p className="mt-4 max-w-md text-[0.9375rem] leading-relaxed text-fg-muted">{world.blurb}</p> : null}

                <div className="mt-8 flex items-end justify-between gap-4">
                  <span className="tnum font-mono text-[0.625rem] uppercase tracking-[0.14em] text-fg-dim">
                    {pb(props, 'showCounts', true) ? `${world.count} published project${world.count === 1 ? '' : 's'}` : ''}
                  </span>
                  <span className="inline-flex items-center gap-2 text-[0.9375rem] font-medium text-[var(--accent)]">
                    Enter <Icon name="arrow-right" size={16} className="transition-transform duration-500 group-hover:translate-x-1.5" />
                  </span>
                </div>

                {world.sample ? (
                  <div aria-hidden className="absolute bottom-0 right-0 hidden w-[38%] translate-x-6 translate-y-6 rotate-[6deg] overflow-hidden rounded-3 border border-[rgba(243,241,236,.14)] shadow-[var(--shadow-3)] transition-transform duration-700 group-hover:translate-x-3 group-hover:translate-y-3 md:block">
                    <CmImage asset={world.sample.cover} alt={world.sample.title} seed={world.sample.slug} ratio="wide" rounded="rounded-none" tone={world.tone as 'media' | 'tech'} />
                  </div>
                ) : null}
              </Link>
            </FadeIn>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ── statement / manifesto ────────────────────────────────────────────────── */
export function Statement({ block, index }: { block: { props: Props; headline: string | null; eyebrow: string | null; body: string | null; isSample: boolean }; index?: number }) {
  const props = blockProps('statement', block.props);
  const variant = ps(props, 'variant', 'default');
  const emphasis = ps(props, 'emphasis');
  const body = (
    <div className={cx(variant === 'split' ? 'grid gap-8 md:grid-cols-2 md:gap-16' : 'max-w-4xl')}>
      {block.eyebrow ? <Eyebrow index={index}>{block.eyebrow}</Eyebrow> : null}
      {block.headline ? (
        <p className={cx('mt-6 font-display leading-[1.06] tracking-[-0.032em]', variant === 'split' ? 'text-[clamp(1.7rem,3.2vw,2.6rem)]' : 'text-[clamp(1.9rem,4.4vw,3.5rem)]')}>
          {block.headline}
        </p>
      ) : null}
      <div className={cx(variant === 'split' ? 'space-y-6' : '')}>
        {emphasis ? <p className="font-display text-[clamp(1.3rem,2.4vw,2rem)] leading-snug tracking-[-0.02em] text-[var(--accent)]">{emphasis}</p> : null}
        {block.body ? <p className="lede max-w-2xl">{block.body}</p> : null}
      </div>
    </div>
  );
  if (variant === 'paper') {
    return (
      <Section tone="paper" className="on-paper">
        <div className="container-page">{body}</div>
      </Section>
    );
  }
  return (
    <Section className="relative">
      {pb(props, 'showRule', true) ? <div aria-hidden className="container-page mb-12 h-px bg-[rgba(243,241,236,.1)]" /> : null}
      <div className="container-page">{body}</div>
    </Section>
  );
}

/* ── service grid ─────────────────────────────────────────────────────────── */
export function ServiceGrid({ block, services }: { block: { props: Props; headline: string | null; eyebrow: string | null; body: string | null; links: { label: string; href: string; variant?: string }[] }; services: ServiceItem[] }) {
  const props = blockProps('service_grid', block.props);
  const layout = ps(props, 'layout', 'grid');
  const showBullets = pb(props, 'showBullets', true);
  const showPrice = pb(props, 'showPrice', false);
  const limit = pn(props, 'limit', 8);
  const items = services.slice(0, limit || services.length);
  const cta = block.links[0];

  if (!items.length) {
    return (
      <Section>
        <div className="container-page">
          <SectionHeader eyebrow={block.eyebrow ?? 'Services'} title={block.headline ?? 'What Covenant does'} />
          <EmptyState className="mt-8" icon="briefcase" title="No services published yet" body="Add services in the CMS under Services → New service. Each one can be scoped to the brand site, the Media portfolio or the Tech portfolio." />
        </div>
      </Section>
    );
  }

  return (
    <Section>
      <div className="container-page">
        <SectionHeader
          eyebrow={block.eyebrow ?? 'Capabilities'}
          title={block.headline ?? 'Services'}
          lede={block.body}
          index={undefined}
          align={layout === 'list' ? 'split' : 'left'}
          action={cta ? <Button href={safeHref(cta.href)} variant="outline" iconEnd="arrow-right">{cta.label}</Button> : null}
        />

        {layout === 'list' ? (
          <ul className="mt-12">
            {items.map((service, i) => (
              <li key={service.id}>
                <Link href={pb(props, 'linkToDetail', true) ? `/services/${service.slug}` : '#services'} className="group grid gap-3 border-b border-[rgba(243,241,236,.09)] py-6 transition-colors hover:border-[rgba(243,241,236,.2)] md:grid-cols-[auto_1fr_auto] md:items-baseline md:gap-8">
                  <span className="tnum font-mono text-[0.6875rem] text-fg-dim">{String(i + 1).padStart(2, '0')}</span>
                  <span className="min-w-0">
                    <span className="block font-display text-xl tracking-[-0.02em] transition-colors group-hover:text-[var(--accent)] md:text-[1.6rem]">{service.title}</span>
                    {service.summary ? <span className="mt-1.5 block max-w-2xl text-[0.9375rem] leading-relaxed text-fg-muted">{service.summary}</span> : null}
                  </span>
                  <span className="flex items-center gap-4">
                    {showPrice && service.priceNote ? <span className="hidden font-mono text-[0.625rem] uppercase tracking-[0.12em] text-fg-dim lg:inline">{truncate(service.priceNote, 40)}</span> : null}
                    <Icon name="arrow-up-right" size={16} className="text-fg-dim transition duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-fg" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className={cx('mt-12 grid gap-5', layout === 'stack' ? 'md:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3', layout === 'grid' && 'lg:[&>*:first-child]:col-span-2')}>
            {items.map((service, i) => (
              <FadeIn key={service.id} delay={i * 50}>
                <SpotlightCard className="h-full rounded-4 border border-[rgba(243,241,236,.09)] bg-[var(--color-ink-900)] transition duration-500 hover:border-[rgba(243,241,236,.18)]">
                  <div className="relative flex h-full flex-col p-6 md:p-7">
                    <div className="flex items-start justify-between gap-4">
                      <span className="grid size-9 place-items-center rounded-full border border-[rgba(243,241,236,.12)] text-[var(--accent)]">
                        <Icon name={serviceIconName(i)} size={17} />
                      </span>
                      {service.isSample ? <SampleTag /> : null}
                    </div>
                    <h3 className="mt-5 font-display text-[1.35rem] leading-tight tracking-[-0.02em]">{service.title}</h3>
                    {service.summary ? <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-fg-muted">{service.summary}</p> : null}
                    {showBullets && service.bullets.length ? (
                      <ul className="mt-5 space-y-2 border-t border-[rgba(243,241,236,.08)] pt-4">
                        {service.bullets.slice(0, 5).map((bullet) => (
                          <li key={bullet} className="flex gap-2.5 text-[0.875rem] text-fg-muted">
                            <Icon name="check" size={14} className="mt-0.5 shrink-0 text-[var(--accent)] opacity-80" />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <div className="mt-auto flex items-end justify-between gap-4 pt-6">
                      {showPrice ? <span className="font-mono text-[0.625rem] uppercase tracking-[0.12em] text-fg-dim">{service.priceNote || 'Quote-based'}</span> : null}
                      {pb(props, 'linkToDetail', true) ? (
                        <span className="ml-auto inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-[var(--accent)]">
                          Details <Icon name="arrow-right" size={14} />
                        </span>
                      ) : null}
                    </div>
                  </div>
                </SpotlightCard>
              </FadeIn>
            ))}
          </div>
        )}
      </div>
    </Section>
  );
}

function serviceIconName(index: number): string {
  return ['film', 'code', 'palette', 'shield', 'wand', 'camera', 'cpu', 'chart'][index % 8]!;
}

/* ── project grid ─────────────────────────────────────────────────────────── */
export async function ProjectGrid({ block }: { block: { props: Props; headline: string | null; eyebrow: string | null; body: string | null; links: { label: string; href: string }[] } }) {
  const props = blockProps('project_grid', block.props);
  const division = ps(props, 'division', 'all');
  const limit = pn(props, 'limit', 8);
  const layout = ps(props, 'layout', 'grid');
  const showVideos = pb(props, 'showVideos', true);
  const ctaLabel = ps(props, 'ctaLabel');
  const ctaHref = ps(props, 'ctaHref');

  const data = division === 'all' ? { cards: await crossDisciplineWork(limit), total: 0 } : await projectCards({ division: division as 'media' | 'tech', limit, featured: pb(props, 'featuredOnly', false) ? true : undefined, category: ps(props, 'category') || undefined });
  const projects = 'cards' in data ? data.cards : [];

  return (
    <Section>
      <div className="container-page">
        <SectionHeader
          eyebrow={block.eyebrow ?? 'Selected work'}
          title={block.headline ?? 'Work that had to survive both rooms'}
          lede={block.body}
          align="split"
          action={ctaHref ? <Button href={safeHref(ctaHref)} variant="ghost" iconEnd="arrow-right">{ctaLabel || 'All work'}</Button> : null}
        />
        {projects.length ? (
          <div className="mt-12">
            <WorkGrid projects={projects} layout={layout as 'grid' | 'wide' | 'list' | 'mosaic'} showVideos={showVideos} />
          </div>
        ) : (
          <EmptyState className="mt-10" icon="layers" title="Nothing published in this collection yet" body="Create projects in the CMS (Media projects or Tech projects) and publish them — featured ones appear here first." />
        )}
      </div>
    </Section>
  );
}

/* ── marquee / stats ──────────────────────────────────────────────────────── */
export function LogoMarquee({ block }: { block: { props: Props } }) {
  const props = blockProps('logo_marquee', block.props);
  const items = pstrs(props, 'items');
  if (!items.length) return null;
  return <MarqueeBand items={items} duration={pn(props, 'speed', 42)} reverse={pb(props, 'reverse', false)} className="my-2" />;
}

export function StatsBand({ block, autoCounts }: { block: { props: Props; headline: string | null; eyebrow: string | null; body: string | null }; autoCounts?: { media: number; tech: number; posts: number } }) {
  const props = blockProps('stats_band', block.props);
  const items = (props.items as Record<string, unknown>[]) ?? [];
  const auto: Record<string, unknown>[] =
    pb(props, 'autoCounts', false) && autoCounts
      ? [
          { value: String(autoCounts.media), label: 'Media projects' },
          { value: String(autoCounts.tech), label: 'Tech projects' },
          { value: String(autoCounts.posts), label: 'Articles' },
        ]
      : [];
  const rows = [...items, ...auto].filter((s) => s && (s.value || s.label));
  if (!rows.length) return null;
  return (
    <Section size="tight">
      <div className="container-page">
        <div className="grid gap-8 border-y border-[rgba(243,241,236,.09)] py-8 sm:grid-cols-2 md:grid-cols-4 md:py-10">
          {rows.slice(0, 8).map((stat, i) => (
            <StatBlock key={`${stat.label}-${i}`} value={String(stat.value ?? '—')} label={String(stat.label ?? '')} note={stat.note ? String(stat.note) : null} animate={pb(props, 'animate', true)} />
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ── about split ──────────────────────────────────────────────────────────── */
export function AboutSplit({
  block,
  portrait,
  name,
  socials,
}: {
  block: SectionData;
  portrait?: import('@/lib/types/content').AssetRef | null;
  name?: string;
  socials?: { network: string; url: string; label: string | null }[];
}) {
  const props = blockProps('about_split', block.props);
  const bullets = pstrs(props, 'bullets');
  const reverse = ps(props, 'align', 'default') === 'reverse';
  const image = block.media.find((m) => m.asset)?.asset ?? portrait ?? null;
  return (
    <Section>
      <div className="container-page">
        <div className={cx('grid items-center gap-10 md:gap-14 lg:grid-cols-2', reverse && 'lg:[&>*:first-child]:order-2')}>
          <div>
            <Eyebrow>{block.eyebrow ?? 'About'}</Eyebrow>
            {block.headline ? <h2 className="display-2 mt-5">{block.headline}</h2> : null}
            {block.body ? <div className="prose-cm mt-6 max-w-xl" dangerouslySetInnerHTML={{ __html: renderMarkdown(block.body) }} /> : null}
            {bullets.length ? (
              <ul className="mt-7 space-y-3 border-t border-[rgba(243,241,236,.09)] pt-6">
                {bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-3 text-[0.9375rem] text-fg-muted">
                    <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                    {bullet}
                  </li>
                ))}
              </ul>
            ) : null}
            {props.signature || name ? (
              <p className="mt-8 font-display text-xl italic tracking-[-0.01em] text-fg">{String(props.signature ?? name)}</p>
            ) : null}
            {pb(props, 'showSocial', false) && socials?.length ? (
              <ul className="mt-6 flex flex-wrap gap-2">
                {socials.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-2 rounded-pill border border-[rgba(243,241,236,.12)] px-3 py-1.5 text-[0.8125rem] text-fg-muted transition hover:text-fg">
                      <Icon name={s.network} size={14} /> {s.label ?? s.network}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
            {block.links[0] ? (
              <div className="mt-8">
                <Button href={safeHref(block.links[0].href)} variant="outline" iconEnd="arrow-right">
                  {block.links[0].label}
                </Button>
              </div>
            ) : null}
          </div>
          <div className="relative">
            <CmImage asset={image ?? null} alt={name ?? block.headline ?? 'Portrait'} seed={name ?? 'about'} ratio="tall" priority sizes="(max-width:1024px) 92vw, 44vw" className="rounded-4" />
            <div aria-hidden className="absolute -bottom-4 -right-4 -z-10 h-2/3 w-2/3 rounded-4 border border-[rgba(243,241,236,.1)]" />
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ── rich text ────────────────────────────────────────────────────────────── */
export async function RichText({ block, settings }: { block: { props: Props; headline: string | null; eyebrow: string | null; body: string | null }; settings: Record<string, string | number | boolean | null> }) {
  const props = blockProps('rich_text', block.props);
  let body = block.body ?? '';
  if (ps(props, 'source', 'body') === 'setting') {
    const key = ps(props, 'settingKey');
    body = key ? String(settings[key] ?? '') : '';
  }
  const wide = ps(props, 'width', 'default') === 'wide';
  return (
    <Section>
      <div className="container-page">
        <div className={cx(wide ? '' : 'container-read')}>
          {block.eyebrow ? <Eyebrow>{block.eyebrow}</Eyebrow> : null}
          {block.headline ? <h2 className="display-3 mt-5">{block.headline}</h2> : null}
          <div className={cx('prose-cm mt-7', wide ? 'max-w-none columns-1 md:columns-2 md:gap-12' : '')} dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }} />
        </div>
      </div>
    </Section>
  );
}

