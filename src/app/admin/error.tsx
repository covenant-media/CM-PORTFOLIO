'use client';

/**
 * Admin-scoped error boundary.
 *
 * The public site degrades quietly when the database is unavailable: content loaders fall
 * back to defaults and the pages keep rendering. The CMS cannot do that — it exists to
 * read and write that data, so an unreachable database is a hard stop.
 *
 * It is *a* stop, not *the* stop. For a long time this screen assumed it was the only way
 * the CMS could fail and said "could not reach its database" unconditionally, which sent
 * operators chasing a database that was perfectly healthy after, say, an upload larger
 * than the request limit. So: report the message we actually have, and reach for the
 * database explanation only when the failure looks like one.
 *
 * Production builds strip server error messages down to a digest, so the fallback still
 * leads with the connection cause — on a fresh deployment that is overwhelmingly the
 * reason (a serverless host has a read-only filesystem, so the embedded engine cannot run
 * there). The digest is shown either way, because it is the only thing that matches a
 * screen like this to a line in the server log.
 */
import { useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

/** The generic stand-in Next ships once a real server message has been stripped. */
const REDACTED = /an error occurred in the server components render/i;

/** Messages that point at the database rather than at the request itself. */
const CONNECTION = /(database|postgres|pgdata|pglite|connection|econnrefused|enotfound|relation .* does not exist|timeout)/i;

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const message = (error.message ?? '').trim();
  const shown = message && !REDACTED.test(message) ? message : '';
  const isConnection = !shown || CONNECTION.test(shown);

  return (
    <div className="theme-admin flex min-h-dvh items-center justify-center bg-ink-1000 px-5 py-10 text-fg">
      <div className="w-full max-w-[540px] rounded-4 border border-line bg-ink-950/80 p-7 text-center shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)]">
        <span className="mx-auto grid size-11 place-items-center rounded-full border border-alert-400/40 text-alert-400">
          <Icon name="alert" size={19} />
        </span>

        <h1 className="mt-6 font-display text-[22px] leading-tight">
          {isConnection ? 'The CMS could not reach its database.' : 'The CMS could not finish that.'}
        </h1>

        <p className="mt-3 text-[13.5px] leading-relaxed text-fg-muted">
          {isConnection
            ? 'The rest of the site still works — its pages fall back to their built-in content. The CMS cannot: it reads and writes that database directly, so this screen needs the connection back.'
            : 'Nothing you were editing was lost — the change was never applied. Try again, and if it repeats, the message below is the one to quote.'}
        </p>

        {shown ? (
          <p className="mt-4 rounded-3 border border-line bg-ink-900/60 px-4 py-3 text-left font-mono text-[11.5px] leading-relaxed text-alert-400">
            {shown}
          </p>
        ) : null}

        {isConnection ? (
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
        ) : (
          <div className="mt-5 rounded-3 border border-line bg-ink-900/60 p-4 text-left text-[12.5px] leading-relaxed text-fg-muted">
            <p className="text-fg">If this keeps happening</p>
            <p className="mt-1.5">
              Large uploads and long lists are the usual culprits — a photograph over the site&apos;s upload limit is
              rejected with a plain message, but a request the server cannot even parse lands here. Otherwise it is worth
              checking the database connection, since the CMS reads and writes it directly.
            </p>
          </div>
        )}

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
          <Link
            href="/admin"
            className="inline-flex h-10 items-center rounded-2 border border-line px-5 text-[13.5px] text-fg-muted transition hover:text-fg"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
