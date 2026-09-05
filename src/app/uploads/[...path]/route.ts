/**
 * GET /uploads/<key> — the read side of the local storage driver.
 *
 * `next start` only serves what existed inside `public/` when the build ran, so an image uploaded
 * after a deploy would 404 if the app relied on the public directory alone. Serving the bytes from
 * the app makes one URL behave identically in development, under `next start`, in a standalone
 * build and behind a proxy that mounts the upload volume. A real deployment can still put a CDN or
 * nginx in front of the same path; nothing in the CMS changes when it does.
 *
 * Keys are generated with a random prefix, which is what makes an immutable cache header safe.
 */
import { NextResponse } from 'next/server';
import { readLocalObject } from '@/lib/media/storage';

export const dynamic = 'force-dynamic';

/** `2026/09/1a2b3c4d5e6f-name.png` — no traversal, no absolute paths, no odd characters. */
const SAFE_KEY = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,220}$/;

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const key = (path ?? []).join('/');
  // Anything that is not a generated key — traversal, a dotfile, an absolute path — is simply
  // not here. A 404 keeps the endpoint from describing what it refused and why.
  if (!SAFE_KEY.test(key) || key.includes('..')) return new NextResponse(null, { status: 404 });

  const object = await readLocalObject(key);
  if (!object) return new NextResponse(null, { status: 404 });

  return new NextResponse(new Uint8Array(object.buffer), {
    headers: {
      'content-type': object.contentType,
      'content-length': String(object.buffer.length),
      'cache-control': 'public, max-age=31536000, immutable',
      // An octet-stream fallback plus nosniff is what keeps a mislabelled file inert.
      'x-content-type-options': 'nosniff',
      vary: 'Accept-Encoding',
    },
  });
}
