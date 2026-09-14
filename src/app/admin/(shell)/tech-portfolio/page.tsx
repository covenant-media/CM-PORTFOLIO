import Link from 'next/link';
import type { Metadata } from 'next';
import { Icon } from '@/components/ui/Icon';
import { Notice } from '@/components/admin/notice';
import { HubHeader, StatRow, ToolGrid } from '@/components/admin/hub';
import { ModuleRowsBoard } from '@/components/admin/hub-boards';
import { SettingsForm } from '@/components/admin/settings-form';
import { Panel } from '@/components/admin/ui';
import { readSession } from '@/lib/auth/session';
import { levelFor } from '@/lib/auth/permissions';
import { permissionsForRole } from '@/lib/auth/guard';
import { sectionHub } from '@/lib/cms/admin';
import { dashboardCounts, list } from '@/lib/cms/repository';
import { getSettings, settingDefs } from '@/lib/cms/settings';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Tech portfolio' };

type SearchParams = Record<string, string | string[] | undefined>;

export default async function TechPortfolioHub({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const raw = await searchParams;
  const session = await readSession();
  if (!session) return null;
  const role = session.user.role;
  const roleMap = await permissionsForRole(role);
  const settingsLevel = levelFor(role, 'settings', roleMap);
  const canWrite = settingsLevel === 'write' || settingsLevel === 'manage';

  const counts: Record<string, number> = await dashboardCounts();
  const [settings, hub, resume] = await Promise.all([
    getSettings({ includePrivate: true }),
    sectionHub('tech', { role, roleMap, counts, omit: ['tech_projects', 'skills', 'certifications'] }),
    list('resume', { per: 5 }),
  ]);

  const activeResume = resume.rows.find((row) => row.is_active === true);

  return (
    <div className="space-y-6">
      <HubHeader
        eyebrow="Section 2 of 3"
        title="Tech portfolio"
        hint={hub.section.hint}
        live={hub.section.live}
      >
        <Link
          href="/admin/tech_projects/new"
          className="inline-flex items-center gap-1.5 rounded-2 border border-line px-3 py-1.5 text-[12.5px] text-fg-muted transition-colors hover:border-[var(--accent)]/50 hover:text-fg"
        >
          <Icon name="plus" size={13} /> New project
        </Link>
      </HubHeader>

      <Notice params={raw} />
      <StatRow stats={hub.stats} />

      <section className="space-y-3">
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-fg-dim">Editors in this section</h2>
        <ToolGrid tools={hub.tools} />
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <ModuleRowsBoard
          moduleKey="tech_projects"
          title="Projects"
          hint="The case studies on /tech-portfolio, each with its stack, outcome and links."
          per={5}
          action={
            <Link href="/admin/tech_projects" className="rounded-2 border border-line px-2.5 py-1 text-[11.5px] text-fg-muted hover:text-fg">
              Manage
            </Link>
          }
        />
        <ModuleRowsBoard
          moduleKey="skills"
          title="Skills"
          hint="Grouped by discipline and print in the skill matrix."
          per={6}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ModuleRowsBoard
          moduleKey="certifications"
          title="Certifications"
          hint="A certificate only shows publicly with a completed date and a verification link."
          per={4}
          emptyText="No certifications yet — add one with its verification link."
        />
        <Panel
          title="Résumé"
          hint="The downloadable CV. One version is active at a time — the public button always points at it."
          action={
            <Link href="/admin/resume" className="rounded-2 border border-line px-2.5 py-1 text-[11.5px] text-fg-muted hover:text-fg">
              Manage versions
            </Link>
          }
        >
          {activeResume ? (
            <div className="rounded-3 border border-line/70 bg-ink-950/50 px-4 py-3">
              <p className="flex flex-wrap items-center gap-2 text-[13px] text-fg">
                <Icon name="check" size={13} className="text-[var(--accent)]" />
                {String(activeResume.title ?? 'Active CV')}
              </p>
              <p className="mt-1 text-[11.5px] text-fg-dim">
                {activeResume.version ? `Version ${String(activeResume.version)}` : 'Current version'}
                {activeResume.updated_at ? ` · updated ${String(activeResume.updated_at).slice(0, 10)}` : ''}
              </p>
              <Link
                href={`/admin/resume/${String(activeResume.id)}`}
                className="mt-2 inline-flex items-center gap-1.5 text-[11.5px] text-[var(--accent)] hover:underline"
              >
                Open this version <Icon name="arrow-right" size={11} />
              </Link>
            </div>
          ) : (
            <p className="text-[12.5px] text-fg-dim">
              No version is active, so the public button falls back to the built-in CV. Publish one and mark it active.
            </p>
          )}
          <p className="mt-3 border-t border-line/60 pt-3 text-[11.5px] leading-relaxed text-fg-dim">
            {resume.total} version{resume.total === 1 ? '' : 's'} stored. Upload the PDF, set its title and mark it active —
            the file itself is served from the media library.
          </p>
        </Panel>
      </div>

      <SettingsForm
        group="tech"
        label="Tech portfolio copy"
        hint="The intro, the profile links and the wording of the tech surface."
        canWrite={canWrite}
        returnTo="/admin/tech-portfolio"
        custom={[]}
        fields={settingDefs('tech').map((def) => ({
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
      />
    </div>
  );
}
