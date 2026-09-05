/**
 * Metadata builder — one entry point so every public route gets the same
 * canonical, Open Graph, Twitter and robots treatment.
 *
 * Nothing here invents copy: a page's own CMS fields (title, description, seo
 * record, cover image) win, then the shared defaults from Site settings, then a
 * description-free result rather than a fabricated one.
 */
import type { Metadata } from 'next';
import { getSettings } from '@/lib/cms/settings';
import { getDb } from '@/lib/db';
import { escapeHtml, truncate } from '@/lib/utils/text';

export interface SeoInput {
  path: string;
  title?: string | null;
  description?: string | null;
  /** absolute or root-relative; resolved against the canonical origin */
  image?: string | null;
  imageAlt?: string | null;
  type?: 'website' | 'article';
  publishedTime?: string | null;
  modifiedTime?: string | null;
  keywords?: string[];
  noindex?: boolean;
  /** skip the "%s — Brand" template (homepage, single-page experiences) */
  rawTitle?: boolean;
  /** overrides for the title tag when the CMS stored one */
  titleOverride?: string | null;
}

export interface ResolvedSite {
  origin: string;
  name: string;
  description: string | null;
  titleTemplate: string;
  noindex: boolean;
  twitter: string | null;
  ogImage: string | null;
}

/** Absolute origin: CMS value → deployment env → request host (dev). */
export async function resolveSite(request?: Request): Promise<ResolvedSite> {
  const settings = await getSettings({ includePrivate: true });
  const configured = String(settings['site.url'] ?? '').trim().replace(/\/+$/, '');
  let origin = configured;
  if (!origin) origin = (process.env.NEXT_PUBLIC_SITE_URL ?? '').trim().replace(/\/+$/, '');
  if (!origin && request) {
    const url = new URL(request.url);
    origin = `${url.protocol}//${url.host}`;
  }
  if (!origin) origin = 'http://localhost:3000';

  let ogImage: string | null = null;
  const ogAssetId = String(settings['brand.og_image'] ?? '').trim();
  if (ogAssetId) ogImage = await assetUrl(ogAssetId);

  return {
    origin,
    name: String(settings['brand.name'] || 'Covenant Media'),
    description: String(settings['seo.default_description'] || '').trim() || null,
    titleTemplate: String(settings['seo.title_template'] || '%s') || '%s',
    noindex: settings['seo.noindex'] === true || process.env.VERCEL_ENV === 'preview',
    twitter: String(settings['seo.twitter_handle'] || '').trim() || null,
    ogImage,
  };
}

async function assetUrl(id: string): Promise<string | null> {
  try {
    const db = await getDb();
    const rows = await db.select<{ url: string }>(`SELECT url FROM media_asset WHERE id = $1::text`, [id]);
    return rows[0]?.url ?? null;
  } catch {
    return null;
  }
}

export function absolute(site: ResolvedSite, path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${site.origin}${path.startsWith('/') ? path : `/${path}`}`;
}

export interface BuildOptions {
  /** which experience the page belongs to — colours the generated share card */
  division?: 'main' | 'media' | 'tech';
}

export async function buildMetadata(input: SeoInput, request?: Request, options: BuildOptions = {}): Promise<Metadata> {
  const site = await resolveSite(request);
  const path = input.path === '/' ? '/' : input.path.replace(/\/+$/, '');
  const title = (input.titleOverride || input.title || site.name).trim();
  const description = truncate((input.description || site.description || '').trim(), 158) || undefined;
  const isHome = path === '/';

  const metadata: Metadata = {
    title: isHome || input.rawTitle ? title : { absolute: applyTemplate(site.titleTemplate, title) },
    description,
    keywords: input.keywords?.length ? input.keywords.slice(0, 12) : undefined,
    alternates: {
      canonical: path,
      types: { 'application/rss+xml': [{ url: '/feed.xml', title: 'Covenant Media — feed' }] },
    },
    openGraph: {
      type: input.type === 'article' ? 'article' : 'website',
      url: absolute(site, path),
      siteName: site.name,
      title: isHome ? title : applyTemplate(site.titleTemplate, title),
      description,
      images: [
        {
          url: shareImage(site, input, title, options.division ?? 'main'),
          width: 1200,
          height: 630,
          alt: input.imageAlt ? escapeHtml(input.imageAlt) : `${title} — ${site.name}`,
        },
      ],
      ...(input.type === 'article' && input.publishedTime
        ? { publishedTime: input.publishedTime, modifiedTime: input.modifiedTime ?? input.publishedTime }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      site: site.twitter ?? undefined,
      creator: site.twitter ?? undefined,
      title: applyTemplate(site.titleTemplate, title),
      description,
    },
    robots: {
      index: !(site.noindex || input.noindex),
      follow: true,
      googleBot: { index: !(site.noindex || input.noindex), follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
    },
    other: input.type === 'article' && input.publishedTime ? { 'article:published_time': input.publishedTime } : undefined,
  };

  return metadata;
}

/**
 * Share image: the page's own image if the CMS has one, otherwise a card
 * generated on demand at /api/og (no binary assets committed, always current).
 */
function shareImage(site: ResolvedSite, input: SeoInput, title: string, division: 'main' | 'media' | 'tech'): string {
  const explicit = input.image ?? site.ogImage;
  if (explicit) return absolute(site, explicit);
  const params = new URLSearchParams({ title: title.slice(0, 90), d: division });
  if (site.name) params.set('brand', site.name);
  return `${site.origin}/api/og?${params.toString()}`;
}

function applyTemplate(template: string, title: string): string {
  if (!template.includes('%s')) return title;
  if (title === template.replace('%s', '').replace(/[—–-]\s*$/, '').trim()) return title;
  return template.replace('%s', title);
}

/** Per-page SEO overrides stored in `seo_record` / the page's seo JSON. */
export function seoRecordToInput(seo: Record<string, unknown> | undefined, path: string): Partial<SeoInput> {
  if (!seo) return { path };
  return {
    path,
    titleOverride: seo.title ? String(seo.title) : undefined,
    description: seo.description ? String(seo.description) : undefined,
    noindex: seo.noindex === true || seo.robots === 'noindex,nofollow',
    keywords: Array.isArray(seo.keywords) ? (seo.keywords as unknown[]).map(String) : undefined,
    image: seo.og_image ? String(seo.og_image) : seo.ogImage ? String(seo.ogImage) : undefined,
  };
}
