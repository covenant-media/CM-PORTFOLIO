import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: { default: 'Covenant CMS', template: '%s — Covenant CMS' },
    robots: { index: false, follow: false },
  };
}

/**
 * Lightweight top-level admin layout. The shell sidebar and auth screen live in
 * their own route groups ((shell), (auth)) so they can enforce their own session
 * rules; this layout exists so shared admin chrome (theme, metadata, 404 page)
 * applies to every URL under /admin even when a child layout does not match —
 * e.g. a mistyped URL or a revoked module link.
 */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="theme-admin min-h-dvh bg-ink-950 text-fg">{children}</div>;
}
