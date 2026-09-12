/**
 * Tiny middleware that only exists to do one thing: prevent a mistyped or
 * revoked /admin/* URL from ever rendering the public-site "lost the reel" 404.
 *
 * The admin not-found page (`src/app/admin/(shell)/not-found.tsx`) handles
 * in-shell 404s (e.g. an unknown module key in /admin/:module) inside the CMS
 * frame. For malformed URLs with extra segments or non-matching ids this
 * middleware redirects back to /admin, which either shows the dashboard (when
 * signed in) or redirects to /admin/login (when signed out).
 *
 * It does not do auth, it does not rewrite public URLs, and it never touches
 * API routes.
 */
import { NextResponse, type NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith('/admin')) return NextResponse.next();
  if (pathname.startsWith('/admin/api') || pathname.startsWith('/admin/_next')) return NextResponse.next();

  const segments = pathname.replace(/^\/+/, '').split('/');
  // segments[0] === 'admin'
  if (segments.length <= 2) return NextResponse.next(); // /admin, /admin/login, /admin/:module
  if (segments.length === 3) {
    const [, mod, third] = segments as [string, string, string];
    if (third === 'new') return NextResponse.next();
    // Row id pages: accept the same id pattern validated by the page itself.
    if (/^[A-Za-z0-9_.:-]{1,64}$/.test(third) && MODULE_KEYS.has(mod)) {
      return NextResponse.next();
    }
  }

  const url = req.nextUrl.clone();
  url.pathname = '/admin';
  url.search = '';
  return NextResponse.redirect(url, 302);
}

// Module keys and console section keys. Keep in sync with src/lib/cms/modules.ts and
// the console groups in src/lib/cms/admin.ts — if you add either, add its key here or
// the middleware will bounce its URL back to /admin.
const MODULE_KEYS = new Set([
  'pages',
  'blocks',
  'navigation',
  'settings',
  'social_links',
  'services',
  'team',
  'testimonials',
  'media_projects',
  'tech_projects',
  'videos',
  'photos',
  'galleries',
  'media_library',
  'skills',
  'experience',
  'certifications',
  'resume',
  'pricing',
  'contact_info',
  'blog',
  'seo',
  'submissions',
  'featured',
  'account',
  // Console sections — these are hand-composed screens, not registry modules, but they
  // live at /admin/<section>/<page> and so need the same pass-through.
  'media',
  'site',
  'social',
  'content',
]);

export const config = {
  matcher: ['/admin/:path*'],
};
