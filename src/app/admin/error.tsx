'use client';

/**
 * Admin-scoped error boundary.
 *
 * The public site degrades quietly when the database is unavailable: content loaders fall back to
 * defaults and the pages keep rendering. The CMS cannot do that — it exists to read and write that
 * data, so an unreachable database is a hard stop. Before this boundary the stop threw the operator
 * out onto the site-wide error page, which explains nothing and reads as "the whole site is broken".
 *
 * The overwhelmingly common cause on a fresh deployment is that no database has been configured
 * (a serverless host has a read-only filesystem, so the embedded local engine cannot run there), so
 * this page says that plainly, stays inside the CMS styling, and still offers the retry.
 */
import { useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="theme-admin flex min-h-dvh items-center justify-center bg-ink-1000 px-5 py-10 text-fg">
      <div className="w-full max-w-[540px] rounded-4 border border-line bg-ink-950/80 p-7 text-center shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)]">
        <span className="mx-auto grid size-11 place-items-center rounded-full border border-[var(--accent)]/40 text-[var(--accent)]">
          <Icon name="alert" size={19} />
        </span>
        <h1 className="mt-6 font-display text-[22px] leading-tight">The CMS could not reach its database.</h1>
        <p className="mt-3 text-[13.5px] leading-relaxed text-fg-muted">
          The rest of the site still works — its pages fall back to their built-in content. The CMS cannot: it reads
          and writes that database directly, so this screen needs the connection back.
        </p>
        <div className="mt-5 rounded-3 border border-line bg-ink-900/60 p-4 text-left text-[12.5px] leading-relaxed text-fg-muted">
          <p className="text-fg">If this site was just deployed, it has no database yet.</p>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5">
            <li>Create a PostgreSQL database (Netlify DB, Neon, Supabase, Railway…).</li>
            <li>
              Set <code className="font-mono text-[11.5px] text-[var(--accent)]">DATABASE_URL</code> and{' '}
              <code className="font-mono text-[11.5px] text-[var(--accent)]">DB_DRIVER=postgres</code> in the site
              environment variables.
            </li>
            <li>
              Set <code className="font-mono text-[11.5px] text-[var(--accent)]">ADMIN_EMAIL</code> and{' '}
              <code className="font-mono text-[11.5px] text-[var(--accent)]">ADMIN_PASSWORD</code> once, so the first
              owner is created on the next request.
            </li>
          </ol>
        </div>
        {error.digest ? (
          <p className="mt-4 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-fg-dim">ref {error.digest.slice(0, 12)}</p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-10 items-center gap-2 rounded-2 bg-[var(--accent)] px-5 text-[13.5px] font-medium text-[var(--accent-ink)] transition hover:brightness-105"
          >
            <Icon name="refresh" size={15} /> Try again
          </button>
          <Link href="/" className="inline-flex h-10 items-center rounded-2 border border-line px-5 text-[13.5px] text-fg-muted transition hover:text-fg">
            Back to the site
          </Link>
        </div>
      </div>
    </div>
  );
}
