/**
 * Media-surface showcase sections (Media Portfolio PRD §7–12).
 *
 * Four blocks that give the Media Portfolio its editorial rhythm:
 *  • FeaturedWork   — hierarchy between the lead film and the rest of the reel
 *  • ShortFormRail  — portrait, feed-first vertical edits on a snap rail
 *  • PhotoGallery   — stills presented as photography, not filler
 *  • ThumbnailWall  — thumbnail / graphic design work shown as designed covers
 *
 * All of them are server components that receive their data from the switch in
 * `blocks/index.tsx`, render posters only (no third-party iframe until the
 * visitor clicks), and degrade to honest empty states when the CMS is empty.
 */
import Link from 'next/link';
import { Section, SectionHeader, EmptyState, SampleTag, Tag } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { CmImage } from '@/components/ui/Media';
import { MediaTile } from '@/components/ui/MediaTile';
import { Rail } from '@/components/ui/Rail';
import { FadeIn } from '@/components/ui/Motion';
import { LeadPlayControl } from './media-showcase-controls';
import { blockProps } from '@/lib/cms/blocks';
import { cx, truncate } from '@/lib/utils/text';
import type { AssetRef, GalleryItem, ProjectCard, SectionData, VideoRef } from '@/lib/types/content';
import { ps, pn, safeHref } from './helpers';

/* ═══════════════════════════════════════════════════════════════════════════
   FEATURED WORK — one lead film, then the next best of the reel
   ═══════════════════════════════════════════════════════════════════════════ */
export function FeaturedWork({ block, projects }: { block: SectionData; projects: ProjectCard[] }) {
  const props = blockProps('featured_work', block.props);
  const limit = Math.max(1, pn(props, 'limit', 4));
  const lead = projects[0] ?? null;
  const rest = projects.slice(1, limit);

  if (!lead) {
    return (
      <Section>
        <div className="container-page">
          <SectionHeader eyebrow={block.eyebrow ?? 'Featured work'} title={block.headline ?? 'Selected films'} lede={block.body} />
          <EmptyState
            className="mt-10"
            icon="film"
            title="No featured work yet"
            body="Feature a project in the CMS (Media projects → toggle “Featured”) and it becomes the lead panel here."
          />
        </div>
      </Section>
    );
  }

  const lightbox = lead.videos.map((video) => ({ kind: 'video' as const, video, title: video.title, meta: 'Featured' }));

  return (
    <Section id="work">
      <div className="container-page">
        <SectionHeader
          eyebrow={block.eyebrow ?? 'Featured work'}
          title={block.headline ?? 'Work that leads with a moment'}
          lede={block.body}
          align="split"
          action={
            <Button href={block.links[0] ? safeHref(block.links[0].href) : '/media/work'} variant="ghost" iconEnd="arrow-right">
              {block.links[0]?.label ?? 'All work'}
            </Button>
          }
        />

        {/* Lead panel — the whole poster navigates; the play control opens the viewer. */}
        <FadeIn className="mt-12">
          <Link
            href={`/media/work/${lead.slug}`}
            className="group/lead relative isolate block overflow-hidden rounded-4 border border-[rgba(243,241,236,.1)] bg-[var(--color-ink-900)] shadow-[var(--shadow-2)] transition-[border-color,box-shadow] duration-500 ease-[cubic-bezier(.16,1,.3,1)] hover:border-[rgba(243,241,236,.2)] hover:shadow-[var(--shadow-lift)]"
            data-analytics="project_click"
            data-analytics-target={`/media/work/${lead.slug}`}
          >
            <div className="relative aspect-[16/10] w-full overflow-hidden md:aspect-[21/10]">
              <CmImage
                asset={lead.cover}
                alt={lead.cover?.alt ?? lead.title}
                seed={lead.slug}
                ratio="wide"
                rounded="rounded-none"
                priority
                className="size-full"
                imgClassName="group-hover/lead:scale-[1.03]"
                sizes="(max-width: 1024px) 96vw, 1280px"
              />
              <span aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgba(5,5,7,.55)] via-transparent to-[rgba(5,5,7,.06)] md:from-[rgba(5,5,7,.95)] md:via-[rgba(5,5,7,.3)]" />
              {lead.isSample ? (
                <span className="absolute left-4 top-4 md:left-6 md:top-6">
                  <SampleTag />
                </span>
              ) : null}
              <LeadPlayControl items={lightbox} label={`Play clips from ${lead.title}`} />
            </div>

            {/* Mobile: in flow under the poster. Desktop: overlaid on it — either way
                the copy can never outgrow the frame and clip. */}
            <div className="relative flex flex-col gap-4 p-5 md:absolute md:inset-x-0 md:bottom-0 md:flex-row md:items-end md:justify-between md:bg-transparent md:p-8">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  {lead.categoryLabel ? <Tag tone="accent">{lead.categoryLabel}</Tag> : null}
                  {lead.form === 'short_form' ? <Tag>Short-form</Tag> : null}
                  {lead.durationLabel ? <Tag>{lead.durationLabel}</Tag> : null}
                </div>
                <h3 className="mt-4 max-w-3xl font-display text-[clamp(1.5rem,3.4vw,2.6rem)] font-medium leading-[1.04] tracking-[-0.025em] text-white [text-wrap:balance]">
                  {lead.title}
                </h3>
                {lead.summary ? (
                  <p className="mt-3 max-w-xl text-[0.9375rem] leading-relaxed text-white/70 [text-wrap:pretty]">{truncate(lead.summary, 190)}</p>
                ) : null}
                <p className="mt-4 font-mono text-[0.625rem] uppercase tracking-[0.15em] text-white/55">
                  {[lead.client, lead.role, lead.year ? String(lead.year) : null].filter(Boolean).join(' · ') || 'View project'}
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-pill bg-[var(--accent)] px-5 py-2.5 text-[0.875rem] font-medium text-[var(--accent-ink)] transition duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-hover/lead:-translate-y-px group-hover/lead:brightness-[1.06] md:self-auto">
                View project <Icon name="arrow-right" size={15} />
              </span>
            </div>
          </Link>
        </FadeIn>

        {rest.length ? (
          <div className={cx('mt-4 grid gap-4 md:mt-5', rest.length >= 2 ? 'sm:grid-cols-2' : '', rest.length >= 3 ? 'lg:grid-cols-3' : '')}>
            {rest.map((project, i) => (
              <FadeIn key={project.id} delay={i * 70} className="h-full">
                <Link
                  href={`/media/work/${project.slug}`}
                  className="group/card relative isolate flex h-full flex-col overflow-hidden rounded-4 border border-[rgba(243,241,236,.08)] bg-[var(--color-ink-900)] transition-[transform,border-color,box-shadow] duration-500 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-1 hover:border-[rgba(243,241,236,.18)] hover:shadow-[var(--shadow-lift)]"
                  data-analytics="project_click"
                  data-analytics-target={`/media/work/${project.slug}`}
                >
                  <div className="relative aspect-[16/9] w-full overflow-hidden">
                    <CmImage
                      asset={project.cover}
                      alt={project.cover?.alt ?? project.title}
                      seed={project.slug}
                      ratio="wide"
                      rounded="rounded-none"
                      className="size-full"
                      imgClassName="group-hover/card:scale-[1.05]"
                      sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 30vw"
                    />
                    <span aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgba(5,5,7,.7)] via-transparent to-transparent" />
                    {project.videoCount ? (
                      <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-pill bg-[rgba(8,8,10,.62)] px-2 py-1 font-mono text-[0.5625rem] uppercase tracking-[0.14em] text-white/85 backdrop-blur-md">
                        <Icon name="play" size={10} filled /> {project.videoCount} clip{project.videoCount > 1 ? 's' : ''}
                      </span>
                    ) : null}
                    {project.isSample ? (
                      <span className="absolute left-3 top-3">
                        <SampleTag />
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-1 items-start justify-between gap-3 p-4 md:p-5">
                    <div className="min-w-0">
                      <h4 className="truncate font-display text-[1.05rem] leading-snug tracking-[-0.015em] transition-colors duration-300 group-hover/card:text-[var(--accent)]">
                        {project.title}
                      </h4>
                      <p className="mt-1.5 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-fg-dim">
                        {[project.categoryLabel, project.year ? String(project.year) : null].filter(Boolean).join(' · ') || 'View project'}
                      </p>
                    </div>
                    <Icon
                      name="arrow-up-right"
                      size={16}
                      className="mt-1 shrink-0 text-fg-dim transition duration-300 group-hover/card:-translate-y-0.5 group-hover/card:translate-x-0.5 group-hover/card:text-fg"
                    />
                  </div>
                </Link>
              </FadeIn>
            ))}
          </div>
        ) : null}
      </div>
    </Section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SHORT-FORM RAIL — vertical edits made for the feed
   ═══════════════════════════════════════════════════════════════════════════ */
export function ShortFormRail({ block, videos }: { block: SectionData; videos: VideoRef[] }) {
  const props = blockProps('short_form_rail', block.props);
  const limit = Math.max(1, pn(props, 'limit', 8));
  const items = videos.slice(0, limit);
  const allHref = block.links[0] ? safeHref(block.links[0].href) : '/media/work?form=short_form';

  return (
    <Section id="short-form" tone="sunken" className="overflow-hidden">
      <div className="container-page">
        <SectionHeader
          eyebrow={block.eyebrow ?? 'Short-form'}
          title={block.headline ?? 'Made for the feed'}
          lede={block.body}
          align="split"
          action={
            <Button href={allHref} variant="ghost" iconEnd="arrow-right">
              {block.links[0]?.label ?? 'All short-form work'}
            </Button>
          }
        />
        {!items.length ? (
          <EmptyState
            className="mt-10"
            icon="film"
            title="No short-form edits published yet"
            body="Paste TikTok, Reels or YouTube Shorts links in the CMS → Videos and tag them “Short-form” — they land here as vertical cards."
          />
        ) : (
          <div className="mt-12 md:mt-14">
            <Rail
              label="Short-form edits"
              fadeTo="var(--color-ink-1000)"
              itemClassName="w-[64vw] max-w-[260px] sm:w-[36vw] lg:w-[clamp(180px,15.5vw,232px)]"
            >
              {items.map((video, i) => (
                <MediaTile
                  key={video.id}
                  title={video.title}
                  subtitle={video.source}
                  video={video}
                  ratio="vertical"
                  hoverPreview={false}
                  seed={video.id}
                  items={items.map((v) => ({ kind: 'video' as const, video: v, title: v.title, meta: v.source }))}
                  index={i}
                  sizes="(max-width: 640px) 64vw, 232px"
                  className="h-full"
                />
              ))}
            </Rail>
            <p className="mt-6 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-fg-dim">
              <Icon name="volume" size={11} className="mr-1.5 inline align-[-1px]" />
              Tap any card to play with sound — previews stay muted, poster-only, until then.
            </p>
          </div>
        )}
      </div>
    </Section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PHOTO GALLERY — stills presented as photography
   ═══════════════════════════════════════════════════════════════════════════ */
export function PhotoGallery({ block, gallery, images }: { block: SectionData; gallery?: GalleryItem | null; images: AssetRef[] }) {
  const props = blockProps('photo_gallery', block.props);
  const limit = Math.max(1, pn(props, 'limit', 8));
  const layout = ps(props, 'layout', 'editorial');

  const items = gallery?.items?.length
    ? gallery.items.filter((item) => item.asset).map((item) => ({ asset: item.asset!, caption: item.caption, alt: item.alt }))
    : images.slice(0, limit).map((asset) => ({ asset, caption: asset.caption, alt: asset.alt }));

  if (!items.length) {
    return (
      <Section id="photography">
        <div className="container-page">
          <SectionHeader eyebrow={block.eyebrow ?? 'Photography'} title={block.headline ?? 'Stills'} lede={block.body} />
          <EmptyState
            className="mt-10"
            icon="camera"
            title="No photo sets published yet"
            body="Curate a gallery in the CMS → Photos (kind: photo) and it renders here — events, portraits, products, lifestyle."
          />
        </div>
      </Section>
    );
  }

  const shown = items.slice(0, limit);
  const lightbox = shown.map((item) => ({
    kind: 'image' as const,
    src: item.asset.url,
    alt: item.alt ?? item.asset.alt,
    title: item.caption ?? gallery?.title ?? null,
    caption: item.caption,
  }));

  return (
    <Section id="photography">
      <div className="container-page">
        <SectionHeader
          eyebrow={block.eyebrow ?? 'Photography'}
          title={block.headline ?? (gallery?.title ?? 'Frames that hold still')}
          lede={block.body ?? gallery?.description}
          align="split"
          action={
            block.links[0] ? (
              <Button href={safeHref(block.links[0].href)} variant="ghost" iconEnd="arrow-right">
                {block.links[0].label}
              </Button>
            ) : null
          }
        />
        <div
          className={cx(
            'mt-12 grid gap-3 sm:gap-4',
            layout === 'grid' ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2 md:grid-cols-4',
          )}
        >
          {shown.map((item, i) => (
            <FadeIn
              key={`${item.asset.id}-${i}`}
              delay={(i % 4) * 60}
              className={cx('h-full', layout === 'editorial' && i === 0 && 'col-span-2 row-span-2')}
            >
              <MediaTile
                title={item.caption ?? item.asset.alt ?? 'Photograph'}
                poster={item.asset}
                ratio="square"
                items={lightbox}
                index={i}
                seed={item.asset.id}
                sizes={layout === 'editorial' && i === 0 ? '(max-width:768px) 92vw, 46vw' : '(max-width:640px) 46vw, 23vw'}
                showDuration={false}
                className="h-full"
              />
            </FadeIn>
          ))}
        </div>
        {ps(props, 'caption') ? <p className="mt-6 text-center font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-fg-dim">{ps(props, 'caption')}</p> : null}
      </div>
    </Section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   THUMBNAIL WALL — designed covers, shown as designed covers
   ═══════════════════════════════════════════════════════════════════════════ */
export function ThumbnailWall({ block, projects, images }: { block: SectionData; projects: ProjectCard[]; images: AssetRef[] }) {
  const props = blockProps('thumbnail_wall', block.props);
  const limit = Math.max(1, pn(props, 'limit', 6));

  if (!projects.length && !images.length) {
    return (
      <Section>
        <div className="container-page">
          <SectionHeader eyebrow={block.eyebrow ?? 'Graphic work'} title={block.headline ?? 'Thumbnails & covers'} lede={block.body} />
          <EmptyState
            className="mt-10"
            icon="image"
            title="No thumbnail designs published yet"
            body="Create projects in the CMS with the category “Thumbnail design” (or attach images to this section) and they render as a cover wall."
          />
        </div>
      </Section>
    );
  }

  const manualLightbox = images.slice(0, limit).map((asset) => ({
    kind: 'image' as const,
    src: asset.url,
    alt: asset.alt,
    title: asset.caption ?? asset.alt ?? 'Design',
    caption: asset.caption,
  }));

  return (
    <Section>
      <div className="container-page">
        <SectionHeader
          eyebrow={block.eyebrow ?? 'Graphic work'}
          title={block.headline ?? 'Thumbnails & covers'}
          lede={block.body}
          align="split"
          action={
            block.links[0] ? (
              <Button href={safeHref(block.links[0].href)} variant="ghost" iconEnd="arrow-right">
                {block.links[0].label}
              </Button>
            ) : null
          }
        />

        {projects.length ? (
          <ul className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.slice(0, limit).map((project, i) => (
              <FadeIn key={project.id} delay={(i % 3) * 70} as="li" className="h-full">
                <Link
                  href={`/media/work/${project.slug}`}
                  className="group/cover flex h-full flex-col overflow-hidden rounded-4 border border-[rgba(243,241,236,.08)] bg-[var(--color-ink-900)] transition-[transform,border-color,box-shadow] duration-500 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-1 hover:border-[rgba(243,241,236,.18)] hover:shadow-[var(--shadow-lift)]"
                  data-analytics="project_click"
                  data-analytics-target={`/media/work/${project.slug}`}
                >
                  <div className="relative aspect-video w-full overflow-hidden">
                    <CmImage
                      asset={project.cover}
                      alt={project.cover?.alt ?? project.title}
                      seed={project.slug}
                      ratio="wide"
                      rounded="rounded-none"
                      className="size-full"
                      imgClassName="group-hover/cover:scale-[1.05]"
                      sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 30vw"
                    />
                    <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[rgba(5,5,7,.85)] to-transparent" />
                    <span className="absolute bottom-2.5 left-3 right-3 flex items-end justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block truncate font-display text-[1.02rem] font-semibold leading-tight tracking-[-0.012em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,.85)]">
                          {project.title.replace(/^Sample — /i, '')}
                        </span>
                      </span>
                      {project.isSample ? <SampleTag /> : null}
                    </span>
                    <span
                      aria-hidden
                      className="absolute inset-x-0 bottom-0 h-[3px] origin-left scale-x-0 bg-[var(--accent)] transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] group-hover/cover:scale-x-100"
                    />
                  </div>
                  <div className="flex flex-1 items-center justify-between gap-3 px-4 py-3.5">
                    <p className="truncate font-mono text-[0.625rem] uppercase tracking-[0.14em] text-fg-dim">
                      {[project.client, project.year ? String(project.year) : null].filter(Boolean).join(' · ') || 'Cover design'}
                    </p>
                    <span className="inline-flex shrink-0 items-center gap-1.5 text-[0.75rem] text-fg-dim transition-colors duration-300 group-hover/cover:text-[var(--accent)]">
                      Open <Icon name="arrow-up-right" size={13} />
                    </span>
                  </div>
                </Link>
              </FadeIn>
            ))}
          </ul>
        ) : (
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {manualLightbox.map((item, i) => (
              <FadeIn key={`${item.src}-${i}`} delay={(i % 3) * 70}>
                <MediaTile
                  title={item.title ?? 'Design'}
                  poster={images[i] ?? null}
                  ratio="wide"
                  items={manualLightbox}
                  index={i}
                  seed={item.src}
                  sizes="(max-width: 640px) 92vw, 30vw"
                  showDuration={false}
                />
              </FadeIn>
            ))}
          </div>
        )}
        {ps(props, 'caption') ? <p className="mt-6 text-center font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-fg-dim">{ps(props, 'caption')}</p> : null}
      </div>
    </Section>
  );
}
