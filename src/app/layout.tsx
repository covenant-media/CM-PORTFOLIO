import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/fraunces/opsz.css';
import '@fontsource-variable/fraunces/opsz-italic.css';
import '@fontsource-variable/inter/index.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-500.css';
import '@fontsource/jetbrains-mono/latin-600.css';
import './globals.css';
import { getSettings } from '@/lib/cms/settings';
import { resolveSite } from '@/lib/seo/metadata';
import { jsonLdScript, organizationJsonLd, websiteJsonLd } from '@/lib/seo/structured';

/**
 * Root layout: fonts, document-level metadata and site-wide structured data.
 * Each experience (brand / media / tech) wraps itself in `ExperienceShell`,
 * which supplies theme, header, footer and behaviours — so this file stays thin.
 */
export async function generateMetadata(): Promise<Metadata> {
  const [settings, site] = await Promise.all([getSettings({ includePrivate: true }), resolveSite()]);
  const name = String(settings['brand.name'] || 'Covenant Media');
  return {
    metadataBase: new URL(site.origin),
    title: { default: `${name} — Media & Technology`, template: `%s — ${name}` },
    description: String(settings['seo.default_description'] || 'Media production and software engineering from one studio.'),
    applicationName: name,
    authors: settings['founder.name'] ? [{ name: String(settings['founder.name']), url: site.origin }] : [{ name }],
    creator: settings['founder.name'] ? String(settings['founder.name']) : name,
    publisher: name,
    category: 'portfolio',
    formatDetection: { telephone: true, address: true, email: true },
    alternates: { canonical: '/' },
    icons: {
      icon: [{ url: '/icon', type: 'image/svg+xml' }],
      shortcut: ['/icon'],
    },
    manifest: undefined,
  };
}

export const viewport: Viewport = {
  themeColor: '#0a0a0d',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [organization, website] = await Promise.all([organizationJsonLd(), websiteJsonLd()]);
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-[var(--color-ink-950)] text-fg antialiased [font-synthesis-weight:none]">
        <noscript>
          <div className="border-b border-[rgba(243,241,236,.12)] bg-[var(--color-ink-900)] px-4 py-2 text-center font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-fg-dim">
            JavaScript is off — the site still works; motion and the video player are reduced.
          </div>
        </noscript>
        {children}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript([organization, website]) }} />
      </body>
    </html>
  );
}
