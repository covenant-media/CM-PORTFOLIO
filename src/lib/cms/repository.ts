/**
 * Generic CMS repository: the CRUD engine behind every admin module.
 * Validation comes from the field definitions; SQL from the table registry.
 */
import { revalidateTag } from 'next/cache';
import { deleteRow as dbDelete, getById, getDb, insertRow, newId, nowIso, updateRow, likeParam, execute } from '../db';
import { TABLES, type TableName } from '../db/tables';
import { validateFields, type FieldDef } from './fields';
import { CMS_MODULE_MAP, type CmsModuleDef } from './modules';
import { ApiError } from '../auth/guard';
import { audit } from '../auth/guard';
import { slugify } from '../utils/text';
import { assetReferences } from '../media/storage';

export interface ListQuery {
  q?: string;
  filters?: Record<string, string>;
  page?: number;
  per?: number;
  sort?: string;
  status?: string;
}

export interface ListResult {
  rows: Record<string, unknown>[];
  total: number;
  page: number;
  per: number;
  pages: number;
}

/** Fields that actually map to a DB column for this module. */
export function dbFields(module: CmsModuleDef): FieldDef[] {
  const spec = TABLES[module.table];
  return module.fields.filter((f) => f.key in spec.columns || f.key === spec.pk);
}

function moduleDef(key: string): CmsModuleDef {
  const def = CMS_MODULE_MAP[key];
  if (!def) throw new ApiError(404, `Unknown CMS module: ${key}`);
  return def;
}

function fixedWhere(module: CmsModuleDef): { sql: string; params: unknown[] } {
  if (!module.fixed) return { sql: '', params: [] };
  const parts: string[] = [];
  const params: unknown[] = [];
  for (const [key, value] of Object.entries(module.fixed)) {
    params.push(value);
    parts.push(`${key} = $${params.length}::text`);
  }
  return { sql: parts.length ? ` AND ${parts.join(' AND ')}` : '', params };
}

export async function list(moduleKey: string, query: ListQuery = {}): Promise<ListResult> {
  const module = moduleDef(moduleKey);
  const spec = TABLES[module.table];
  const db = await getDb();
  const where: string[] = ['1=1'];
  const params: unknown[] = [];

  const fixed = fixedWhere(module);
  if (fixed.sql) {
    where.push(fixed.sql.replace(/^ AND /, ''));
    params.push(...fixed.params);
  }

  if (query.q) {
    const columns = (module.search ?? [module.primary]).filter((c) => c in spec.columns);
    if (columns.length) {
      const or: string[] = [];
      for (const col of columns) {
        params.push(`%${query.q.slice(0, 80)}%`);
        or.push(`${col}::text ILIKE $${params.length}`);
      }
      where.push(`(${or.join(' OR ')})`);
    }
  }

  if (query.status && 'status' in spec.columns) {
    params.push(query.status);
    where.push(`status = $${params.length}::text`);
  }

  for (const [key, value] of Object.entries(query.filters ?? {})) {
    if (!value) continue;
    if (!(key in spec.columns)) continue;
    if (module.fixed && key in module.fixed) continue;
    params.push(value);
    where.push(`${key} = $${params.length}::text`);
  }

  const per = Math.min(Math.max(Number(query.per ?? 25), 1), 200);
  const page = Math.max(Number(query.page ?? 1), 1);
  const sortSql = safeSort(spec, query.sort) || module.defaultSort || (module.sortable ? ' ORDER BY sort_order ASC, created_at DESC' : ' ORDER BY created_at DESC');

  const whereSql = `WHERE ${where.join(' AND ')}`;
  const rows = await db.select<Record<string, unknown>>(
    `SELECT * FROM ${spec.table} ${whereSql}${sortSql} LIMIT ${per} OFFSET ${(page - 1) * per}`,
    params,
  );
  const countRows = await db.select<{ n: number | string }>(`SELECT count(*)::int AS n FROM ${spec.table} ${whereSql}`, params);
  const total = Number(countRows[0]?.n ?? 0);

  return {
    rows: rows.map((r) => hydrate(module, r)),
    total,
    page,
    per,
    pages: Math.max(1, Math.ceil(total / per)),
  };
}

function safeSort(spec: (typeof TABLES)[TableName], sort?: string): string {
  if (!sort) return '';
  const [rawCol, dir] = sort.split(':');
  const col = (rawCol ?? '').replace(/[^a-z_]/gi, '');
  if (!(col in spec.columns)) return '';
  return ` ORDER BY ${col} ${String(dir).toLowerCase() === 'desc' ? 'DESC' : 'ASC'} NULLS LAST`;
}

/** JSONB columns come back typed already; this normalises the odd string case. */
export function hydrate(module: CmsModuleDef, row: Record<string, unknown>): Record<string, unknown> {
  const spec = TABLES[module.table];
  const out: Record<string, unknown> = { ...row };
  for (const [key, col] of Object.entries(spec.columns)) {
    if (col.type === 'jsonb' && typeof out[key] === 'string') {
      try {
        out[key] = JSON.parse(out[key] as string);
      } catch {
        out[key] = col.nullable ? null : [];
      }
    }
    if ((col.type === 'int' || col.type === 'numeric') && typeof out[key] === 'string') out[key] = Number(out[key]);
  }
  return out;
}

function serialiseJsonb(module: CmsModuleDef, values: Record<string, unknown>): Record<string, unknown> {
  const spec = TABLES[module.table];
  const out = { ...values };
  for (const [key, col] of Object.entries(spec.columns)) {
    if (col.type !== 'jsonb') continue;
    const value = out[key];
    if (value === undefined || value === null) {
      out[key] = col.nullable ? null : key === 'props' || key === 'seo' || key === 'overrides' || key === 'embed_config' || key === 'metadata' || key === 'variants' || key === 'extra' ? {} : [];
      continue;
    }
    out[key] = JSON.stringify(value);
  }
  return out;
}

async function uniqueSlug(module: CmsModuleDef, slugField: string, desired: string, exceptId?: string): Promise<string> {
  const spec = TABLES[module.table];
  if (!(slugField in spec.columns)) return desired;
  const db = await getDb();
  let candidate = desired || 'item';
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const params: unknown[] = [candidate];
    let sql = `SELECT count(*)::int AS n FROM ${spec.table} WHERE ${slugField} = $1::text`;
    const fixed = fixedWhere(module);
    sql += fixed.sql;
    params.push(...fixed.params);
    if (exceptId) {
      params.push(exceptId);
      sql += ` AND ${spec.pk} <> $${params.length}::text`;
    }
    const rows = await db.select<{ n: number | string }>(sql, params);
    if (Number(rows[0]?.n ?? 0) === 0) return candidate;
    candidate = `${desired}-${attempt + 2}`;
  }
  return `${desired}-${newId('x').slice(4, 8)}`;
}

export async function create(moduleKey: string, input: Record<string, unknown>, ctx: { user: { id: string } }): Promise<Record<string, unknown>> {
  const module = moduleDef(moduleKey);
  const fields = dbFields(module);
  const merged: Record<string, unknown> = { ...input, ...(module.fixed ?? {}) };
  const { ok, value, errors } = validateFields(fields, merged);
  if (!ok) throw new ApiError(422, 'Some fields need attention', errors);

  if (module.slugFrom) {
    const slugField = module.fields.find((f) => f.type === 'slug');
    if (slugField) {
      const desired = value[slugField.key] ? String(value[slugField.key]) : slugify(String(value[module.slugFrom] ?? ''), { allowSlashes: true });
      value[slugField.key] = await uniqueSlug(module, slugField.key, desired);
    }
  }

  if ('published_at' in TABLES[module.table].columns && value.status === 'published' && !value.published_at) {
    value.published_at = nowIso();
  }
  if (module.table === 'blog_post' && typeof value.body === 'string') {
    const { renderMarkdown } = await import('../utils/markdown');
    const { readingTime } = await import('../utils/text');
    value.body_html = renderMarkdown(value.body);
    if (!value.reading_minutes) value.reading_minutes = readingTime(value.body);
  }

  const row = await insertRow(module.table, serialiseJsonb(module, value));
  const id = String(row[TABLES[module.table].pk] ?? '');
  await audit(ctx, { action: 'create', module: moduleKey, entity: module.table, entityId: id, summary: `${module.singular} created` });
  await revalidateContent(moduleKey, id, 'create');
  return hydrate(module, row);
}

export async function read(moduleKey: string, id: string): Promise<Record<string, unknown>> {
  const module = moduleDef(moduleKey);
  const row = await getById(module.table, id);
  if (!row) throw new ApiError(404, `No ${module.singular.toLowerCase()} with that id`);
  return hydrate(module, row);
}

export async function update(moduleKey: string, id: string, input: Record<string, unknown>, ctx: { user: { id: string } }): Promise<Record<string, unknown>> {
  const module = moduleDef(moduleKey);
  const spec = TABLES[module.table];
  const existing = await getById(module.table, id);
  if (!existing) throw new ApiError(404, `No ${module.singular.toLowerCase()} with that id`);

  const fields = dbFields(module);
  const merged: Record<string, unknown> = { ...input, ...(module.fixed ?? {}) };
  const { ok, value, errors } = validateFields(fields, merged);
  if (!ok) throw new ApiError(422, 'Some fields need attention', errors);

  const slugField = module.fields.find((f) => f.type === 'slug');
  if (module.slugFrom && slugField && value[slugField.key]) {
    const current = String(existing[slugField.key] ?? '');
    if (current !== String(value[slugField.key])) {
      value[slugField.key] = await uniqueSlug(module, slugField.key, String(value[slugField.key]), id);
    }
  }

  if ('published_at' in spec.columns && value.status === 'published' && !existing.published_at) {
    value.published_at = nowIso();
  }
  if (module.table === 'blog_post' && typeof value.body === 'string') {
    const { renderMarkdown } = await import('../utils/markdown');
    const { readingTime } = await import('../utils/text');
    value.body_html = renderMarkdown(value.body);
    if (!value.reading_minutes) value.reading_minutes = readingTime(value.body);
  }

  const row = await updateRow(module.table, id, serialiseJsonb(module, value));
  await audit(ctx, { action: 'update', module: moduleKey, entity: module.table, entityId: id, summary: `${module.singular} updated`, meta: { fields: Object.keys(value) } });
  await revalidateContent(moduleKey, id, 'update');
  return hydrate(module, row ?? existing);
}

export async function remove(moduleKey: string, id: string, ctx: { user: { id: string } }, opts: { force?: boolean } = {}): Promise<void> {
  const module = moduleDef(moduleKey);
  const existing = await getById(module.table, id);
  if (!existing) throw new ApiError(404, `No ${module.singular.toLowerCase()} with that id`);

  if (module.table === 'media_asset') {
    const refs = await assetReferences(id);
    if (refs.total > 0 && !opts.force) {
      throw new ApiError(409, `In use by ${refs.total} record${refs.total === 1 ? '' : 's'}: ${refs.places.map((p) => `${p.label} (${p.count})`).join(', ')}. Unlink it first, or choose "Replace".`, {
        references: String(refs.total),
      });
    }
    const db = await getDb();
    const asset = await db.select<{ storage: string; public_id: string; url: string; variants: unknown }>('SELECT storage, public_id, url, variants FROM media_asset WHERE id = $1::text', [id]);
    const record = asset[0];
    if (record?.storage === 'local' && record.public_id) {
      const fs = await import('node:fs/promises');
      const path = await import('node:path');
      const root = process.env.CM_UPLOAD_DIR || path.join(process.cwd(), 'public', 'uploads');
      await fs.unlink(path.join(root, record.public_id)).catch(() => undefined);
      const variants = (typeof record.variants === 'string' ? JSON.parse(record.variants) : record.variants) as Record<string, { url?: string }>;
      for (const variant of Object.values(variants ?? {})) {
        const url = variant?.url;
        if (url?.startsWith('/uploads/')) await fs.unlink(path.join(root, url.replace('/uploads/', ''))).catch(() => undefined);
      }
    }
  }

  // Blocks referenced by pages must be unlinked first (keeps pages renderable).
  if (module.table === 'content_block') {
    const db = await getDb();
    await db.execute('DELETE FROM page_block WHERE block_id = $1::text', [id]);
  }

  await dbDelete(module.table, id);
  await audit(ctx, { action: 'delete', module: moduleKey, entity: module.table, entityId: id, summary: `${module.singular} deleted` });
  await revalidateContent(moduleKey, id, 'delete');
}

export async function setStatus(moduleKey: string, id: string, status: string, ctx: { user: { id: string } }): Promise<Record<string, unknown>> {
  const module = moduleDef(moduleKey);
  const spec = TABLES[module.table];
  if (!('status' in spec.columns)) throw new ApiError(400, `${module.singular} has no publishing state`);
  const patch: Record<string, unknown> = { status };
  if (status === 'published' && 'published_at' in spec.columns) {
    const existing = await getById(module.table, id);
    if (!existing?.published_at) patch.published_at = nowIso();
  }
  if ('is_visible' in spec.columns) patch.is_visible = status === 'published';
  const row = await updateRow(module.table, id, patch);
  await audit(ctx, { action: status === 'published' ? 'publish' : 'unpublish', module: moduleKey, entity: module.table, entityId: id, summary: `${module.singular} set to ${status}` });
  await revalidateContent(moduleKey, id, 'update');
  return hydrate(module, row ?? {});
}

export async function setField(moduleKey: string, id: string, key: string, value: unknown, ctx: { user: { id: string } }): Promise<Record<string, unknown>> {
  const module = moduleDef(moduleKey);
  const spec = TABLES[module.table];
  if (!(key in spec.columns)) throw new ApiError(400, `Unknown field: ${key}`);
  const field = module.fields.find((f) => f.key === key);
  let finalValue = value;
  if (field) {
    const { ok, value: coerced } = validateFields([field], { [key]: value });
    if (ok) finalValue = coerced[key];
  }
  const cast = (spec.columns as Record<string, { type: string }>)[key];
  const patch = cast?.type === 'jsonb' ? { [key]: JSON.stringify(finalValue ?? {}) } : { [key]: finalValue };
  const row = await updateRow(module.table, id, patch as Record<string, unknown>);
  await audit(ctx, { action: 'update', module: moduleKey, entity: module.table, entityId: id, summary: `${key} changed` });
  await revalidateContent(moduleKey, id, 'update');
  return hydrate(module, row ?? {});
}

export async function reorder(moduleKey: string, ids: string[], ctx: { user: { id: string } }): Promise<void> {
  const module = moduleDef(moduleKey);
  const spec = TABLES[module.table];
  if (!('sort_order' in spec.columns)) throw new ApiError(400, `${module.singular} cannot be ordered`);
  const db = await getDb();
  await db.transaction(async (tx) => {
    for (let i = 0; i < ids.length; i += 1) {
      const id = String(ids[i]).slice(0, 64);
      await tx.execute(
        `UPDATE ${spec.table} SET sort_order = $1::int, updated_at = $2::timestamptz WHERE ${spec.pk} = $3::text`,
        [i * 10, nowIso(), id],
      );
    }
  });
  await audit(ctx, { action: 'reorder', module: moduleKey, entity: module.table, summary: `Reordered ${ids.length} ${module.label.toLowerCase()}` });
  await revalidateContent(moduleKey, '', 'update');
}

export async function duplicate(moduleKey: string, id: string, ctx: { user: { id: string } }): Promise<Record<string, unknown>> {
  const module = moduleDef(moduleKey);
  const existing = await read(moduleKey, id);
  const copy: Record<string, unknown> = { ...existing };
  delete copy.id;
  delete copy.created_at;
  delete copy.updated_at;
  copy.status = 'draft';
  copy.published_at = null;
  copy.is_featured = false;
  const titleKey = module.slugFrom ?? module.primary;
  if (typeof copy[titleKey] === 'string') copy[titleKey] = `${copy[titleKey]} (copy)`.slice(0, 100);
  const slugField = module.fields.find((f) => f.type === 'slug');
  if (slugField && typeof copy[slugField.key] === 'string') copy[slugField.key] = `${copy[slugField.key]}-copy`;
  return create(moduleKey, copy, ctx);
}

/** Page ⇄ section attachment (drag order, placement, visibility). */
export async function setPageBlocks(
  pageId: string,
  blocks: { block_id: string; placement?: string; sort_order?: number; is_visible?: boolean; overrides?: Record<string, unknown> }[],
  ctx: { user: { id: string } },
): Promise<void> {
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx.execute('DELETE FROM page_block WHERE page_id = $1::text', [pageId]);
    for (let i = 0; i < blocks.length; i += 1) {
      const block = blocks[i];
      if (!block?.block_id) continue;
      await tx.execute(
        `INSERT INTO page_block (page_id, block_id, placement, variant, sort_order, is_visible, overrides)
         VALUES ($1::text,$2::text,$3::text,$4::text,$5::int,$6::boolean,$7::jsonb)
         ON CONFLICT (page_id, block_id) DO UPDATE SET placement = EXCLUDED.placement, sort_order = EXCLUDED.sort_order,
           is_visible = EXCLUDED.is_visible, overrides = EXCLUDED.overrides`,
        [
          pageId,
          block.block_id,
          (block.placement ?? 'body').slice(0, 24),
          null,
          Number.isFinite(Number(block.sort_order)) ? Number(block.sort_order) : i,
          block.is_visible !== false,
          JSON.stringify(block.overrides ?? {}),
        ],
      );
    }
  });
  await audit(ctx, { action: 'update', module: 'pages', entity: 'page_block', entityId: pageId, summary: `Section layout saved (${blocks.length})` });
  await revalidateContent('pages', pageId, 'update');
}

export async function revalidateContent(moduleKey: string, id: string, _action?: 'create' | 'update' | 'delete'): Promise<void> {
  try {
    revalidateTag('content');
    revalidateTag(`content:${moduleKey}`);
    if (id) revalidateTag(`content:${moduleKey}:${id}`);
  } catch {
    /* outside a request context (scripts) — caches are not active */
  }
}

/** Counts powering the admin dashboard. */
export async function dashboardCounts(): Promise<Record<string, number>> {
  const db = await getDb();
  const queries: [string, string][] = [
    ['media_projects', 'SELECT count(*)::int AS n FROM project WHERE division = $1::text'],
    ['tech_projects', 'SELECT count(*)::int AS n FROM project WHERE division = $1::text'],
    ['videos', 'SELECT count(*)::int AS n FROM media_video'],
    ['assets', 'SELECT count(*)::int AS n FROM media_asset'],
    ['posts', 'SELECT count(*)::int AS n FROM blog_post'],
    ['testimonials', 'SELECT count(*)::int AS n FROM testimonial'],
    ['services', 'SELECT count(*)::int AS n FROM service'],
    ['submissions', 'SELECT count(*)::int AS n FROM contact_submission'],
    ['new_submissions', 'SELECT count(*)::int AS n FROM contact_submission WHERE status = $1::text'],
    ['published_projects', 'SELECT count(*)::int AS n FROM project WHERE status = $1::text'],
    ['samples', 'SELECT count(*)::int AS n FROM project WHERE is_sample = TRUE'],
    ['pricing', 'SELECT count(*)::int AS n FROM pricing_package'],
  ];
  const args: Record<string, string> = {
    media_projects: 'media',
    tech_projects: 'tech',
    published_projects: 'published',
    new_submissions: 'new',
  };
  const out: Record<string, number> = {};
  for (const [key, sql] of queries) {
    try {
      const rows = await db.select<{ n: number | string }>(sql, args[key] ? [args[key]] : []);
      out[key] = Number(rows[0]?.n ?? 0);
    } catch {
      out[key] = 0;
    }
  }
  return out;
}

/** Options for relation fields. */
export async function relationOptions(moduleKey: string, limit = 200): Promise<{ value: string; label: string; meta?: string }[]> {
  const module = moduleDef(moduleKey);
  const spec = TABLES[module.table];
  const label = module.primary in spec.columns ? module.primary : spec.pk;
  const db = await getDb();
  const fixed = fixedWhere(module);
  const rows = await db.select<Record<string, unknown>>(
    `SELECT ${spec.pk} AS value, ${label} AS label FROM ${spec.table}${fixed.sql} ${module.defaultSort ?? `ORDER BY ${label} ASC`} LIMIT ${limit}`,
    fixed.params,
  );
  return rows.map((r) => ({ value: String(r.value), label: String(r.label ?? r.value) }));
}

export async function exportSubmissionsCsv(filters: Record<string, string> = {}): Promise<string> {
  const db = await getDb();
  const where: string[] = ['1=1'];
  const params: unknown[] = [];
  for (const key of ['form', 'status'] as const) {
    if (filters[key]) {
      params.push(filters[key]);
      where.push(`${key} = $${params.length}::text`);
    }
  }
  const rows = await db.select<Record<string, unknown>>(
    `SELECT * FROM contact_submission WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT 5000`,
    params,
  );
  const headers = ['created_at', 'form', 'name', 'email', 'phone', 'organization', 'service', 'project_type', 'event_date', 'location', 'budget_band', 'timeline', 'requirements', 'message', 'page_path', 'status'];
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(','), ...rows.map((row) => headers.map((h) => escape(row[h])).join(','))].join('\n');
}

export async function submissionCounts(): Promise<{ total: number; new: number; byForm: Record<string, number> }> {
  const db = await getDb();
  const rows = await db.select<{ form: string; n: number | string; newn: number | string }>(
    `SELECT form, count(*)::int AS n, count(*) FILTER (WHERE status = 'new')::int AS newn FROM contact_submission GROUP BY form`,
  );
  const byForm: Record<string, number> = {};
  let total = 0;
  let fresh = 0;
  for (const row of rows) {
    byForm[row.form] = Number(row.n);
    total += Number(row.n);
    fresh += Number(row.newn);
  }
  return { total, new: fresh, byForm };
}

export { execute, likeParam };
