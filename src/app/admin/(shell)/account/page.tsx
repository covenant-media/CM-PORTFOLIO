import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { Panel, Pill, whenLabel } from '@/components/admin/ui';
import { AccountForm } from '@/components/admin/account-form';
import { readSession } from '@/lib/auth/session';
import { getDb } from '@/lib/db';
import { ROLE_OPTIONS } from '@/lib/cms/admin';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Your account', robots: { index: false, follow: false } };

export default async function AccountPage() {
  const session = await readSession();
  if (!session) redirect('/admin/login');

  const db = await getDb();
  const [user, sessions] = await Promise.all([
    db.select<Record<string, unknown>>('SELECT email, name, role, title, last_login_at, created_at, password_updated_at FROM admin_user WHERE id = $1::text', [session.user.id]).catch(() => []),
    db
      .select<Record<string, unknown>>(
        `SELECT id, created_at, expires_at, revoked_at, ip_hash FROM admin_session WHERE user_id = $1::text ORDER BY created_at DESC LIMIT 12`,
        [session.user.id],
      )
      .catch(() => []),
  ]);
  const row = user[0] ?? {};
  const role = ROLE_OPTIONS.find((option) => option.value === session.user.role);

  return (
    <div className="space-y-4">
      <header>
        <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-fg-dim">
          <Icon name="user" size={13} /> System
        </p>
        <h1 className="mt-1 font-display text-[24px] leading-tight">Your account</h1>
        <p className="mt-1 max-w-[68ch] text-[12.5px] leading-relaxed text-fg-muted">
          Password, sessions and what this role is allowed to change. Roles are fixed by the deployment; access is
          checked on every write, not just in this menu.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Who you are">
          <dl className="space-y-1.5 text-[12.5px]">
            <div className="flex justify-between gap-3">
              <dt className="text-fg-dim">Name</dt>
              <dd className="text-fg">{String(row.name ?? session.user.name)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-fg-dim">Email</dt>
              <dd className="truncate font-mono text-[11.5px] text-fg-muted">{String(row.email ?? session.user.email)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-fg-dim">Role</dt>
              <dd className="text-fg">
                <Pill tone="accent">{role?.label ?? session.user.role}</Pill>
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-fg-dim">Last sign-in</dt>
              <dd className="text-fg-muted">{row.last_login_at ? whenLabel(String(row.last_login_at)) : 'this session'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-fg-dim">Password changed</dt>
              <dd className="text-fg-muted">{row.password_updated_at ? whenLabel(String(row.password_updated_at)) : 'never (seed)'}</dd>
            </div>
          </dl>
          {role?.hint ? <p className="mt-3 border-t border-line pt-3 text-[11.5px] leading-relaxed text-fg-dim">{role.hint}</p> : null}
        </Panel>

        <Panel title="Sessions" hint="Twelve hours of inactivity ends a session. Revoke anything you do not recognise.">
          <ul className="space-y-2">
            {sessions.map((item) => {
              const active = !item.revoked_at && new Date(String(item.expires_at)).getTime() > Date.now();
              return (
                <li key={String(item.id)} className="flex items-center gap-2.5 text-[12px]">
                  <span className={active ? 'h-1.5 w-1.5 rounded-full bg-ok-400' : 'h-1.5 w-1.5 rounded-full bg-ink-600'} />
                  <span className="text-fg-muted">{whenLabel(String(item.created_at))}</span>
                  <span className="font-mono text-[10.5px] text-fg-dim">{String(item.ip_hash ?? '').slice(0, 10)}</span>
                  {String(item.id) === session.sessionId ? <Pill tone="neutral">this device</Pill> : null}
                  <span className="ml-auto text-[11px] text-fg-dim">{active ? 'active' : 'revoked'}</span>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>

      <AccountForm csrf={session.csrfToken} />
    </div>
  );
}
