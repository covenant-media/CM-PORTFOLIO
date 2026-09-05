'use client';
/**
 * Carries the CSRF token to the client-driven CMS actions (reorder, uploads, toggles)
 * so every one of them can present the same second factor the form posts do.
 */
import { createContext, useContext, useMemo } from 'react';

const CsrfContext = createContext<string>('');

export function AdminProviders({ csrf, children }: { csrf: string; children: React.ReactNode }) {
  const value = useMemo(() => csrf, [csrf]);
  return <CsrfContext.Provider value={value}>{children}</CsrfContext.Provider>;
}

export function useCsrf(): string {
  return useContext(CsrfContext);
}
