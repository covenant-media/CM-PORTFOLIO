import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Panel, Pill, StatusPill, whenLabel, adminIcon } from '@/components/admin/ui';
import { needsAttention, recentActivity, submissionsInbox } from '@/lib/cms/admin';
import { dashboardCounts } from '@/lib/cms/repository';
import { readSession } from '@/lib/auth/session';
import { getSettings } from '@/lib/cms/settings';

export const dynamic = 'force-dynamic';

const TILES: { key: string; label: string; href: string; icon: string }[] = [
  { key: 'media_projects', label: 'Media projects', href: '/admin/media_projects', icon: 'camera' },
  { key: 'tech_projects', label: 'Tech projects', href: '/admin/tech_projects', icon: 'code' },
  { key: 'videos', label: 'Videos', href: '/admin/videos', icon: 'film' },
  { key: 'assets', label: 'Uploaded media', href: '/admin/media_library', icon: 'archive' },
  { key: 'posts', label: 'Journal posts', href: '/admin/blog', icon: 'book' },
  { key: 'services', label: 'Services', href: '/admin/services', icon: 'briefcase' },
  { key: 'testimonials', label: 'Testimonials', href: '/admin/testimonials', icon: 'quote' },
  { key: 'new_submissions', label: 'Unread enquiries', href: '/admin/submissions', icon: 'inbox' },
];

export default async function DashboardPage() {
  const [session, counts, attention, activity, inbox, settings] = await Promise.all([
    readSession(),
    dashboardCounts(),
    needsAttention(),
    recentActivity(10),
    submissionsInbox({ status: 'new', page: 1 }),
    getSettings(),
  ]);
  const firstName = (session?.user.name ?? '').split(' ')[0] || 'there';
  const published = counts.published_projects ?? 0;
  const samples = counts.samples ?? 0;
  const real = Math.max(0, published - samples);

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-fg-dim">{String(settings['brand.name'] ?? 'Covenant Media')}</p>
          <h1 className="mt-1 font-display text-[26px] leading-tight">Good to see you, {firstName}.</h1>
          <p className="mt-1 max-w-[62ch] text-[13px] leading-relaxed text-fg-muted">
            {real} real {real === 1 ? 'project is' : 'projects are'} published and {samples} {samples === 1 ? 'row is' : 'rows are'} still
            placeholder. Everything on the public site is edited here — nothing is written into the code.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/" target="_blank" className="inline-flex items-center gap-1.5 rounded-2 border border-line px-3 py-1.5 text-[12.5px] text-fg-muted transition-colors hover:border-[var(--accent)]/50 hover:text-fg">
            <Icon name="external" size={13} /> View site
          </Link>
          <Link href="/media" target="_blank" className="inline-flex items-center gap-1.5 rounded-2 border border-line px-3 py-1.5 text-[12.5px] text-fg-muted transition-colors hover:border-[var(--accent)]/50 hover:text-fg">
            <Icon name="film" size={13} /> /media
          </Link>
          <Link href="/tech" target="_blank" className="inline-flex items-center gap-1.5 rounded-2 border border-line px-3 py-1.5 text-[12.5px] text-fg-muted transition-colors hover:border-[var(--accent)]/50 hover:text-fg">
            <Icon name="code" size={13} /> /tech
          </Link>
        </div>
      </header>

      <Panel
        title={attention.length ? 'Before launch' : 'Nothing is blocking you'}
        hint={attention.length ? 'Each item is a fact only you can confirm. They are listed in the order they affect the public site.' : 'The checklist is clear — publish changes as you get them.'}
      >
        {attention.length === 0 ? (
          <p className="flex items-center gap-2 text-[13px] text-ok-400">
            <Icon name="check" size={15} /> No outstanding gaps in the content model.
          </p>
        ) : (
          <ul className="divide-y divide-line/60">
            {attention.map((item) => (
              <li key={item.label} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className={item.severity === 'warn' ? 'mt-[3px] text-alert-400' : 'mt-[3px] text-fg-dim'}>
                  <Icon name={item.severity === 'warn' ? 'alert' : 'info'} size={14} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] text-fg">{item.label}</span>
                  <span className="mt-0.5 block text-[12px] leading-snug text-fg-dim">{item.detail}</span>
                </span>
                <Link href={item.href} className="shrink-0 rounded-2 border border-line px-2 py-1 text-[11.5px] text-fg-muted transition-colors hover:border-[var(--accent)]/50 hover:text-fg">
                  Open
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {TILES.map((tile) => (
          <Link
            key={tile.key}
            href={tile.href}
            className="group rounded-4 border border-line bg-ink-900/60 px-4 py-3.5 transition-colors hover:border-[var(--accent)]/45"
          >
            <span className="flex items-center gap-2 text-fg-dim">
              <Icon name={adminIcon(tile.icon)} size={14} className="transition-colors group-hover:text-[var(--accent)]" />
              <span className="text-[11px] uppercase tracking-[0.14em]">{tile.label}</span>
            </span>
            <span className="mt-2 block font-display text-[26px] leading-none text-fg">{counts[tile.key] ?? 0}</span>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Inbox"
          hint="Enquiries posted from the public forms. Details never live in the browser — read them here."
          action={
            <Link href="/admin/submissions" className="rounded-2 border border-line px-2.5 py-1 text-[11.5px] text-fg-muted hover:text-fg">
              Open inbox
            </Link>
          }
        >
          {inbox.rows.length === 0 ? (
            <p className="text-[12.5px] text-fg-dim">No unread enquiries.</p>
          ) : (
            <ul className="space-y-2.5">
              {inbox.rows.slice(0, 5).map((row) => (
                <li key={row.id} className="flex items-start gap-3">
                  <span className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                  <span className="min-w-0 flex-1">
                    <Link href={`/admin/submissions`} className="block truncate text-[13px] text-fg hover:underline">
                      {row.name} <span className="text-fg-dim">· {row.subject}</span>
                    </Link>
                    <span className="mt-0.5 line-clamp-1 block text-[12px] text-fg-dim">{row.message || 'No message'}</span>
                  </span>
                  <span className="shrink-0 text-[11px] text-fg-dim">{whenLabel(row.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Recently changed" hint="Every publish, edit and deletion in this workspace.">
          {activity.length === 0 ? (
            <p className="text-[12.5px] text-fg-dim">
              Nothing recorded yet. The log fills up as soon as you change something here.
            </p>
          ) : (
            <ul className="space-y-2">
              {activity.map((row) => (
                <li key={row.id} className="flex items-baseline justify-between gap-3 text-[12.5px]">
                  <span className="min-w-0 truncate text-fg-muted">
                    <span className="text-fg">{row.who}</span> — {row.summary}
                  </span>
                  <span className="shrink-0 text-[11px] text-fg-dim">{whenLabel(row.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Start here" hint="The four things that make the platform yours rather than a template." pad={false}>
        <div className="grid divide-y divide-line/60 sm:grid-cols-2 sm:divide-y-0 sm:[&>*]:border-line/60 lg:grid-cols-4">
          {[
            { href: '/admin/settings?group=brand', icon: 'palette', label: 'Set the brand words', hint: 'Name, taglines, share image' },
            { href: '/admin/media_library', icon: 'upload', label: 'Upload real media', hint: 'Covers, posters, gallery stills' },
            { href: '/admin/media_projects', icon: 'camera', label: 'Replace the sample projects', hint: 'Two media, two tech, then publish' },
            { href: '/admin/navigation', icon: 'menu', label: 'Order the menus', hint: 'Header and footer per experience' },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="flex items-start gap-3 px-5 py-4 transition-colors hover:bg-ink-800/40 sm:border-r sm:last:border-r-0">
              <Icon name={adminIcon(item.icon)} size={16} className="mt-[2px] text-[var(--accent)]" />
              <span>
                <span className="block text-[13px] text-fg">{item.label}</span>
                <span className="mt-0.5 block text-[11.5px] text-fg-dim">{item.hint}</span>
              </span>
            </Link>
          ))}
        </div>
      </Panel>

      <p className="flex items-center gap-2 text-[11.5px] text-fg-dim">
        <Pill tone="neutral">
          <StatusPill status={String(settings['system.maintenance_mode'] ?? '') === 'true' ? 'new' : 'published'} />
          {String(settings['system.maintenance_mode'] ?? '') === 'true' ? 'Maintenance mode is on' : 'Public site is live'}
        </Pill>
        Saved changes appear immediately: publishing revalidates the cached pages.
      </p>
    </div>
  );
}
