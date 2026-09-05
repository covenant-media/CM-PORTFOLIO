'use client';
import { useActionState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { accountAction, signOutOtherSessionsAction } from '@/app/admin/actions';
import type { AdminActionState } from '@/lib/cms/admin';

export function AccountForm({ csrf }: { csrf: string }) {
  const [state, action, pending] = useActionState<AdminActionState | null, FormData>(accountAction, null);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_296px]">
      <form action={action} className="rounded-4 border border-line bg-ink-900/50">
        <header className="border-b border-line px-5 py-3.5">
          <h2 className="text-[13px] font-medium text-fg">Change password</h2>
          <p className="mt-1 text-[11.5px] text-fg-dim">At least 12 characters. Every other session is revoked when you change it.</p>
        </header>
        <div className="grid gap-3 px-5 py-4 sm:grid-cols-3">
          <input type="hidden" name="_csrf" value={csrf} />
          {(
            [
              { key: 'current_password', label: 'Current password' },
              { key: 'next_password', label: 'New password' },
              { key: 'confirm_password', label: 'Repeat new password' },
            ] as const
          ).map((field) => (
            <label key={field.key} className="block">
              <span className="mb-1.5 block text-[11px] uppercase tracking-[0.13em] text-fg-dim">{field.label}</span>
              <input
                type="password"
                name={field.key}
                autoComplete={field.key === 'current_password' ? 'current-password' : 'new-password'}
                className="w-full rounded-2 border border-line bg-ink-950/70 px-3 py-2 text-[13.5px] text-fg outline-none focus:border-[var(--accent)]/70"
              />
            </label>
          ))}
        </div>
        {state ? (
          <p className={`mx-5 mb-3 flex items-center gap-2 text-[12px] ${state.ok ? 'text-ok-400' : 'text-alert-400'}`}>
            <Icon name={state.ok ? 'check' : 'alert'} size={13} />
            {state.message}
          </p>
        ) : null}
        <div className="border-t border-line px-5 py-3">
          <button type="submit" disabled={pending} className="inline-flex items-center gap-2 rounded-2 bg-[var(--accent)] px-3.5 py-2 text-[12.5px] font-medium text-[var(--accent-ink)] disabled:opacity-60">
            {pending ? <Icon name="spinner" size={13} className="animate-spin" /> : <Icon name="key" size={13} />}
            Update password
          </button>
        </div>
      </form>

      <form action={signOutOtherSessionsAction} className="h-fit rounded-4 border border-line bg-ink-900/50 p-4">
        <p className="text-[11px] uppercase tracking-[0.14em] text-fg-dim">Safety</p>
        <p className="mt-1.5 text-[12px] leading-relaxed text-fg-muted">Sign out every device except this one.</p>
        <button type="submit" className="mt-3 w-full rounded-2 border border-line px-3 py-1.5 text-[12px] text-fg-muted hover:border-alert-400/50 hover:text-alert-400">
          Revoke other sessions
        </button>
      </form>
    </div>
  );
}
