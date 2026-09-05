/**
 * Public content loaders.
 *
 * Every read used by the three public experiences flows through here so pages
 * never talk to SQL directly. Results are cached per tag and invalidated by the
 * CMS on write (revalidateTag('content')). Errors degrade to empty states —
 * a missing row must never crash a public page.
 */
import { unstable_cache } from 'next/cache';
import { getDb } from '../db';
import { getSettings } from './settings';
import { MEDIA_CATEGORIES, TECH_CATEGORIES, SKILL_CATEGORIES, VIDEO_FORM_OPTIONS } from './options';
import { aspectForForm } from '../media/video';
import { normaliseAsset } from '../media/storage';
import { formatDate, humanize, readingTime, truncate } from '../utils/text';
import { markdownExcerpt } from '../utils/markdown';
import type {
  AssetRef,
  CertificationItem,
  ExperienceEntry,
  GalleryItem,
  NavItem,
  PageData,
  PostCard,
  PostDetail,
  PricingPackage,
  ProjectCard,
  ProjectDetail,
  ResumeInfo,
  SectionData,
  ServiceItem,
  SiteContext,
  SkillItem,
  SocialItem,
  TeamItem,
  TestimonialItem,
  VideoRef,
} from '../types/content';

function memo<T>(name: string, args: unknown[], fn: () => Promise<T>): Promise<T> {
  const key = `${name}:${JSON.stringify(args ?? [])}`;
  return unstable_cache(fn, [key], { tags: ['content', `content:${name}`], revalidate: 300 })();
}

function labelFor(options: readonly { value: string; label: string }[], value: string | null | undefined): string | null {
  if (!value) return null;
  return options.find((o) => o.value === value)?.label ?? humanize(value);
}

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') console.warn('[content]', (err as Error).message?.slice(0, 160));
    return fallback;
  }
}

// ── assets ──────────────────────────────────────────────────────────────────

export async function assetsByIds(ids: (string | null | undefined)[]): Promise<Record<string, AssetRef>> {
  const unique = Array.from(new Set(ids.filter((v): v is string => typeof v === 'string' && v.length > 0))).slice(0, 600);
  if (!unique.length) return {};
  return safe(async () => {
    const db = await getDb();
    const placeholders = unique.map((_, i) => `$${i + 1}::text`).join(', ');
    const rows = await db.select<Record<string, unknown>>(`SELECT * FROM media_asset WHERE id IN (${placeholders})`, unique);
    const out: Record<string, AssetRef> = {};
    for (const raw of rows) {
      const row = normaliseAsset(raw);
      out[String(row.id)] = {
        id: String(row.id),
        url: (row.url as string) ?? '',
        alt: (row.alt as string) ?? null,
        width: row.width == null ? null : Number(row.width),
        height: row.height == null ? null : Number(row.height),
        kind: (row.kind as string) ?? 'image',
        variants: (row.variants as AssetRef['variants']) ?? {},
        blur: (row.blur_data as string) ?? null,
        caption: (row.caption as string) ?? null,
      };
    }
    return out;
  }, {});
}

// ── videos ──────────────────────────────────────────────────────────────────

function toVideoRef(row: Record<string, unknown>, assets: Record<string, AssetRef>): VideoRef {
  const posterAsset = row.poster_asset_id ? assets[String(row.poster_asset_id)] : undefined;
  const fileAsset = row.file_asset_id ? assets[String(row.file_asset_id)] : undefined;
  const form = (row.form as string) ?? null;
  const source = String(row.source ?? 'external');
  return {
    id: String(row.id),
    title: String(row.title ?? 'Untitled'),
    description: (row.description as string) ?? null,
    source,
    sourceUrl: (row.source_url as string) ?? null,
    embedUrl: (row.embed_url as string) ?? null,
    posterUrl: posterAsset?.url ?? (row.poster_url as string) ?? null,
    posterAssetId: (row.poster_asset_id as string) ?? null,
    fileUrl: fileAsset?.url ?? null,
    durationS: row.duration_s == null ? null : Number(row.duration_s),
    form,
    vertical: form === 'short_form' || source === 'tiktok',
    externalUrl: (row.external_url as string) ?? (row.source_url as string) ?? null,
    aspect: aspectForForm(form),
  };
}

export async function videosByIds(ids: string[]): Promise<VideoRef[]> {
  if (!ids.length) return [];
  const db = await getDb();
  const placeholders = ids.map((_, i) => `$${i + 1}::text`).join(', ');
  const rows = await db.select<Record<string, unknown>>(`SELECT * FROM media_video WHERE id IN (${placeholders})`, ids);
  const assets = await assetsByIds(rows.map((r) => (r.poster_asset_id as string) ?? null));
  return rows.map((row) => toVideoRef(row, assets));
}

async function videosForProjects(projectIds: string[], limitPerProject = 12): Promise<Record<string, VideoRef[]>> {
  if (!projectIds.length) return {};
  return safe(async () => {
    const db = await getDb();
    const placeholders = projectIds.map((_, i) => `$${i + 1}::text`).join(', ');
    const rows = await db.select<Record<string, unknown>>(
      `SELECT * FROM media_video
        WHERE project_id IN (${placeholders}) AND status = 'published'
        ORDER BY sort_order ASC, created_at DESC`,
      projectIds,
    );
    const assets = await assetsByIds(rows.map((r) => (r.poster_asset_id as string) ?? null));
    const grouped: Record<string, VideoRef[]> = {};
    for (const row of rows) {
      const pid = String(row.project_id ?? '');
      grouped[pid] = grouped[pid] ?? [];
      if (grouped[pid].length < limitPerProject) grouped[pid].push(toVideoRef(row, assets));
    }
    return grouped;
  }, {});
}

export function featuredVideos(input: { limit?: number; form?: string | null; source?: string | null } = {}): Promise<VideoRef[]> {
  const limit = Math.min(input.limit ?? 12, 40);
  return memo('videos.featured', [limit, input.form, input.source], () =>
    safe(async () => {
      const db = await getDb();
      const where: string[] = ["status = 'published'"];
      const params: unknown[] = [];
      if (input.form) {
        params.push(input.form);
        where.push(`form = $${params.length}::text`);
      }
      if (input.source) {
        params.push(input.source);
        where.push(`source = $${params.length}::text`);
      }
      const rows = await db.select<Record<string, unknown>>(
        `SELECT * FROM media_video WHERE ${where.join(' AND ')}
          ORDER BY is_featured DESC NULLS LAST, sort_order ASC, created_at DESC LIMIT ${limit}`,
        params,
      );
      const assets = await assetsByIds(rows.map((r) => (r.poster_asset_id as string) ?? null));
      return rows.map((row) => toVideoRef(row, assets));
    }, [] as VideoRef[]),
  );
}

// ── projects ────────────────────────────────────────────────────────────────

interface ProjectRowOptions {
  division?: 'media' | 'tech';
  featured?: boolean;
  category?: string | null;
  form?: string | null;
  limit?: number;
  offset?: number;
  includeDrafts?: boolean;
  q?: string;
}

async function projectRows(opts: ProjectRowOptions): Promise<{ rows: Record<string, unknown>[]; total: number }> {
  const db = await getDb();
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.division) {
    params.push(opts.division);
    where.push(`division = $${params.length}::text`);
  }
  if (!opts.includeDrafts) where.push(`status = 'published'`);
  if (opts.featured) where.push('is_featured = TRUE');
  if (opts.category) {
    params.push(opts.category);
    where.push(`category = $${params.length}::text`);
  }
  if (opts.form) {
    params.push(opts.form);
    where.push(`form = $${params.length}::text`);
  }
  if (opts.q) {
    params.push(`%${opts.q.slice(0, 60)}%`);
    where.push(`(title ILIKE $${params.length}::text OR summary ILIKE $${params.length}::text OR client ILIKE $${params.length}::text)`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const limit = Math.min(opts.limit ?? 24, 120);
  const offset = Math.max(opts.offset ?? 0, 0);
  const rows = await db.select<Record<string, unknown>>(
    `SELECT * FROM project ${whereSql}
      ORDER BY is_featured DESC NULLS LAST, sort_order ASC, COALESCE(event_date, published_at, created_at) DESC
      LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const countRows = await db.select<{ n: number | string }>(`SELECT count(*)::int AS n FROM project ${whereSql}`, params);
  return { rows, total: Number(countRows[0]?.n ?? 0) };
}

export function projectCards(input: ProjectRowOptions = {}): Promise<{ cards: ProjectCard[]; total: number }> {
  return memo('projects.list', [input], async () => {
    const result = await safe(async () => {
      const { rows, total } = await projectRows(input);
      const assetIds = rows.map((r) => (r.cover_asset_id as string) ?? null);
      const assets = await assetsByIds(assetIds);
      const videos = await videosForProjects(rows.map((r) => String(r.id)));
      const cards: ProjectCard[] = rows.map((row) => {
        const options = row.division === 'tech' ? TECH_CATEGORIES : MEDIA_CATEGORIES;
        const linksRaw = Array.isArray(row.external_links) ? (row.external_links as Record<string, unknown>[]) : [];
        return {
          id: String(row.id),
          slug: String(row.slug),
          division: row.division as 'media' | 'tech',
          title: String(row.title ?? ''),
          summary: (row.summary as string) ?? null,
          category: (row.category as string) ?? null,
          categoryLabel: labelFor(options, (row.category as string) ?? null),
          form: (row.form as string) ?? null,
          year: row.year == null ? null : Number(row.year),
          client: row.client_public === false ? null : ((row.client as string) ?? null),
          role: (row.role as string) ?? null,
          location: (row.location as string) ?? null,
          durationLabel: (row.duration_label as string) ?? null,
          cover: row.cover_asset_id ? (assets[String(row.cover_asset_id)] ?? null) : null,
          accent: (row.accent as string) ?? null,
          isSample: row.is_sample === true,
          technologies: asStrings(row.technologies),
          services: asStrings(row.services),
          videoCount: videos[String(row.id)]?.length ?? 0,
          videos: videos[String(row.id)] ?? [],
          links: linksRaw.map((l) => ({ label: String(l.label ?? 'Link'), url: String(l.url ?? ''), kind: (l.kind as string) ?? undefined })),
          repoUrl: (row.repo_url as string) ?? null,
          liveUrl: (row.live_url as string) ?? null,
        };
      });
      return { cards, total };
    }, { cards: [] as ProjectCard[], total: 0 });
    return result;
  });
}

function asStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v) => typeof v === 'string' && v.trim()).map((v) => String(v));
}

export function projectBySlug(slug: string, division?: 'media' | 'tech'): Promise<ProjectDetail | null> {
  return safe(() => memo('project.detail', [slug, division], async () => {
      const db = await getDb();
      const params: unknown[] = [slug];
      let sql = 'SELECT * FROM project WHERE slug = $1::text AND status = $2::text';
      params.push('published');
      if (division) {
        params.push(division);
        sql += ` AND division = $${params.length}::text`;
      }
      const rows = await db.select<Record<string, unknown>>(sql, params);
      const row = rows[0];
      if (!row) return null;

      const gallery = Array.isArray(row.gallery) ? (row.gallery as Record<string, unknown>[]) : [];
      const assetIds = [row.cover_asset_id as string, ...gallery.map((g) => g.asset_id as string)];
      const assets = await assetsByIds(assetIds.filter(Boolean));
      const videosByProject = await videosForProjects([String(row.id)], 24);
      const videos = videosByProject[String(row.id)] ?? [];
      const heroVideo = row.hero_video_id ? (videos.find((v) => v.id === String(row.hero_video_id)) ?? (await videosByIds([String(row.hero_video_id)]))[0] ?? null) : (videos[0] ?? null);
      const options = row.division === 'tech' ? TECH_CATEGORIES : MEDIA_CATEGORIES;
      const metrics = (Array.isArray(row.metrics) ? (row.metrics as Record<string, unknown>[]) : []).filter((m) => m.verified === true);

      return {
        id: String(row.id),
        slug: String(row.slug),
        division: row.division as 'media' | 'tech',
        title: String(row.title ?? ''),
        summary: (row.summary as string) ?? null,
        category: (row.category as string) ?? null,
        categoryLabel: labelFor(options, (row.category as string) ?? null),
        form: (row.form as string) ?? null,
        year: row.year == null ? null : Number(row.year),
        client: row.client_public === false ? null : ((row.client as string) ?? null),
        role: (row.role as string) ?? null,
        location: (row.location as string) ?? null,
        durationLabel: (row.duration_label as string) ?? null,
        cover: row.cover_asset_id ? (assets[String(row.cover_asset_id)] ?? null) : null,
        accent: (row.accent as string) ?? null,
        isSample: row.is_sample === true,
        technologies: asStrings(row.technologies),
        services: asStrings(row.services),
        videoCount: videos.length,
        videos,
        links: (Array.isArray(row.external_links) ? (row.external_links as Record<string, unknown>[]) : []).map((l) => ({
          label: String(l.label ?? 'Link'),
          url: String(l.url ?? ''),
          kind: (l.kind as string) ?? undefined,
        })),
        repoUrl: (row.repo_url as string) ?? null,
        liveUrl: (row.live_url as string) ?? null,
        problem: (row.problem as string) ?? null,
        solution: (row.solution as string) ?? null,
        outcomes: asStrings(row.outcomes),
        deliverables: asStrings(row.deliverables),
        tools: asStrings(row.tools),
        credits: (Array.isArray(row.credits) ? (row.credits as Record<string, unknown>[]) : []).map((c) => ({ role: String(c.role ?? ''), name: (c.name as string) ?? null })),
        metrics: metrics.map((m) => ({ label: String(m.label ?? ''), value: String(m.value ?? '') })),
        gallery: gallery.map((g) => ({
          asset: g.asset_id ? (assets[String(g.asset_id)] ?? null) : null,
          assetId: (g.asset_id as string) ?? null,
          caption: (g.caption as string) ?? null,
          alt: (g.alt as string) ?? null,
        })),
        heroVideo,
        seo: (row.seo as Record<string, unknown>) ?? {},
        publishedAt: (row.published_at as string) ?? null,
        eventDate: (row.event_date as string) ?? null,
      } satisfies ProjectDetail;
    }), null);
}

export function relatedProjects(slug: string, division: 'media' | 'tech', category: string | null, limit = 3): Promise<ProjectCard[]> {
  return memo('projects.related', [slug, division, category, limit], async () =>
    safe(async () => {
      const db = await getDb();
      const params: unknown[] = [division, slug];
      let sql = `SELECT * FROM project WHERE division = $1::text AND status = 'published' AND slug <> $2::text`;
      if (category) {
        params.push(category);
        sql += ` AND category = $${params.length}::text`;
      }
      sql += ` ORDER BY is_featured DESC NULLS LAST, sort_order ASC LIMIT ${Math.min(limit, 12)}`;
      const rows = await db.select<Record<string, unknown>>(sql, params);
      if (!rows.length && category) return (await projectCards({ division, limit })).cards.filter((c) => c.slug !== slug).slice(0, limit);
      const assets = await assetsByIds(rows.map((r) => (r.cover_asset_id as string) ?? null));
      const videos = await videosForProjects(rows.map((r) => String(r.id)));
      const options = division === 'tech' ? TECH_CATEGORIES : MEDIA_CATEGORIES;
      return rows.map((row) => ({
        id: String(row.id),
        slug: String(row.slug),
        division,
        title: String(row.title ?? ''),
        summary: (row.summary as string) ?? null,
        category: (row.category as string) ?? null,
        categoryLabel: labelFor(options, (row.category as string) ?? null),
        form: (row.form as string) ?? null,
        year: row.year == null ? null : Number(row.year),
        client: row.client_public === false ? null : ((row.client as string) ?? null),
        role: (row.role as string) ?? null,
        location: null,
        durationLabel: null,
        cover: row.cover_asset_id ? (assets[String(row.cover_asset_id)] ?? null) : null,
        accent: null,
        isSample: row.is_sample === true,
        technologies: asStrings(row.technologies),
        services: asStrings(row.services),
        videoCount: videos[String(row.id)]?.length ?? 0,
        videos: videos[String(row.id)] ?? [],
        links: [],
        repoUrl: (row.repo_url as string) ?? null,
        liveUrl: (row.live_url as string) ?? null,
      })) satisfies ProjectCard[];
    }, [] as ProjectCard[]),
  );
}

/** Filter chips + counts for a portfolio index. */
export function projectFacets(division: 'media' | 'tech'): Promise<{ key: 'category' | 'form'; label: string; value: string; count: number }[]> {
  return memo('projects.facets', [division], async () =>
    safe(async () => {
      const db = await getDb();
      const rows = await db.select<{ key: string; value: string; count: number | string }>(
        `SELECT 'category' AS key, category AS value, count(*)::int AS count FROM project WHERE division = $1::text AND status = 'published' AND category IS NOT NULL GROUP BY category
         UNION ALL
         SELECT 'form' AS key, form AS value, count(*)::int AS count FROM project WHERE division = $1::text AND status = 'published' AND form IS NOT NULL GROUP BY form
         ORDER BY count DESC`,
        [division],
      );
      const options = division === 'tech' ? TECH_CATEGORIES : MEDIA_CATEGORIES;
      return rows
        .filter((r) => r.value)
        .map((r) => ({
          key: r.key as 'category' | 'form',
          label: r.key === 'category' ? (labelFor(options, r.value) ?? humanize(r.value)) : (labelFor(VIDEO_FORM_OPTIONS, r.value) ?? humanize(r.value)),
          value: r.value as string,
          count: Number(r.count),
        }));
    }, []),
  );
}

// ── services, testimonials, team ────────────────────────────────────────────

export function servicesFor(divisions: string[]): Promise<ServiceItem[]> {
  return memo('services.list', [divisions], () =>
    safe(async () => {
      const db = await getDb();
      const placeholders = divisions.map((_, i) => `$${i + 1}::text`).join(', ');
      const rows = await db.select<Record<string, unknown>>(
        `SELECT * FROM service WHERE status = 'published' AND division IN (${placeholders}) ORDER BY is_featured DESC NULLS LAST, sort_order ASC, title ASC`,
        divisions,
      );
      const assets = await assetsByIds(rows.map((r) => (r.hero_asset as string) ?? null));
      const { renderMarkdown } = await import('../utils/markdown');
      return rows.map((row) => ({
        id: String(row.id),
        slug: String(row.slug),
        division: String(row.division),
        title: String(row.title ?? ''),
        summary: (row.summary as string) ?? null,
        descriptionHtml: renderMarkdown((row.description as string) ?? ''),
        bullets: asStrings(row.bullets),
        deliverables: asStrings(row.deliverables),
        tools: asStrings(row.tools),
        process: (Array.isArray(row.process) ? (row.process as Record<string, unknown>[]) : []).map((p) => ({
          title: String(p.title ?? ''),
          description: (p.description as string) ?? null,
          duration: (p.duration as string) ?? null,
        })),
        priceNote: (row.price_note as string) ?? null,
        ctaLabel: (row.cta_label as string) ?? null,
        ctaHref: (row.cta_href as string) ?? null,
        hero: row.hero_asset ? (assets[String(row.hero_asset)] ?? null) : null,
        isSample: row.is_sample === true,
      })) satisfies ServiceItem[];
    }, [] as ServiceItem[]),
  );
}

export function testimonialsFor(division: string, limit = 6): Promise<TestimonialItem[]> {
  return memo('testimonials', [division, limit], async () =>
    safe(async () => {
      const db = await getDb();
      const rows = await db.select<Record<string, unknown>>(
        `SELECT t.*, p.title AS project_title FROM testimonial t
           LEFT JOIN project p ON p.id = t.project_id
          WHERE t.status = 'published' AND (t.division = $1::text OR $1::text = 'all')
          ORDER BY t.is_featured DESC NULLS LAST, t.sort_order ASC LIMIT ${Math.min(limit, 40)}`,
        [division],
      );
      const assets = await assetsByIds(rows.map((r) => (r.avatar_asset_id as string) ?? null));
      const settings = await getSettings();
      const showSamples = settings['system.show_sample_badges'] !== false;
      return rows.map((row) => ({
        id: String(row.id),
        quote: String(row.quote ?? ''),
        authorName: (row.author_name as string) ?? null,
        authorRole: (row.author_role as string) ?? null,
        authorOrg: (row.author_org as string) ?? null,
        location: (row.location as string) ?? null,
        avatar: row.avatar_asset_id ? (assets[String(row.avatar_asset_id)] ?? null) : null,
        rating: row.rating == null ? null : Number(row.rating),
        isSample: showSamples && row.is_sample === true,
        projectTitle: (row.project_title as string) ?? null,
      })) satisfies TestimonialItem[];
    }, [] as TestimonialItem[]),
  );
}

export function teamFor(division: string): Promise<TeamItem[]> {
  return memo('team', [division], () =>
    safe(async () => {
      const db = await getDb();
      const rows = await db.select<Record<string, unknown>>(
        `SELECT * FROM team_member WHERE status = 'published' AND is_visible = TRUE AND (division = $1::text OR $1::text = 'all') ORDER BY is_founder DESC NULLS LAST, sort_order ASC`,
        [division],
      );
      const assets = await assetsByIds(rows.map((r) => (r.avatar_asset_id as string) ?? null));
      return rows.map((row) => ({
        id: String(row.id),
        name: String(row.name ?? ''),
        role: (row.role as string) ?? null,
        bio: (row.bio as string) ?? null,
        isFounder: row.is_founder === true,
        isPlaceholder: row.is_placeholder === true,
        focus: asStrings(row.focus),
        avatar: row.avatar_asset_id ? (assets[String(row.avatar_asset_id)] ?? null) : null,
        links: (Array.isArray(row.links) ? (row.links as Record<string, unknown>[]) : []).map((l) => ({ label: String(l.label ?? ''), url: String(l.url ?? '') })),
      })) satisfies TeamItem[];
    }, [] as TeamItem[]),
  );
}

// ── blog ─────────────────────────────────────────────────────────────────────

function postRowToCard(row: Record<string, unknown>, cover: AssetRef | null): PostCard {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title ?? ''),
    excerpt: (row.excerpt as string) ?? markdownExcerpt((row.body as string) ?? '', 180),
    category: (row.category as string) ?? null,
    tags: asStrings(row.tags),
    division: String(row.division ?? 'main'),
    authorName: (row.author_name as string) ?? 'Covenant Nsikan',
    publishedAt: (row.published_at as string) ?? null,
    readingMinutes: row.reading_minutes == null ? readingTime((row.body as string) ?? '') : Number(row.reading_minutes),
    cover,
    isSample: row.is_sample === true,
  };
}

export function postsFor(input: { divisions?: string[]; limit?: number; offset?: number; exclude?: string; tag?: string | null; featured?: boolean } = {}): Promise<{ posts: PostCard[]; total: number }> {
  const divisions = input.divisions ?? ['main', 'media', 'tech'];
  const limit = Math.min(input.limit ?? 9, 60);
  return memo('posts.list', [divisions, limit, input.offset, input.exclude, input.tag, input.featured], async () =>
    safe(async () => {
      const db = await getDb();
      const placeholders = divisions.map((_, i) => `$${i + 1}::text`).join(', ');
      const params: unknown[] = [...divisions];
      let where = `status = 'published' AND division IN (${placeholders}) AND (published_at IS NULL OR published_at <= now())`;
      if (input.tag) {
        params.push(input.tag);
        where += ` AND tags::text ILIKE $${params.length}::text`;
      }
      if (input.featured) where += ' AND is_featured = TRUE';
      const rows = await db.select<Record<string, unknown>>(
        `SELECT * FROM blog_post WHERE ${where} ORDER BY COALESCE(published_at, created_at) DESC LIMIT ${limit} OFFSET ${Math.max(input.offset ?? 0, 0)}`,
        params,
      );
      const totalRows = await db.select<{ n: number | string }>(`SELECT count(*)::int AS n FROM blog_post WHERE ${where}`, params);
      const assets = await assetsByIds(rows.map((r) => (r.cover_asset_id as string) ?? null));
      return {
        posts: rows.map((row) => postRowToCard(row, row.cover_asset_id ? (assets[String(row.cover_asset_id)] ?? null) : null)),
        total: Number(totalRows[0]?.n ?? 0),
      };
    }, { posts: [] as PostCard[], total: 0 }),
  );
}

export function postBySlug(slug: string): Promise<PostDetail | null> {
  return safe(() => memo('post.detail', [slug], async () => {
      const db = await getDb();
      const rows = await db.select<Record<string, unknown>>('SELECT * FROM blog_post WHERE slug = $1::text AND status = $2::text', [slug, 'published']);
      const row = rows[0];
      if (!row) return null;
      const { renderMarkdown } = await import('../utils/markdown');
      const assets = await assetsByIds([(row.cover_asset_id as string) ?? null]);
      const relatedIds = Array.isArray(row.related_project_ids) ? (row.related_project_ids as string[]).slice(0, 3) : [];
      const related = relatedIds.length
        ? (await projectCards({ limit: 12 })).cards.filter((card) => relatedIds.includes(card.id))
        : [];
      const bodyHtml = (row.body_html as string) || renderMarkdown((row.body as string) ?? '');
      return {
        ...postRowToCard(row, row.cover_asset_id ? (assets[String(row.cover_asset_id)] ?? null) : null),
        bodyHtml,
        body: (row.body as string) ?? null,
        relatedProjects: related,
        seo: (row.seo as Record<string, unknown>) ?? {},
      } satisfies PostDetail;
    }), null as PostDetail | null);
}

// ── tech catalogue ──────────────────────────────────────────────────────────

export function skillsGrouped(): Promise<{ category: string; label: string; skills: SkillItem[] }[]> {
  return memo('skills', [], () =>
    safe(async () => {
      const db = await getDb();
      const rows = await db.select<Record<string, unknown>>(
        `SELECT * FROM skill WHERE status = 'published' ORDER BY sort_order ASC, name ASC`,
      );
      const byCategory = new Map<string, SkillItem[]>();
      for (const row of rows) {
        const item: SkillItem = {
          id: String(row.id),
          name: String(row.name ?? ''),
          slug: String(row.slug ?? ''),
          category: String(row.category ?? 'tools'),
          categoryLabel: labelFor(SKILL_CATEGORIES, (row.category as string) ?? null) ?? 'Tools',
          level: Number(row.level ?? 3),
          description: (row.description as string) ?? null,
          evidence: (row.evidence as string) ?? null,
          yearsStart: row.years_start == null ? null : Number(row.years_start),
          isSample: row.is_sample === true,
        };
        const list = byCategory.get(item.category) ?? [];
        list.push(item);
        byCategory.set(item.category, list);
      }
      return SKILL_CATEGORIES.filter((c) => byCategory.has(c.value)).map((c) => ({ category: c.value, label: c.label, skills: byCategory.get(c.value)! }));
    }, [] as { category: string; label: string; skills: SkillItem[] }[]),
  );
}

export function experienceTimeline(): Promise<ExperienceEntry[]> {
  return memo('experience', [], () =>
    safe(async () => {
      const db = await getDb();
      const rows = await db.select<Record<string, unknown>>(`SELECT * FROM experience_item WHERE status = 'published' ORDER BY COALESCE(start_date, '1970-01-01') DESC, sort_order DESC`);
      return rows.map((row) => {
        const start = (row.start_label as string) || (row.start_date ? String(row.start_date).slice(0, 7) : '');
        const end = row.is_current ? 'Present' : (row.end_label as string) || (row.end_date ? String(row.end_date).slice(0, 7) : '');
        return {
          id: String(row.id),
          role: String(row.role ?? ''),
          organization: (row.organization as string) ?? null,
          location: (row.location as string) ?? null,
          summary: (row.summary as string) ?? null,
          bullets: asStrings(row.bullets),
          highlights: asStrings(row.highlights),
          technologies: asStrings(row.technologies),
          rangeLabel: [start, end].filter(Boolean).join(' — ') || 'Date to be confirmed',
          startDate: (row.start_date as string) ?? null,
          isCurrent: row.is_current === true,
          kind: String(row.kind ?? 'work'),
          isSample: row.is_sample === true,
        } satisfies ExperienceEntry;
      });
    }, [] as ExperienceEntry[]),
  );
}

export function certifications(): Promise<CertificationItem[]> {
  return memo('certifications', [], () =>
    safe(async () => {
      const db = await getDb();
      const rows = await db.select<Record<string, unknown>>(`SELECT * FROM certification ORDER BY sort_order ASC, name ASC`);
      return rows.map((row) => {
        const completed = row.completed === true && row.status === 'completed';
        const status = String(row.status ?? 'planned');
        return {
          id: String(row.id),
          name: String(row.name ?? ''),
          issuer: (row.issuer as string) ?? null,
          status,
          completed,
          issuedOn: (row.issued_on as string) ?? null,
          expiresOn: (row.expires_on as string) ?? null,
          verifyUrl: (row.verify_url as string) ?? null,
          description: (row.description as string) ?? null,
          displayLabel:
            (row.status_label_override as string) ||
            (completed
              ? row.issued_on
                ? `Earned ${formatDate(String(row.issued_on), 'short')}`
                : 'Earned'
              : status === 'in_progress'
                ? 'In progress'
                : status === 'expired'
                  ? 'Expired'
                  : 'Planned'),
        } satisfies CertificationItem;
      });
    }, [] as CertificationItem[]),
  );
}

export function activeResume(): Promise<ResumeInfo> {
  return memo('resume', [], () =>
    safe(async () => {
      const db = await getDb();
      const rows = await db.select<Record<string, unknown>>(
        `SELECT r.*, a.url, a.filename, a.bytes FROM resume_version r LEFT JOIN media_asset a ON a.id = r.asset_id
          WHERE r.is_active = TRUE AND a.url IS NOT NULL ORDER BY r.published_at DESC NULLS LAST LIMIT 1`,
      );
      const row = rows[0];
      if (!row) return { available: false, url: null, label: null, version: null, publishedAt: null, filename: null, bytes: null };
      return {
        available: true,
        url: String(row.url),
        label: (row.label as string) ?? 'Résumé',
        version: (row.version as string) ?? null,
        publishedAt: (row.published_at as string) ?? null,
        filename: (row.filename as string) ?? null,
        bytes: row.bytes == null ? null : Number(row.bytes),
      } satisfies ResumeInfo;
    }, { available: false, url: null, label: null, version: null, publishedAt: null, filename: null, bytes: null } as ResumeInfo),
  );
}

// ── pricing, galleries ──────────────────────────────────────────────────────

export function pricingFor(division: 'media' | 'tech'): Promise<PricingPackage[]> {
  return memo('pricing', [division], () =>
    safe(async () => {
      const db = await getDb();
      const rows = await db.select<Record<string, unknown>>(
        `SELECT * FROM pricing_package WHERE division = $1::text AND status = 'published' ORDER BY is_featured DESC NULLS LAST, sort_order ASC`,
        [division],
      );
      const { money } = await import('../utils/text');
      return rows.map((row) => {
        const mode = String(row.mode ?? 'quote');
        const amount = row.amount == null ? null : Number(row.amount);
        const currency = String(row.currency ?? 'NGN');
        const period = (row.period as string) ?? null;
        const periodLabel = period ? humanize(period).replace(/^Per /i, 'per ') : null;
        let priceLabel: string | null = null;
        if (amount && mode !== 'quote') {
          const value = money(amount, currency);
          priceLabel = mode === 'starting_at' ? `From ${value}` : mode === 'day_rate' ? `${value} / day` : value;
          if (priceLabel && periodLabel && mode !== 'day_rate') priceLabel = `${priceLabel} ${periodLabel}`;
        }
        return {
          id: String(row.id),
          name: String(row.name ?? ''),
          tagline: (row.tagline as string) ?? null,
          mode,
          amount,
          currency,
          period,
          includes: asStrings(row.includes),
          exclusions: asStrings(row.exclusions),
          turnaround: (row.turnaround as string) ?? null,
          notes: (row.notes as string) ?? null,
          isFeatured: row.is_featured === true,
          isSample: row.is_sample === true,
          priceLabel,
        } satisfies PricingPackage;
      });
    }, [] as PricingPackage[]),
  );
}

export function galleriesFor(division: string, input: { limit?: number; kind?: string } = {}): Promise<GalleryItem[]> {
  return memo('galleries', [division, input.limit, input.kind], async () =>
    safe(async () => {
      const db = await getDb();
      const params: unknown[] = [division];
      let sql = `SELECT * FROM gallery WHERE division = $1::text AND status = 'published'`;
      if (input.kind) {
        params.push(input.kind);
        sql += ` AND kind = $${params.length}::text`;
      }
      sql += ` ORDER BY is_featured DESC NULLS LAST, sort_order ASC LIMIT ${Math.min(input.limit ?? 8, 24)}`;
      const rows = await db.select<Record<string, unknown>>(sql, params);
      const ids = rows.flatMap((r) => (Array.isArray(r.items) ? (r.items as Record<string, unknown>[]).map((i) => (i.asset_id as string) ?? '') : []));
      const assets = await assetsByIds(ids);
      return rows.map((row) => ({
        id: String(row.id),
        slug: String(row.slug),
        title: String(row.title ?? ''),
        description: (row.description as string) ?? null,
        kind: String(row.kind ?? 'photo'),
        items: (Array.isArray(row.items) ? (row.items as Record<string, unknown>[]) : []).map((item) => ({
          asset: item.asset_id ? (assets[String(item.asset_id)] ?? null) : null,
          caption: (item.caption as string) ?? null,
          alt: (item.alt as string) ?? null,
        })),
        isSample: row.is_sample === true,
        projectId: (row.project_id as string) ?? null,
      })) satisfies GalleryItem[];
    }, [] as GalleryItem[]),
  );
}

// ── pages & sections ────────────────────────────────────────────────────────

export function pageBySlug(slug: string): Promise<PageData> {
  return safe(() => memo('page', [slug], async () => {
      const db = await getDb();
      const rows = await db.select<Record<string, unknown>>(
        `SELECT p.*, pb.placement, pb.variant, pb.sort_order, pb.is_visible, pb.overrides,
                b.id AS block_id, b.block_type, b.name AS block_name, b.eyebrow, b.headline, b.body,
                b.props, b.media, b.links, b.is_sample, b.status AS block_status
           FROM page p
           LEFT JOIN page_block pb ON pb.page_id = p.id
           LEFT JOIN content_block b ON b.id = pb.block_id AND b.status = 'published'
          WHERE p.slug = $1::text AND p.status = 'published'
          ORDER BY pb.sort_order ASC`,
        [slug],
      );
      const head = rows[0];
      if (!head || !head.block_id) {
        return {
          id: head ? String(head.id) : '',
          slug,
          title: head ? String(head.title) : '',
          description: head ? ((head.description as string) ?? null) : null,
          sections: [],
          seo: head ? ((head.seo as Record<string, unknown>) ?? {}) : {},
          exists: Boolean(head),
        };
      }
      const mediaIds = rows.flatMap((r) => (Array.isArray(r.media) ? (r.media as Record<string, unknown>[]).map((m) => (m.asset_id as string) ?? '') : []));
      const videoIds = rows.flatMap((r) => (Array.isArray(r.media) ? (r.media as Record<string, unknown>[]).map((m) => (m.video_id as string) ?? '') : []));
      const assets = await assetsByIds(mediaIds.filter(Boolean));
      const videos = await videosByIds(Array.from(new Set(videoIds.filter(Boolean)))).catch(() => [] as VideoRef[]);
      const videoById = Object.fromEntries(videos.map((v) => [v.id, v]));

      const sections: SectionData[] = rows
        .filter((r) => r.block_id)
        .map((row) => {
          const mediaRaw = Array.isArray(row.media) ? (row.media as Record<string, unknown>[]) : [];
          return {
            id: String(row.block_id),
            type: String(row.block_type),
            name: String(row.block_name ?? ''),
            eyebrow: (row.eyebrow as string) ?? null,
            headline: (row.headline as string) ?? null,
            body: (row.body as string) ?? null,
            props: (row.props as Record<string, unknown>) ?? {},
            media: mediaRaw.map((m) => ({
              assetId: (m.asset_id as string) ?? null,
              videoId: (m.video_id as string) ?? null,
              role: (m.role as string) ?? 'primary',
              caption: (m.caption as string) ?? null,
              alt: (m.alt as string) ?? null,
              asset: m.asset_id ? (assets[String(m.asset_id)] ?? null) : null,
              video: m.video_id ? (videoById[String(m.video_id)] ?? null) : null,
            })),
            links: (Array.isArray(row.links) ? (row.links as Record<string, unknown>[]) : []).map((l) => ({
              label: String(l.label ?? ''),
              href: String(l.href ?? ''),
              variant: (l.variant as string) ?? 'primary',
            })),
            placement: String(row.placement ?? 'body'),
            variant: (row.variant as string) ?? null,
            overrides: (row.overrides as Record<string, unknown>) ?? {},
            isSample: row.is_sample === true,
          };
        });

      return {
        id: String(head.id),
        slug,
        title: String(head.title),
        description: (head.description as string) ?? null,
        sections,
        seo: (head.seo as Record<string, unknown>) ?? {},
        exists: true,
      };
    }), { id: '', slug, title: '', description: null, sections: [], seo: {}, exists: false } as PageData);
}

// ── site context ────────────────────────────────────────────────────────────

export function siteContext(): Promise<SiteContext> {
  return memo('site', [], () =>
    safe<SiteContext>(async () => {
      const db = await getDb();
      const [settings, socialRows, navRows] = await Promise.all([
        getSettings(),
        db
          .select<Record<string, unknown>>(
            `SELECT * FROM social_link WHERE status = 'published' AND is_verified = TRUE ORDER BY sort_order ASC`,
          )
          .catch(() => [] as Record<string, unknown>[]),
        db
          .select<Record<string, unknown>>(
            `SELECT * FROM navigation_item WHERE is_visible = TRUE ORDER BY sort_order ASC, label ASC`,
          )
          .catch(() => [] as Record<string, unknown>[]),
      ]);
      const nav: Record<string, NavItem[]> = {};
      for (const row of navRows) {
        const location = String(row.location ?? 'main_header');
        nav[location] = nav[location] ?? [];
        nav[location].push({
          label: String(row.label ?? ''),
          href: String(row.href ?? '#'),
          badge: (row.badge as string) ?? null,
          external: row.is_external === true,
          newTab: row.open_new_tab === true,
        });
      }
      const social: SocialItem[] = socialRows.map((row) => ({
        network: String(row.network ?? 'other'),
        url: String(row.url ?? '#'),
        label: (row.label as string) ?? null,
        handle: (row.handle as string) ?? null,
      }));
      return { settings, social, nav, ready: true };
    }, { settings: {}, social: [], nav: {}, ready: false } as SiteContext),
  );
}

/** Verified contact details formatted for display. */
export function contactDetails(): Promise<Record<string, string | null>> {
  return safe(async () => {
    const s = await getSettings();
    const { whatsappUrl, telHref } = await import('./settings');
    const str = (v: unknown) => (v === null || v === undefined || v === '' ? null : String(v));
    return {
      email: str(s['contact.email']),
      emailAlt: str(s['contact.email_alt']),
      phone: str(s['contact.phone']),
      whatsapp: str(s['contact.whatsapp']),
      whatsappHref: whatsappUrl(str(s['contact.whatsapp'])),
      telHref: telHref(str(s['contact.phone'])),
      whatsappLabel: str(s['contact.whatsapp_label']) ?? 'Chat on WhatsApp',
      location: str(s['contact.location']),
      serviceAreas: str(s['contact.service_areas']),
      responseTime: str(s['contact.response_time']),
      hours: str(s['contact.hours']),
      availability: str(s['founder.availability']),
    };
  }, {} as Record<string, string | null>);
}

/** Cross-experience homepage: selected work from both disciplines. */
export function crossDisciplineWork(limit = 4): Promise<ProjectCard[]> {
  return memo('work.cross', [limit], async () => {
    const [media, tech] = await Promise.all([projectCards({ division: 'media', limit: Math.ceil(limit / 2) || 1 }), projectCards({ division: 'tech', limit: Math.ceil(limit / 2) || 1 })]);
    const merged = [...media.cards, ...tech.cards].sort((a, b) => (b.isSample === a.isSample ? 0 : a.isSample ? 1 : -1));
    return merged.slice(0, limit);
  });
}

export function categoryLabel(division: 'media' | 'tech', value: string | null | undefined): string {
  if (!value) return 'Work';
  return labelFor(division === 'tech' ? TECH_CATEGORIES : MEDIA_CATEGORIES, value) ?? humanize(value);
}

/** Sitemap + robots inputs. */
export async function sitemapEntries(): Promise<{ path: string; lastmod?: string; priority?: number }[]> {
  const db = await getDb();
  const out: { path: string; lastmod?: string; priority?: number }[] = [{ path: '/', priority: 1 }];
  const seen = new Set(['/']);
  const push = (path: string, lastmod?: string, priority?: number) => {
    if (!path || seen.has(path)) return;
    seen.add(path);
    out.push({ path, ...(lastmod ? { lastmod: new Date(lastmod).toISOString().slice(0, 10) } : {}), ...(priority ? { priority } : {}) });
  };
  try {
    const pages = await db.select<{ slug: string; updated_at: string }>(`SELECT slug, updated_at FROM page WHERE status = 'published'`);
    for (const p of pages) if (p.slug && p.slug !== 'home') push(`/${p.slug.replace(/^home\/?/, '')}`, p.updated_at);
    const projects = await db.select<{ slug: string; division: string; updated_at: string }>(`SELECT slug, division, updated_at FROM project WHERE status = 'published'`);
    for (const p of projects) push(p.division === 'tech' ? `/tech/projects/${p.slug}` : `/media/work/${p.slug}`, p.updated_at, 0.8);
    const posts = await db.select<{ slug: string; updated_at: string }>(`SELECT slug, updated_at FROM blog_post WHERE status = 'published'`);
    for (const p of posts) push(`/blog/${p.slug}`, p.updated_at, 0.6);
  } catch {
    /* table not migrated yet → static routes only */
  }
  for (const path of ['/about', '/services', '/work', '/team', '/blog', '/security', '/contact', '/media', '/media/work', '/media/services', '/media/about', '/media/pricing', '/media/contact', '/tech', '/tech/about', '/tech/skills', '/tech/services', '/tech/projects', '/tech/experience', '/tech/testimonials', '/tech/resume', '/tech/contact']) push(path);
  return out.filter((e) => e.path.length > 1 || e.path === '/').map((e) => ({ ...e, path: e.path.replace(/\/$/, '') || '/' }));
}

export function projectCountFor(division: 'media' | 'tech'): Promise<number> {
  return memo('projects.count', [division], () =>
    safe(async () => {
      const { total } = await projectRows({ division });
      return total;
    }, 0),
  );
}

export function truncateText(value: string | null | undefined, max = 150): string {
  return truncate(value ?? '', max);
}
