import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

export const dynamic = 'force-dynamic';

/**
 * Admin-area 404 — stays inside the CMS shell theme rather than dumping the
 * signed-in editor onto the public "lost the reel" page. The shell layout (which
 * wraps this segment and provides the sidebar) already redirects unauthenticated
 * visitors to /admin/login, so anyone who sees this is signed in.
 */
export default function AdminNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <span className="grid h-11 w-11 place-items-center rounded-3 border border-line text-fg-dim">
        <Icon name="sliders" size={18} />
      </span>
      <p className="mt-6 text-[11px] uppercase tracking-[0.2em] text-fg-dim">404 — section not found</p>
      <h1 className="mt-3 font-display text-[28px] leading-tight">That CMS page does not exist.</h1>
      <p className="mt-3 max-w-[52ch] text-[13px] leading-relaxed text-fg-muted">
        The link may have been mistyped, or the section you were trying to reach was renamed or removed.
        Everything you can edit is still listed in the sidebar.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-2">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 rounded-2 bg-[var(--accent)] px-4 py-2 text-[12.5px] font-medium text-[var(--accent-ink)] transition hover:brightness-105"
        >
          <Icon name="home" size={13} /> Back to dashboard
        </Link>
        <Link
          href="/admin/pages"
          className="inline-flex items-center gap-1.5 rounded-2 border border-line px-4 py-2 text-[12.5px] text-fg-muted transition hover:border-[var(--accent)]/50 hover:text-fg"
        >
          Site structure
        </Link>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-2 border border-line px-4 py-2 text-[12.5px] text-fg-muted transition hover:border-[var(--accent)]/50 hover:text-fg"
        >
          <Icon name="external" size={13} /> View public site
        </a>
      </div>
    </div>
  );
}
