import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { EmptyState } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import { WorkGrid } from './WorkCard';
import { Pager } from '@/components/ui/Pager';
import { projectCards, projectFacets, postsFor, categoryLabel } from '@/lib/cms/content';
import { cx, truncate } from '@/lib/utils/text';
import type { PostCard } from '@/lib/types/content';

export interface CatalogQuery {
  page?: string;
  category?: string;
  form?: string;
  q?: string;
  tag?: string;
  division?: string;
}

const PER_PAGE = 12;

function pageOf(value: string | undefined): number {
  const n = Number(value ?? 1);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), 200) : 1;
}

/* ── projects / work ──────────────────────────────────────────────────────── */
export async function ProjectCatalog({
  division,
  query,
  basePath,
  perPage = PER_PAGE,
}: {
  division: 'media' | 'tech';
  query: CatalogQuery;
  basePath: string;
  perPage?: number;
}) {
  const page = pageOf(query.page);
  const category = query.category?.trim() || undefined;
  const form = query.form?.trim() || undefined;
  const q = query.q?.trim().slice(0, 60) || undefined;

  const [{ cards, total }, facets] = await Promise.all([
    projectCards({ division, limit: perPage, offset: (page - 1) * perPage, category, form, q }),
    projectFacets(division),
  ]);
  const pages = Math.max(1, Math.ceil(total / perPage));
  const active: Record<string, string | null> = { category: category ?? null, form: form ?? null };

  const filterHref = (key: 'category' | 'form', value: string | null) => {
    const params = new URLSearchParams();
    const next = { ...active, [key]: value };
    for (const [k, v] of Object.entries(next)) if (v) params.set(k, v);
    if (q) params.set('q', q);
    if (page > 1) params.set('page', String(Math.min(page, pages)));
    const search = params.toString();
    return `${basePath}${search ? `?${search}` : ''}`;
  };

  const categoryFacets = facets.filter((facet) => facet.key === 'category');
  const formFacets = facets.filter((facet) => facet.key === 'form');

  return (
    <div className="border-t border-[rgba(243,241,236,.09)]">
      <div className="container-page">
        <div className="flex flex-wrap items-end justify-between gap-6 py-7">
          <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-4">
            {categoryFacets.length > 1 ? (
              <nav aria-label="Filter by category" className="min-w-0">
                <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <li>
                    <Link href={filterHref('category', null)} className={cx('text-[0.875rem] transition', !category ? 'text-[var(--accent)]' : 'text-fg-muted hover:text-fg')}>
                      All <span className="tnum font-mono text-[0.6875rem] opacity-60">{totalWithout(categoryFacets)}</span>
                    </Link>
                  </li>
                  {categoryFacets.map((facet) => (
                    <li key={facet.value}>
                      <Link
                        href={filterHref('category', active.category === facet.value ? null : facet.value)}
                        className={cx('text-[0.875rem] transition', active.category === facet.value ? 'text-[var(--accent)]' : 'text-fg-muted hover:text-fg')}
                      >
                        {facet.label} <span className="tnum font-mono text-[0.6875rem] opacity-60">{facet.count}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ) : null}
            {formFacets.length > 1 ? (
              <nav aria-label="Filter by format" className="min-w-0">
                <ul className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  {formFacets.map((facet) => (
                    <li key={facet.value}>
                      <Link
                        href={filterHref('form', active.form === facet.value ? null : facet.value)}
                        className={cx(
                          'inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1 font-mono text-[0.625rem] uppercase tracking-[0.12em] transition',
                          active.form === facet.value
                            ? 'border-[var(--accent)] text-[var(--accent)]'
                            : 'border-[rgba(243,241,236,.12)] text-fg-dim hover:border-[rgba(243,241,236,.3)] hover:text-fg-muted',
                        )}
                      >
                        {facet.label} <span className="tnum opacity-60">{facet.count}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ) : null}
          </div>

          <form action={basePath} method="get" className="flex shrink-0 items-center gap-2" role="search">
            {active.category ? <input type="hidden" name="category" value={active.category ?? ''} /> : null}
            {active.form ? <input type="hidden" name="form" value={active.form ?? ''} /> : null}
            <label htmlFor="catalog-q" className="sr-only">
              Search {division === 'tech' ? 'projects' : 'work'}
            </label>
            <div className="relative">
              <Icon name="search" size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-dim" />
              <input
                id="catalog-q"
                name="q"
                defaultValue={q ?? ''}
                placeholder={division === 'tech' ? 'Search projects' : 'Search work'}
                className="h-9 w-44 rounded-pill border border-[rgba(243,241,236,.12)] bg-[rgba(243,241,236,.02)] pl-8 pr-3 text-[0.8125rem] outline-none transition focus:border-[var(--accent)] focus:bg-[rgba(243,241,236,.05)] md:w-52"
              />
            </div>
            <button type="submit" className="sr-only">
              Search
            </button>
          </form>
        </div>
      </div>

      <div className="container-page pb-4">
        {q ? (
          <p className="mb-6 flex flex-wrap items-center gap-2 text-[0.875rem] text-fg-muted">
            <span className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-fg-dim">Results for</span>
            <span className="text-fg">“{q}”</span>
            <Link href={filterHref('category', null)} className="ml-1 inline-flex items-center gap-1 text-fg-dim underline underline-offset-4 transition hover:text-fg">
              <Icon name="close" size={12} /> clear
            </Link>
          </p>
        ) : null}

        {cards.length ? (
          <>
            <WorkGrid projects={cards} layout="grid" showVideos={division === 'media'} />
            <div className="pb-4" />
          </>
        ) : (
          <EmptyState
            className="my-14"
            icon={division === 'tech' ? 'code' : 'film'}
            title={q || category || form ? 'Nothing matches those filters' : 'Nothing published here yet'}
            body={
              q || category || form
                ? 'Try a broader filter, or clear the search.'
                : division === 'tech'
                  ? 'Projects appear here once they are published in the CMS → Tech projects.'
                  : 'Work appears here once it is published in the CMS → Media projects.'
            }
            action={
              q || category || form ? (
                <Button href={basePath} size="sm" variant="outline" iconEnd="arrow-right">
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        )}

        {total > perPage ? (
          <div className="pb-16">
            <Pager page={page} pages={pages} basePath={basePath} total={total} query={{ category: active.category, form: active.form, q: q ?? null }} />
          </div>
        ) : cards.length ? (
          <p className="tnum border-t border-[rgba(243,241,236,.09)] py-7 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-fg-dim">
            {total} {total === 1 ? 'project' : 'projects'} shown
          </p>
        ) : null}
      </div>
    </div>
  );
}

function totalWithout(facets: { count: number }[]): number {
  return facets.reduce((sum, facet) => sum + facet.count, 0);
}

/* ── writing / blog ───────────────────────────────────────────────────────── */
export async function WritingCatalog({
  query,
  divisions,
  basePath = '/blog',
  perPage = 9,
}: {
  query: CatalogQuery;
  divisions?: string[];
  basePath?: string;
  perPage?: number;
}) {
  const page = pageOf(query.page);
  const tag = query.tag?.trim() || undefined;
  const [{ posts, total }, all] = await Promise.all([
    postsFor({ divisions, limit: perPage, offset: (page - 1) * perPage, tag }),
    postsFor({ divisions, limit: 1 }),
  ]);
  const pages = Math.max(1, Math.ceil(total / perPage));
  const tags = Array.from(new Set(all.posts.flatMap((post: PostCard) => post.tags))).slice(0, 12);

  return (
    <div className="container-page border-t border-[rgba(243,241,236,.09)] py-12">
      {tags.length > 1 ? (
        <nav aria-label="Filter by tag" className="mb-10">
          <ul className="flex flex-wrap items-center gap-2">
            <li>
              <Link href={basePath} className={cx('rounded-pill border px-3 py-1 font-mono text-[0.625rem] uppercase tracking-[0.12em] transition', !tag ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[rgba(243,241,236,.12)] text-fg-dim hover:text-fg-muted')}>
                All
              </Link>
            </li>
            {tags.map((item) => (
              <li key={item}>
                <Link
                  href={`${basePath}?tag=${encodeURIComponent(item)}`}
                  className={cx('rounded-pill border px-3 py-1 font-mono text-[0.625rem] uppercase tracking-[0.12em] transition', tag === item ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[rgba(243,241,236,.12)] text-fg-dim hover:text-fg-muted')}
                >
                  {item}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      {posts.length ? (
        <ul className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post: PostCard) => (
            <li key={post.id}>
              <article className="group flex h-full flex-col border-t border-[rgba(243,241,236,.14)] pt-5">
                <p className="flex items-center gap-3 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-fg-dim">
                  <span className="text-[var(--accent)]">{post.division === 'media' ? 'Media' : post.division === 'tech' ? 'Tech' : 'Studio'}</span>
                  {post.category ? <span>· {post.category}</span> : null}
                  <span className="tnum">· {post.readingMinutes ?? 1} min</span>
                </p>
                <h2 className="mt-3 font-display text-[1.4rem] leading-snug tracking-[-0.024em]">
                  <Link href={`/blog/${post.slug}`} className="after:absolute after:inset-0 after:content-[''] group-hover:text-[var(--accent)]">
                    {post.title}
                  </Link>
                </h2>
                {post.excerpt ? <p className="mt-3 line-clamp-3 text-[0.9375rem] leading-relaxed text-fg-muted">{truncate(post.excerpt, 190)}</p> : null}
                <p className="mt-auto pt-5 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-fg-dim">
                  {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Draft'}
                </p>
              </article>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon="book"
          title={tag ? `Nothing tagged “${tag}” yet` : 'The journal is empty'}
          body="Posts published in the CMS → Blog land here — breakdowns, tutorials and notes from both disciplines."
          action={tag ? <Button href={basePath} size="sm" variant="outline">All writing</Button> : undefined}
        />
      )}

      {total > perPage ? <div className="mt-4 -mx-[4.5vw] md:mx-0"><Pager page={page} pages={pages} basePath={basePath} total={total} query={{ tag: tag ?? null }} /></div> : null}
    </div>
  );
}

/** Small helper used on project detail pages for the "next" line. */
export function CategoryChip({ division, value }: { division: 'media' | 'tech'; value: string | null | undefined }) {
  const label = categoryLabel(division, value);
  if (!label) return null;
  return <span className="rounded-pill border border-[rgba(243,241,236,.14)] px-2.5 py-1 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-fg-muted">{label}</span>;
}
