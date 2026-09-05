import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Section, SectionHeader, Eyebrow, SampleTag, Tag } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { CmImage } from '@/components/ui/Media';
import { WorkGrid } from './WorkCard';
import { CmsPage } from './CmsPage';
import { postBySlug, postsFor } from '@/lib/cms/content';
import { breadcrumbJsonLd, jsonLdScript, postJsonLd } from '@/lib/seo/structured';
import { resolveSite } from '@/lib/seo/metadata';
import { formatDate } from '@/lib/utils/text';

/** Long-form reading view: quiet, narrow, typographic. No decorative noise. */
export async function ArticleView({ slug }: { slug: string }) {
  const post = await postBySlug(slug);
  if (!post) notFound();
  const [site, more] = await Promise.all([
    resolveSite(),
    postsFor({ divisions: [post.division], limit: 3, exclude: post.slug }),
  ]);
  const path = `/blog/${post.slug}`;
  const structured = [
    postJsonLd(post, site, path),
    breadcrumbJsonLd(
      [
        { name: 'Writing', path: '/blog' },
        { name: post.title, path },
      ],
      site.origin,
    ),
  ];

  return (
    <CmsPage surface={post.division === 'media' || post.division === 'tech' ? post.division : 'main'} path={path} slug={`post:${post.slug}`} title={post.title} hideHeader>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(structured) }} />

      <article>
        <header className="border-b border-[rgba(243,241,236,.09)] pb-12 pt-24 md:pt-28">
          <div className="container-read">
            <nav aria-label="Breadcrumb" className="mb-8">
              <Link href="/blog" className="inline-flex items-center gap-1.5 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-fg-dim transition hover:text-fg">
                <Icon name="arrow-left" size={12} /> Writing
              </Link>
            </nav>
            <div className="flex flex-wrap items-center gap-3">
              <Tag tone="accent">{post.division === 'tech' ? 'Technology' : post.division === 'media' ? 'Media' : 'Studio'}</Tag>
              {post.category ? <span className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-fg-dim">{post.category}</span> : null}
              {post.isSample ? <SampleTag /> : null}
            </div>
            <h1 className="mt-6 font-display text-[clamp(2rem,5vw,3.4rem)] font-light leading-[1.04] tracking-[-0.03em] [text-wrap:balance]">{post.title}</h1>
            {post.excerpt ? <p className="lede mt-5">{post.excerpt}</p> : null}
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-[rgba(243,241,236,.09)] pt-5 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-fg-dim">
              <span className="text-fg-muted">{post.authorName ?? 'Covenant Nsikan'}</span>
              {post.publishedAt ? <span>{formatDate(post.publishedAt, 'long')}</span> : null}
              <span className="tnum">{post.readingMinutes ?? 1} min read</span>
            </div>
          </div>
        </header>

        {post.cover ? (
          <div className="container-page mt-12">
            <CmImage asset={post.cover} alt={post.cover.alt ?? post.title} seed={post.slug} ratio="wide" rounded="rounded-4" priority sizes="(max-width: 1200px) 92vw, 1200px" />
          </div>
        ) : null}

        <div className="container-read py-14 md:py-20">
          <div className="prose-cm" dangerouslySetInnerHTML={{ __html: post.bodyHtml }} />

          {post.tags.length ? (
            <ul className="mt-12 flex flex-wrap gap-2 border-t border-[rgba(243,241,236,.09)] pt-6">
              {post.tags.map((tag) => (
                <li key={tag}>
                  <Link
                    href={`/blog?tag=${encodeURIComponent(tag)}`}
                    className="rounded-pill border border-[rgba(243,241,236,.12)] px-3 py-1 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-fg-muted transition hover:border-[var(--accent)] hover:text-fg"
                  >
                    {tag}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </article>

      {post.relatedProjects.length ? (
        <Section tone="sunken">
          <div className="container-page">
            <SectionHeader eyebrow="From this article" title="The work behind it" />
            <div className="mt-10">
              <WorkGrid projects={post.relatedProjects} layout="grid" showVideos />
            </div>
          </div>
        </Section>
      ) : null}

      <Section size="tight">
        <div className="container-page">
          <div className="flex flex-wrap items-center justify-between gap-6 rounded-4 border border-[rgba(243,241,236,.1)] bg-[var(--color-ink-900)] p-6 md:p-8">
            <div>
              <Eyebrow>Keep reading</Eyebrow>
              <p className="mt-3 font-display text-[1.35rem] leading-snug tracking-[-0.02em] md:text-[1.6rem]">
                {more.posts[0]?.title ?? 'More notes are on the way.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {more.posts[0] ? (
                <Button href={`/blog/${more.posts[0].slug}`} iconEnd="arrow-right" size="sm">
                  Next article
                </Button>
              ) : null}
              <Button href="/blog" variant="ghost" size="sm">
                All writing
              </Button>
            </div>
          </div>
        </div>
      </Section>
    </CmsPage>
  );
}
