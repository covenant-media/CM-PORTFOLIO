import type { MetadataRoute } from 'next';
import { resolveSite } from '@/lib/seo/metadata';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const site = await resolveSite();
  const disallow = ['/', '/admin', '/api', '/tech/resume'];
  return {
    rules: site.noindex
      ? [{ userAgent: '*', disallow: ['/'] }]
      : [
          {
            userAgent: '*',
            // Every experience is indexable; the CMS, API and the raw résumé
            // download are not (the résumé has personal contact details).
            disallow: ['/admin', '/api', '/tech/resume'],
            allow: ['/', '/media', '/tech', '/blog'],
          },
        ],
    sitemap: `${site.origin}/sitemap.xml`,
    host: site.origin,
  };
}
