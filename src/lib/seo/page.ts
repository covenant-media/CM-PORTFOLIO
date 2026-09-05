/**
 * Route-level SEO: resolve a page's metadata from the CMS (page record +
 * seo_record) and fall back to Site settings. Never invents a description.
 */
import type { Metadata } from 'next';
import { pageBySlug, projectBySlug, postBySlug } from '@/lib/cms/content';
import { buildMetadata, seoRecordToInput, type BuildOptions } from './metadata';

interface PageSeoOptions extends BuildOptions {
  path: string;
  /** CMS page slug; defaults to the path without a leading slash */
  slug?: string;
  title: string;
  description?: string | null;
  request?: Request;
}

export async function pageMetadata({ path, slug, title, description, division, request }: PageSeoOptions): Promise<Metadata> {
  const key = slug ?? (path === '/' ? 'home' : path.replace(/^\/+/, ''));
  const page = await pageBySlug(key);
  const seo = (page.seo ?? {}) as Record<string, unknown>;
  return buildMetadata(
    {
      ...seoRecordToInput(seo, path),
      path,
      title: (seo.title as string) || page.title || title,
      description: (seo.description as string) || page.description || description || null,
      image: seo.og_asset_url ? String(seo.og_asset_url) : undefined,
      keywords: seo.keywords ? (seo.keywords as unknown[]).map(String) : undefined,
      noindex: seo.no_index === true,
      rawTitle: path === '/',
    },
    request,
    { division },
  );
}

export async function projectMetadata(division: 'media' | 'tech', slug: string, request?: Request): Promise<Metadata> {
  const path = division === 'tech' ? `/tech/projects/${slug}` : `/media/work/${slug}`;
  const project = await projectBySlug(slug, division);
  if (!project) {
    return buildMetadata({ path, title: 'Project', description: null, noindex: true }, request, { division });
  }
  const seo = (project.seo ?? {}) as Record<string, unknown>;
  return buildMetadata(
    {
      ...seoRecordToInput(seo, path),
      path,
      title: project.title,
      description: project.summary,
      image: project.cover?.url ?? project.gallery.find((item) => item.asset?.url)?.asset?.url ?? null,
      imageAlt: project.cover?.alt ?? project.title,
      type: 'article',
      publishedTime: project.publishedAt,
      keywords: [project.categoryLabel, ...project.technologies.slice(0, 6), project.division === 'tech' ? 'software' : 'film'].filter(Boolean) as string[],
    },
    request,
    { division },
  );
}

export async function postMetadata(slug: string, request?: Request): Promise<Metadata> {
  const path = `/blog/${slug}`;
  const post = await postBySlug(slug);
  if (!post) return buildMetadata({ path, title: 'Article', noindex: true }, request);
  const seo = (post.seo ?? {}) as Record<string, unknown>;
  return buildMetadata(
    {
      ...seoRecordToInput(seo, path),
      path,
      title: post.title,
      description: post.excerpt,
      image: post.cover?.url ?? null,
      imageAlt: post.cover?.alt ?? post.title,
      type: 'article',
      publishedTime: post.publishedAt,
      keywords: post.tags,
    },
    request,
    { division: post.division === 'media' || post.division === 'tech' ? post.division : 'main' },
  );
}
