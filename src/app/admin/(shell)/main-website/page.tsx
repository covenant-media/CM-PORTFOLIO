import Link from 'next/link';
import type { Metadata } from 'next';
import { Icon } from '@/components/ui/Icon';
import { Notice } from '@/components/admin/notice';
import { HubHeader, StatRow, ToolGrid } from '@/components/admin/hub';
import { ModuleRowsBoard } from '@/components/admin/hub-boards';
import { Panel, StatusPill } from '@/components/admin/ui';
import { readSession } from '@/lib/auth/session';
import { permissionsForRole } from '@/lib/auth/guard';
import { levelFor } from '@/lib/auth/permissions';
import { pageCompositions, sectionHub } from '@/lib/cms/admin';
import { dashboardCounts } from '@/lib/cms/repository';
import { SETTINGS_GROUPS } from '@/lib/cms/settings';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Main website' };

type SearchParams = Record<string, string | string[] | undefined>;

export default async function MainWebsiteHub({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const raw = await searchParams;
  const session = await readSession();
  if (!session) return null;
  const role = session.user.role;
  const roleMap = await permissionsForRole(role);

  const counts: Record<string, number> = await dashboardCounts();
  const [hub, pages] = await Promise.all([
    sectionHub('website', { role, roleMap, counts, omit: ['pages', 'services'] }),
    pageCompositions(),
  ]);

  const main = pages.filter((page) => page.surface === 'main');
  const brandLevel = levelFor(role, 'settings', roleMap);
  const canBrand = brandLevel === 'write' || brandLevel === 'manage';

  return (
    <div className="space-y-6">
      <HubHeader eyebrow="Section 3 of 3" title="Main website" hint={hub.section.hint} live={hub.section.live}>
        <Link
          href="/admin/pages/new"
          className="inline-flex items-center gap-1.5 rounded-2 border border-line px-3 py-1.5 text-[12.5px] text-fg-muted transition-colors hover:border-[var(--accent)]/50 hover:text-fg"
        >
          <Icon name="plus" size={13} /> New page
        </Link>
      </HubHeader>

      <Notice params={raw} />
      <StatRow stats={hub.stats} />

      <section className="space-y-3">
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-fg-dim">Editors in this section</h2>
        <ToolGrid tools={hub.tools} />
      </section>

      <Panel
        title="Pages & sections"
        hint="Every authored page and what it is built from. Open a page to compose its sections; open a section to change its words."
        action={
          <Link href="/admin/pages" className="rounded-2 border border-line px-2.5 py-1 text-[11.5px] text-fg-muted hover:text-fg">
            All pages
          </Link>
        }
      >
        {main.length === 0 ? (
          <p className="text-[12.5px] text-fg-dim">
            No pages authored yet — the landing page renders its built-in composition. Create a page to take it over.
          </p>
        ) : (
          <ul className="divide-y divide-line/60">
            {main.map((page) => (
              <li key={page.id} className="flex flex-wrap items-center gap-3 py-3">
                <StatusPill status={page.status} />
                <span className="min-w-0 flex-1">
                  <Link href={`/admin/pages/${page.id}`} className="block text-[13px] text-fg hover:underline">
                    {page.title}
                  </Link>
                  <span className="mt-0.5 block text-[11.5px] text-fg-dim">
                    /{page.slug} · {page.blocks.length} section{page.blocks.length === 1 ? '' : 's'}
                    {page.blocks.length ? `: ${page.blocks.slice(0, 4).map((block) => block.name).join(', ')}` : ''}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <ModuleRowsBoard
          moduleKey="services"
          title="Services"
          hint="What the site sells, in the order the visitor reads it."
          per={6}
        />
        <ModuleRowsBoard
          moduleKey="blog"
          title="Journal"
          hint="Posts, their covers and their publish dates."
          per={5}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ModuleRowsBoard
          moduleKey="team"
          title="Team"
          hint="People shown on the studio and contact sections, with portraits and roles."
          per={4}
          emptyText="No team members yet — the studio section shows its built-in founder card."
        />
        <Panel
          title="Site-wide copy"
          hint="Brand, contact details, forms, legal and SEO wording — the settings groups that apply to every surface."
          action={
            <Link href="/admin/settings" className="rounded-2 border border-line px-2.5 py-1 text-[11.5px] text-fg-muted hover:text-fg">
              Open settings
            </Link>
          }
        >
          <ul className="grid gap-2 sm:grid-cols-2">
            {SETTINGS_GROUPS.filter((group) => group.key !== 'identity').map((group) => (
              <li key={group.key}>
                <Link
                  href={`/admin/settings?group=${group.key}`}
                  className="flex items-center gap-2.5 rounded-3 border border-line bg-ink-950/40 px-3 py-2 transition-colors hover:border-[var(--accent)]/40"
                >
                  <Icon name={group.icon} size={14} className="text-[var(--accent)]" />
                  <span className="min-w-0">
                    <span className="block truncate text-[12.5px] text-fg">{group.label}</span>
                    <span className="block truncate text-[11px] text-fg-dim">{group.hint}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-line/60 pt-2.5 text-[11.5px] text-fg-dim">
            {canBrand
              ? 'Changes save group by group — nothing in this list touches the other groups.'
              : 'Read only for your role.'}
          </p>
        </Panel>
      </div>
    </div>
  );
}
