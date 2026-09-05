import Link from 'next/link';
import { Icon } from './Icon';
import { cx } from '@/lib/utils/text';

/**
 * Pagination for the catalog pages. Filters stay in the URL so page 2 of a
 * category keeps its context, and page 1 never carries a useless query string.
 */
export function Pager({
  page,
  pages,
  basePath,
  total,
  query,
  label = 'items',
}: {
  page: number;
  pages: number;
  basePath: string;
  total: number;
  query?: Record<string, string | null | undefined>;
  label?: string;
}) {
  if (pages <= 1) return null;
  const href = (n: number) => {
    const params = new URLSearchParams();
    if (n > 1) params.set('page', String(n));
    for (const [key, value] of Object.entries(query ?? {})) if (value) params.set(key, String(value));
    const search = params.toString();
    return `${basePath}${search ? `?${search}` : ''}`;
  };

  const nums: (number | '…')[] = [];
  if (pages <= 7) {
    for (let i = 1; i <= pages; i += 1) nums.push(i);
  } else {
    const start = Math.max(2, page - 2);
    const end = Math.min(pages - 1, page + 2);
    nums.push(1);
    if (start > 2) nums.push('…');
    for (let i = start; i <= end; i += 1) nums.push(i);
    if (end < pages - 1) nums.push('…');
    nums.push(pages);
  }

  return (
    <nav className="flex flex-wrap items-center justify-between gap-6 border-t border-[rgba(243,241,236,.09)] py-7" aria-label="Pagination">
      <p className="tnum font-mono text-[0.625rem] uppercase tracking-[0.14em] text-fg-dim">
        Page {page} of {pages} · {total} {label}
      </p>
      <div className="flex items-center gap-1.5">
        {page > 1 ? (
          <Link
            href={href(page - 1)}
            rel="prev"
            aria-label="Previous page"
            className="grid size-9 place-items-center rounded-full border border-[rgba(243,241,236,.14)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            <Icon name="arrow-left" size={15} />
          </Link>
        ) : null}
        {nums.map((item, index) =>
          item === '…' ? (
            <span key={`gap-${index}`} className="px-1 font-mono text-[0.75rem] text-fg-dim" aria-hidden>
              …
            </span>
          ) : (
            <Link
              key={item}
              href={href(item)}
              aria-current={item === page ? 'page' : undefined}
              className={cx(
                'tnum grid size-9 place-items-center rounded-full border font-mono text-[0.75rem] transition',
                item === page
                  ? 'border-transparent bg-[var(--accent)] text-[var(--accent-ink)]'
                  : 'border-[rgba(243,241,236,.1)] text-fg-muted hover:border-[var(--accent)] hover:text-fg',
              )}
            >
              {item}
            </Link>
          ),
        )}
        {page < pages ? (
          <Link
            href={href(page + 1)}
            rel="next"
            aria-label="Next page"
            className="grid size-9 place-items-center rounded-full border border-[rgba(243,241,236,.14)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            <Icon name="arrow-right" size={15} />
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
