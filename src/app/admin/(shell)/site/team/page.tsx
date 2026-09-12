/**
 * Team.
 *
 * Quick editing at the card level. The placeholder flag is deliberately prominent: a
 * seeded or invented person must never read as a real member of the studio, so the row
 * says plainly whether it is one.
 */
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { PageHeader, Pill, EmptyState, StatCard } from '@/components/admin/ui';
import { Notice } from '@/components/admin/notice';
import { ActionButton, Field, Select, SubmitButton, TextArea, TextInput, Toggle } from '@/components/admin/controls';
import { ConfirmSubmit } from '@/components/admin/confirm';
import { readSession } from '@/lib/auth/session';
import { levelFor } from '@/lib/auth/permissions';
import { permissionsForRole } from '@/lib/auth/guard';
import { teamForConsole, type TeamRow } from '@/lib/cms/console';
import { DIVISION_OPTIONS } from '@/lib/cms/options';
import { saveTeamAction, inlineRowAction } from '@/app/admin/actions';
import { cx } from '@/lib/utils/text';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Team' };

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

export default async function SiteTeamPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await readSession();
  if (!session) redirect('/admin/login');
  const [team, roleMap] = await Promise.all([teamForConsole(), permissionsForRole(session.user.role)]);
  const level = levelFor(session.user.role, 'team', roleMap);
  const canWrite = level === 'write' || level === 'manage';
  const canDelete = level === 'manage';
  const params = await searchParams;

  return (
    <>
      <PageHeader
        eyebrow="Main website"
        title="Team"
        lede="Covenant plus collaborators. Mark a row as a placeholder until it describes a real person — the public site labels it as one rather than presenting it as fact."
      />

      <Notice params={params} />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="Members" value={team.length} />
        <StatCard label="Published" value={team.filter((t) => t.status === 'published').length} tone="accent" />
        <StatCard
          label="Placeholders"
          value={team.filter((t) => t.is_placeholder).length}
          tone={team.some((t) => t.is_placeholder) ? 'warn' : 'neutral'}
          hint="Labelled publicly"
        />
      </div>

      {canWrite ? (
        <section className="mb-6 rounded-4 border border-line bg-ink-900/60">
          <header className="border-b border-line px-5 py-3">
            <h3 className="text-[12.5px] font-medium text-fg">Add a team member</h3>
            <p className="mt-0.5 text-[11.5px] leading-snug text-fg-dim">Name and role are enough to start.</p>
          </header>
          <form action={saveTeamAction} className="grid gap-4 px-5 py-4 lg:grid-cols-2">
            <input type="hidden" name="_csrf" value={session.csrfToken} />
            <input type="hidden" name="return_to" value="/admin/site/team" />
            <TextInput label="Name" name="title" required placeholder="Covenant Nsikan" maxLength={80} />
            <TextInput label="Role" name="role" placeholder="Founder / CEO" maxLength={80} />
            <Select label="Appears in" name="division" defaultValue="main" options={DIVISION_OPTIONS.map((d) => ({ value: d.value, label: d.label }))} />
            <Field label="Status" name="status">
              <select
                id="status"
                name="status"
                defaultValue="draft"
                className="w-full appearance-none rounded-3 border border-line bg-ink-950/60 px-3 py-2 text-[13px] text-fg focus:border-[var(--accent)]/60 focus:outline-none"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <div className="lg:col-span-2">
              <TextArea label="Short bio" name="bio" rows={3} maxLength={600} placeholder="What this person does." />
            </div>
            <div className="lg:col-span-2 grid gap-3 sm:grid-cols-2">
              <Toggle label="Placeholder (not a real person)" name="is_placeholder" defaultChecked help="Turn off once the row describes somebody real." />
              <Toggle label="Visible on the site" name="is_visible" defaultChecked />
            </div>
            <div className="lg:col-span-2">
              <SubmitButton pendingLabel="Adding…">Add member</SubmitButton>
            </div>
          </form>
        </section>
      ) : null}

      {team.length === 0 ? (
        <EmptyState title="No team members yet" hint="Add yourself first, then collaborators as the crew grows." />
      ) : (
        <ul className="space-y-2.5">
          {team.map((member) => (
            <TeamCard key={member.id} member={member} csrf={session.csrfToken} canWrite={canWrite} canDelete={canDelete} />
          ))}
        </ul>
      )}
    </>
  );
}

function TeamCard({ member, csrf, canWrite, canDelete }: { member: TeamRow; csrf: string; canWrite: boolean; canDelete: boolean }) {
  return (
    <li className={cx('rounded-4 border bg-ink-900/60', member.is_placeholder ? 'border-alert-400/30' : 'border-line')}>
      <div className="flex flex-wrap items-start gap-3 px-4 py-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line bg-ink-800 text-fg-muted">
          <Icon name="user" size={14} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-fg">{member.name}</p>
          {member.role ? <p className="text-[11.5px] text-fg-dim">{member.role}</p> : null}
          {member.bio ? <p className="mt-1 line-clamp-2 text-[12px] text-fg-muted">{member.bio}</p> : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <Pill tone={member.status === 'published' ? 'ok' : 'warn'}>{member.status}</Pill>
          {member.is_placeholder ? <Pill tone="warn">placeholder</Pill> : null}
          {!member.is_visible ? <Pill tone="neutral">hidden</Pill> : null}
          {canWrite ? (
            <form action={inlineRowAction}>
              <input type="hidden" name="_csrf" value={csrf} />
              <input type="hidden" name="module" value="team" />
              <input type="hidden" name="id" value={member.id} />
              <input type="hidden" name="op" value={member.status === 'published' ? 'draft' : 'publish'} />
              <ActionButton pendingLabel="…">{member.status === 'published' ? 'Unpublish' : 'Publish'}</ActionButton>
            </form>
          ) : null}
          <Link
            href={`/admin/team/${member.id}`}
            className="inline-flex items-center gap-1 rounded-2 border border-line px-2 py-[3px] text-[11.5px] text-fg-muted transition-colors hover:border-[var(--accent)]/45 hover:text-fg"
          >
            Full editor <Icon name="arrow-right" size={10} />
          </Link>
        </div>
      </div>

      {canWrite ? (
        <details className="border-t border-line">
          <summary className="cursor-pointer list-none px-4 py-2 text-[11.5px] text-fg-dim hover:text-fg-muted">Quick edit</summary>
          <div className="border-t border-line/60 px-4 py-4">
            <form action={saveTeamAction} className="grid gap-4 lg:grid-cols-2">
              <input type="hidden" name="_csrf" value={csrf} />
              <input type="hidden" name="id" value={member.id} />
              <input type="hidden" name="return_to" value="/admin/site/team" />
              <TextInput label="Name" name="title" defaultValue={member.name} required maxLength={80} />
              <TextInput label="Role" name="role" defaultValue={member.role} maxLength={80} />
              <Select label="Appears in" name="division" defaultValue={member.division} options={DIVISION_OPTIONS.map((d) => ({ value: d.value, label: d.label }))} />
              <Select label="Status" name="status" defaultValue={member.status} options={STATUS_OPTIONS} />
              <div className="lg:col-span-2">
                <TextArea label="Short bio" name="bio" rows={3} defaultValue={member.bio} maxLength={600} />
              </div>
              <TextInput label="Order" name="sort_order" type="number" defaultValue={String(member.sort_order)} />
              <div className="grid gap-3">
                <Toggle label="Placeholder (not a real person)" name="is_placeholder" defaultChecked={member.is_placeholder} />
                <Toggle label="Visible on the site" name="is_visible" defaultChecked={member.is_visible} />
              </div>
              <div className="lg:col-span-2">
                <SubmitButton>Save changes</SubmitButton>
              </div>
            </form>
            {canDelete ? (
              <form action={inlineRowAction} className="mt-3 border-t border-line/60 pt-3">
                <input type="hidden" name="_csrf" value={csrf} />
                <input type="hidden" name="module" value="team" />
                <input type="hidden" name="id" value={member.id} />
                <input type="hidden" name="op" value="delete" />
                <ConfirmSubmit message={`Delete “${member.name}”? This cannot be undone.`}>Delete</ConfirmSubmit>
              </form>
            ) : null}
          </div>
        </details>
      ) : null}
    </li>
  );
}
