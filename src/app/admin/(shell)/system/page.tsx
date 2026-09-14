import Link from 'next/link';
import type { Metadata } from 'next';
import { Icon } from '@/components/ui/Icon';
import { Notice } from '@/components/admin/notice';
import { HubHeader, StatRow, ToolGrid } from '@/components/admin/hub';
import { EnquiriesBoard, ModuleRowsBoard, SocialsBoard } from '@/components/admin/hub-boards';
import { Panel, Pill } from '@/components/admin/ui';
import { readSession } from '@/lib/auth/session';
import { levelFor } from '@/lib/auth/permissions';
import { permissionsForRole } from '@/lib/auth/guard';
import { recentActivity, sectionHub, submissionsInbox } from '@/lib/cms/admin';
import { dashboardCounts } from '@/lib/cms/repository';
import { getSettings } from '@/lib/cms/settings';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'System' };

type SearchParams = Record<string, string | string[] | undefined>;

export default async function SystemHub({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const raw = await searchParams;
  const session = await readSession();
  if (!session) return null;
  const role = session.user.role;
  const roleMap = await permissionsForRole(role);
  const settingsLevel = levelFor(role, 'settings', roleMap);
  const canWrite = settingsLevel === 'write' || settingsLevel === 'manage';

  const counts: Record<string, number> = await dashboardCounts();
  const [settings, hub, inbox, activity] = await Promise.all([
    getSettings({ includePrivate: true }),
    sectionHub('system', { role, roleMap, counts, omit: ['social_links', 'submissions'] }),
    submissionsInbox({ status: 'new', page: 1 }),
    recentActivity(8),
  ]);

  const maintenance = settings['system.maintenance'] === true;
  const showBadges = settings['system.show_sample_badges'] !== false;

  return (
    <div className="space-y-6">
      <HubHeader eyebrow="System" title="System" hint={hub.section.hint} live={hub.section.live}>
        <Link
          href="/admin/social_links/new"
          className="inline-flex items-center gap-1.5 rounded-2 border border-line px-3 py-1.5 text-[12.5px] text-fg-muted transition-colors hover:border-[var(--accent)]/50 hover:text-fg"
        >
          <Icon name="plus" size={13} /> Add social account
        </Link>
      </HubHeader>

      <Notice params={raw} />
      <StatRow stats={hub.stats} />

      <Panel title="Site state" hint="The switches that change how the public site behaves right now.">
        <div className="grid gap-3 sm:grid-cols-3">
          <StateCard
            label="Public site"
            value={maintenance ? 'Maintenance' : 'Live'}
            tone={maintenance ? 'warn' : 'ok'}
            hint={maintenance ? 'Visitors see the maintenance message.' : 'Every published page is reachable.'}
            href="/admin/settings?group=system"
          />
          <StateCard
            label="Placeholder badges"
            value={showBadges ? 'Shown' : 'Hidden'}
            tone={showBadges ? 'info' : 'ok'}
            hint={showBadges ? 'Seeded rows are labelled on the site.' : 'Seeded rows read as finished content.'}
            href="/admin/settings?group=system"
          />
          <StateCard
            label="Unread enquiries"
            value={String(counts.new_submissions ?? 0)}
            tone={(counts.new_submissions ?? 0) > 0 ? 'warn' : 'ok'}
            hint={(counts.new_submissions ?? 0) > 0 ? 'Someone is waiting for a reply.' : 'The inbox is clear.'}
            href="/admin/submissions?status=new"
          />
        </div>
      </Panel>

      <SocialsBoard canWrite={canWrite || levelFor(role, 'social_links', roleMap) !== 'read'} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <EnquiriesBoard
          rows={inbox.rows.slice(0, 5).map((row) => ({
            id: row.id,
            name: row.name,
            email: row.email,
            form: row.form,
            status: row.status,
            created_at: row.created_at,
          }))}
        />
        <Panel title="Recent edits" hint="Every write to the CMS, newest first — who changed what, and when.">
          {activity.length === 0 ? (
            <p className="text-[12.5px] text-fg-dim">Nothing recorded yet.</p>
          ) : (
            <ul className="divide-y divide-line/60">
              {activity.slice(0, 6).map((row) => (
                <li key={row.id} className="flex items-center gap-2.5 py-2">
                  <Pill tone={row.action === 'delete' ? 'warn' : 'neutral'}>{row.action}</Pill>
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-fg-muted">
                    {row.summary || 'No summary recorded'}
                  </span>
                  <span className="shrink-0 text-[11px] text-fg-dim">{row.who}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <section className="space-y-3">
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-fg-dim">Editors in this section</h2>
        <ToolGrid tools={hub.tools} />
      </section>

      <ModuleRowsBoard
        moduleKey="seo"
        title="SEO overrides"
        hint="Per-page titles, descriptions and indexing rules that override the generated defaults."
        per={6}
        emptyText="No overrides — every page uses the titles generated from its own content."
      />
    </div>
  );
}

function StateCard({
  label,
  value,
  hint,
  tone,
  href,
}: {
  label: string;
  value: string;
  hint: string;
  tone: 'ok' | 'warn' | 'info';
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 rounded-4 border border-line bg-ink-900/50 px-4 py-3.5 transition-colors hover:border-[var(--accent)]/45"
    >
      <span className="min-w-0">
        <span className="block text-[11px] uppercase tracking-[0.14em] text-fg-dim">{label}</span>
        <span className="mt-1.5 block font-display text-[20px] leading-none text-fg">{value}</span>
        <span className="mt-1.5 block text-[11.5px] leading-snug text-fg-dim">{hint}</span>
      </span>
      <Pill tone={tone}>{tone === 'warn' ? 'Action' : 'OK'}</Pill>
    </Link>
  );
}
