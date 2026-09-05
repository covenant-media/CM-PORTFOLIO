import { Section, SectionHeader, EmptyState, SampleTag } from '@/components/ui/Section';
import { MediaTile } from '@/components/ui/MediaTile';
import { CmImage } from '@/components/ui/Media';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Marquee } from '@/components/ui/Marquee';
import { FadeIn } from '@/components/ui/Motion';
import { blockProps } from '@/lib/cms/blocks';
import { cx, formatDuration } from '@/lib/utils/text';
import Link from 'next/link';
import type { AssetRef, GalleryItem, PostCard, TeamItem, VideoRef } from '@/lib/types/content';
import type { Props } from './helpers';
import { pb, ps, pn } from './helpers';

/* ── video wall ───────────────────────────────────────────────────────────── */
export function VideoWall({ block, videos, title }: { block: { props: Props; headline: string | null; eyebrow: string | null; body: string | null }; videos: VideoRef[]; title?: string }) {
  const props = blockProps('video_wall', block.props);
  const layout = ps(props, 'layout', 'wall');
  const limit = pn(props, 'limit', 8);
  const items = videos.slice(0, limit);
  const lightbox = items.map((video) => ({ kind: 'video' as const, video, title: video.title, meta: video.form === 'short_form' ? 'Short-form' : 'Long-form' }));

  return (
    <Section>
      <div className="container-page">
        <SectionHeader eyebrow={block.eyebrow ?? 'Motion'} title={block.headline ?? title ?? 'Selected edits'} lede={block.body} />
        {!items.length ? (
          <EmptyState className="mt-10" icon="film" title="No videos published yet" body="Paste a YouTube, TikTok, Facebook or Vimeo link in the CMS → Videos. Posters and embeds are generated automatically." />
        ) : layout === 'strip' ? (
          <div className="mt-12">
            <Marquee duration={54} groupClassName="gap-4 md:gap-5">
              {items.map((video, i) => (
                <div key={video.id} className="w-[70vw] shrink-0 sm:w-[42vw] lg:w-[24vw]">
                  <MediaTile title={video.title} subtitle={video.source} video={video} ratio={video.vertical ? 'vertical' : 'wide'} items={lightbox} index={i} hoverPreview={false} seed={video.id} className="rounded-3" />
                </div>
              ))}
            </Marquee>
          </div>
        ) : (
          <div className={cx('mt-12 grid gap-5', layout === 'stack' ? 'md:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3')}>
            {items.map((video, i) => (
              <FadeIn key={video.id} delay={(i % 3) * 70}>
                <MediaTile
                  title={video.title}
                  subtitle={video.source}
                  video={video}
                  ratio={video.vertical ? 'vertical' : 'wide'}
                  items={lightbox}
                  index={i}
                  hoverPreview={false}
                  seed={video.id}
                  meta={video.durationS ? formatDuration(video.durationS) : undefined}
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

/* ── photo strip ──────────────────────────────────────────────────────────── */
export function PhotoStrip({ block, gallery, images }: { block: { props: Props; headline: string | null; eyebrow: string | null; body: string | null }; gallery?: GalleryItem | null; images: AssetRef[] }) {
  const props = blockProps('photo_strip', block.props);
  const layout = ps(props, 'layout', 'strip');
  const items = gallery?.items?.length
    ? gallery.items.filter((item) => item.asset).map((item) => ({ asset: item.asset!, caption: item.caption }))
    : images.slice(0, pn(props, 'limit', 8)).map((asset) => ({ asset, caption: asset.caption }));

  if (!items.length) {
    return (
      <Section>
        <div className="container-page">
          <SectionHeader eyebrow={block.eyebrow ?? 'Stills'} title={block.headline ?? 'Frames from the field'} />
          <EmptyState className="mt-10" icon="camera" title="No photos yet" body="Upload to the Media library, then curate a photo set under Photos — or point this section at a gallery slug." />
        </div>
      </Section>
    );
  }

  const lightbox = items.map((item) => ({ kind: 'image' as const, src: item.asset.url, alt: item.asset.alt ?? item.caption, title: item.caption, caption: item.caption }));

  return (
    <Section>
      <div className="container-page">
        {block.headline || block.eyebrow ? <SectionHeader eyebrow={block.eyebrow ?? 'Stills'} title={block.headline ?? 'Frames from the field'} lede={block.body} /> : null}
        {layout === 'strip' ? (
          <div className={cx('mt-10', !block.headline && 'mt-0')}>
            <Marquee duration={62} groupClassName="gap-3 md:gap-4" pauseOnHover>
              {items.slice(0, 14).map((item, i) => (
                <div key={`${item.asset.id}-${i}`} className="w-[54vw] shrink-0 sm:w-[34vw] lg:w-[22vw]">
                  <MediaTile
                    title={item.caption ?? item.asset.alt ?? 'Photograph'}
                    poster={item.asset}
                    ratio="square"
                    items={lightbox}
                    index={i}
                    seed={item.asset.id}
                    sizes="34vw"
                    showDuration={false}
                  />
                </div>
              ))}
            </Marquee>
          </div>
        ) : (
          <div className={cx('mt-12 grid gap-3 sm:gap-4', layout === 'mosaic' ? 'grid-cols-2 md:grid-cols-4 [&>*:nth-child(5n+1)]:col-span-2 [&>*:nth-child(5n+1)]:row-span-2' : 'grid-cols-2 md:grid-cols-3')}>
            {items.slice(0, 12).map((item, i) => (
              <FadeIn key={`${item.asset.id}-${i}`} delay={(i % 4) * 60} className={layout === 'mosaic' && i % 5 === 0 ? 'col-span-2 row-span-2' : undefined}>
                <MediaTile
                  title={item.caption ?? item.asset.alt ?? 'Photograph'}
                  poster={item.asset}
                  ratio="square"
                  items={lightbox}
                  index={i}
                  seed={item.asset.id}
                  sizes="(max-width:640px) 46vw, 28vw"
                  showDuration={false}
                />
              </FadeIn>
            ))}
          </div>
        )}
      </div>
    </Section>
  );
}

/* ── process timeline ─────────────────────────────────────────────────────── */
export function ProcessTimeline({
  block,
  steps,
}: {
  block: { props: Props; headline: string | null; eyebrow: string | null; body: string | null };
  steps?: { title: string; description?: string | null; duration?: string | null }[];
}) {
  const props = blockProps('process_timeline', block.props);
  const manual = ((props.steps as Record<string, unknown>[]) ?? []).map((s) => ({
    title: String(s.title ?? ''),
    description: s.description ? String(s.description) : null,
    duration: s.duration ? String(s.duration) : null,
  }));
  const rows = manual.length ? manual : (steps ?? []);
  const numbered = ps(props, 'layout', 'numbered') === 'numbered';

  if (!rows.length) {
    return (
      <Section>
        <div className="container-page">
          <SectionHeader eyebrow={block.eyebrow ?? 'Process'} title={block.headline ?? 'How the work moves'} />
          <EmptyState className="mt-10" icon="sliders" title="No process defined" body="Add steps in the section options, or attach a service with its own process and set “Or read steps from a service slug”." />
        </div>
      </Section>
    );
  }

  return (
    <Section>
      <div className="container-page">
        <SectionHeader eyebrow={block.eyebrow ?? 'Process'} title={block.headline ?? 'How the work moves'} lede={block.body} />
        <ol className={cx('mt-12 grid gap-5', numbered ? 'md:grid-cols-2 lg:grid-cols-5' : 'lg:grid-cols-2')}>
          {rows.map((step, i) => (
            <FadeIn key={`${step.title}-${i}`} delay={i * 60} className="h-full">
              <li className="relative flex h-full flex-col rounded-4 border border-[rgba(243,241,236,.09)] bg-[var(--color-ink-900)] p-5 md:p-6">
                {numbered ? (
                  <span className="tnum font-mono text-[0.6875rem] tracking-[0.14em] text-[var(--accent)]">{String(i + 1).padStart(2, '0')}</span>
                ) : (
                  <span className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-fg-dim">Step {i + 1}</span>
                )}
                <h3 className="mt-4 font-display text-[1.15rem] leading-snug tracking-[-0.018em]">{step.title}</h3>
                {step.description ? <p className="mt-2.5 text-[0.9rem] leading-relaxed text-fg-muted">{step.description}</p> : null}
                {step.duration ? (
                  <span className="mt-auto pt-4 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-fg-dim">{step.duration}</span>
                ) : null}
                {numbered && i < rows.length - 1 ? (
                  <Icon name="arrow-right" size={14} className="absolute -right-3 top-1/2 hidden -translate-y-1/2 text-[rgba(243,241,236,.18)] lg:block" />
                ) : null}
              </li>
            </FadeIn>
          ))}
        </ol>
      </div>
    </Section>
  );
}

/* ── tools grid ───────────────────────────────────────────────────────────── */
export function ToolsGrid({ block, aggregated }: { block: { props: Props; headline: string | null; eyebrow: string | null; body: string | null }; aggregated: string[] }) {
  const props = blockProps('tools_grid', block.props);
  const manual = ((props.items as string[]) ?? []).map(String);
  const items = (manual.length ? manual : aggregated).slice(0, 30);
  if (!items.length) return null;
  const chips = ps(props, 'layout', 'grid') === 'chips';
  return (
    <Section size="tight">
      <div className="container-page">
        <SectionHeader eyebrow={block.eyebrow ?? 'Toolkit'} title={block.headline ?? 'Made with'} lede={block.body} />
        {chips ? (
          <ul className="mt-8 flex flex-wrap gap-2">
            {items.map((item) => (
              <li key={item} className="rounded-pill border border-[rgba(243,241,236,.1)] bg-[rgba(243,241,236,.03)] px-3 py-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-fg-muted">
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <ul className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-4 border border-[rgba(243,241,236,.09)] bg-[rgba(243,241,236,.08)] sm:grid-cols-3 lg:grid-cols-5">
            {items.map((item) => (
              <li key={item} className="flex items-center gap-2.5 bg-[var(--color-ink-900)] px-4 py-4 text-[0.875rem] text-fg-muted transition-colors hover:bg-[var(--color-ink-850)] hover:text-fg">
                <Icon name="sparkle" size={13} className="shrink-0 text-[var(--accent)] opacity-70" />
                <span className="truncate">{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Section>
  );
}

/* ── faq ──────────────────────────────────────────────────────────────────── */
export function Faq({ block }: { block: { props: Props; headline: string | null; eyebrow: string | null; body: string | null } }) {
  const props = blockProps('faq', block.props);
  const items = ((props.items as Record<string, unknown>[]) ?? []).filter((i) => i?.question);
  if (!items.length) return null;
  const accordion = ps(props, 'layout', 'accordion') === 'accordion';
  return (
    <Section>
      <div className="container-page">
        <SectionHeader eyebrow={block.eyebrow ?? 'Questions'} title={block.headline ?? 'Before you ask'} lede={block.body} />
        <div className="mt-10 max-w-3xl divide-y divide-[rgba(243,241,236,.09)] border-y border-[rgba(243,241,236,.09)]">
          {items.map((item, i) =>
            accordion ? (
              <details key={i} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-display text-[1.1rem] tracking-[-0.015em] md:text-[1.25rem]">
                  {String(item.question)}
                  <span className="grid size-7 shrink-0 place-items-center rounded-full border border-[rgba(243,241,236,.14)] transition duration-300 group-open:rotate-45">
                    <Icon name="plus" size={14} />
                  </span>
                </summary>
                <p className="mt-3 max-w-2xl text-[0.9375rem] leading-relaxed text-fg-muted">{String(item.answer ?? '')}</p>
              </details>
            ) : (
              <div key={i} className="grid gap-2 py-5 md:grid-cols-[1fr_1.5fr] md:gap-8">
                <p className="font-display text-[1.0625rem] tracking-[-0.015em]">{String(item.question)}</p>
                <p className="text-[0.9375rem] leading-relaxed text-fg-muted">{String(item.answer ?? '')}</p>
              </div>
            ),
          )}
        </div>
      </div>
    </Section>
  );
}

/* ── team grid ────────────────────────────────────────────────────────────── */
export function TeamGrid({ block, team }: { block: { props: Props; headline: string | null; eyebrow: string | null; body: string | null }; team: TeamItem[] }) {
  const props = blockProps('team_grid', block.props);
  const items = team.slice(0, pn(props, 'limit', 8)).filter((member) => pb(props, 'showPlaceholders', true) || !member.isPlaceholder);
  return (
    <Section>
      <div className="container-page">
        <SectionHeader eyebrow={block.eyebrow ?? 'People'} title={block.headline ?? 'Who you work with'} lede={block.body} />
        {items.length ? (
          <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((member, i) => (
              <FadeIn key={member.id} delay={i * 60}>
                <li className="group relative overflow-hidden rounded-4 border border-[rgba(243,241,236,.09)] bg-[var(--color-ink-900)]">
                  <CmImage asset={member.avatar} alt={member.name} seed={member.id} ratio="tall" rounded="rounded-none" imgClassName="grayscale-[35%] transition duration-[900ms] group-hover:scale-[1.04] group-hover:grayscale-0" sizes="(max-width:640px) 46vw, 22vw" />
                  <div className="p-4">
                    <div className="flex items-center gap-2">
                      <h3 className="min-w-0 truncate font-display text-[1.0625rem] tracking-[-0.015em]">{member.name}</h3>
                      {member.isFounder ? <span className="shrink-0 rounded-pill bg-[color-mix(in_oklab,var(--accent)_18%,transparent)] px-1.5 py-0.5 font-mono text-[0.5rem] uppercase tracking-[0.14em] text-[var(--accent)]">Founder</span> : null}
                    </div>
                    {member.role ? <p className="mt-1 text-[0.8125rem] text-fg-muted">{member.role}</p> : null}
                    {member.focus.length ? (
                      <p className="mt-3 font-mono text-[0.5625rem] uppercase leading-relaxed tracking-[0.14em] text-fg-dim">{member.focus.join(' · ')}</p>
                    ) : null}
                    {member.isPlaceholder ? <SampleTag className="mt-3" label="Open slot" /> : null}
                  </div>
                </li>
              </FadeIn>
            ))}
          </ul>
        ) : (
          <EmptyState className="mt-10" icon="users" title="Just Covenant for now" body="That is honest and it is fine. Add collaborators in the CMS → Team when the crew grows." />
        )}
      </div>
    </Section>
  );
}

/* ── blog preview ─────────────────────────────────────────────────────────── */
export function BlogPreview({ block, posts, allHref = '/blog' }: { block: { props: Props; headline: string | null; eyebrow: string | null; body: string | null }; posts: PostCard[]; allHref?: string }) {
  const props = blockProps('blog_preview', block.props);
  const layout = ps(props, 'layout', 'cards');
  const showMeta = pb(props, 'showMeta', true);
  return (
    <Section>
      <div className="container-page">
        <SectionHeader
          eyebrow={block.eyebrow ?? 'Writing'}
          title={block.headline ?? 'Notes from both sides'}
          lede={block.body}
          align="split"
          action={
            <Button href={allHref} variant="ghost" iconEnd="arrow-right" size="sm">
              All writing
            </Button>
          }
        />
        {posts.length ? (
          layout === 'list' ? (
            <ul className="mt-10">
              {posts.map((post, i) => (
                <li key={post.id}>
                  <Link href={`/blog/${post.slug}`} className="group grid gap-2 border-b border-[rgba(243,241,236,.09)] py-5 md:grid-cols-[auto_1fr_auto] md:items-baseline md:gap-8">
                    <span className="tnum font-mono text-[0.6875rem] text-fg-dim">{String(i + 1).padStart(2, '0')}</span>
                    <span className="font-display text-lg tracking-[-0.02em] transition group-hover:text-[var(--accent)] md:text-[1.45rem]">{post.title}</span>
                    <span className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-fg-dim">{post.category ?? 'Article'}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="mt-12 grid gap-5 md:grid-cols-3 md:gap-6">
              {posts.map((post, i) => (
                <FadeIn key={post.id} delay={i * 70} as="li" className="h-full">
                  <article className="group relative flex h-full flex-col overflow-hidden rounded-4 border border-[rgba(243,241,236,.09)] bg-[var(--color-ink-900)] transition duration-500 hover:-translate-y-1 hover:border-[rgba(243,241,236,.18)]">
                    <CmImage asset={post.cover} alt={post.title} seed={post.slug} ratio="wide" rounded="rounded-none" priority={i === 0} sizes="(max-width:768px) 92vw, 30vw" />
                    <div className="flex flex-1 flex-col p-5">
                      <div className="flex items-center gap-3">
                        {post.category ? <span className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-[var(--accent)]">{post.category}</span> : null}
                        {post.isSample ? <SampleTag /> : null}
                      </div>
                      <h3 className="mt-3 font-display text-[1.2rem] leading-snug tracking-[-0.02em]">
                        <Link href={`/blog/${post.slug}`} className="after:absolute after:inset-0 after:content-[''] hover:text-[var(--accent)] transition-colors">
                          {post.title}
                        </Link>
                      </h3>
                      {post.excerpt ? <p className="mt-2.5 line-clamp-3 text-[0.9rem] leading-relaxed text-fg-muted">{post.excerpt}</p> : null}
                      {showMeta ? (
                        <p className="mt-auto pt-5 font-mono text-[0.5625rem] uppercase tracking-[0.16em] text-fg-dim">
                          {[post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null, post.readingMinutes ? `${post.readingMinutes} min read` : null].filter(Boolean).join(' · ')}
                        </p>
                      ) : null}
                    </div>
                  </article>
                </FadeIn>
              ))}
            </ul>
          )
        ) : (
          <EmptyState className="mt-10" icon="book" title="Nothing written yet" body="Blog posts published in the CMS appear here — tutorials, breakdowns, security notes, behind the scenes." />
        )}
      </div>
    </Section>
  );
}
