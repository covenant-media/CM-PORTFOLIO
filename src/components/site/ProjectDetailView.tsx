import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Section, SectionHeader, Eyebrow, SampleTag, EmptyState, Tag } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { CmImage } from '@/components/ui/Media';
import { MediaTile } from '@/components/ui/MediaTile';
import { VideoPlayer } from '@/components/ui/Lightbox';
import { Reveal } from '@/components/ui/Reveal';
import { FadeIn } from '@/components/ui/Motion';
import { WorkGrid } from './WorkCard';
import { CmsPage } from './CmsPage';
import { projectBySlug, relatedProjects, categoryLabel } from '@/lib/cms/content';
import { jsonLdScript, projectJsonLd, breadcrumbJsonLd } from '@/lib/seo/structured';
import { resolveSite } from '@/lib/seo/metadata';
import { cx, formatDate, truncate } from '@/lib/utils/text';
import type { LightboxItem } from '@/components/ui/Lightbox';
import type { ProjectDetail } from '@/lib/types/content';

/**
 * Project / film case page for both portfolios. Every block below is conditional:
 * a field the owner has not filled in simply does not render, so an unfinished
 * project never shows an invented outcome or a fake client logo.
 */
export async function ProjectDetailView({
  slug,
  division,
}: {
  slug: string;
  division: 'media' | 'tech';
}) {
  const project = await projectBySlug(slug, division);
  if (!project) notFound();
  const [related, site] = await Promise.all([relatedProjects(project.slug, division, project.category, 3), resolveSite()]);

  const basePath = division === 'tech' ? '/tech/projects' : '/media/work';
  const path = `${basePath}/${project.slug}`;
  const gallery = project.gallery.filter((item) => item.asset);
  const lightbox: LightboxItem[] = [
    ...gallery.map((item) => ({
      kind: 'image' as const,
      src: item.asset!.url,
      alt: item.alt ?? item.asset!.alt,
      title: item.caption,
      caption: item.caption,
    })),
  ];

  const facts = [
    { label: 'Client', value: project.client },
    { label: 'Year', value: project.year ? String(project.year) : null },
    { label: 'Role', value: project.role },
    { label: 'Format', value: project.form ? truncate(project.form.replace(/_/g, ' '), 30) : null },
    { label: 'Location', value: project.location },
    { label: 'Delivered', value: project.eventDate ? formatDate(project.eventDate, 'long') : project.publishedAt ? formatDate(project.publishedAt, 'long') : null },
  ].filter((fact) => fact.value);

  const structured = [
    projectJsonLd(project, site, path),
    breadcrumbJsonLd(
      [
        { name: division === 'tech' ? 'Projects' : 'Work', path: basePath },
        { name: project.title, path },
      ],
      site.origin,
    ),
  ];

  return (
    <CmsPage
      surface={division}
      path={path}
      slug={`project:${project.slug}`}
      title={project.title}
      hideHeader
    >
      <>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(structured) }} />
          <ArticleBody project={project} gallery={gallery} lightbox={lightbox} facts={facts} />
          <Section size="tight">
            <div className="container-page">
              <div className="flex flex-wrap items-center justify-between gap-5 rounded-4 border border-[rgba(243,241,236,.1)] bg-[var(--color-ink-900)] p-6 md:p-8">
                <div className="min-w-0">
                  <Eyebrow>{division === 'tech' ? 'Want something like this?' : 'Book something like this?'}</Eyebrow>
                  <p className="mt-3 font-display text-[1.5rem] leading-tight tracking-[-0.025em] md:text-[1.9rem]">
                    {division === 'tech' ? 'Send the brief — I will tell you what is realistic.' : 'Tell me what you are making — dates first.'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button href={division === 'tech' ? '/tech/contact' : '/media/contact'} iconEnd="arrow-right">
                    {division === 'tech' ? 'Start a project' : 'Enquire about a shoot'}
                  </Button>
                  <Button href={basePath} variant="ghost" icon="arrow-left">
                    All {division === 'tech' ? 'projects' : 'work'}
                  </Button>
                </div>
              </div>
            </div>
          </Section>
          {related.length ? (
            <Section size="tight">
              <div className="container-page">
                <SectionHeader eyebrow="Next" title={division === 'tech' ? 'Related projects' : 'More from the reel'} />
                <div className="mt-10">
                  <WorkGrid projects={related} layout="grid" showVideos={division === 'media'} />
                </div>
              </div>
            </Section>
          ) : null}
        </>
    </CmsPage>
  );
}

function ArticleBody({
  project,
  gallery,
  lightbox,
  facts,
}: {
  project: ProjectDetail;
  gallery: ProjectDetail['gallery'];
  lightbox: LightboxItem[];
  facts: { label: string; value: string | null }[];
}) {
  return (
    <>
      {/* ── hero ───────────────────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden border-b border-[rgba(243,241,236,.09)] pb-12 pt-24 md:pb-16 md:pt-28" data-hero>
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10" style={{ backgroundImage: 'var(--surface-tone)' }} />
        <div className="container-page">
          <nav aria-label="Breadcrumb" className="mb-7">
            <ol className="flex items-center gap-2 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-fg-dim">
              <li>
                <Link href={project.division === 'tech' ? '/tech' : '/media'} className="transition hover:text-fg">
                  {project.division === 'tech' ? 'Tech portfolio' : 'Media portfolio'}
                </Link>
              </li>
              <li aria-hidden>
                <Icon name="chevron-right" size={11} />
              </li>
              <li>
                <Link href={project.division === 'tech' ? '/tech/projects' : '/media/work'} className="transition hover:text-fg">
                  {project.division === 'tech' ? 'Projects' : 'Work'}
                </Link>
              </li>
            </ol>
          </nav>

          <div className="flex flex-wrap items-center gap-3">
            {project.categoryLabel ? <Tag tone="accent">{project.categoryLabel}</Tag> : null}
            {project.isSample ? <SampleTag /> : null}
            {project.year ? <span className="tnum font-mono text-[0.625rem] uppercase tracking-[0.14em] text-fg-dim">{project.year}</span> : null}
          </div>

          <h1 className="mt-6 max-w-4xl font-display text-[clamp(2.2rem,6vw,4.4rem)] font-light leading-[0.98] tracking-[-0.035em] [text-wrap:balance]">
            {project.title}
          </h1>
          {project.summary ? <p className="lede mt-6 max-w-2xl">{project.summary}</p> : null}

          {project.links.length || project.liveUrl || project.repoUrl ? (
            <div className="mt-8 flex flex-wrap gap-3">
              {project.liveUrl ? (
                <Button href={project.liveUrl} newTab icon="external">
                  {project.division === 'tech' ? 'Open live project' : 'Watch the full film'}
                </Button>
              ) : null}
              {project.repoUrl ? (
                <Button href={project.repoUrl} newTab variant="outline" icon="github">
                  Source code
                </Button>
              ) : null}
              {project.links
                .filter((link) => link.url !== project.liveUrl && link.url !== project.repoUrl)
                .map((link) => (
                  <Button key={link.url} href={link.url} newTab variant="ghost" iconEnd="arrow-up-right">
                    {link.label}
                  </Button>
                ))}
            </div>
          ) : null}

          {/* Media: real player with sound on click; still image when no video. */}
          <div className="mt-12">
            {project.heroVideo ? (
              <div className="mx-auto max-w-4xl">
                <VideoPlayer video={project.heroVideo} ratio={project.heroVideo.vertical ? 'vertical' : 'wide'} />
              </div>
            ) : project.cover ? (
              <CmImage asset={project.cover} alt={project.cover.alt ?? project.title} seed={project.slug} ratio="wide" rounded="rounded-4" priority sizes="(max-width: 1024px) 92vw, 1024px" />
            ) : (
              <EmptyState compact icon="image" title="No cover image yet" body="Add a poster or cover in the CMS → Media library, then attach it to this project." />
            )}
          </div>

          {facts.length ? (
            <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-[rgba(243,241,236,.09)] pt-7 md:grid-cols-3 lg:grid-cols-6">
              {facts.map((fact) => (
                <div key={fact.label} className="min-w-0">
                  <dt className="font-mono text-[0.5625rem] uppercase tracking-[0.16em] text-fg-dim">{fact.label}</dt>
                  <dd className="mt-1.5 truncate text-[0.9375rem] text-fg" title={fact.value ?? undefined}>
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </section>

      {/* ── narrative ──────────────────────────────────────────────────────── */}
      {project.problem || project.solution || project.outcomes.length ? (
        <Section>
          <div className="container-page">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-16">
              <div className="min-w-0 space-y-12">
                {project.problem ? (
                  <Reveal as="div">
                    <Eyebrow>{project.division === 'tech' ? 'The problem' : 'The brief'}</Eyebrow>
                    <p className="mt-5 font-display text-[clamp(1.3rem,2.4vw,1.85rem)] leading-[1.35] tracking-[-0.02em] text-fg [text-wrap:pretty]">{project.problem}</p>
                  </Reveal>
                ) : null}
                {project.solution ? (
                  <Reveal as="div">
                    <Eyebrow>{project.division === 'tech' ? 'The approach' : 'What we made'}</Eyebrow>
                    <div className="mt-5 max-w-2xl space-y-4 text-[1.0625rem] leading-[1.75] text-fg-muted">
                      {project.solution.split('\n').filter(Boolean).map((line) => (
                        <p key={line.slice(0, 32)}>{line}</p>
                      ))}
                    </div>
                  </Reveal>
                ) : null}
              </div>

              <aside className="space-y-8 lg:pl-8">
                {project.outcomes.length ? (
                  <div className="rounded-4 border border-[color-mix(in_oklab,var(--accent)_28%,transparent)] bg-[color-mix(in_oklab,var(--accent)_6%,transparent)] p-6">
                    <Eyebrow>Outcomes</Eyebrow>
                    <ul className="mt-4 space-y-3">
                      {project.outcomes.map((outcome) => (
                        <li key={outcome} className="flex gap-2.5 text-[0.9375rem] leading-relaxed text-fg">
                          <Icon name="check" size={14} className="mt-1 shrink-0 text-[var(--accent)]" />
                          <span>{outcome}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {project.metrics.length ? (
                  <div>
                    <Eyebrow>By the numbers</Eyebrow>
                    <ul className="mt-4 space-y-3">
                      {project.metrics.map((metric) => (
                        <li key={metric.label} className="flex items-baseline justify-between gap-4 border-b border-[rgba(243,241,236,.08)] pb-2.5">
                          <span className="text-[0.8125rem] text-fg-muted">{metric.label}</span>
                          <span className="tnum font-display text-[1.15rem] tracking-[-0.02em]">{metric.value}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 font-mono text-[0.5625rem] uppercase leading-relaxed tracking-[0.14em] text-fg-dim">
                      Only verified figures are published.
                    </p>
                  </div>
                ) : null}

                {project.deliverables.length ? (
                  <div>
                    <Eyebrow>Delivered</Eyebrow>
                    <ul className="mt-3.5 flex flex-wrap gap-1.5">
                      {project.deliverables.map((item) => (
                        <li key={item}>
                          <Tag>{item}</Tag>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {project.credits.length ? (
                  <div>
                    <Eyebrow>Credits</Eyebrow>
                    <ul className="mt-3.5 space-y-2">
                      {project.credits.map((credit) => (
                        <li key={`${credit.role}-${credit.name ?? ''}`} className="flex items-baseline justify-between gap-3 text-[0.875rem]">
                          <span className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-fg-dim">{credit.role}</span>
                          <span className="text-fg-muted">{credit.name ?? '—'}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </aside>
            </div>

            {project.technologies.length ? (
              <div className="mt-14 border-t border-[rgba(243,241,236,.09)] pt-7">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span className="font-mono text-[0.5625rem] uppercase tracking-[0.16em] text-fg-dim">Stack</span>
                  {project.technologies.map((tech) => (
                    <span key={tech} className="rounded-pill border border-[rgba(243,241,236,.1)] px-2.5 py-1 font-mono text-[0.625rem] uppercase tracking-[0.1em] text-fg-muted">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </Section>
      ) : null}

      {/* ── video wall ─────────────────────────────────────────────────────── */}
      {project.videos.length ? (
        <Section tone="sunken">
          <div className="container-page">
            <SectionHeader eyebrow="Footage" title={project.division === 'tech' ? 'In motion' : 'Cuts from this shoot'} lede="Click any card to play it with sound." />
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {project.videos.map((video, index) => (
                <FadeIn key={video.id} delay={index * 60} as="li" className="h-full">
                  <MediaTile
                    title={video.title}
                    video={video}
                    poster={null}
                    ratio={video.vertical ? 'vertical' : 'wide'}
                    hoverPreview={false}
                    seed={video.id}
                    sizes="(max-width:640px) 92vw, 30vw"
                  />
                </FadeIn>
              ))}
            </ul>
          </div>
        </Section>
      ) : null}

      {/* ── gallery ────────────────────────────────────────────────────────── */}
      {gallery.length ? (
        <Section>
          <div className="container-page">
            <SectionHeader eyebrow={project.division === 'tech' ? 'Screens' : 'Stills'} title={project.division === 'tech' ? 'What it looks like' : 'Frames'} lede="Open any frame for the full-resolution view." />
            <ul className={cx('mt-10 grid gap-3 sm:gap-4', gallery.length === 1 ? 'grid-cols-1' : gallery.length === 2 ? 'sm:grid-cols-2' : 'grid-cols-2 md:grid-cols-3')}>
              {gallery.map((item, index) => (
                <li key={`${item.assetId ?? index}`}>
                  <MediaTile
                    title={item.caption ?? project.title}
                    poster={item.asset}
                    ratio="wide"
                    items={lightbox}
                    index={index}
                    seed={`${project.slug}-${index}`}
                    sizes="(max-width:640px) 92vw, 30vw"
                    showDuration={false}
                  />
                </li>
              ))}
            </ul>
          </div>
        </Section>
      ) : null}
    </>
  );
}
