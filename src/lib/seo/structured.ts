/**
 * Structured data. Every object is generated from CMS content, so nothing is
 * asserted that the owner has not actually entered — no fake aggregate ratings,
 * no invented logos, no claims of certification bodies.
 */
import { getSettings } from '@/lib/cms/settings';
import { resolveSite, type ResolvedSite } from './metadata';
import type { PostDetail, ProjectDetail } from '@/lib/types/content';

type Json = Record<string, unknown>;

async function site(): Promise<ResolvedSite> {
  return resolveSite();
}

export async function organizationJsonLd(): Promise<Json> {
  const meta = await site();
  const settings = await getSettings({ includePrivate: true });
  const logo = String(settings['seo.organization_logo'] ?? '').trim();
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${meta.origin}/#organization`,
    name: settings['brand.name'] ? String(settings['brand.name']) : 'Covenant Media',
    url: meta.origin,
    ...(settings['brand.legal_name'] ? { legalName: String(settings['brand.legal_name']) } : {}),
    ...(settings['founder.name'] ? { founder: { '@type': 'Person', name: String(settings['founder.name']) } } : {}),
    ...(logo ? { logo: { '@type': 'ImageObject', url: logo } } : {}),
    description: settings['seo.default_description'] ? String(settings['seo.default_description']) : undefined,
    sameAs: await verifiedSocialLinks(),
  };
}

/** Social profiles are only linked to search engines once verified in the CMS. */
async function verifiedSocialLinks(): Promise<string[]> {
  try {
    const { getDb } = await import('@/lib/db');
    const db = await getDb();
    const rows = await db.select<{ url: string }>(
      `SELECT url FROM social_link WHERE status = 'published' AND is_verified = TRUE ORDER BY sort_order ASC`,
    );
    return rows.map((row) => row.url).filter(Boolean).slice(0, 10);
  } catch {
    return [];
  }
}

export async function websiteJsonLd(): Promise<Json> {
  const meta = await site();
  const settings = await getSettings({ includePrivate: true });
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${meta.origin}/#website`,
    url: meta.origin,
    name: settings['brand.name'] ? String(settings['brand.name']) : 'Covenant Media',
    ...(settings['brand.tagline'] ? { alternateName: String(settings['brand.tagline']) } : {}),
    publisher: { '@id': `${meta.origin}/#organization` },
    inLanguage: 'en',
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[], origin = ''): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${origin}${item.path.startsWith('/') ? item.path : `/${item.path}`}`,
    })),
  };
}

export function projectJsonLd(project: ProjectDetail, meta: ResolvedSite, path: string): Json {
  const base: Json = {
    '@context': 'https://schema.org',
    '@type': project.division === 'tech' ? 'SoftwareApplication' : 'CreativeWork',
    name: project.title,
    description: project.summary ?? undefined,
    url: `${meta.origin}${path}`,
    ...(project.publishedAt ? { datePublished: project.publishedAt } : {}),
    ...(project.year ? { dateCreated: `${project.year}` } : {}),
    ...(project.cover?.url ? { image: project.cover.url, thumbnail: project.cover.url } : {}),
    ...(project.categoryLabel ? { genre: project.categoryLabel } : {}),
    ...(project.role ? { creator: { '@type': 'Person', name: project.role } } : {}),
  };
  if (project.division === 'tech') {
    base.applicationCategory = 'DeveloperApplication';
    if (project.liveUrl) base.url = project.liveUrl;
    if (project.repoUrl) base.codeRepository = project.repoUrl;
  }
  if (project.gallery.some((item) => item.asset?.url)) {
    base.image = project.gallery.map((item) => item.asset?.url).filter(Boolean);
  }
  return base;
}

export function postJsonLd(post: PostDetail, meta: ResolvedSite, path: string): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt ?? undefined,
    url: `${meta.origin}${path}`,
    inLanguage: 'en',
    author: { '@type': 'Person', name: post.authorName ?? 'Covenant Nsikan' },
    publisher: { '@id': `${meta.origin}/#organization` },
    ...(post.publishedAt ? { datePublished: post.publishedAt, dateModified: post.publishedAt } : {}),
    ...(post.cover?.url ? { image: post.cover.url } : {}),
    ...(post.tags.length ? { keywords: post.tags.join(', ') } : {}),
  };
}

export function faqJsonLd(items: { question: string; answer: string }[], meta: ResolvedSite, path: string): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
    url: `${meta.origin}${path}`,
  };
}

export function personJsonLd(input: { name: string; jobTitle?: string | null; description?: string | null; image?: string | null; links?: string[] }, meta: ResolvedSite): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${meta.origin}/#person`,
    name: input.name,
    ...(input.jobTitle ? { jobTitle: input.jobTitle } : {}),
    ...(input.description ? { description: input.description } : {}),
    ...(input.image ? { image: input.image } : {}),
    url: meta.origin,
    ...(input.links?.length ? { sameAs: input.links } : {}),
    worksFor: { '@id': `${meta.origin}/#organization` },
  };
}

/** Service list, only including services that actually exist in the CMS. */
export function servicesJsonLd(services: { name: string; description: string | null; path: string }[], meta: ResolvedSite): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Services',
    itemListElement: services.map((service, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: service.name,
      url: `${meta.origin}${service.path}`,
    })),
  };
}

/** Renders a <script type="application/ld+json"> block safely. */
export function jsonLdScript(data: Json | Json[]): string {
  const list = Array.isArray(data) ? data : [data];
  return JSON.stringify(list.length === 1 ? list[0] : { '@graph': list }).replace(/</g, '\\u003c');
}
