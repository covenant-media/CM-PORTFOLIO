import Link from 'next/link';
import Image from 'next/image';
import { MaskReveal, DecodeText, Tilt } from '@/components/ui/Motion';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { CmImage, plainSrc, PosterFallback } from '@/components/ui/Media';
import { MediaTile } from '@/components/ui/MediaTile';
import { Eyebrow, SampleTag } from '@/components/ui/Section';
import { cx, truncate } from '@/lib/utils/text';
import type { PageData, ProjectCard, SectionData, SiteContext, VideoRef } from '@/lib/types/content';
import { blockProps } from '@/lib/cms/blocks';
import { pb, pstrs, ps, pn } from './helpers';

type Settings = SiteContext['settings'];

function setting(settings: Settings, key: string, fallback = ''): string {
  const value = settings[key];
  return value === null || value === undefined || value === '' ? fallback : String(value);
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN BRAND HERO — "two worlds, one studio"
   ═════════════════════════════════════════════════════════════════════════ */
export async function HeroBrand({
  block,
  settings,
  work,
  counts,
}: {
  block: SectionData;
  settings: Settings;
  work: ProjectCard[];
  counts: { media: number; tech: number };
}) {
  const props = blockProps('hero_brand', block.props);
  const mediaVideos = work.filter((p) => p.division === 'media').flatMap((p) => p.videos.slice(0, 1));
  const statement = ps(props, 'statement', setting(settings, 'brand.statement'));
  const showPaths = pb(props, 'showPathways', true);
  const showStats = pb(props, 'showStats', true);
  const variant = ps(props, 'variant', 'stacked');

  return (
    <section className="relative isolate overflow-hidden pb-10 pt-24 md:pb-16 md:pt-32 lg:pt-36" data-hero>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-40 -z-10 h-[70vh]">
        <div className="halo absolute left-1/2 top-0 h-full w-[130vw] -translate-x-1/2 opacity-70" />
      </div>

      <div className="container-page">
        <div className={cx('grid gap-12 lg:grid-cols-12 lg:gap-10', variant === 'collage' && 'lg:items-end')}>
          <div className={cx('relative min-w-0', variant === 'collage' ? 'lg:col-span-7' : 'lg:col-span-8')}>
            <Eyebrow>{setting(settings, 'brand.name', 'Covenant Media').toUpperCase()} · MEDIA × TECHNOLOGY</Eyebrow>

            <MaskReveal
              as="h1"
              lines={(block.headline || setting(settings, 'brand.headline')).split('\n').filter(Boolean)}
              className="mt-6 font-display text-[clamp(2.6rem,7.6vw,6.4rem)] font-medium leading-[0.94] tracking-[-0.035em] text-fg"
            />

            {statement ? <p className="lede mt-6 max-w-xl text-[1.125rem] md:mt-7 md:text-[1.28rem]">{statement}</p> : null}

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button href="/media" size="lg" iconEnd="arrow-right" data-analytics="cta_click" data-analytics-target="/media">
                Explore Media
              </Button>
              <Button href="/tech" size="lg" variant="outline" iconEnd="arrow-right" data-analytics="cta_click" data-analytics-target="/tech">
                Explore Technology
              </Button>
            </div>

            {showStats ? (
              <dl className="mt-12 grid max-w-2xl grid-cols-2 gap-x-6 gap-y-6 border-t border-[rgba(243,241,236,.09)] pt-6 sm:grid-cols-4">
                <Stat label="Media projects" value={counts.media ? String(counts.media) : '—'} note="published" />
                <Stat label="Tech projects" value={counts.tech ? String(counts.tech) : '—'} note="published" />
                <Stat label="Disciplines" value="02" note="under one roof" />
                <Stat label="Based" value={truncate(setting(settings, 'contact.location', 'Nigeria'), 14) || '—'} note="works remote" />
              </dl>
            ) : null}
          </div>

          <div className={cx('relative min-w-0', variant === 'collage' ? 'lg:col-span-5' : 'lg:col-span-4')}>
            {variant === 'collage' || mediaVideos.length || work.length ? (
              <HeroCollage work={work} />
            ) : (
              <div className="relative overflow-hidden rounded-4 border border-[rgba(243,241,236,.1)]">
                <PosterFallback seed="covenant-hero" label={setting(settings, 'brand.name')} ratio="tall" className="w-full" />
              </div>
            )}
          </div>
        </div>

        {showPaths ? (
          <div className="mt-14 grid gap-px overflow-hidden rounded-4 border border-[rgba(243,241,236,.1)] bg-[rgba(243,241,236,.08)] md:mt-20 md:grid-cols-2">
            <PathwayCard
              title={setting(settings, 'brand.media_tagline', 'WE CAPTURE. WE CREATE. WE INSPIRE.')}
              kicker="Media portfolio"
              body={truncate(setting(settings, 'media.intro'), 150)}
              href="/media"
              ctaLabel={setting(settings, 'media.cta_primary', 'View work')}
              tone="media"
              icon="film"
            />
            <PathwayCard
              title={setting(settings, 'tech.role', 'Software · UI/UX · IT · Cybersecurity')}
              kicker="Tech portfolio"
              body={truncate(setting(settings, 'tech.intro'), 150)}
              href="/tech"
              ctaLabel="View projects"
              tone="tech"
              icon="code"
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-2 font-display text-2xl leading-none tracking-[-0.03em] md:text-[1.9rem]">{value}</dd>
      {note ? <dd className="mt-1.5 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-fg-dim">{note}</dd> : null}
    </div>
  );
}

function HeroCollage({ work }: { work: ProjectCard[] }) {
  const tiles = work.slice(0, 3);
  if (!tiles.length) return null;
  const [first, second, third] = tiles;
  return (
    <div className="relative isolate select-none">
      <div className={cx('relative z-20 overflow-hidden rounded-4 border border-[rgba(243,241,236,.12)] shadow-[var(--shadow-3)]')}>
        <CmImage
          asset={first!.cover}
          alt={first!.title}
          seed={first!.slug}
          ratio={first!.division === 'media' && first!.form === 'short_form' ? 'tall' : 'wide'}
          rounded="rounded-none"
          priority
          sizes="(max-width: 1024px) 92vw, 34vw"
        />
        <div className="flex items-center justify-between gap-3 border-t border-[rgba(243,241,236,.1)] bg-[var(--color-ink-900)] px-3.5 py-2.5">
          <span className="truncate text-[0.8125rem] text-fg">{first!.title}</span>
          <span className="shrink-0 font-mono text-[0.5625rem] uppercase tracking-[0.16em] text-fg-dim">{first!.division}</span>
        </div>
      </div>
      {second ? (
        <div className="absolute -bottom-10 -left-6 z-10 hidden w-[46%] overflow-hidden rounded-3 border border-[rgba(243,241,236,.12)] shadow-[var(--shadow-3)] sm:block">
          <CmImage asset={second.cover} alt={second.title} seed={second.slug} ratio="square" rounded="rounded-none" tone={second.division === 'tech' ? 'tech' : 'media'} />
        </div>
      ) : null}
      {third ? (
        <div className="absolute -right-5 -top-9 z-30 hidden w-[34%] overflow-hidden rounded-3 border border-[rgba(243,241,236,.12)] shadow-[var(--shadow-3)] md:block">
          <CmImage asset={third.cover} alt={third.title} seed={third.slug} ratio="square" rounded="rounded-none" tone={third.division === 'tech' ? 'tech' : 'media'} />
        </div>
      ) : null}
      <Link
        href="/work"
        className="group absolute -bottom-4 right-2 z-40 inline-flex items-center gap-1.5 rounded-pill border border-[rgba(243,241,236,.16)] bg-[rgba(10,10,13,.72)] px-3 py-1.5 text-[0.75rem] text-fg-muted backdrop-blur-md transition hover:border-[rgba(243,241,236,.34)] hover:text-fg md:-bottom-5"
      >
        All work
        <Icon name="arrow-up-right" size={13} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </Link>
    </div>
  );
}

function PathwayCard({
  title,
  kicker,
  body,
  href,
  ctaLabel,
  tone,
  icon,
}: {
  title: string;
  kicker: string;
  body: string;
  href: string;
  ctaLabel: string;
  tone: 'media' | 'tech';
  icon: string;
}) {
  return (
    <Link
      href={href}
      className={cx('theme-ctx group relative flex flex-col justify-between gap-8 overflow-hidden bg-[var(--color-ink-950)] p-6 transition-colors duration-500 hover:bg-[var(--color-ink-900)] md:p-8', `theme-${tone}`)}
      data-analytics="cta_click"
      data-analytics-target={href}
    >
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full opacity-0 blur-3xl transition-opacity duration-700 group-hover:opacity-100" style={{ background: 'var(--accent-glow)' }} />
      <div className="relative">
        <div className="flex items-center justify-between gap-4">
          <Eyebrow>{kicker}</Eyebrow>
          <span className="grid size-9 place-items-center rounded-full border border-[rgba(243,241,236,.12)] text-[var(--accent)] transition duration-500 group-hover:rotate-6">
            <Icon name={icon} size={17} />
          </span>
        </div>
        <p className={cx('mt-5 text-[1.35rem] leading-tight tracking-[-0.02em] md:text-[1.7rem]', tone === 'media' ? 'font-display' : 'font-mono text-[1.05rem] uppercase tracking-[0.02em]')}>
          {title}
        </p>
        {body ? <p className="mt-3 max-w-md text-[0.9375rem] leading-relaxed text-fg-muted">{body}</p> : null}
      </div>
      <span className="relative inline-flex items-center gap-2 text-[0.9375rem] font-medium text-[var(--accent)]">
        {ctaLabel}
        <Icon name="arrow-right" size={16} className="transition-transform duration-500 group-hover:translate-x-1.5" />
      </span>
    </Link>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MEDIA HERO — floating, drifting, muted previews
   ═════════════════════════════════════════════════════════════════════════ */
export async function HeroMedia({ block, videos, settings }: { block: SectionData; videos: VideoRef[]; settings: Settings }) {
  const props = blockProps('hero_media', block.props);
  const limit = pn(props, 'limit', 6);
  const drift = pb(props, 'autoDrift', true);
  const variant = ps(props, 'variant', 'floating');
  const preview = videos.slice(0, Math.max(0, limit));
  const lines = (block.headline || 'WE CAPTURE.\nWE CREATE.\nWE INSPIRE.').split('\n').filter(Boolean);
  const showCategories = pb(props, 'showCategories', true);

  return (
    <section className="relative isolate flex min-h-[92svh] flex-col justify-end overflow-hidden pb-14 pt-28 md:min-h-[94svh] md:pb-20 md:pt-32" data-hero>
      {variant === 'floating' && preview.length > 0 ? (
        <>
          {/* Desktop: drifting card wall. Mobile: horizontal film strip. */}
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 hidden lg:block" />
          <div className="pointer-events-none absolute inset-0 -z-10 hidden lg:block">
            {preview.map((video, i) => {
              const layout = cardLayout(i, preview.length);
              return (
                <div
                  key={video.id}
                  className={cx('absolute w-[clamp(180px,17vw,268px)]', drift && 'animate-float')}
                  style={
                    {
                      left: layout.left,
                      top: layout.top,
                      '--tilt': `${layout.tilt}deg`,
                      '--float-delay': String(i * 700),
                      opacity: layout.opacity,
                      transform: `rotate(${layout.tilt}deg)`,
                    } as React.CSSProperties
                  }
                >
                  <div className="pointer-events-auto">
                    <MediaTile
                      title={video.title}
                      subtitle={video.source}
                      video={video}
                      posterUrl={video.posterUrl}
                      items={preview.map((v) => ({ kind: 'video' as const, video: v, title: v.title, meta: ps(props, 'durationLabel', 'Selected work') }))}
                      index={i}
                      ratio={video.vertical ? 'vertical' : 'wide'}
                      hoverPreview={false}
                      seed={video.id}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-[5] bg-[radial-gradient(120%_80%_at_50%_100%,rgba(5,5,7,.96)_38%,rgba(5,5,7,.55)_70%,transparent)]" />
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-[5] bg-[linear-gradient(to_bottom,rgba(5,5,7,.72),rgba(5,5,7,.2)_38%,rgba(5,5,7,.85))]" />
        </>
      ) : null}

      <div className="container-page relative">
        <div className="max-w-4xl">
          <div className="flex items-center gap-3">
            <Link href="/" className="inline-flex items-center gap-2 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-fg-dim transition hover:text-fg">
              <Icon name="arrow-left" size={13} /> Covenant Media
            </Link>
            <span aria-hidden className="h-px w-8 bg-[rgba(243,241,236,.2)]" />
            <span className="eyebrow text-[var(--accent)]">{setting(settings, 'brand.name', 'Media Portfolio').toUpperCase()} PORTFOLIO</span>
          </div>

          <MaskReveal
            as="h1"
            lines={lines}
            delay={80}
            className="mt-7 font-display text-[clamp(2.5rem,9.2vw,7.4rem)] font-medium uppercase leading-[0.9] tracking-[-0.045em]"
          />

          <div className="mt-7 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <p className="lede max-w-lg text-[1.0625rem] md:text-[1.18rem]">{block.body || truncate(setting(settings, 'media.intro'), 190)}</p>
            <div className="flex flex-wrap items-center gap-3">
              <Button href="/media/work" size="lg" iconEnd="arrow-right" data-analytics="cta_click" data-analytics-target="/media/work">
                {setting(settings, 'media.cta_primary', 'View work')}
              </Button>
              <Button href="/media/contact" size="lg" variant="outline" data-analytics="cta_click" data-analytics-target="/media/contact">
                {setting(settings, 'media.cta_secondary', 'Hire me')}
              </Button>
            </div>
          </div>

          {showCategories && pstrs(props, 'categories').length ? (
            <ul className="mt-8 flex flex-wrap gap-2">
              {pstrs(props, 'categories').map((category) => (
                <li key={category}>
                  <Link href={`/media/work?q=${encodeURIComponent(category)}`} className="rounded-pill border border-[rgba(243,241,236,.12)] px-3 py-1.5 text-[0.8125rem] text-fg-muted transition hover:border-[rgba(243,241,236,.3)] hover:text-fg">
                    {category}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {variant === 'strip' || preview.length ? (
          <div className={cx('mt-12 lg:hidden', variant === 'floating' && 'hidden')}>
            <MobileStrip videos={preview} props={props} />
          </div>
        ) : null}
        {variant === 'strip' && preview.length ? <MobileStrip videos={preview} props={props} className="mt-12 hidden lg:block" /> : null}
      </div>

      {preview.length === 0 ? (
        <div className="container-page mt-10">
          <div className="grid gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <PosterFallback key={i} seed={`empty-${i}`} label={null} ratio={i === 1 ? 'vertical' : 'wide'} className="w-full" />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function MobileStrip({ videos, props, className }: { videos: VideoRef[]; props: Record<string, unknown>; className?: string }) {
  if (!videos.length) return null;
  return (
    <div className={cx('-mx-[5vw] flex snap-x snap-mandatory gap-3 overflow-x-auto px-[5vw] pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', className)}>
      {videos.map((video, i) => (
        <div key={video.id} className="w-[64vw] max-w-[280px] shrink-0 snap-center sm:w-[42vw]">
          <MediaTile
            title={video.title}
            subtitle={video.source}
            video={video}
            posterUrl={video.posterUrl}
            ratio={video.vertical ? 'vertical' : 'wide'}
            hoverPreview={false}
            seed={video.id}
            items={videos.map((v) => ({ kind: 'video' as const, video: v, title: v.title, meta: ps(props, 'durationLabel', 'Selected work') }))}
            index={i}
          />
        </div>
      ))}
    </div>
  );
}

/** Deterministic, hand-tuned positions so the wall never looks random-noisy. */
function cardLayout(i: number, total: number) {
  const spots = [
    { left: '4%', top: '14%', tilt: -6, opacity: 0.92 },
    { left: '27%', top: '6%', tilt: 3, opacity: 0.85 },
    { left: '52%', top: '16%', tilt: -3, opacity: 0.95 },
    { left: '74%', top: '7%', tilt: 5, opacity: 0.8 },
    { left: '14%', top: '56%', tilt: 4, opacity: 0.86 },
    { left: '40%', top: '52%', tilt: -4, opacity: 0.9 },
    { left: '64%', top: '58%', tilt: 2, opacity: 0.84 },
    { left: '84%', top: '44%', tilt: -5, opacity: 0.78 },
  ];
  const spot = spots[i % spots.length]!;
  return { ...spot, top: `${Math.min(72, Number.parseFloat(spot.top) + (total > 6 ? 4 : 0))}%` };
}

/* ═══════════════════════════════════════════════════════════════════════════
   TECH HERO — engineer's introduction
   ═════════════════════════════════════════════════════════════════════════ */
export async function HeroTech({
  block,
  settings,
  portrait,
  stats,
  resumeAvailable,
  topSkills,
}: {
  block: SectionData;
  settings: Settings;
  portrait: { url: string | null; alt: string | null } | null;
  stats: { label: string; value: string; note?: string }[];
  resumeAvailable: boolean;
  topSkills: string[];
}) {
  const props = blockProps('hero_tech', block.props);
  const showStack = pb(props, 'showStack', true);
  const showStatus = pb(props, 'showStatus', true);
  const greeting = ps(props, 'greeting', setting(settings, 'contact.location'));
  const lines = (block.headline || setting(settings, 'founder.name', 'Covenant Nsikan')).split('\n').filter(Boolean);

  return (
    <section className="relative isolate overflow-hidden pb-14 pt-24 md:pb-20 md:pt-32" data-hero>
      <div aria-hidden className="tech-grid pointer-events-none absolute inset-x-0 -top-24 -z-10 h-[120vh] opacity-70" />
      <div className="container-page">
        <div className="grid items-end gap-12 lg:grid-cols-12 lg:gap-14">
          <div className="min-w-0 lg:col-span-7">
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/" className="inline-flex items-center gap-2 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-fg-dim transition hover:text-fg">
                <Icon name="arrow-left" size={13} /> Covenant Media
              </Link>
              <span aria-hidden className="hidden h-px w-8 bg-[rgba(243,241,236,.2)] sm:block" />
              {greeting ? <span className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-fg-dim"><DecodeText text={greeting} /></span> : null}
            </div>

            <MaskReveal
              as="h1"
              lines={lines}
              className="mt-7 font-display text-[clamp(2.5rem,6.6vw,5.4rem)] font-medium leading-[0.95] tracking-[-0.035em]"
            />

            <p className="mt-5 max-w-xl font-mono text-[0.8125rem] uppercase leading-relaxed tracking-[0.1em] text-[var(--accent)]">
              {setting(settings, 'tech.role', 'Software engineer · Cybersecurity · UI/UX')}
            </p>

            <p className="lede mt-6 max-w-xl">{block.body || truncate(setting(settings, 'tech.intro'), 220)}</p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button href="/tech/projects" size="lg" iconEnd="arrow-right" data-analytics="cta_click" data-analytics-target="/tech/projects">
                View projects
              </Button>
              <Button href="/tech/contact" size="lg" variant="outline" data-analytics="cta_click" data-analytics-target="/tech/contact">
                Hire / contact
              </Button>
              {resumeAvailable ? (
                <Button href="/tech/resume" size="lg" variant="ghost" icon="download" data-analytics="cta_click" data-analytics-target="/tech/resume">
                  Résumé
                </Button>
              ) : null}
            </div>

            {showStatus && setting(settings, 'founder.availability') ? (
              <p className="mt-7 inline-flex items-center gap-2.5 rounded-pill border border-[rgba(243,241,236,.12)] px-3.5 py-1.5 text-[0.8125rem] text-fg-muted">
                <span aria-hidden className="animate-pulse-dot inline-block size-1.5 rounded-full bg-[var(--color-ok-400)]" />
                {setting(settings, 'founder.availability')}
              </p>
            ) : null}

            {showStack && topSkills.length ? (
              <ul className="mt-9 flex flex-wrap gap-x-2 gap-y-2 border-t border-[rgba(243,241,236,.09)] pt-5">
                {topSkills.map((skill) => (
                  <li key={skill} className="rounded-pill border border-[rgba(243,241,236,.1)] bg-[rgba(243,241,236,.03)] px-2.5 py-1 font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-fg-muted">
                    {skill}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="min-w-0 lg:col-span-5">
            <Tilt max={4}>
              <figure className="relative isolate overflow-hidden rounded-4 border border-[rgba(243,241,236,.12)] bg-[var(--color-ink-900)] p-2.5 shadow-[var(--shadow-3)]">
                <span aria-hidden className="absolute left-4 top-4 size-3 border-l border-t border-[var(--accent)] opacity-70" />
                <span aria-hidden className="absolute right-4 top-4 size-3 border-r border-t border-[var(--accent)] opacity-70" />
                <span aria-hidden className="absolute bottom-4 left-4 size-3 border-b border-l border-[var(--accent)] opacity-70" />
                <span aria-hidden className="absolute bottom-4 right-4 size-3 border-b border-r border-[var(--accent)] opacity-70" />
                {portrait?.url ? (
                  <div className="relative aspect-[4/5] w-full overflow-hidden rounded-3">
                    <Image src={portrait.url} alt={portrait.alt ?? setting(settings, 'founder.name')} fill priority sizes="(max-width:1024px) 88vw, 34vw" className="object-cover" unoptimized={plainSrc(portrait.url)} />
                  </div>
                ) : (
                  <PosterFallback seed="portrait" label="portrait — upload in CMS" ratio="tall" tone="tech" className="w-full" />
                )}
                <figcaption className="flex items-center justify-between gap-3 px-2 pb-1 pt-3">
                  <span className="truncate font-mono text-[0.625rem] uppercase tracking-[0.14em] text-fg-dim">{setting(settings, 'founder.name')}</span>
                  <span className="shrink-0 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-fg-dim">since {stats.find((s) => s.label === 'Experience')?.value ?? '—'}</span>
                </figcaption>
              </figure>
            </Tilt>
          </div>
        </div>

        {stats.length ? (
          <dl className="mt-14 grid grid-cols-2 gap-x-6 gap-y-7 border-t border-[rgba(243,241,236,.09)] pt-6 md:mt-16 md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label}>
                <dt className="eyebrow">{stat.label}</dt>
                <dd className="tnum mt-2 font-display text-2xl leading-none tracking-[-0.03em] md:text-[1.85rem]">{stat.value}</dd>
                {stat.note ? <dd className="mt-1.5 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-fg-dim">{stat.note}</dd> : null}
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </section>
  );
}

export function PageHeader({
  block,
  surface,
  eyebrow,
  title: titleProp,
  lede,
  meta,
  actions,
}: {
  block?: SectionData;
  surface: 'main' | 'media' | 'tech';
  eyebrow?: string;
  title?: string;
  lede?: string | null;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const title = titleProp ?? block?.headline ?? undefined;
  const crumb = surface === 'main' ? null : { label: surface === 'media' ? 'Media portfolio' : 'Tech portfolio', href: surface === 'media' ? '/media' : '/tech' };
  return (
    <section className={cx('relative isolate overflow-hidden border-b border-[rgba(243,241,236,.09)]', 'pb-12 pt-24 md:pb-16 md:pt-28')} data-hero>
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10" style={{ backgroundImage: 'var(--surface-tone)' }} />
      <div className="container-page">
        {crumb ? (
          <nav className="mb-6" aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-fg-dim">
              <li>
                <Link href="/" className="transition hover:text-fg">
                  Covenant Media
                </Link>
              </li>
              <li aria-hidden>
                <Icon name="chevron-right" size={11} />
              </li>
              <li>
                <Link href={crumb.href} className="transition hover:text-fg">
                  {crumb.label}
                </Link>
              </li>
            </ol>
          </nav>
        ) : null}
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        {title ? (
          <MaskReveal as="h1" lines={title.split('\n')} className="mt-5 font-display text-[clamp(2.1rem,5.4vw,4.1rem)] font-medium leading-[1] tracking-[-0.032em]" />
        ) : null}
        {lede ? <p className="lede mt-5 max-w-2xl">{lede}</p> : null}
        {(meta || actions) && (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-5 border-t border-[rgba(243,241,236,.09)] pt-5">
            {meta}
            {actions}
          </div>
        )}
      </div>
    </section>
  );
}

/** Used when a page has no CMS hero: keeps structure, shows an admin hint. */
export function MissingContent({ page }: { page: PageData; settings?: Settings }) {
  return (
    <div className="container-page py-24">
      <div className="max-w-2xl rounded-4 border border-dashed border-[rgba(243,241,236,.16)] bg-[rgba(243,241,236,.02)] p-8">
        <SampleTag label="Empty page" />
        <h1 className="display-3 mt-4">{page.title || 'Untitled page'}</h1>
        <p className="lede mt-3">
          This page is published but has no sections attached yet. Add sections in the CMS → Homepage sections, then attach them to{' '}
          <span className="font-mono text-[0.85em] text-fg">/{page.slug}</span> from Pages → Layout.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button href="/admin/pages" size="sm" variant="outline">
            Open pages
          </Button>
          <Button href="/admin/blocks" size="sm" variant="ghost">
            Create a section
          </Button>
        </div>
      </div>
    </div>
  );
}
