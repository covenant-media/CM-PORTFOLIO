import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Icon } from '@/components/ui/Icon';
import { ModuleList, ListToolbar, type ListPageQuery } from '@/components/admin/list';
import { Panel, Pill, StatusPill, adminIcon, whenLabel, bytesLabel, TinyButton } from '@/components/admin/ui';
import { ReorderList } from '@/components/admin/reorder';
import { RowActionForm } from '@/components/admin/row-actions';
import { importVideoFormAction } from '@/app/admin/actions';
import { Uploader } from '@/components/admin/uploader';
import { Composer } from '@/components/admin/composer';
import { SettingsForm } from '@/components/admin/settings-form';
import { readSession } from '@/lib/auth/session';
import { levelFor } from '@/lib/auth/permissions';
import { permissionsForRole } from '@/lib/auth/guard';
import { getCmsModule } from '@/lib/cms/modules';
import * as repo from '@/lib/cms/repository';
import { assetGrid, assetUrls, featuredBoard, pageCompositions, sectionIndex, submissionsInbox } from '@/lib/cms/admin';
import { Notice } from '@/components/admin/notice';
import { getSettings, listCustomSettings, settingDefs, SETTINGS_GROUPS } from '@/lib/cms/settings';
import { NAV_LOCATIONS, PUBLISH_OPTIONS } from '@/lib/cms/options';
import { uploadLimits } from '@/lib/media/storage';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ module: string }> }): Promise<Metadata> {
  const { module: key } = await params;
  const mod = getCmsModule(key);
  return { title: mod?.label ?? 'CMS' };
}

type SearchParams = Record<string, string | string[] | undefined>;

const str = (value: string | string[] | undefined): string | undefined => (Array.isArray(value) ? value[0] : value);

export default async function ModuleListPage({ params, searchParams }: { params: Promise<{ module: string }>; searchParams: Promise<SearchParams> }) {
  const [{ module: key }, raw] = await Promise.all([params, searchParams]);
  const mod = getCmsModule(key);
  if (!mod) notFound();

  const session = await readSession();
  if (!session) notFound();
  const role = session.user.role;
  const level = levelFor(role, mod.permission ?? mod.key, await permissionsForRole(role));
  const canWrite = level === 'write' || level === 'manage';

  const query: ListPageQuery = {};
  for (const [name, value] of Object.entries(raw)) {
    const single = str(value);
    if (single !== undefined) query[name] = single;
  }

  const header = (
    <>
      <ModuleHeader mod={mod} extra={query.q ?? query.status ? <TinyButton href={`/admin/${key}`}>Clear filters</TinyButton> : undefined} />
      <Notice params={raw} />
    </>
  );

  // ── bespoke editors ───────────────────────────────────────────────────────
  if (mod.editor === 'settings') {
    const group = str(raw.group) ?? (key === 'contact_info' ? 'contact' : SETTINGS_GROUPS[0]!.key);
    const [settings, custom] = await Promise.all([getSettings({ includePrivate: true }), listCustomSettings()]);
    const defs = settingDefs(group as never);
    return (
      <div className="space-y-4">
        {header}
        <nav className="flex flex-wrap gap-1.5" aria-label="Setting groups">
          {SETTINGS_GROUPS.map((item) => (
            <Link
              key={item.key}
              href={`/admin/${key}?group=${item.key}`}
              className={
                item.key === group
                  ? 'rounded-2 border border-[var(--accent)]/50 bg-[var(--accent-glow)] px-3 py-1.5 text-[12.5px] text-fg'
                  : 'rounded-2 border border-line px-3 py-1.5 text-[12.5px] text-fg-muted hover:text-fg'
              }
            >
              <span className="inline-flex items-center gap-1.5">
                <Icon name={adminIcon(item.icon)} size={13} />
                {item.label}
              </span>
            </Link>
          ))}
        </nav>
        <SettingsForm
          group={group}
          label={SETTINGS_GROUPS.find((g) => g.key === group)?.label ?? 'Settings'}
          hint={SETTINGS_GROUPS.find((g) => g.key === group)?.hint ?? ''}
          canWrite={canWrite}
          fields={defs.map((def) => ({
            key: def.key,
            label: def.label,
            type: def.type,
            help: def.help,
            options: def.options,
            rows: def.rows,
            maxLength: def.maxLength,
            value: settings[def.key] ?? def.default,
            isPublic: def.is_public,
          }))}
          custom={custom.map((row) => ({ key: row.key, label: row.label, value: typeof row.value === 'string' ? row.value : JSON.stringify(row.value ?? '') }))}
        />
      </div>
    );
  }

  if (mod.editor === 'submissions') {
    const inbox = await submissionsInbox({ form: query.form, status: query.status, q: query.q, page: Number(query.page ?? 1) });
    return (
      <div className="space-y-4">
        {header}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <ListToolbar
            module={mod}
            query={query}
            statuses={STATUS_FILTERS}
          />
          <Link href="/api/admin/export/submissions" className="inline-flex items-center gap-1.5 rounded-2 border border-line px-3 py-1.5 text-[12px] text-fg-muted hover:text-fg">
            <Icon name="download" size={13} /> Export CSV
          </Link>
        </div>
        {inbox.rows.length === 0 ? (
          <p className="rounded-4 border border-dashed border-line px-6 py-10 text-center text-[13px] text-fg-dim">
            Nothing here yet. Enquiries from all three experiences arrive in this list, and the same content is emailed
            if SMTP is configured.
          </p>
        ) : (
          <ul className="space-y-3">
            {inbox.rows.map((row) => (
              <li key={row.id}>
                <article className="rounded-4 border border-line bg-ink-900/50 px-5 py-4">
                  <header className="flex flex-wrap items-center gap-2.5">
                    <span className="text-[13.5px] text-fg">{row.name}</span>
                    <a href={`mailto:${row.email}`} className="font-mono text-[11.5px] text-fg-muted underline decoration-line hover:text-fg">
                      {row.email}
                    </a>
                    <Pill tone="neutral">{row.form}</Pill>
                    <StatusPill status={row.status} />
                    <span className="ml-auto text-[11.5px] text-fg-dim">{whenLabel(row.created_at)}</span>
                  </header>
                  {row.message ? <p className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed text-fg-muted">{row.message}</p> : null}
                  {row.detail.length ? (
                    <dl className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
                      {row.detail.map((item) => (
                        <div key={item.label} className="flex justify-between gap-3 border-b border-line/40 py-1 text-[12px]">
                          <dt className="text-fg-dim">{item.label}</dt>
                          <dd className="truncate text-right text-fg-muted">{item.value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                  {canWrite ? (
                    <footer className="mt-3 flex flex-wrap items-center gap-2">
                      {row.status !== 'replied' ? <RowActionForm module="submissions" id={row.id} action={{ op: 'mark-replied', label: 'Mark replied', icon: 'check' }} /> : null}
                      {row.status === 'new' ? <RowActionForm module="submissions" id={row.id} action={{ op: 'mark-read', label: 'Mark read', icon: 'eye' }} /> : null}
                      <RowActionForm module="submissions" id={row.id} action={{ op: 'delete', label: 'Delete', icon: 'trash', tone: 'danger', confirm: 'Delete this enquiry for good?' }} />
                    </footer>
                  ) : null}
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (mod.editor === 'media-library') {
    const grid = await assetGrid({ q: query.q, kind: query.kind, folder: query.folder, page: Number(query.page ?? 1) });
    return (
      <div className="space-y-4">
        {header}
        <Uploader canWrite={canWrite} />
        <form method="GET" className="flex flex-wrap items-end gap-2">
          <label className="min-w-[200px] flex-1">
            <span className="mb-1 block text-[10.5px] uppercase tracking-[0.13em] text-fg-dim">Search</span>
            <input name="q" defaultValue={query.q ?? ''} placeholder="Filename, alt text, folder…" className="w-full rounded-2 border border-line bg-ink-950/70 px-3 py-1.5 text-[12.5px] text-fg outline-none focus:border-[var(--accent)]/60" />
          </label>
          <label>
            <span className="mb-1 block text-[10.5px] uppercase tracking-[0.13em] text-fg-dim">Type</span>
            <select name="kind" defaultValue={query.kind ?? ''} className="rounded-2 border border-line bg-ink-950/70 px-2.5 py-1.5 text-[12.5px] text-fg-muted">
              <option value="">Any</option>
              {['image', 'video', 'document', 'audio'].map((kind) => (
                <option key={kind} value={kind}>
                  {kind}
                </option>
              ))}
            </select>
          </label>
          {grid.folders.length ? (
            <label>
              <span className="mb-1 block text-[10.5px] uppercase tracking-[0.13em] text-fg-dim">Folder</span>
              <select name="folder" defaultValue={query.folder ?? ''} className="rounded-2 border border-line bg-ink-950/70 px-2.5 py-1.5 text-[12.5px] text-fg-muted">
                <option value="">All folders</option>
                {grid.folders.map((folder) => (
                  <option key={folder} value={folder}>
                    {folder}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <button type="submit" className="rounded-2 border border-line px-3 py-1.5 text-[12.5px] text-fg-muted hover:text-fg">
            Apply
          </button>
        </form>

        {grid.rows.length === 0 ? (
          <p className="rounded-4 border border-dashed border-line px-6 py-10 text-center text-[13px] text-fg-dim">
            {grid.total === 0 ? 'The library is empty. Upload the first image, film or PDF above.' : 'Nothing matches those filters.'}
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {grid.rows.map((asset) => (
              <li key={asset.id} className="overflow-hidden rounded-3 border border-line bg-ink-900/50">
                <Link href={`/admin/media_library/${asset.id}`} className="group block">
                  <span className="block h-[104px] w-full bg-ink-950">
                    {asset.kind === 'video' ? (
                      <video src={asset.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                    ) : asset.kind === 'document' ? (
                      <span className="grid h-full w-full place-items-center text-fg-dim">
                        <Icon name="clipboard" size={22} />
                      </span>
                    ) : (
                      <img src={asset.url} alt={asset.alt ?? ''} loading="lazy" className="h-full w-full object-cover transition-opacity group-hover:opacity-90" />
                    )}
                  </span>
                  <span className="block px-2.5 py-2">
                    <span className="block truncate text-[12px] text-fg">{asset.title}</span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-fg-dim">
                      <span>{bytesLabel(asset.bytes)}</span>
                      {asset.width ? <span>· {asset.width}×{asset.height}</span> : null}
                      {asset.folder ? <span className="truncate">· {asset.folder}</span> : null}
                    </span>
                    {asset.references > 0 ? (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-pill border border-line px-1.5 py-[1px] text-[10px] text-fg-muted">
                        <Icon name="link" size={9} /> {asset.references}
                      </span>
                    ) : (
                      <span className="mt-1 inline-block text-[10px] text-fg-dim">unused</span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className="text-[11.5px] text-fg-dim">
          {grid.total} asset{grid.total === 1 ? '' : 's'} · page {grid.page} of {grid.pages} · uploads are limited to{' '}
          {uploadLimits().maxBytes / 1024 / 1024}MB each
        </p>
      </div>
    );
  }

  if (mod.editor === 'featured') {
    const board = await featuredBoard();
    return (
      <div className="space-y-4">
        {header}
        <p className="max-w-[70ch] text-[13px] leading-relaxed text-fg-muted">
          Featuring decides what the showcases and hero rails show — it does not publish anything. Unpublished records
          stay off the public site even when featured.
        </p>
        {board.map((group) => (
          <Panel key={group.group} title={group.group} hint={`${group.hint} Keep it to ${group.max} or fewer for the rails to breathe.`}>
            {group.rows.length === 0 ? (
              <p className="text-[12.5px] text-fg-dim">Nothing in this module yet.</p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {group.rows.map((row) => (
                  <li key={`${row.module}-${row.id}`} className="flex items-center gap-3 rounded-2 border border-line bg-ink-950/40 px-3 py-2">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] text-fg">{row.title}</span>
                      <span className="mt-0.5 block truncate text-[11px] text-fg-dim">
                        {row.meta} · {row.status}
                        {row.is_sample ? ' · placeholder' : ''}
                      </span>
                    </span>
                    {canWrite ? (
                      <RowActionForm
                        module={row.module}
                        id={row.id}
                        action={{
                          op: row.is_featured ? 'unfeature' : 'feature',
                          label: row.is_featured ? 'Featured' : 'Feature',
                          icon: 'star',
                          tone: row.is_featured ? 'accent' : 'default',
                        }}
                      />
                    ) : row.is_featured ? (
                      <Pill tone="accent">featured</Pill>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        ))}
      </div>
    );
  }

  if (mod.editor === 'blocks') {
    const [compositions, index] = await Promise.all([pageCompositions(), sectionIndex()]);
    const activeId = str(raw.page) ?? compositions[0]?.id ?? '';
    const active = compositions.find((page) => page.id === activeId) ?? compositions[0];
    const list = await repo.list(key, { q: query.q, status: query.status, page: Number(query.page ?? 1), per: 25 });
    return (
      <div className="space-y-4">
        {header}
        <Panel title="Page layout" hint="Pick a page, then add, hide and reorder the sections it renders.">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {compositions.map((page) => (
              <Link
                key={page.id}
                href={`/admin/blocks?page=${page.id}`}
                className={
                  active?.id === page.id
                    ? 'rounded-2 border border-[var(--accent)]/50 bg-[var(--accent-glow)] px-2.5 py-1 text-[12px] text-fg'
                    : 'rounded-2 border border-line px-2.5 py-1 text-[12px] text-fg-muted hover:text-fg'
                }
              >
                /{page.slug === 'home' ? '' : page.slug} <span className="text-fg-dim">({page.blocks.length})</span>
              </Link>
            ))}
          </div>
          {active ? (
            <Composer
              pageId={active.id}
              pageSlug={active.slug}
              pageTitle={active.title}
              canWrite={canWrite}
              blocks={active.blocks}
              available={index.map((row) => ({ id: row.id, name: row.name, block_type: row.block_type, headline: row.headline, status: row.status, used_by: row.used_on.length }))}
            />
          ) : (
            <p className="text-[12.5px] text-fg-dim">No CMS pages exist yet — create one under Pages first.</p>
          )}
        </Panel>

        <Panel title="All sections" hint="Reusable blocks. Editing one updates every page that uses it." action={canWrite ? <NewButton module={key} label="New section" /> : undefined} pad={false}>
          <div className="px-5 py-4">
            <ModuleList module={mod} result={list} query={query} canWrite={canWrite} actions={() => []} />
          </div>
        </Panel>
      </div>
    );
  }

  if (mod.editor === 'navigation') {
    const location = str(raw.location) ?? NAV_LOCATIONS[0]!.value;
    const list = await repo.list(key, { q: query.q, page: 1, per: 200, filters: { location } });
    return (
      <div className="space-y-4">
        {header}
        <div className="flex flex-wrap items-center gap-1.5">
          {NAV_LOCATIONS.map((item) => (
            <Link
              key={item.value}
              href={`/admin/navigation?location=${item.value}`}
              className={
                item.value === location
                  ? 'rounded-2 border border-[var(--accent)]/50 bg-[var(--accent-glow)] px-3 py-1.5 text-[12.5px] text-fg'
                  : 'rounded-2 border border-line px-3 py-1.5 text-[12.5px] text-fg-muted hover:text-fg'
              }
            >
              {item.label}
            </Link>
          ))}
          {canWrite ? <NewButton module={key} label="New item" className="ml-auto" /> : null}
        </div>
        {canWrite ? (
          <Panel title="Order" hint="This is the order the menu renders in. Hidden items stay in place.">
            <ReorderList
              moduleKey={key}
              items={list.rows.map((row) => ({
                id: String(row.id),
                label: String(row.label ?? 'Untitled'),
                meta: `${row.is_visible === false ? 'hidden · ' : ''}${String(row.href ?? '')}`,
              }))}
            />
          </Panel>
        ) : null}
        <ModuleList
          module={mod}
          result={list}
          query={query}
          canWrite={canWrite}
          actions={(row) => [
            { op: row.is_visible === false ? 'show' : 'hide', label: row.is_visible === false ? 'Show' : 'Hide', icon: row.is_visible === false ? 'eye' : 'eye-off' },
          ]}
        />
      </div>
    );
  }

  // ── generic collection-shaped editors ─────────────────────────────────────
  const list = await repo.list(key, {
    q: query.q,
    status: query.status,
    page: Number(query.page ?? 1),
    per: mod.editor === 'projects' ? 30 : 25,
    filters: Object.fromEntries(
      (mod.filterBy ? (Array.isArray(mod.filterBy) ? mod.filterBy : [mod.filterBy]) : []).map((filter) => [filter.key, query[filter.key] ?? '']),
    ),
  });

  const thumbs = mod.previewImage
    ? await assetUrlsFrom(list.rows, mod.previewImage)
    : undefined;

  return (
    <div className="space-y-4">
      {header}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <ListToolbar module={mod} query={query} statuses={mod.publishable ? PUBLISH_OPTIONS : undefined} />
        {canWrite ? <NewButton module={key} label={`New ${mod.singular.toLowerCase()}`} /> : null}
      </div>
      {mod.editor === 'videos' && canWrite ? <ImportPanel csrf={session.csrfToken} /> : null}
      {canWrite && mod.sortable && list.page === 1 && !query.q && !query.status ? (
        <Panel title="Order" hint="Drag-free up/down controls; the public lists follow this order.">
          <ReorderList moduleKey={key} items={list.rows.map((row) => ({ id: String(row.id), label: String(row[mod.primary] ?? 'Untitled') }))} />
        </Panel>
      ) : null}
      <ModuleList
        module={mod}
        result={list}
        query={query}
        canWrite={canWrite}
        thumbs={thumbs}
        actions={(row) => buildRowActions(mod, row, canWrite)}
      />
    </div>
  );
}

const STATUS_FILTERS = [
  { value: 'new', label: 'Unread' },
  { value: 'read', label: 'Read' },
  { value: 'replied', label: 'Replied' },
  { value: 'spam', label: 'Marked spam' },
];

// ── helpers ─────────────────────────────────────────────────────────────────

async function assetUrlsFrom(rows: Record<string, unknown>[], field: string) {
  const ids = rows.map((row) => (row[field] as string) ?? null);
  const urls = await assetUrls(ids);
  const out: Record<string, { url: string }> = {};
  for (const row of rows) {
    const id = String(row.id);
    const assetId = String(row[field] ?? '');
    const fallback = String(row.poster_url ?? row.url ?? '');
    const url = urls[assetId] ?? (fallback.startsWith('http') ? fallback : '');
    if (url) out[id] = { url };
  }
  return out;
}

function buildRowActions(mod: NonNullable<ReturnType<typeof getCmsModule>>, row: Record<string, unknown>, canWrite: boolean) {
  if (!canWrite) return [];
  const actions: { op: string; label: string; icon: string; tone?: 'default' | 'accent' | 'danger'; confirm?: string }[] = [];
  if (mod.publishable) {
    actions.push({ op: row.status === 'published' ? 'draft' : 'publish', label: row.status === 'published' ? 'Unpublish' : 'Publish', icon: row.status === 'published' ? 'eye-off' : 'rocket' });
  }
  if ('is_featured' in row) actions.push({ op: row.is_featured ? 'unfeature' : 'feature', label: 'Feature', icon: 'star', tone: row.is_featured ? 'accent' : 'default' });
  if (mod.table === 'social_link') actions.push({ op: 'verify', label: 'Confirm link', icon: 'check' });
  if (mod.key === 'resume') actions.push({ op: 'activate-resume', label: 'Make active', icon: 'download' });
  if (mod.duplicate) actions.push({ op: 'duplicate', label: 'Duplicate', icon: 'copy' });
  if (levelAllowsDelete(mod)) actions.push({ op: 'delete', label: 'Delete', icon: 'trash', tone: 'danger', confirm: 'Delete this permanently?' });
  return actions;
}

function levelAllowsDelete(mod: { key: string; table: string }): boolean {
  // Pages and blocks keep their own destructive controls in the composer; everything
  // else gets a delete in the row.
  return mod.table !== 'page';
}

function NewButton({ module, label, className }: { module: string; label: string; className?: string }) {
  return (
    <Link href={`/admin/${module}/new`} className={className ? `inline-flex items-center gap-1.5 rounded-2 bg-[var(--accent)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--accent-ink)] ${className}` : 'inline-flex items-center gap-1.5 rounded-2 bg-[var(--accent)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--accent-ink)]'}>
      <Icon name="plus" size={13} /> {label}
    </Link>
  );
}

function ImportPanel({ csrf }: { csrf: string }) {
  return (
    <Panel title="Import from a link" hint="Paste a YouTube, Vimeo, TikTok, Facebook or Instagram link. The source is detected, whatever the platform publishes is filled in, and the row lands as a draft so you can check it.">
      <form action={importVideoFormAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="_csrf" value={csrf} />
        <input name="source_url" required placeholder="https://www.youtube.com/watch?v=…" className="min-w-[240px] flex-1 rounded-2 border border-line bg-ink-950/70 px-3 py-2 font-mono text-[12.5px] text-fg placeholder:text-fg-dim/70 outline-none focus:border-[var(--accent)]/60" />
        <button type="submit" className="inline-flex items-center gap-1.5 rounded-2 border border-[var(--accent)]/45 px-3 py-2 text-[12.5px] text-[var(--accent)] hover:bg-[var(--accent-glow)]">
          <Icon name="wand" size={13} /> Detect and create draft
        </button>
      </form>
    </Panel>
  );
}

function ModuleHeader({ mod, extra }: { mod: NonNullable<ReturnType<typeof getCmsModule>>; extra?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-fg-dim">
          <Icon name={adminIcon(mod.icon)} size={13} />
          {mod.group}
        </p>
        <h1 className="mt-1 font-display text-[24px] leading-tight">{mod.label}</h1>
        <p className="mt-1 max-w-[72ch] text-[12.5px] leading-relaxed text-fg-muted">{mod.description}</p>
      </div>
      <div className="flex items-center gap-2">{extra}</div>
    </header>
  );
}
