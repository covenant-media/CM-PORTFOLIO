import type { MetadataRoute } from 'next';
import { sitemapEntries } from '@/lib/cms/content';
import { resolveSite } from '@/lib/seo/metadata';

/** Sitemap built from published pages, projects and posts (no orphan URLs). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [entries, site] = await Promise.all([sitemapEntries(), resolveSite()]);
  if (site.noindex) return [];
  return entries.map((entry) => ({
    url: `${site.origin}${entry.path === '/' ? '/' : entry.path}`,
    lastModified: entry.lastmod ? new Date(entry.lastmod) : undefined,
    changeFrequency: entry.path.split('/').length > 2 ? 'monthly' : 'weekly',
    priority: entry.priority ?? (entry.path.split('/').length > 2 ? 0.6 : 0.8),
  }));
}
