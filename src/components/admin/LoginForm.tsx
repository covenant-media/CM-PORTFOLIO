'use client';
/**
 * The only way into the CMS. `useActionState` keeps the server-side rate limit and
 * lockout messages visible without a client-side copy of the rules.
 */
import { useActionState, useEffect, useRef } from 'react';
import { Icon } from '@/components/ui/Icon';
import { signInAction } from '@/app/admin/actions';
import type { AdminActionState } from '@/lib/cms/admin';

export interface LoginFormProps {
  next: string;
  devHint?: { email: string; password: string } | null;
}

export function LoginForm({ next, devHint }: LoginFormProps) {
  const [state, action, pending] = useActionState<AdminActionState | null, FormData>(signInAction, null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      <div>
        <label htmlFor="email" className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-fg-dim">
          Email
        </label>
        <input
          id="email"
          ref={emailRef}
          name="email"
          type="email"
          required
          autoComplete="username"
          spellCheck={false}
          className="w-full rounded-2 border border-line bg-ink-900 px-3 py-2.5 text-[14px] text-fg outline-none transition-colors placeholder:text-fg-dim focus:border-[var(--accent)]/70"
          placeholder="you@covenant.media"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-fg-dim">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-2 border border-line bg-ink-900 px-3 py-2.5 text-[14px] text-fg outline-none transition-colors focus:border-[var(--accent)]/70"
          placeholder="••••••••"
        />
      </div>

      {state && !state.ok ? (
        <p role="alert" className="flex items-start gap-2 rounded-2 border border-alert-400/40 bg-alert-400/8 px-3 py-2 text-[12.5px] text-alert-400">
          <Icon name="alert" size={14} className="mt-[1px] shrink-0" />
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-2 bg-[var(--accent)] px-4 py-2.5 text-[13.5px] font-medium text-[var(--accent-ink)] transition-opacity hover:opacity-90 disabled:opacity-55"
      >
        {pending ? <Icon name="spinner" size={15} className="animate-spin" /> : <Icon name="lock" size={15} />}
        {pending ? 'Checking…' : 'Sign in'}
      </button>

      {devHint ? (
        <p className="rounded-2 border border-line bg-ink-900/60 px-3 py-2 text-[11.5px] leading-relaxed text-fg-dim">
          <span className="text-fg-muted">Development seed.</span> Sign in with{' '}
          <code className="font-mono text-[11px] text-[var(--accent)]">{devHint.email}</code> /{' '}
          <code className="font-mono text-[11px] text-[var(--accent)]">{devHint.password}</code>, then change the
          password under <span className="text-fg-muted">Account</span>. Demo data only — it never exists in a real
          deployment.
        </p>
      ) : null}
    </form>
  );
}
