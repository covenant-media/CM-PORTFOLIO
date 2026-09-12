/** @type {import('next').NextConfig} */

// The sandbox/preview host must be allowed as a dev origin, otherwise hot-reload
// assets are treated as cross-origin. Add any other local host the CMS is opened
// from via CM_ALLOWED_ORIGINS="host1,host2".
const devOrigins = (process.env.CM_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
if (process.env.E2B_SANDBOX_ID) devOrigins.push(`3000-${process.env.E2B_SANDBOX_ID}.e2b.app`);

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Standalone-friendly: server output keeps the image optimizer working on VPS.
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
  compress: true,
  // This repo can sit under a parent folder that also carries a package-lock.json, and Next then
  // infers that parent as the workspace root — printing the "multiple lockfiles" warning and
  // resolving chunks from the wrong place. Pin the root to this project.
  turbopack: { root: import.meta.dirname },
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
    optimizePackageImports: ['framer-motion'],
    // Worth it on small machines: fewer cached modules in the dev server, at the cost
    // of slightly slower rebuilds. Turn off with CM_LOW_MEM=0.
    webpackMemoryOptimizations: process.env.CM_LOW_MEM !== '0',
  },
};

export default nextConfig;
