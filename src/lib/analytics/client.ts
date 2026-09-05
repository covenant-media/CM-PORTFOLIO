'use client';
/**
 * Fire-and-forget measurement for client components.
 *
 * A component describes what happened and moves on: `SiteBehaviours` owns the endpoint, the
 * event allowlist, the batch shape and the privacy checks (DNT, no cookies, no IPs). That keeps
 * a lightbox or a video tile free of analytics plumbing, and means turning measurement off in
 * the CMS changes one listener instead of every call site.
 */
import type { EventName } from './events';

export function trackClientEvent(name: EventName, target?: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent('cm:track', { detail: { name, target } }));
  } catch {
    // CustomEvent is missing only in very old browsers; measurement is never worth an error.
  }
}
