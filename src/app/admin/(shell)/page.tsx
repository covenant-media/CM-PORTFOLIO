import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Notice } from '@/components/admin/notice';
import { HubHeader, StatRow } from '@/components/admin/hub';
import { Panel, Pill, adminIcon, whenLabel } from '@/components/admin/ui';
import { CMS_SECTIONS, needsAttention, recentActivity, sectionHub, submissionsInbox } from '@/lib/cms/admin';
import { dashboardCounts } from '@/lib/cms/repository';
import { readSession } from '@/lib/auth/session';
import { permissionsForRole } from '@/lib/auth/guard';
import { getSettings } from '@/lib/cms/settings';

export const dynamic = 'force-dynamic';

/** The four numbers the whole platform is judged by, in the order they matter. */
const HEADLINE_STATS: { key: string; label: string; hint?: string }[] = [
  { key: 'published_videos', label: 'Films & edits published', hint: 'Long and short form, live on the media portfolio' },
  { key: 'photo_frames', label: 'Photography frames', hint: 'Published across the event-photography sets' },
  { key: 'media_stories', label: 'Client stories', hint: 'Attributed to a real piece of work' },
  { key: 'pages', label: 'Authored pages', hint: 'Across the main, media and tech surfaces' },
];

type SearchParams = Record<string, string | string[] | undefined>;

export default async function DashboardPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const raw = await searchParams;
  const session = await readSession();
  if (!session) return null;
  const role = session.user.role;
  const roleMap = await permissionsForRole(role);

  const counts: Record<string, number> = await dashboardCounts();
  const [settings, attention, activity, inbox, sections] = await Promise.all([
    getSettings(),
    needsAttention(),
    recentActivity(8),
    submissionsInbox({ status: 'new', page: 1 }),
    Promise.all(
      CMS_SECTIONS.filter((section) => section.key !== 'Overview').map((section) =>
        sectionHub(section.key, { role, roleMap, counts }),
      ),
    ),
  ]);

  const firstName = (session.user.name ?? '').split(' ')[0] || 'there';
  const samples = counts.samples ?? 0;
  const maintenance = settings['system.maintenance'] === true;

  return (
    <div className="space-y-6">
      <HubHeader
        eyebrow={String(settings['brand.name'] ?? 'Covenant Media')}
        title={`Good to see you, ${firstName}.`}
        hint="Nothing on the public site is written in code — it all comes from the four sections below. Start at a section to change what it publishes, or work through the list of things only you can confirm."
        live={CMS_SECTIONS[0]!.live}
      >
        <Pill tone={maintenance ? 'warn' : 'ok'}>
          <Icon name={maintenance ? 'alert' : 'check'} size={11} />
          {maintenance ? 'Maintenance mode is on' : 'Public site is live'}
        </Pill>
        {samples > 0 ? <Pill tone="info">{samples} placeholder row{samples === 1 ? '' : 's'} still in the site</Pill> : null}
      </HubHeader>

      <Notice params={raw} />

      <StatRow stats={HEADLINE_STATS.map((stat) => ({ ...stat, value: counts[stat.key] ?? 0 }))} />

      <section className="space-y-3">
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-fg-dim">The four sections</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          {sections.map((hub) => (
            <article key={hub.section.key} className="flex flex-col rounded-4 border border-line bg-ink-900/50">
              <header className="flex items-start gap-3 border-b border-line/60 px-5 py-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-3 border border-[var(--accent)]/25 bg-[var(--accent-glow)] text-[var(--accent)]">
                  <Icon name={adminIcon(hub.section.icon)} size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="font-display text-[17px] leading-tight text-fg">{hub.section.label}</span>
                    <span className="rounded-pill border border-line px-1.5 text-[10.5px] text-fg-dim">
                      {hub.tools.length} editor{hub.tools.length === 1 ? '' : 's'}
                    </span>
                  </span>
                  <span className="mt-1 block text-[12px] leading-snug text-fg-dim">{hub.section.hint}</span>
                </span>
                <Link
                  href={hub.section.hub}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-2 border border-[var(--accent)]/45 px-2.5 py-1 text-[11.5px] text-[var(--accent)] transition-colors hover:bg-[var(--accent-glow)]"
                >
                  Open <Icon name="arrow-right" size={11} />
                </Link>
              </header>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-5 py-4 sm:grid-cols-4">
                {hub.stats.map((stat) => (
                  <div key={stat.key} className="min-w-0">
                    <dt className="truncate text-[10.5px] uppercase tracking-[0.12em] text-fg-dim" title={stat.label}>
                      {stat.label}
                    </dt>
                    <dd className="mt-1 font-display text-[20px] leading-none text-fg">{stat.value}</dd>
                  </div>
                ))}
              </dl>

              <ul className="mt-auto flex flex-wrap gap-1.5 border-t border-line/60 px-5 py-3">
                {hub.tools.slice(0, 5).map((tool) => (
                  <li key={tool.key}>
                    <Link
                      href={tool.href}
                      className="inline-flex items-center gap-1.5 rounded-2 border border-line px-2.5 py-1 text-[11.5px] text-fg-muted transition-colors hover:border-[var(--accent)]/45 hover:text-fg"
                    >
                      <Icon name={adminIcon(tool.icon)} size={12} />
                      {tool.label}
                    </Link>
                  </li>
                ))}
                {hub.tools.length > 5 ? (
                  <li>
                    <Link href={hub.section.hub} className="inline-flex items-center rounded-2 px-2 py-1 text-[11.5px] text-fg-dim hover:text-fg">
                      +{hub.tools.length - 5} more
                    </Link>
                  </li>
                ) : null}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <Panel
        title={attention.length ? 'Before launch' : 'Nothing is blocking you'}
        hint={
          attention.length
            ? 'Each item is a fact only you can confirm. They are listed in the order they affect the public site.'
            : 'The checklist is clear — publish changes as you get them.'
        }
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
                <Link
                  href={item.href}
                  className="shrink-0 rounded-2 border border-line px-2 py-1 text-[11.5px] text-fg-muted transition-colors hover:border-[var(--accent)]/50 hover:text-fg"
                >
                  Open
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

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
                  <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                  <span className="min-w-0 flex-1">
                    <Link href="/admin/submissions" className="block truncate text-[13px] text-fg hover:underline">
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
            <p className="text-[12.5px] text-fg-dim">Nothing recorded yet. The log fills up as soon as you change something here.</p>
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
    </div>
  );
}
