'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Server logs keep the detail; the visitor sees an honest sentence.
    console.error(error);
  }, [error]);

  return (
    <main className="theme-main flex min-h-dvh items-center justify-center px-6">
      <div className="max-w-md text-center">
        <span className="mx-auto grid size-11 place-items-center rounded-full border border-[rgba(232,121,90,.4)] text-[var(--color-alert-400)]">
          <Icon name="alert" size={19} />
        </span>
        <h1 className="display-3 mt-7">Something broke on this page.</h1>
        <p className="lede mt-4">
          The rest of the site is fine. Try again, and if it keeps happening send the page link by email.
        </p>
        {error.digest ? (
          <p className="mt-4 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-fg-dim">ref {error.digest.slice(0, 12)}</p>
        ) : null}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex h-10 items-center gap-2 rounded-pill bg-[var(--accent)] px-5 text-[0.9375rem] text-[var(--accent-ink)] transition hover:brightness-105"
          >
            <Icon name="refresh" size={15} /> Try again
          </button>
          <Button href="/" variant="outline">Back home</Button>
        </div>
      </div>
    </main>
  );
}
