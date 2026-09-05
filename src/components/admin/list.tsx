import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Pager } from '@/components/ui/Pager';
import { cx, formatDate, truncate } from '@/lib/utils/text';
import { Pill, StatusPill } from './ui';
import { RowActionForm, type RowAction } from './row-actions';
import type { CmsModuleDef } from '@/lib/cms/modules';
import type { ListResult } from '@/lib/cms/repository';

export interface ListPageQuery {
  q?: string;
  status?: string;
  page?: string;
  [key: string]: string | undefined;
}

/**
 * The generic collection list. Columns, filters and row actions all come from the
 * module registry, so 20+ modules share one implementation.
 */
export function ModuleList({
  module,
  result,
  query,
  canWrite,
  thumbs,
  actions,
  hrefFor,
}: {
  module: CmsModuleDef;
  result: ListResult;
  query: ListPageQuery;
  canWrite: boolean;
  thumbs?: Record<string, { url: string; kind?: string } | undefined>;
  actions?: (row: Record<string, unknown>) => RowAction[];
  hrefFor?: (row: Record<string, unknown>) => string | null;
}) {
  const base = `/admin/${module.key}`;
  const columns = module.columns.length ? module.columns : [{ key: module.primary, label: module.singular, type: 'text' as const }];

  if (!result.rows.length) {
    return (
      <div className="rounded-4 border border-dashed border-line px-6 py-12 text-center">
        <p className="font-display text-[19px] text-fg">{module.emptyTitle ?? `No ${module.label.toLowerCase()} yet`}</p>
        <p className="mx-auto mt-2 max-w-[54ch] text-[13px] leading-relaxed text-fg-muted">{module.emptyHint ?? module.description}</p>
        {canWrite ? (
          <Link href={`${base}/new`} className="mt-4 inline-flex items-center gap-2 rounded-2 bg-[var(--accent)] px-3.5 py-2 text-[12.5px] font-medium text-[var(--accent-ink)]">
            <Icon name="plus" size={13} /> Create the first one
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-4 border border-line bg-ink-900/40">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-line text-[10.5px] uppercase tracking-[0.13em] text-fg-dim">
            {thumbs ? <th className="w-[58px] px-3 py-2" aria-label="Preview" /> : null}
            {columns.map((column) => (
              <th key={column.key} className={cx('px-3 py-2 font-medium', column.key === module.primary && 'w-[32%]')}>
                {column.label}
              </th>
            ))}
            <th className="w-[1%] px-3 py-2 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row) => {
            const id = String(row.id ?? row.key ?? row.scope ?? '');
            const href = hrefFor ? hrefFor(row) : `${base}/${id}`;
            const thumb = thumbs?.[id];
            const rowActions = actions ? actions(row) : [];
            return (
              <tr key={id} className="border-b border-line/50 align-middle transition-colors last:border-0 hover:bg-ink-850/40">
                {thumb !== undefined || thumbs ? (
                  <td className="px-3 py-2">
                    {thumb ? (
                      <span className="block h-9 w-12 overflow-hidden rounded border border-line bg-ink-950">
                       
                        <img src={thumb.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                      </span>
                    ) : (
                      <span className="grid h-9 w-12 place-items-center rounded border border-dashed border-line text-fg-dim">
                        <Icon name="image" size={12} />
                      </span>
                    )}
                  </td>
                ) : null}
                {columns.map((column) => (
                  <td key={column.key} className="px-3 py-2 text-[12.5px] text-fg-muted">
                    {renderCell(row, column, href, module, row)}
                  </td>
                ))}
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-1.5">
                    {rowActions.map((action) => (
                      <RowActionForm key={action.op} module={module.key} id={id} action={action} compact />
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-2.5">
        <p className="text-[11.5px] text-fg-dim">
          {result.total} record{result.total === 1 ? '' : 's'}
          {result.total > result.per ? ` · page ${result.page} of ${result.pages}` : ''}
        </p>
        <Pager page={result.page} pages={result.pages} basePath={base} total={result.total} query={{ ...query }} label={module.singular.toLowerCase()} />
      </div>
    </div>
  );
}

function renderCell(row: Record<string, unknown>, column: { key: string; label: string; type?: string }, href: string | null, module: CmsModuleDef, full: Record<string, unknown>) {
  const value = row[column.key];
  const isPrimary = column.key === module.primary;

  if (isPrimary) {
    const secondary = module.secondary ? row[module.secondary] : null;
    const inner = (
      <span className="block min-w-0">
        <span className="block truncate text-[13px] text-fg">{truncate(String(value ?? 'Untitled'), 70)}</span>
        {secondary ? <span className="mt-0.5 block truncate font-mono text-[10.5px] text-fg-dim">{truncate(String(secondary), 60)}</span> : null}
        {full.is_sample === true ? (
          <span className="mt-1 inline-flex items-center gap-1 rounded-pill border border-[var(--accent)]/35 px-1.5 py-[1px] text-[10px] text-[var(--accent)]">
            <Icon name="info" size={9} /> placeholder
          </span>
        ) : null}
      </span>
    );
    return href ? (
      <Link href={href} className="block min-w-0 hover:underline">
        {inner}
      </Link>
    ) : (
      inner
    );
  }

  switch (column.type) {
    case 'status':
      return <StatusPill status={String(value ?? 'draft')} />;
    case 'bool':
      return value === true || value === 'true' ? (
        <Icon name="check" size={14} className="text-ok-400" title="Yes" />
      ) : (
        <span className="text-fg-dim">—</span>
      );
    case 'number':
      return <span className="font-mono text-[12px]">{value === null || value === undefined || value === '' ? '—' : String(value)}</span>;
    case 'date':
      return <span className="text-[12px]">{value ? formatDate(String(value), 'short') : '—'}</span>;
    case 'tag':
      return value ? <Pill tone="neutral">{humaniseToken(String(value))}</Pill> : <span className="text-fg-dim">—</span>;
    case 'relation':
      return <span className="font-mono text-[11px] text-fg-dim">{value ? truncate(String(value), 22) : '—'}</span>;
    case 'image':
      return value ? <span className="font-mono text-[11px]">{truncate(String(value), 26)}</span> : <span className="text-fg-dim">—</span>;
    default:
      return <span className="block max-w-[36ch] truncate">{value === null || value === undefined || value === '' ? <span className="text-fg-dim">—</span> : humaniseToken(String(value))}</span>;
  }
}

function humaniseToken(value: string): string {
  if (!value.includes('_') || value.length > 40) return value;
  return value.replace(/_/g, ' ');
}

/** Search + status + module filters as a plain GET form (works without JS). */
export function ListToolbar({
  module,
  query,
  statuses,
}: {
  module: CmsModuleDef;
  query: ListPageQuery;
  statuses?: readonly { value: string; label: string }[];
}) {
  const base = `/admin/${module.key}`;
  const filters = module.filterBy ? (Array.isArray(module.filterBy) ? module.filterBy : [module.filterBy]) : [];
  const active = Boolean(query.q || query.status || filters.some((f) => query[f.key]));

  return (
    <form method="GET" action={base} className="flex flex-wrap items-end gap-2">
      <label className="min-w-[220px] flex-1">
        <span className="mb-1 block text-[10.5px] uppercase tracking-[0.13em] text-fg-dim">Search</span>
        <input
          name="q"
          defaultValue={query.q ?? ''}
          placeholder={module.search?.length ? `Search ${module.search.join(', ')}` : 'Search…'}
          className="w-full rounded-2 border border-line bg-ink-950/70 px-3 py-1.5 text-[12.5px] text-fg outline-none placeholder:text-fg-dim/80 focus:border-[var(--accent)]/60"
        />
      </label>

      {statuses?.length ? (
        <label>
          <span className="mb-1 block text-[10.5px] uppercase tracking-[0.13em] text-fg-dim">State</span>
          <select
            name="status"
            defaultValue={query.status ?? ''}
            className="rounded-2 border border-line bg-ink-950/70 px-2.5 py-1.5 text-[12.5px] text-fg-muted outline-none focus:border-[var(--accent)]/60"
          >
            <option value="">Any</option>
            {statuses.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {filters.map((filter) => (
        <label key={filter.key}>
          <span className="mb-1 block text-[10.5px] uppercase tracking-[0.13em] text-fg-dim">{filter.label}</span>
          <select
            name={filter.key}
            defaultValue={query[filter.key] ?? ''}
            className="rounded-2 border border-line bg-ink-950/70 px-2.5 py-1.5 text-[12.5px] text-fg-muted outline-none focus:border-[var(--accent)]/60"
          >
            <option value="">Any</option>
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ))}

      <button type="submit" className="rounded-2 border border-line px-3 py-1.5 text-[12.5px] text-fg-muted hover:border-[var(--accent)]/50 hover:text-fg">
        Apply
      </button>
      {active ? (
        <Link href={base} className="rounded-2 px-2 py-1.5 text-[12px] text-fg-dim hover:text-fg">
          Clear
        </Link>
      ) : null}
    </form>
  );
}
