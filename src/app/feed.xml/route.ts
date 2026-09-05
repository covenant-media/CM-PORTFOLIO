import { getDb } from '@/lib/db';
import { resolveSite } from '@/lib/seo/metadata';
import { escapeHtml } from '@/lib/utils/text';

/** RSS 2.0 for published blog posts — plain XML, no dependency. */
export const dynamic = 'force-dynamic';

export async function GET() {
  const [site, rows] = await Promise.all([
    resolveSite(),
    getDb()
      .then((db) =>
        db.select<Record<string, unknown>>(
          `SELECT title, slug, excerpt, published_at, category FROM blog_post
            WHERE status = 'published' ORDER BY COALESCE(published_at, created_at) DESC LIMIT 30`,
        ),
      )
      .catch(() => [] as Record<string, unknown>[]),
  ]);
  const items = rows
    .map((row) => {
      const url = `${site.origin}/blog/${row.slug}`;
      const date = row.published_at ? new Date(String(row.published_at)).toUTCString() : '';
      return `    <item>
      <title>${escapeHtml(String(row.title ?? ''))}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      ${row.category ? `<category>${escapeHtml(String(row.category))}</category>` : ''}
      ${date ? `<pubDate>${date}</pubDate>` : ''}
      <description>${escapeHtml(String(row.excerpt ?? ''))}</description>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeHtml(site.name)}</title>
    <link>${site.origin}</link>
    <description>${escapeHtml(site.description ?? '')}</description>
    <language>en</language>
    <atom:link href="${site.origin}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'content-type': 'application/rss+xml; charset=utf-8',
      'cache-control': 'public, max-age=1800, s-maxage=1800',
    },
  });
}
