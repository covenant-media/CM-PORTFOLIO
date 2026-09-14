/**
 * CMS read helpers that the generic repository does not cover: the section
 * composer, the media grid, the featured board, the dashboard and the inbox.
 * Everything here is server-only and every list is bounded.
 */
import { getDb } from '../db';
import { mediaVideoRows } from '../media/portfolio';
import { CMS_MODULES, getCmsModule, type CmsModuleDef } from './modules';
import { levelFor, SYSTEM_ROLES, can, type ModuleKey, type PermissionLevel } from '../auth/permissions';
import { getSettings } from './settings';
import { BLOCK_TYPES } from './blocks';

export interface AdminActionState {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
  id?: string;
  /** field types the parser encodes from JSON */
  notice?: string;
}

/** Value shapes the form encodes as JSON before the repository coerces them. */
export const STRUCTURED_TYPES = new Set(['repeat', 'json', 'seo', 'multiselect', 'tags', 'list']);

/** FormData → the plain object validateFields/create/update expect. */
export function parseForm(formData: FormData, fields: { key: string; type: string; multiple?: boolean }[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of fields) {
    const key = field.key;
    if (field.type === 'boolean') {
      out[key] = formData.get(key) === 'on' || formData.get(key) === 'true';
      continue;
    }
    if (field.type === 'multiselect' || (field.multiple && field.type === 'relation')) {
      const all = formData.getAll(key).map((v) => String(v)).filter(Boolean);
      const json = formData.get(`${key}__json`);
      if (all.length) {
        out[key] = all;
      } else if (typeof json === 'string' && json.trim()) {
        try {
          out[key] = JSON.parse(json) as unknown;
        } catch {
          out[key] = [];
        }
      } else {
        out[key] = [];
      }
      continue;
    }
    if (field.type === 'repeat' || field.type === 'json' || field.type === 'seo') {
      const raw = formData.get(key);
      const text = typeof raw === 'string' ? raw.trim() : '';
      if (!text) {
        out[key] = field.type === 'json' || field.type === 'seo' ? {} : [];
        continue;
      }
      try {
        out[key] = JSON.parse(text) as unknown;
      } catch {
        out[key] = text; // validator will report it as invalid JSON
      }
      continue;
    }
    if (field.type === 'tags' || field.type === 'list') {
      const raw = formData.get(key);
      out[key] = typeof raw === 'string' ? raw : '';
      continue;
    }
    const value = formData.get(key);
    out[key] = typeof value === 'string' ? value : '';
  }
  return out;
}

// ── navigation / permissions ────────────────────────────────────────────────

export interface AdminNavItem {
  key: string;
  label: string;
  icon: string;
  level: PermissionLevel;
  count?: number;
}

export interface AdminNavGroup {
  key: string;
  label: string;
  hint: string;
  /** The section's own page, so the sidebar can link every label to its hub. */
  hub: string;
  icon: string;
  items: AdminNavItem[];
}

/**
 * The CMS has exactly four sections plus the dashboard. Each one owns the content of one
 * surface (or the shared plumbing), has its own hub page, its own live links and its own set
 * of modules — so "where do I change the media hero?" has one answer, not six.
 *
 * Section membership lives on the module itself (`CmsModuleDef.group`); this table adds the
 * order the sidebar and hubs present them in, the hub route, and the public pages the section
 * drives. Nothing here duplicates business logic — the modules keep their own fields.
 */
export interface CmsSection {
  key: string;
  label: string;
  hint: string;
  icon: string;
  /** The hub screen for this section. The Overview section's hub is the dashboard itself. */
  hub: string;
  /** Public pages this section controls, for the "see it live" strip. */
  live: { label: string; href: string }[];
  /** Sidebar/hub order for the section's modules. */
  order: string[];
}

export const CMS_SECTIONS: CmsSection[] = [
  {
    key: 'Overview',
    label: 'Overview',
    hint: 'Every feature in one place, with what needs you next',
    icon: 'home',
    hub: '/admin',
    live: [
      { label: 'Main site', href: '/' },
      { label: 'Media portfolio', href: '/media-portfolio' },
      { label: 'Tech portfolio', href: '/tech-portfolio' },
    ],
    order: [],
  },
  {
    key: 'Media',
    label: 'Media portfolio',
    hint: 'Films, vertical edits, photography, client stories, uploads',
    icon: 'film',
    hub: '/admin/media-portfolio',
    live: [
      { label: 'Media portfolio', href: '/media-portfolio' },
      { label: 'Pricing', href: '/media/pricing' },
      { label: 'Long-form catalog', href: '/media/long-form' },
      { label: 'Short-form catalog', href: '/media/short-form' },
      { label: 'Photography catalog', href: '/media/photography' },
    ],
    order: ['videos', 'photos', 'media_projects', 'galleries', 'media_library', 'testimonials'],
  },
  {
    key: 'Tech',
    label: 'Tech portfolio',
    hint: 'Projects, skills, experience, certifications, resume',
    icon: 'code',
    hub: '/admin/tech-portfolio',
    live: [
      { label: 'Tech portfolio', href: '/tech-portfolio' },
      { label: 'Projects', href: '/tech/projects' },
      { label: 'Resume', href: '/tech/resume' },
    ],
    order: ['tech_projects', 'skills', 'experience', 'certifications', 'resume'],
  },
  {
    key: 'Website',
    label: 'Main website',
    hint: 'Pages, sections, menus, services, team, writing, pricing',
    icon: 'layers',
    hub: '/admin/main-website',
    live: [
      { label: 'Home', href: '/' },
      { label: 'Services', href: '/services' },
      { label: 'Work', href: '/work' },
      { label: 'Journal', href: '/blog' },
    ],
    order: ['pages', 'blocks', 'navigation', 'services', 'team', 'blog', 'pricing'],
  },
  {
    key: 'System',
    label: 'System',
    hint: 'Settings, social links, SEO, enquiries, featured content, contact details',
    icon: 'settings',
    hub: '/admin/system',
    live: [{ label: 'Public site', href: '/' }],
    order: ['settings', 'social_links', 'contact_info', 'seo', 'submissions', 'featured'],
  },
];

export function sectionFor(key: string): CmsSection | undefined {
  return CMS_SECTIONS.find((section) => section.key === key);
}

/**
 * The modules of one section, in the section's declared order. `Overview` (and any key with an
 * empty order list) returns every module, which is what a "everything at a glance" screen wants.
 */
export function modulesForSection(key: string): CmsModuleDef[] {
  const section = sectionFor(key);
  if (!section || section.key === 'Overview') return CMS_MODULES;
  const rank = new Map(section.order.map((moduleKey, index) => [moduleKey, index]));
  return CMS_MODULES.filter((m) => m.group === section.key).sort(
    (a, b) => (rank.get(a.key) ?? 99) - (rank.get(b.key) ?? 99),
  );
}

/** Modules the Overview screen should not count as content (they are not tables). */
export const OVERVIEW_SKIP = new Set(['settings', 'contact_info', 'featured', 'seo', 'account']);

/** The sidebar is the section list, filtered by what this role may even read. */
export async function adminNav(role: string, roleMap?: Record<string, PermissionLevel>): Promise<AdminNavGroup[]> {
  // The Overview section owns no modules of its own — its hub is the dashboard, which the shell
  // links first. Listing it here as well would print every module twice.
  return CMS_SECTIONS.filter((section) => section.order.length > 0).map((section) => ({
    key: section.key,
    label: section.label,
    hint: section.hint,
    hub: section.hub,
    icon: section.icon,
    items: modulesForSection(section.key)
      .filter((m) => can(role, m.permission ?? m.key, 'read', roleMap))
      .map((m) => ({
        key: m.key,
        label: m.label,
        icon: m.icon,
        level: levelFor(role, m.permission ?? m.key, roleMap),
      })),
  })).filter((group) => group.items.length > 0);
}

/** Kept for the module list page's header, which shows the module's section as a crumb. */
export const CmsModuleGroups = CMS_SECTIONS.map((section) => ({
  key: section.key,
  label: section.label,
  hint: section.hint,
})) as { key: string; label: string; hint: string }[];

export function moduleFor(key: string): CmsModuleDef {
  const module = getCmsModule(key);
  if (!module) throw new Error(`Unknown CMS module "${key}"`);
  return module;
}

export function isModuleKey(key: string): key is ModuleKey {
  return CMS_MODULES.some((m) => m.key === key) || key === 'account';
}

// ── dashboard ───────────────────────────────────────────────────────────────

export interface AttentionItem {
  label: string;
  detail: string;
  href: string;
  severity: 'info' | 'warn';
}

export async function needsAttention(): Promise<AttentionItem[]> {
  const db = await getDb();
  const settings = await getSettings();
  const items: AttentionItem[] = [];

  const count = async (sql: string, params: unknown[] = []) => {
    const rows = await db.select<{ n: number | string }>(sql, params);
    return Number(rows[0]?.n ?? 0);
  };

  const [draftProjects, draftPosts, draftVideos, unverifiedSocial, sampleRows, submissions, activeResume, assets, testimonials, experience] = await Promise.all([
    count('SELECT count(*)::int AS n FROM project WHERE status <> $1::text', ['published']),
    count('SELECT count(*)::int AS n FROM blog_post WHERE status <> $1::text', ['published']),
    count('SELECT count(*)::int AS n FROM media_video WHERE status <> $1::text', ['published']),
    count('SELECT count(*)::int AS n FROM social_link WHERE is_verified = false'),
    count('SELECT count(*)::int AS n FROM project WHERE is_sample = true OR status = $1::text', ['draft']),
    count('SELECT count(*)::int AS n FROM contact_submission WHERE status = $1::text', ['new']),
    count('SELECT count(*)::int AS n FROM resume_version WHERE is_active = true'),
    count('SELECT count(*)::int AS n FROM media_asset'),
    count('SELECT count(*)::int AS n FROM testimonial'),
    count('SELECT count(*)::int AS n FROM experience_item'),
  ]);

  if (!String(settings['seo.site_url'] ?? '').startsWith('https://')) {
    items.push({
      label: 'Canonical site URL not set',
      detail: 'Metadata, sitemap and social cards fall back to the request origin until you set it.',
      href: '/admin/settings?group=seo',
      severity: 'warn',
    });
  }
  if (unverifiedSocial > 0) {
    items.push({
      label: `${unverifiedSocial} social profile${unverifiedSocial === 1 ? '' : 's'} unverified`,
      detail: 'They stay hidden on the public site until each URL is confirmed. Do not publish a link you have not opened.',
      href: '/admin/social_links',
      severity: 'warn',
    });
  }
  if (sampleRows > 0) {
    items.push({
      label: `${sampleRows} placeholder project${sampleRows === 1 ? '' : 's'} still in the site`,
      detail: 'Sample rows carry a visible “Placeholder” badge. Replace the copy or unpublish them before launch.',
      href: '/admin/media_projects',
      severity: 'warn',
    });
  }
  if (assets === 0) {
    items.push({
      label: 'Media library is empty',
      detail: 'Cover images, posters and galleries need uploads before those sections can render.',
      href: '/admin/media_library',
      severity: 'info',
    });
  }
  if (activeResume === 0) {
    items.push({
      label: 'No active resume',
      detail: 'The Tech portfolio hides its resume section until one version is marked active.',
      href: '/admin/resume',
      severity: 'info',
    });
  }
  if (testimonials === 0) {
    items.push({
      label: 'No testimonials on file',
      detail: 'The section renders an empty state rather than invented praise. Add real quotes with permission.',
      href: '/admin/testimonials',
      severity: 'info',
    });
  }
  if (experience === 0) {
    items.push({
      label: 'Experience timeline is empty',
      detail: 'The PRD describes a timeline from around 2015 — only you can confirm the roles and dates.',
      href: '/admin/experience',
      severity: 'info',
    });
  }
  if (draftProjects + draftPosts + draftVideos > 0) {
    items.push({
      label: `${draftProjects + draftPosts + draftVideos} item(s) sitting in draft`,
      detail: 'Drafts are invisible to the public site and to search.',
      href: '/admin/featured',
      severity: 'info',
    });
  }
  if (submissions > 0) {
    items.push({
      label: `${submissions} unread enquiry${submissions === 1 ? '' : 'ies'}`,
      detail: 'Contact and brief submissions are waiting in the inbox.',
      href: '/admin/submissions',
      severity: 'warn',
    });
  }
  return items;
}

// ── section composer ────────────────────────────────────────────────────────

export interface CompositionBlock {
  block_id: string;
  block_type: string;
  name: string;
  headline: string | null;
  placement: string;
  sort_order: number;
  is_visible: boolean;
  status: string;
  overrides: Record<string, unknown>;
}

export interface CompositionPage {
  id: string;
  slug: string;
  title: string;
  surface: string;
  status: string;
  blocks: CompositionBlock[];
}

export async function pageCompositions(): Promise<CompositionPage[]> {
  const db = await getDb();
  const pages = await db.select<Record<string, unknown>>(
    `SELECT id, slug, title, surface, status FROM page ORDER BY surface ASC, slug ASC`,
  );
  const attached = await db.select<Record<string, unknown>>(
    `SELECT pb.page_id, pb.block_id, pb.placement, pb.sort_order, pb.is_visible, pb.overrides,
            b.block_type, b.name, b.headline, b.status
       FROM page_block pb JOIN content_block b ON b.id = pb.block_id
      ORDER BY pb.sort_order ASC`,
  );
  const byPage = new Map<string, CompositionBlock[]>();
  for (const row of attached) {
    const pageId = String(row.page_id);
    const list = byPage.get(pageId) ?? [];
    list.push({
      block_id: String(row.block_id),
      block_type: String(row.block_type ?? ''),
      name: String(row.name ?? 'Untitled section'),
      headline: (row.headline as string) ?? null,
      placement: String(row.placement ?? 'body'),
      sort_order: Number(row.sort_order ?? 0),
      is_visible: row.is_visible !== false,
      status: String(row.status ?? 'draft'),
      overrides: (row.overrides as Record<string, unknown>) ?? {},
    });
    byPage.set(pageId, list);
  }
  return pages.map((page) => ({
    id: String(page.id),
    slug: String(page.slug),
    title: String(page.title),
    surface: String(page.surface ?? 'main'),
    status: String(page.status ?? 'draft'),
    blocks: byPage.get(String(page.id)) ?? [],
  }));
}

export interface SectionRow {
  id: string;
  name: string;
  block_type: string;
  headline: string | null;
  status: string;
  is_sample: boolean;
  used_on: string[];
}

export async function sectionIndex(): Promise<SectionRow[]> {
  const db = await getDb();
  const rows = await db.select<Record<string, unknown>>(
    `SELECT b.id, b.name, b.block_type, b.headline, b.status, b.is_sample,
            COALESCE(json_agg(DISTINCT p.slug) FILTER (WHERE p.slug IS NOT NULL), '[]'::json) AS pages
       FROM content_block b
       LEFT JOIN page_block pb ON pb.block_id = b.id
       LEFT JOIN page p ON p.id = pb.page_id
      GROUP BY b.id
      ORDER BY b.block_type ASC, b.name ASC`,
  );
  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name ?? ''),
    block_type: String(row.block_type ?? ''),
    headline: (row.headline as string) ?? null,
    status: String(row.status ?? 'draft'),
    is_sample: row.is_sample === true,
    used_on: Array.isArray(row.pages) ? (row.pages as string[]) : [],
  }));
}

export const BLOCK_TYPE_LABELS: Record<string, string> = Object.fromEntries(BLOCK_TYPES.map((b) => [b.type, b.label]));

/** Suggested section types for a page, based on the surface it belongs to. */
export function suggestedBlockTypes(surface: string): { type: string; label: string; description: string }[] {
  const list = BLOCK_TYPES.filter((b) => b.surfaces.includes(surface as 'main') || b.surfaces.length === 3);
  const order = list.length ? list : BLOCK_TYPES;
  return order.map((b) => ({ type: b.type, label: b.label, description: b.description }));
}

// ── featured board ──────────────────────────────────────────────────────────

export interface FeaturedRow {
  id: string;
  title: string;
  module: string;
  status: string;
  is_featured: boolean;
  is_sample: boolean;
  meta: string;
}

export async function featuredBoard(): Promise<{ group: string; rows: FeaturedRow[]; max: number; hint: string }[]> {
  const db = await getDb();
  const projects = (division: string) =>
    db.select<Record<string, unknown>>(
      `SELECT id, title, status, is_featured, is_sample, category, year, slug
         FROM project WHERE division = $1::text ORDER BY is_featured DESC, sort_order ASC, year DESC NULLS LAST LIMIT 40`,
      [division],
    );
  const map = (rows: Record<string, unknown>[], module: string): FeaturedRow[] =>
    rows.map((row) => ({
      id: String(row.id),
      title: String(row.title ?? 'Untitled'),
      module,
      status: String(row.status ?? 'draft'),
      is_featured: row.is_featured === true,
      is_sample: row.is_sample === true,
      meta: [row.category, row.year, row.slug].filter(Boolean).map(String).join(' · '),
    }));

  const [media, tech, posts, videos] = await Promise.all([
    projects('media'),
    projects('tech'),
    db.select<Record<string, unknown>>(
      `SELECT id, title, status, is_featured, is_sample, category, slug FROM blog_post ORDER BY created_at DESC LIMIT 40`,
    ),
    db.select<Record<string, unknown>>(
      `SELECT id, title, status, is_featured, is_sample, form FROM media_video ORDER BY sort_order ASC LIMIT 40`,
    ),
  ]);
  return [
    { group: 'Media projects', rows: map(media, 'media_projects'), max: 6, hint: 'Shown in the /media showcase and the brand-home media rail.' },
    { group: 'Tech projects', rows: map(tech, 'tech_projects'), max: 6, hint: 'Shown on /tech and the case-study grid.' },
    { group: 'Journal', rows: map(posts, 'blog'), max: 4, hint: 'Featured posts lead the /blog list and the homepage writing rail.' },
    {
      group: 'Videos',
      rows: videos.map((row) => ({
        id: String(row.id),
        title: String(row.title ?? 'Untitled'),
        module: 'videos',
        status: String(row.status ?? 'draft'),
        is_featured: row.is_featured === true,
        is_sample: row.is_sample === true,
        meta: String(row.form ?? 'video'),
      })),
      max: 8,
      hint: 'Featured videos build the floating hero previews on /media.',
    },
  ];
}

// ── media library ───────────────────────────────────────────────────────────

export interface AssetRow {
  id: string;
  title: string;
  filename: string;
  kind: string;
  url: string;
  alt: string | null;
  bytes: number;
  width: number | null;
  height: number | null;
  folder: string | null;
  references: number;
  created_at: string;
}

export async function assetGrid(query: { q?: string; kind?: string; folder?: string; page?: number; per?: number } = {}): Promise<{ rows: AssetRow[]; total: number; page: number; pages: number; folders: string[] }> {
  const db = await getDb();
  const where: string[] = ['1=1'];
  const params: unknown[] = [];
  if (query.q) {
    params.push(`%${query.q.slice(0, 60)}%`);
    where.push(`(filename ILIKE $${params.length} OR title ILIKE $${params.length} OR alt ILIKE $${params.length})`);
  }
  if (query.kind) {
    params.push(query.kind);
    where.push(`kind = $${params.length}::text`);
  }
  if (query.folder) {
    params.push(query.folder);
    where.push(`folder = $${params.length}::text`);
  }
  const per = Math.min(Math.max(Number(query.per ?? 24), 1), 120);
  const page = Math.max(Number(query.page ?? 1), 1);
  const whereSql = `WHERE ${where.join(' AND ')}`;

  const [rows, counts, folders, refs] = await Promise.all([
    db.select<Record<string, unknown>>(
      `SELECT id, title, filename, kind, url, alt, bytes, width, height, folder, created_at
         FROM media_asset ${whereSql} ORDER BY created_at DESC LIMIT ${per} OFFSET ${(page - 1) * per}`,
      params,
    ),
    db.select<{ n: number | string }>(`SELECT count(*)::int AS n FROM media_asset ${whereSql}`, params),
    db.select<{ folder: string; n: number | string }>(
      `SELECT COALESCE(folder, '') AS folder, count(*)::int AS n FROM media_asset GROUP BY 1 ORDER BY 2 DESC LIMIT 40`,
    ),
    usageCounts(),
  ]);

  const total = Number(counts[0]?.n ?? 0);
  return {
    rows: rows.map((row) => ({
      id: String(row.id),
      title: String(row.title ?? row.filename ?? 'Untitled'),
      filename: String(row.filename ?? ''),
      kind: String(row.kind ?? 'image'),
      url: String(row.url ?? ''),
      alt: (row.alt as string) ?? null,
      bytes: Number(row.bytes ?? 0),
      width: row.width == null ? null : Number(row.width),
      height: row.height == null ? null : Number(row.height),
      folder: (row.folder as string) || null,
      references: refs[String(row.id)] ?? 0,
      created_at: String(row.created_at ?? ''),
    })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / per)),
    folders: folders.map((f) => f.folder).filter(Boolean),
  };
}

/** How many places each asset is used — one pass over the referencing columns. */
export async function usageCounts(): Promise<Record<string, number>> {
  const db = await getDb();
  const rows = await db.select<{ asset_id: string; n: number | string }>(
    `SELECT asset_id, count(*)::int AS n FROM (
       SELECT cover_asset_id AS asset_id FROM project WHERE cover_asset_id IS NOT NULL
       UNION ALL SELECT hero_video_id FROM project WHERE hero_video_id IS NOT NULL
       UNION ALL SELECT poster_asset_id FROM media_video WHERE poster_asset_id IS NOT NULL
       UNION ALL SELECT file_asset_id FROM media_video WHERE file_asset_id IS NOT NULL
       UNION ALL SELECT asset_id FROM resume_version WHERE asset_id IS NOT NULL
       UNION ALL SELECT jsonb_array_elements(gallery) ->> 'asset_id' FROM project WHERE jsonb_typeof(gallery) = 'array'
       UNION ALL SELECT jsonb_array_elements(items) ->> 'asset_id' FROM gallery WHERE jsonb_typeof(items) = 'array'
     ) u WHERE asset_id IS NOT NULL AND asset_id <> '' GROUP BY asset_id`,
  );
  const out: Record<string, number> = {};
  for (const row of rows) out[String(row.asset_id)] = Number(row.n);
  return out;
}

// ── inbox ───────────────────────────────────────────────────────────────────

export interface SubmissionRow {
  id: string;
  form: string;
  name: string;
  email: string;
  subject: string;
  created_at: string;
  status: string;
  message: string;
  detail: { label: string; value: string }[];
}

export async function submissionsInbox(query: { form?: string; status?: string; q?: string; page?: number } = {}): Promise<{ rows: SubmissionRow[]; total: number; page: number; pages: number }> {
  const db = await getDb();
  const where: string[] = ['1=1'];
  const params: unknown[] = [];
  if (query.form) {
    params.push(query.form);
    where.push(`form = $${params.length}::text`);
  }
  if (query.status) {
    params.push(query.status);
    where.push(`status = $${params.length}::text`);
  }
  if (query.q) {
    params.push(`%${query.q.slice(0, 60)}%`);
    where.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length} OR message ILIKE $${params.length})`);
  }
  const per = 20;
  const page = Math.max(Number(query.page ?? 1), 1);
  const whereSql = `WHERE ${where.join(' AND ')}`;
  const [rows, counts] = await Promise.all([
    db.select<Record<string, unknown>>(
      `SELECT * FROM contact_submission ${whereSql} ORDER BY created_at DESC LIMIT ${per} OFFSET ${(page - 1) * per}`,
      params,
    ),
    db.select<{ n: number | string }>(`SELECT count(*)::int AS n FROM contact_submission ${whereSql}`, params),
  ]);
  const total = Number(counts[0]?.n ?? 0);
  const labels: Record<string, string> = {
    phone: 'Phone / WhatsApp',
    organization: 'Organisation',
    service: 'Service',
    project_type: 'Project type',
    event_date: 'Event date',
    location: 'Location',
    budget_band: 'Budget',
    timeline: 'Timeline',
    requirements: 'Requirements',
    page_path: 'Came from',
  };
  return {
    rows: rows.map((row) => ({
      id: String(row.id),
      form: String(row.form ?? 'contact'),
      name: String(row.name ?? '—'),
      email: String(row.email ?? '—'),
      subject: String(row.project_type ?? row.service ?? row.form ?? 'Enquiry'),
      created_at: String(row.created_at ?? ''),
      status: String(row.status ?? 'new'),
      message: String(row.message ?? ''),
      detail: Object.entries(labels)
        .map(([key, label]) => ({ label, value: String(row[key] ?? '').trim() }))
        .filter((entry) => entry.value),
    })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / per)),
  };
}

// ── audit trail ─────────────────────────────────────────────────────────────

export interface ActivityRow {
  id: string;
  who: string;
  action: string;
  summary: string;
  created_at: string;
}

export async function recentActivity(limit = 14): Promise<ActivityRow[]> {
  const db = await getDb();
  const rows = await db.select<Record<string, unknown>>(
    `SELECT a.id, a.action, a.summary, a.created_at, COALESCE(u.name, 'Someone') AS who
       FROM audit_log a LEFT JOIN admin_user u ON u.id = a.user_id
      ORDER BY a.created_at DESC LIMIT $1::int`,
    [Math.min(Math.max(limit, 1), 60)],
  );
  return rows.map((row) => ({
    id: String(row.id),
    who: String(row.who),
    action: String(row.action ?? ''),
    summary: String(row.summary ?? ''),
    created_at: String(row.created_at ?? ''),
  }));
}

/** asset id → url, for list thumbnails and pickers. */
export async function assetUrls(ids: (string | null | undefined)[]): Promise<Record<string, string>> {
  const unique = Array.from(new Set(ids.filter((v): v is string => typeof v === 'string' && v.length > 3)));
  if (!unique.length) return {};
  const db = await getDb();
  const placeholders = unique.map((_, i) => `$${i + 1}::text`).join(', ');
  const rows = await db.select<{ id: string; url: string }>(`SELECT id, url FROM media_asset WHERE id IN (${placeholders})`, unique);
  return Object.fromEntries(rows.map((row) => [row.id, row.url]));
}

export const ROLE_OPTIONS = SYSTEM_ROLES.map((r) => ({ value: r.key, label: r.label, hint: r.description }));

// ── section hubs ────────────────────────────────────────────────────────────
//
// One implementation of "here is everything in this section, what it holds, what needs you and
// where it lives on the public site". The four hub screens differ only in the copy and the
// extra boards they add, so they share this shape instead of four bespoke pages.

export interface HubStat {
  key: string;
  label: string;
  value: number | string;
  hint?: string;
}

export interface HubTool {
  key: string;
  label: string;
  href: string;
  icon: string;
  description: string;
  count?: number;
  level: PermissionLevel;
  /** Public page this module drives, when it has one. */
  live?: string;
}

export interface SectionHub {
  section: CmsSection;
  stats: HubStat[];
  tools: HubTool[];
}

/** Stat cards per section, drawn from the counters the dashboard already computes. */
const SECTION_STATS: Record<string, { key: string; label: string; hint?: string }[]> = {
  Media: [
    { key: 'published_videos', label: 'Published films & edits' },
    { key: 'hero_preview', label: 'In the hero card', hint: 'Short-form pieces toggled into the /media hero' },
    { key: 'photo_frames', label: 'Photography frames', hint: 'Across the published photo sets' },
    { key: 'media_stories', label: 'Client stories' },
  ],
  Tech: [
    { key: 'tech_projects', label: 'Tech projects' },
    { key: 'skills', label: 'Skills' },
    { key: 'experience', label: 'Experience entries' },
    { key: 'certifications', label: 'Certifications' },
  ],
  Website: [
    { key: 'pages', label: 'Authored pages' },
    { key: 'services', label: 'Services' },
    { key: 'team', label: 'Team members' },
    { key: 'posts', label: 'Journal posts' },
  ],
  System: [
    { key: 'socials', label: 'Social links' },
    { key: 'seo_records', label: 'SEO overrides' },
    { key: 'new_submissions', label: 'Unread enquiries' },
    { key: 'assets', label: 'Uploaded files' },
  ],
};

export interface SectionHubOptions {
  role: string;
  roleMap?: Record<string, PermissionLevel>;
  counts: Record<string, number>;
  /** Extra cards for a section-specific board (the media hub's hero/watch numbers). */
  extraStats?: HubStat[];
  /** Modules to leave off this hub's tool grid (they get their own board instead). */
  omit?: string[];
}

export async function sectionHub(key: string, options: SectionHubOptions): Promise<SectionHub> {
  const section = sectionFor(key) ?? CMS_SECTIONS[1]!;
  const tools = modulesForSection(section.key)
    .filter((m) => !(options.omit ?? []).includes(m.key))
    .filter((m) => can(options.role, m.permission ?? m.key, 'read', options.roleMap))
    .map((m) => ({
      key: m.key,
      label: m.label,
      href: `/admin/${m.key}`,
      icon: m.icon,
      description: m.description,
      count: options.counts[m.key],
      level: levelFor(options.role, m.permission ?? m.key, options.roleMap),
      live: m.publicBase,
    }));
  const stats: HubStat[] = (SECTION_STATS[section.key] ?? [])
    .map((stat) => ({ ...stat, value: options.counts[stat.key] ?? 0 }) as HubStat)
    .concat(options.extraStats ?? []);
  return { section, stats, tools };
}

/* ── media hub boards ────────────────────────────────────────────────────── */

export interface MediaVideoBoardRow {
  id: string;
  title: string;
  format: 'long' | 'short';
  form: string | null;
  status: string;
  heroPreview: boolean;
  isFeatured: boolean;
  duration: string | null;
  poster: string | null;
  client: string | null;
  storyClient: string | null;
  storyKind: string | null;
  storyQuote: string | null;
  /** What the public rail would call this story if the fields are left as they are. */
  derivedAuthor: string;
  derivedContext: string;
}

/**
 * Every video the CMS holds, with what the hero and the client-stories rail would do with it.
 * Drafts are included on purpose: the boards are where an editor decides what goes live.
 */
export async function mediaVideoBoard(): Promise<MediaVideoBoardRow[]> {
  const rows = await mediaVideoRows({ includeDrafts: true });
  const posters = await assetUrls(rows.map((row) => row.posterAssetId));
  const { formatDuration } = await import('../media/portfolio');
  const { deriveStory } = await import('../media/story');
  return rows.map((row) => {
    const short = row.form === 'short_form' || row.source === 'tiktok' || row.source === 'instagram';
    const story = deriveStory({
      title: row.title,
      description: row.description,
      client: row.client,
      storyClient: row.storyClient,
      storyKind: row.storyKind,
    });
    return {
      id: row.id,
      title: row.title,
      format: short ? ('short' as const) : ('long' as const),
      form: row.form,
      status: row.status,
      heroPreview: row.heroPreview,
      isFeatured: row.isFeatured,
      duration: formatDuration(row.durationS),
      poster: row.posterAssetId ? (posters[row.posterAssetId] ?? null) : row.posterUrl,
      client: row.client,
      storyClient: row.storyClient,
      storyKind: row.storyKind,
      storyQuote: row.storyQuote,
      derivedAuthor: story.author,
      derivedContext: story.context,
    };
  });
}

/** The current hero order, resolved to titles — what the visitor actually sees, in order. */
export async function mediaHeroOrder(): Promise<{ id: string; title: string; poster: string | null }[]> {
  const board = await mediaVideoBoard();
  return board
    .filter((row) => row.heroPreview && row.format === 'short' && row.status === 'published')
    .map((row) => ({ id: row.id, title: row.title, poster: row.poster }));
}
