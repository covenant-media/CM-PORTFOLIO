/**
 * Boards shared by the section hubs.
 *
 * Each one is a thin, read-only window onto a module plus the links to act on it — the editors
 * themselves stay in the module pages, so there is exactly one place where a row is written.
 * They are server components: data in, markup out.
 */
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Panel, Pill, StatusPill, whenLabel } from './ui';
import { list, type ListQuery } from '@/lib/cms/repository';
import { getCmsModule } from '@/lib/cms/modules';

export interface BoardRow {
  id: string;
  title: string;
  meta: string;
  status: string;
  href: string;
}

/**
 * The newest rows of one module. `secondary` names the column printed under the title; when the
 * column is empty the row falls back to its slug or status so the line is never blank.
 */
export async function ModuleRowsBoard({
  moduleKey,
  title,
  hint,
  per = 6,
  query,
  emptyText,
  action,
}: {
  moduleKey: string;
  title: string;
  hint: string;
  per?: number;
  query?: ListQuery;
  emptyText?: string;
  action?: React.ReactNode;
}) {
  const mod = getCmsModule(moduleKey);
  if (!mod) return null;
  const result = await list(moduleKey, { per, ...query });
  const rows: BoardRow[] = result.rows.map((row) => {
    const secondary = mod.secondary ? String(row[mod.secondary] ?? '') : '';
    const slug = String(row.slug ?? '');
    return {
      id: String(row[mod.primary] ?? row.id ?? ''),
      title: String(row[mod.primary] ?? 'Untitled'),
      meta: secondary || slug || String(row.role ?? '').replace(/_/g, ' '),
      status: String(row.status ?? 'published'),
      href: `/admin/${moduleKey}/${row.id}`,
    };
  });

  return (
    <Panel
      title={title}
      hint={hint}
      action={
        action ?? (
          <Link href={`/admin/${moduleKey}`} className="rounded-2 border border-line px-2.5 py-1 text-[11.5px] text-fg-muted hover:text-fg">
            Manage
          </Link>
        )
      }
    >
      {rows.length === 0 ? (
        <p className="text-[12.5px] text-fg-dim">{emptyText ?? `Nothing in ${mod.label} yet.`}</p>
      ) : (
        <ul className="divide-y divide-line/60">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center gap-3 py-2.5">
              <StatusPill status={row.status} />
              <span className="min-w-0 flex-1">
                <Link href={row.href} className="block truncate text-[13px] text-fg hover:underline">
                  {row.title}
                </Link>
                {row.meta ? <span className="mt-0.5 block truncate text-[11.5px] text-fg-dim">{row.meta}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 border-t border-line/60 pt-2.5 text-[11.5px] text-fg-dim">
        {result.total} row{result.total === 1 ? '' : 's'} in {mod.label}
        {result.total > rows.length ? ` · showing the first ${rows.length}` : ''}
      </p>
    </Panel>
  );
}

export interface SocialRow {
  id: string;
  network: string;
  label: string | null;
  handle: string | null;
  url: string;
  icon: string | null;
  isVerified: boolean;
  status: string;
  placements: string[];
}

/** The social-links board: every profile, its icon, and whether it is cleared for the public site. */
export async function SocialsBoard({ canWrite }: { canWrite: boolean }) {
  const result = await list('social_links', { per: 40 });
  const rows: SocialRow[] = result.rows.map((row) => ({
    id: String(row.id),
    network: String(row.network ?? ''),
    label: (row.label as string) ?? null,
    handle: (row.handle as string) ?? null,
    url: String(row.url ?? ''),
    icon: (row.icon as string) ?? null,
    isVerified: row.is_verified === true,
    status: String(row.status ?? 'published'),
    placements: Array.isArray(row.placements) ? (row.placements as string[]) : [],
  }));
  const verified = rows.filter((row) => row.isVerified && row.status === 'published').length;

  return (
    <Panel
      title="Social accounts"
      hint="Every profile the site can show. A link reaches the public site once it is verified and published."
      action={
        <Link
          href="/admin/social_links/new"
          className="inline-flex items-center gap-1.5 rounded-2 border border-[var(--accent)]/45 px-2.5 py-1 text-[11.5px] text-[var(--accent)] hover:bg-[var(--accent-glow)]"
        >
          <Icon name="plus" size={12} /> Add account
        </Link>
      }
    >
      <p className="flex flex-wrap items-center gap-2 border-b border-line/60 pb-3 text-[11.5px] text-fg-dim">
        <Pill tone={verified ? 'ok' : 'warn'}>
          <Icon name="check" size={11} /> {verified} live
        </Pill>
        {rows.length - verified} held back (unverified or draft)
      </p>
      {rows.length === 0 ? (
        <p className="py-3 text-[12.5px] text-fg-dim">
          No accounts yet. Add Facebook, Instagram, TikTok, YouTube, LinkedIn or X and the icons appear in the footer.
        </p>
      ) : (
        <ul className="divide-y divide-line/60">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center gap-3 py-2.5">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-2 border border-line bg-ink-950 text-fg-muted">
                <Icon name={row.icon || row.network} size={14} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <Link href={`/admin/social_links/${row.id}`} className="truncate text-[13px] text-fg hover:underline">
                    {row.label || row.network}
                  </Link>
                  <Pill tone={row.isVerified ? 'ok' : 'warn'}>{row.isVerified ? 'Verified' : 'Unverified'}</Pill>
                  {row.status !== 'published' ? <Pill tone="warn">Draft</Pill> : null}
                </span>
                <span className="mt-0.5 block truncate text-[11.5px] text-fg-dim">
                  {row.handle ? `${row.handle} · ` : ''}
                  {row.url}
                  {row.placements.length ? ` · ${row.placements.join(', ')}` : ''}
                </span>
              </span>
              {canWrite ? (
                <Link
                  href={`/admin/social_links/${row.id}`}
                  className="shrink-0 rounded-2 border border-line px-2.5 py-1 text-[11.5px] text-fg-muted hover:text-fg"
                >
                  Edit
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/** Recent enquiries — shown on the system hub so an unanswered message is visible from the top level. */
export async function EnquiriesBoard({
  rows,
}: {
  rows: { id: string; name: string; email: string; form: string; status: string; created_at: string; message?: string | null }[];
}) {
  return (
    <Panel
      title="Latest enquiries"
      hint="Everything the three forms have collected, newest first."
      action={
        <Link href="/admin/submissions" className="rounded-2 border border-line px-2.5 py-1 text-[11.5px] text-fg-muted hover:text-fg">
          Open inbox
        </Link>
      }
    >
      {rows.length === 0 ? (
        <p className="text-[12.5px] text-fg-dim">Nothing yet — enquiries from every form land here.</p>
      ) : (
        <ul className="divide-y divide-line/60">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center gap-3 py-2.5">
              <StatusPill status={row.status} />
              <span className="min-w-0 flex-1">
                <Link href={`/admin/submissions/${row.id}`} className="block truncate text-[13px] text-fg hover:underline">
                  {row.name}
                </Link>
                <span className="mt-0.5 block truncate text-[11.5px] text-fg-dim">
                  {row.form} · {row.email}
                </span>
              </span>
              <span className="shrink-0 text-[11.5px] text-fg-dim">{whenLabel(row.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
