import Link from 'next/link';
import { CovenantMark } from '@/components/site/Logo';

export default function NotFound() {
  return (
    <main className="theme-main flex min-h-dvh items-center justify-center px-6">
      <div className="max-w-md text-center">
        <CovenantMark size={34} className="mx-auto text-fg" />
        <p className="eyebrow mt-8">404 — lost the reel</p>
        <h1 className="display-2 mt-4">This page is not here yet.</h1>
        <p className="lede mt-4">
          The link may be old, or the page has not been published. Both experiences are still open below.
        </p>
        <nav className="mt-9 flex flex-wrap justify-center gap-3 text-[0.9375rem]">
          <Link href="/" className="rounded-pill bg-[var(--accent)] px-5 py-2.5 text-[var(--accent-ink)] transition hover:brightness-105">
            Home
          </Link>
          <Link href="/media" className="rounded-pill border border-[rgba(243,241,236,.18)] px-5 py-2.5 transition hover:border-[var(--accent)]">
            Media portfolio
          </Link>
          <Link href="/tech" className="rounded-pill border border-[rgba(243,241,236,.18)] px-5 py-2.5 transition hover:border-[var(--accent)]">
            Tech portfolio
          </Link>
        </nav>
      </div>
    </main>
  );
}
