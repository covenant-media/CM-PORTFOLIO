/**
 * CMS read helpers that the generic repository does not cover: the section
 * composer, the media grid, the featured board, the dashboard and the inbox.
 * Everything here is server-only and every list is bounded.
 */
import { getDb } from '../db';
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
  items: AdminNavItem[];
}

/** The sidebar is the module registry filtered by what this role may even read. */
export async function adminNav(role: string, roleMap?: Record<string, PermissionLevel>): Promise<AdminNavGroup[]> {
  return CmsModuleGroups.map((group) => ({
    ...group,
    items: CMS_MODULES.filter((m) => m.group === group.key && can(role, m.permission ?? m.key, 'read', roleMap)).map((m) => ({
      key: m.key,
      label: m.label,
      icon: m.icon,
      level: levelFor(role, m.permission ?? m.key, roleMap),
    })),
  })).filter((group) => group.items.length > 0);
}

export const CmsModuleGroups = [
  { key: 'Structure', label: 'Structure', hint: 'Pages, sections, menus' },
  { key: 'Brand', label: 'Brand & settings', hint: 'How the whole platform reads' },
  { key: 'Media', label: 'Media portfolio', hint: 'Films, stills, projects' },
  { key: 'Technology', label: 'Tech portfolio', hint: 'Systems, skills, resume' },
  { key: 'Trust', label: 'Proof', hint: 'Team, testimonials, credentials' },
  { key: 'Commerce', label: 'Offers & contact', hint: 'Pricing, contact routing' },
  { key: 'Insight', label: 'Writing', hint: 'Journal' },
  { key: 'System', label: 'System', hint: 'SEO, inbox, media library' },
] as const;

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
