/** @type {import('next').NextConfig} */

// The sandbox/preview host must be allowed as a dev origin, otherwise hot-reload
// assets are treated as cross-origin. Add any other local host the CMS is opened
// from via CM_ALLOWED_ORIGINS="host1,host2".
const devOrigins = (process.env.CM_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
if (process.env.E2B_SANDBOX_ID) devOrigins.push(`3000-${process.env.E2B_SANDBOX_ID}.e2b.app`);

/**
 * Server actions are the CMS's only write path, and uploads travel through them.
 * Next caps action request bodies at 1MB by default — far below STORAGE_MAX_UPLOAD_MB,
 * so a real event photograph was rejected by the framework with a 500 before the
 * upload action's own 413 could explain it. Track the storage limit, plus headroom
 * for multipart framing and field overhead.
 */
const uploadLimitMb = Math.max(1, Number(process.env.STORAGE_MAX_UPLOAD_MB ?? 32));
const actionBodyLimitMb = uploadLimitMb + 8;

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Standalone-friendly: server output keeps the image optimizer working on VPS.
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
  compress: true,
  // This repo can sit under a parent folder that also carries a package-lock.json, and Next then
  // infers that parent as the workspace root — printing the "multiple lockfiles" warning and
  // resolving chunks from the wrong place. Pin the root to this project. (`import.meta.dirname`
  // needs Node 20.11+, so fall back to cwd for an older pinned build image.)
  turbopack: { root: import.meta.dirname ?? process.cwd() },
  // `ensureSchema()` reads this file at runtime so a brand-new hosted database migrates itself on
  // the first request. Next only traces files it can see statically and that path is built at
  // runtime, so without this the SQL was absent from the server bundle — production then skipped
  // the migration and every CMS query failed with "relation does not exist".
  outputFileTracingIncludes: { '/**': ['./src/lib/db/schema.sql'] },
  // PGlite loads its WASM/FS from module-relative paths and pg is a native-ish
  // driver: bundling them breaks file resolution at runtime, so keep both external.
  serverExternalPackages: ['@electric-sql/pglite', 'pg'],
  images: {
    formats: ['image/avif', 'image/webp'],
    // Local uploads are served from /uploads (public) and remote media via allowed hosts below.
    remotePatterns: [
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'i.vimeocdn.com' },
      { protocol: 'https', hostname: 'img.youtube.com' },
      { protocol: 'https', hostname: '**.cloudfront.net' },
      { protocol: 'https', hostname: 'picsum.photos' },
    ],
  },
  /**
   * The Media Portfolio is a single page, so the old per-section routes are folded back into
   * it (2026-09-11). Their URLs are redirected rather than left to 404, because they were
   * linked from the CMS navigation and from the footer of every surface.
   */
  async redirects() {
    return [
      { source: '/media/services', destination: '/media#services', permanent: true },
      { source: '/media/about', destination: '/media#about', permanent: true },
      { source: '/media/contact', destination: '/media#contact', permanent: true },
      { source: '/media/work', destination: '/media#work', permanent: true },
    ];
  },
  async headers() {
    return [
      {
        // Security headers. CSP is intentionally scoped to not block inline styles used by
        // animation tooling while still restricting script sources.
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
      {
        source: '/admin/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/uploads/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
  ...(devOrigins.length ? { allowedDevOrigins: Array.from(new Set(devOrigins)) } : {}),
  experimental: {
    serverActions: {
      bodySizeLimit: `${actionBodyLimitMb}mb`,
    },
    // Middleware sits in front of /admin/*, so an upload passing through it is buffered
    // up to Next's own 10MB default before anything else sees it. Match the action limit
    // so a large photograph is not silently truncated (and does not log a warning that
    // has nothing to do with the request).
    middlewareClientMaxBodySize: actionBodyLimitMb * 1024 * 1024,
    optimizePackageImports: ['framer-motion'],
    // Worth it on small machines: fewer cached modules in the dev server, at the cost
    // of slightly slower rebuilds. Turn off with CM_LOW_MEM=0.
    webpackMemoryOptimizations: process.env.CM_LOW_MEM !== '0',
  },
};

export default nextConfig;
