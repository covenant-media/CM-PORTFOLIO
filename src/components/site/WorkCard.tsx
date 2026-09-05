import Link from 'next/link';
import type { ProjectCard } from '@/lib/types/content';
import { cx, truncate } from '@/lib/utils/text';
import { Icon } from '@/components/ui/Icon';
import { CmImage } from '@/components/ui/Media';
import { MediaTile } from '@/components/ui/MediaTile';
import { SampleTag } from '@/components/ui/Section';

function hrefFor(project: ProjectCard): string {
  return project.division === 'tech' ? `/tech/projects/${project.slug}` : `/media/work/${project.slug}`;
}

/**
 * The work card shared by all three experiences. Division changes the framing
 * (Media = cinematic poster, Tech = product screenshot in a browser chrome),
 * never the underlying component.
 */
export function WorkCard({
  project,
  layout = 'card',
  showVideos = true,
  index,
  priority = false,
  className,
}: {
  project: ProjectCard;
  layout?: 'card' | 'wide' | 'list' | 'mosaic';
  showVideos?: boolean;
  index?: number;
  priority?: boolean;
  className?: string;
}) {
  const isTech = project.division === 'tech';
  const href = hrefFor(project);
  const videos = showVideos ? project.videos.slice(0, 3) : [];

  if (layout === 'list') {
    return (
      <Link
        href={href}
        className={cx('group flex items-center justify-between gap-6 border-b border-[rgba(243,241,236,.09)] py-5 transition-colors duration-300 hover:border-[rgba(243,241,236,.2)]', className)}
        data-analytics="project_click"
        data-analytics-target={href}
      >
        <span className="flex min-w-0 items-baseline gap-4">
          {index !== undefined ? <span className="tnum shrink-0 font-mono text-[0.6875rem] text-fg-dim">{String(index + 1).padStart(2, '0')}</span> : null}
          <span className="min-w-0">
            <span className="block truncate font-display text-lg tracking-[-0.02em] transition-colors duration-300 group-hover:text-[var(--accent)] md:text-2xl">{project.title}</span>
            {project.summary ? <span className="mt-1 block truncate text-[0.8125rem] text-fg-dim">{truncate(project.summary, 96)}</span> : null}
          </span>
        </span>
        <span className="hidden shrink-0 items-center gap-5 md:flex">
          {project.categoryLabel ? <span className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-fg-dim">{project.categoryLabel}</span> : null}
          {project.year ? <span className="tnum font-mono text-[0.6875rem] text-fg-dim">{project.year}</span> : null}
          <Icon name="arrow-up-right" size={16} className="text-fg-dim transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-fg" />
        </span>
      </Link>
    );
  }

  const ratio = project.division === 'media' && project.form === 'short_form' ? 'vertical' : layout === 'mosaic' && index !== undefined && index % 3 === 1 ? 'square' : 'wide';

  const frame = (
    <div className="relative isolate overflow-hidden bg-[var(--color-ink-850)]">
      <CmImage
        asset={project.cover}
        alt={project.title}
        seed={project.slug}
        ratio={ratio}
        rounded="rounded-none"
        priority={priority}
        tone={isTech ? 'tech' : 'media'}
        imgClassName="transition-transform duration-[1100ms] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.05]"
        sizes={layout === 'wide' ? '(max-width:1024px) 92vw, 46vw' : '(max-width:640px) 92vw, (max-width:1024px) 46vw, 30vw'}
        overlay={
          <>
            {!isTech && videos.length ? (
              <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-pill bg-[rgba(8,8,10,.6)] px-2 py-1 font-mono text-[0.5625rem] uppercase tracking-[0.14em] text-white/85 backdrop-blur-md">
                <Icon name="play" size={10} filled /> {videos.length} clip{videos.length > 1 ? 's' : ''}
              </span>
            ) : null}
            <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgba(5,5,7,.86)] via-transparent to-transparent opacity-90" aria-hidden />
            <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3.5">
              <span className="inline-flex items-center gap-2 text-[0.75rem] text-white/80 opacity-0 transition duration-500 group-hover:opacity-100">
                <span className="grid size-7 place-items-center rounded-full bg-[var(--accent)] text-[var(--accent-ink)]">
                  <Icon name="arrow-right" size={13} />
                </span>
                {isTech ? 'Open case' : 'View project'}
              </span>
            </span>
          </>
        }
      />
    </div>
  );

  return (
    <article
      className={cx(
        'group relative isolate flex flex-col overflow-hidden rounded-4 border border-[rgba(243,241,236,.09)] bg-[var(--color-ink-900)] transition duration-500 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-1 hover:border-[rgba(243,241,236,.18)] hover:shadow-[var(--shadow-lift)]',
        layout === 'wide' && 'md:flex-row md:items-stretch',
        className,
      )}
    >
      <div className={cx(layout === 'wide' && 'md:w-[58%]')}>{frame}</div>
      <div className={cx('flex min-w-0 flex-1 flex-col p-4 md:p-5', layout === 'wide' && 'md:justify-between md:p-6')}>
        <div>
          <div className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate font-mono text-[0.625rem] uppercase tracking-[0.14em] text-[var(--accent)]">
                {project.categoryLabel ?? (isTech ? 'Technology' : 'Media')}
              </span>
              {project.isSample ? <SampleTag /> : null}
            </span>
            {project.year ? <span className="tnum shrink-0 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-fg-dim">{project.year}</span> : null}
          </div>

          <h3 className={cx('mt-3 font-display leading-tight tracking-[-0.022em]', layout === 'wide' ? 'text-2xl md:text-[1.75rem]' : 'text-xl md:text-[1.4rem]')}>
            <Link href={href} className="after:absolute after:inset-0 after:content-[''] hover:text-[var(--accent)] transition-colors duration-300">
              {project.title}
            </Link>
          </h3>

          {project.summary ? <p className={cx('mt-2.5 text-[0.9375rem] leading-relaxed text-fg-muted', layout === 'wide' ? 'line-clamp-3' : 'line-clamp-2')}>{project.summary}</p> : null}

          {isTech && project.technologies.length ? (
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {project.technologies.slice(0, layout === 'wide' ? 7 : 4).map((tech) => (
                <li key={tech} className="rounded-pill border border-[rgba(243,241,236,.1)] px-2 py-0.5 font-mono text-[0.625rem] uppercase tracking-[0.08em] text-fg-dim">
                  {tech}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(243,241,236,.08)] pt-3.5">
          <span className="min-w-0 truncate text-[0.75rem] text-fg-dim">
            {project.client ? truncate(project.client, 26) : project.role ? truncate(project.role, 30) : '—'}
          </span>
          <span className="flex items-center gap-2.5">
            {project.repoUrl ? (
              <a href={project.repoUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1.5 text-[0.75rem] text-fg-muted transition hover:text-fg" aria-label={`Repository for ${project.title}`}>
                <Icon name="github" size={14} /> code
              </a>
            ) : null}
            {project.liveUrl ? (
              <a href={project.liveUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1.5 text-[0.75rem] text-fg-muted transition hover:text-fg" aria-label={`Live demo for ${project.title}`}>
                <Icon name="external" size={13} /> live
              </a>
            ) : null}
          </span>
        </div>
      </div>

      {videos.length ? (
        <div className={cx('grid gap-px border-t border-[rgba(243,241,236,.08)] bg-[rgba(243,241,236,.08)]', videos.length > 1 ? 'grid-cols-3' : 'grid-cols-1')}>
          {videos.map((video, i) => (
            <div key={video.id} className="bg-[var(--color-ink-900)]">
              <MediaTile
                title={video.title}
                video={video}
                posterUrl={video.posterUrl}
                ratio={video.vertical ? 'vertical' : 'wide'}
                hoverPreview={false}
                seed={video.id}
                items={project.videos.map((v) => ({ kind: 'video' as const, video: v, title: v.title, meta: project.title }))}
                index={i}
                showDuration={false}
                className="rounded-none border-0 bg-transparent shadow-none hover:translate-y-0"
              />
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function WorkGrid({
  projects,
  layout = 'grid',
  showVideos = true,
  className,
}: {
  projects: ProjectCard[];
  layout?: 'grid' | 'wide' | 'list' | 'mosaic';
  showVideos?: boolean;
  className?: string;
}) {
  if (layout === 'list') {
    return (
      <div className={className}>
        {projects.map((project, i) => (
          <WorkCard key={project.id} project={project} layout="list" index={i} />
        ))}
      </div>
    );
  }
  return (
    <div
      className={cx(
        'grid gap-5 md:gap-6',
        layout === 'mosaic' ? 'md:grid-cols-6 [&>*:nth-child(3n+1)]:md:col-span-4 [&>*:nth-child(3n+2)]:md:col-span-2 [&>*:nth-child(3n+3)]:md:col-span-3' : '',
        layout === 'wide' ? 'md:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3',
        className,
      )}
    >
      {projects.map((project, i) => (
        <WorkCard
          key={project.id}
          project={project}
          layout={layout === 'grid' ? 'card' : layout}
          index={i}
          priority={i === 0}
          showVideos={showVideos && layout !== 'mosaic'}
          className={cx(layout === 'mosaic' && i % 3 === 1 && 'md:mt-10', layout === 'mosaic' && i % 3 === 2 && 'md:-mt-6')}
        />
      ))}
    </div>
  );
}
