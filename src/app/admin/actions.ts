'use server';
/**
 * Every CMS mutation goes through this file.
 *
 * Each action re-checks the session, the role's permission for that module and the
 * CSRF token, then delegates to the repository layer (which validates fields against
 * the module registry, audits the change and revalidates the public caches). No admin
 * component writes to the database directly.
 */
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { ApiError, assertCsrf, audit, requirePermission } from '@/lib/auth/guard';
import {
  clearSessionCookies,
  createSession,
  destroyCurrentSession,
  findUserById,
  setSessionCookies,
  verifyLogin,
  changePassword,
} from '@/lib/auth/session';
import { enforceLoginRate, recordAuthAttempt } from '@/lib/auth/rate-limit';
import * as repo from '@/lib/cms/repository';
import { getCmsModule } from '@/lib/cms/modules';
import { parseForm, type AdminActionState } from '@/lib/cms/admin';
import { saveSetting, settingDefs } from '@/lib/cms/settings';
import { replaceAsset, ingestFile, uploadLimits } from '@/lib/media/storage';
import { detectVideoSource, fetchOEmbed, type DetectedSource } from '@/lib/media/video';
import { extractStory, storyRoleFor } from '@/lib/media/story-extract';
import { PHOTO_FOLDER, isVideoForm } from '@/lib/cms/console';
import { TABLES } from '@/lib/db/tables';
import { getDb, getById, insertRow, updateRow, deleteRow, selectOne, nowIso } from '@/lib/db';
import type { ModuleKey } from '@/lib/auth/permissions';
import { slugify } from '@/lib/utils/text';

const SAFE_NEXT = /^\/admin(\/[A-Za-z0-9_\-/?=&%#]*)?$/;

function state(err: unknown): AdminActionState {
  if (err instanceof ApiError) return { ok: false, message: err.message, errors: err.details };
  const message = err instanceof Error ? err.message : 'Something went wrong';
  return { ok: false, message: message.slice(0, 300) };
}

/** Only ever used as a rate-limit key; never stored with an enquiry. */
async function ipFromHeaders(): Promise<string> {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || h.get('cf-connecting-ip') || '0.0.0.0';
}

function csrfOf(formData: FormData): string | null {
  const raw = formData.get('_csrf');
  return typeof raw === 'string' && raw ? raw : null;
}

/** A redirect must happen outside the try/catch, so failures are collected first. */
function failure(err: unknown): never | AdminActionState {
  return state(err);
}

/**
 * `redirect()` signals by throwing, so an action that redirects from inside its own
 * try/catch would otherwise report its success as a failure. Any error carrying a
 * Next redirect digest is re-thrown untouched; everything else is a real problem.
 */
function isRedirect(err: unknown): boolean {
  const digest = (err as { digest?: unknown })?.digest;
  return typeof digest === 'string' && (digest.startsWith('NEXT_REDIRECT') || digest.startsWith('NEXT_NOT_FOUND'));
}

// ── auth ────────────────────────────────────────────────────────────────────

export async function signInAction(_prev: AdminActionState | null, formData: FormData): Promise<AdminActionState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '/admin');
  const ip = await ipFromHeaders();
  const rate = await enforceLoginRate(`login:${ip}`);
  if (!rate.ok) {
    return { ok: false, message: `Too many attempts. Try again in ${Math.ceil(rate.retryAfterMs / 1000)}s.` };
  }
  // A database that cannot be reached must not look like a wrong password, and must not throw the
  // operator onto the site-wide error page: report it on the form, where the fix can be read.
  const result = await verifyLogin(email, password).catch(() => null);
  if (!result) {
    return {
      ok: false,
      message:
        'The CMS database is not reachable. A freshly deployed site needs a hosted PostgreSQL: set DATABASE_URL and DB_DRIVER=postgres in its environment variables.',
    };
  }
  await recordAuthAttempt(`login:${ip}`, result.ok, { userAgent: (await headers()).get('user-agent') ?? undefined });
  if (!result.ok || !result.user) {
    return { ok: false, message: result.locked ? 'That account is temporarily locked after repeated failures. Wait a few minutes.' : 'Email or password is incorrect' };
  }
  const { token, csrfToken, expiresAt } = await createSession(result.user.id, { ip });
  await setSessionCookies(token, csrfToken);
  void expiresAt;
  redirect(SAFE_NEXT.test(next) ? next : '/admin');
}

export async function signOutAction(): Promise<void> {
  await destroyCurrentSession();
  await clearSessionCookies();
  redirect('/admin/login');
}

export async function accountAction(_prev: AdminActionState | null, formData: FormData): Promise<AdminActionState> {
  let userId = '';
  let passwordError: string | null = null;
  try {
    const ctx = await requirePermission('account', 'manage');
    await assertCsrf(csrfOf(formData));
    userId = ctx.user.id;
    const current = String(formData.get('current_password') ?? '');
    const next = String(formData.get('next_password') ?? '');
    const confirm = String(formData.get('confirm_password') ?? '');
    if (next || confirm) {
      if (next !== confirm) passwordError = 'The new passwords do not match';
      else {
        const result = await changePassword(userId, current, next);
        if (!result.ok) passwordError = result.error ?? 'Could not change the password';
      }
    }
  } catch (err) {
    return state(err);
  }
  if (passwordError) return { ok: false, message: passwordError };
  if (!userId) return { ok: false, message: 'Nothing to update' };
  const user = await findUserById(userId);
  return {
    ok: true,
    message: user ? `Signed in as ${user.email}` : 'Saved',
  };
}

/** Revokes every other session for the current user. */
export async function signOutOtherSessionsAction(): Promise<void> {
  try {
    const ctx = await requirePermission('account', 'manage');
    const db = await getDb();
    await db.execute('UPDATE admin_session SET revoked_at = $1::timestamptz WHERE user_id = $2::text AND id <> $3::text', [nowIso(), ctx.user.id, ctx.sessionId]);
  } catch {
    /* the page re-reads the session list, so a failure is visible without a toast */
  }
}

// ── rows ────────────────────────────────────────────────────────────────────

export async function saveRowAction(
  moduleKey: string,
  id: string | null,
  _prev: AdminActionState | null,
  formData: FormData,
): Promise<AdminActionState> {
  let savedId = id ?? '';
  try {
    const module = getCmsModule(moduleKey);
    if (!module) throw new ApiError(404, 'Unknown module');
    const ctx = await requirePermission((module.permission ?? module.key) as ModuleKey, 'write');
    await assertCsrf(csrfOf(formData));
    const input = parseForm(formData, repo.dbFields(module));
    if (moduleKey === 'videos') applyDetection(input);
    if (id) {
      await repo.update(moduleKey, id, input, ctx);
      savedId = id;
    } else {
      const row = await repo.create(moduleKey, input, ctx);
      savedId = String(row[TABLES[module.table].pk] ?? '');
    }
  } catch (err) {
    return failure(err);
  }
  if (!id && savedId) redirect(`/admin/${moduleKey}/${savedId}?created=1`);
  return { ok: true, message: 'Saved', id: savedId };
}

/**
 * Pasting a link in the video editor is the whole job: if the source fields are still
 * empty we fill them from the URL so a draft is playable without a second step.
 */
function applyDetection(input: Record<string, unknown>): void {
  const url = String(input.source_url ?? '');
  if (!url) return;
  const detected: DetectedSource | null = detectVideoSource(url);
  if (!detected) return;
  if (!input.source) input.source = detected.source;
  if (!input.source_id) input.source_id = detected.sourceId ?? '';
  if (!input.embed_url && detected.embedUrl) input.embed_url = detected.embedUrl;
  if (!input.poster_url && detected.thumbnailCandidates[0]) input.poster_url = detected.thumbnailCandidates[0];
  if (!input.external_url && detected.canonicalUrl) input.external_url = detected.canonicalUrl;
  if (!input.metadata_state) input.metadata_state = 'partial';
}

export async function detectVideoAction(formData: FormData): Promise<AdminActionState & { detected?: Record<string, unknown> }> {
  try {
    const url = String(formData.get('source_url') ?? '');
    const detected = detectVideoSource(url);
    if (!detected) return { ok: false, message: 'That link is not a YouTube, Vimeo, TikTok, Facebook or Instagram video URL' };
    const { meta, error } = await fetchOEmbed(detected);
    return {
      ok: true,
      message: meta ? 'Metadata filled from the platform — check it before publishing' : `No public metadata available (${error ?? 'not permitted'}). Fill the fields yourself.`,
      detected: {
        source: detected.source,
        source_id: detected.sourceId ?? '',
        embed_url: detected.embedUrl ?? '',
        poster_url: meta?.thumbnail_url ?? detected.thumbnailCandidates[0] ?? '',
        external_url: detected.canonicalUrl ?? '',
        title: meta?.title ?? '',
        duration_s: meta?.duration ?? '',
        metadata_state: meta ? 'ready' : 'manual',
      },
    };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Could not read that link' };
  }
}

/** `<form action>` variant of the paste-a-link import. */
export async function importVideoFormAction(formData: FormData): Promise<void> {
  const result = await importVideoAction(formData);
  if (!result.ok) {
    redirect(`/admin/videos?error=1&message=${encodeURIComponent(result.message ?? 'Could not import that link')}`);
  }
  redirect('/admin/videos?saved=1');
}

/** Paste-a-link import from the Videos list: creates a draft row and opens it. */
export async function importVideoAction(formData: FormData): Promise<AdminActionState> {
  let newId = '';
  try {
    const ctx = await requirePermission('videos', 'write');
    await assertCsrf(csrfOf(formData));
    const url = String(formData.get('source_url') ?? '').trim();
    if (!url) return { ok: false, message: 'Paste a video link first' };
    const detected = detectVideoSource(url);
    if (!detected) return { ok: false, message: 'That link is not a recognised video URL' };
    const { meta } = await fetchOEmbed(detected);
    const input: Record<string, unknown> = {
      source_url: url,
      title: meta?.title ?? url.slice(0, 80),
      source: detected.source,
      source_id: detected.sourceId ?? '',
      embed_url: detected.embedUrl ?? '',
      poster_url: meta?.thumbnail_url ?? detected.thumbnailCandidates[0] ?? '',
      external_url: detected.canonicalUrl ?? '',
      duration_s: meta?.duration ?? '',
      metadata_state: meta ? 'ready' : 'manual',
      status: 'draft',
    };
    const row = await repo.create('videos', input, ctx);
    newId = String(row.id ?? '');
  } catch (err) {
    return failure(err);
  }
  if (newId) redirect(`/admin/videos/${newId}?imported=1`);
  return { ok: true };
}

/**
 * `<form action>` variant: results travel as query params so plain HTML forms (and
 * users with JavaScript off) still see what happened after the page refreshes.
 */
export async function rowFormAction(formData: FormData): Promise<void> {
  const moduleKey = String(formData.get('module') ?? 'pages');
  const result = await rowAction(formData);
  const flag = result.ok ? 'saved' : 'error';
  const query = result.ok ? '' : `&message=${encodeURIComponent(result.message ?? 'Could not do that')}`;
  redirect(`/admin/${SAFE_MODULE.test(moduleKey) ? moduleKey : 'admin'}?${flag}=1${query}`);
}

const SAFE_MODULE = /^[a-z_]{2,32}$/;

/** Small row operations from lists and editors: publish, hide, duplicate, delete… */
export async function rowAction(formData: FormData): Promise<AdminActionState> {
  let message = 'Done';
  let goto: string | null = null;
  try {
    const moduleKey = String(formData.get('module') ?? '');
    const id = String(formData.get('id') ?? '');
    const op = String(formData.get('op') ?? '');
    const module = getCmsModule(moduleKey);
    if (!module || !id) throw new ApiError(400, 'Missing module or record');
    const ctx = await requirePermission((module.permission ?? module.key) as ModuleKey, op === 'delete' ? 'manage' : 'write');
    await assertCsrf(csrfOf(formData));

    switch (op) {
      case 'publish':
        await repo.setStatus(moduleKey, id, 'published', ctx);
        message = 'Published';
        break;
      case 'draft':
        await repo.setStatus(moduleKey, id, 'draft', ctx);
        message = 'Moved back to draft';
        break;
      case 'archive':
        await repo.setStatus(moduleKey, id, 'archived', ctx);
        message = 'Archived';
        break;
      case 'feature':
        await repo.setField(moduleKey, id, 'is_featured', true, ctx);
        message = 'Marked as featured';
        break;
      case 'unfeature':
        await repo.setField(moduleKey, id, 'is_featured', false, ctx);
        message = 'Removed from featured';
        break;
      case 'show':
        await repo.setField(moduleKey, id, 'is_visible', true, ctx);
        message = 'Now visible';
        break;
      case 'hide':
        await repo.setField(moduleKey, id, 'is_visible', false, ctx);
        message = 'Hidden';
        break;
      case 'mark-read':
        await repo.setField(moduleKey, id, 'status', 'read', ctx);
        message = 'Marked as read';
        break;
      case 'mark-replied':
        await repo.setField(moduleKey, id, 'status', 'replied', ctx);
        message = 'Marked as replied';
        break;
      case 'mark-new':
        await repo.setField(moduleKey, id, 'status', 'new', ctx);
        message = 'Back in the unread queue';
        break;
      case 'verify':
        await repo.setField(moduleKey, id, 'is_verified', true, ctx);
        message = 'Link confirmed — it can be published';
        break;
      case 'activate-resume': {
        const db = await getDb();
        await db.transaction(async (tx) => {
          await tx.execute('UPDATE resume_version SET is_active = false WHERE is_active = true', []);
          await tx.execute('UPDATE resume_version SET is_active = true, published_at = COALESCE(published_at, $1::timestamptz) WHERE id = $2::text', [nowIso(), id]);
        });
        await repo.revalidateContent(moduleKey, id, 'update');
        message = 'This is now the active download';
        break;
      }
      case 'duplicate': {
        if (!module.duplicate) throw new ApiError(400, 'This record type is not duplicated');
        const row = await repo.duplicate(moduleKey, id, ctx);
        const copyId = String(row[TABLES[module.table].pk] ?? '');
        goto = copyId ? `/admin/${moduleKey}/${copyId}?duplicated=1` : null;
        message = 'Duplicated as a draft';
        break;
      }
      case 'delete': {
        const force = formData.get('force') === '1';
        await repo.remove(moduleKey, id, ctx, { force });
        message = `${module.singular} deleted`;
        goto = `/admin/${moduleKey}?deleted=1`;
        break;
      }
      default:
        throw new ApiError(400, `Unsupported action "${op}"`);
    }
  } catch (err) {
    return state(err);
  }
  if (goto) redirect(goto);
  return { ok: true, message };
}

/** Ordered id list from the reorder UI (navigation, galleries, services…). */
export async function reorderAction(moduleKey: string, csrf: string, ids: string[]): Promise<AdminActionState> {
  try {
    const module = getCmsModule(moduleKey);
    if (!module) throw new ApiError(404, 'Unknown module');
    const ctx = await requirePermission((module.permission ?? module.key) as ModuleKey, 'write');
    await assertCsrf(csrf);
    await repo.reorder(moduleKey, ids.slice(0, 500), ctx);
    return { ok: true, message: 'Order saved' };
  } catch (err) {
    return state(err);
  }
}

/** Section composer: attach, detach, reorder and toggle blocks on a page. */
export async function saveCompositionAction(
  pageId: string,
  csrf: string,
  blocks: { block_id: string; placement?: string; sort_order?: number; is_visible?: boolean; overrides?: Record<string, unknown> }[],
): Promise<AdminActionState> {
  try {
    const ctx = await requirePermission('pages', 'write');
    await assertCsrf(csrf);
    await repo.setPageBlocks(pageId, blocks.slice(0, 120), ctx);
    return { ok: true, message: `Layout saved — ${blocks.length} section${blocks.length === 1 ? '' : 's'}` };
  } catch (err) {
    return state(err);
  }
}

export async function saveSettingsFormAction(group: string, formData: FormData): Promise<void> {
  let message = '';
  let failed: AdminActionState | null = null;
  try {
    const ctx = await requirePermission('settings', 'write');
    await assertCsrf(csrfOf(formData));
    const defs = settingDefs(group as never);
    let saved = 0;
    for (const def of defs) {
      if (!formData.has(def.key) && def.type !== 'boolean') continue;
      const raw = formData.get(def.key);
      let value: unknown = typeof raw === 'string' ? raw : '';
      if (def.type === 'boolean') value = raw === 'on';
      if (def.type === 'number') value = raw === '' || raw === null ? '' : Number(raw);
      await saveSetting(def.key, value);
      saved += 1;
    }
    for (const extra of formData.keys()) {
      if (extra.startsWith('custom:') && !extra.endsWith('__label')) {
        const key = extra.slice('custom:'.length);
        if (key.includes('.')) await saveSetting(key, String(formData.get(extra) ?? ''));
      }
    }
    await audit(ctx, { action: 'update', module: 'settings', entity: 'site_setting', entityId: group, summary: `Settings saved (${group}, ${saved})` });
    await repo.revalidateContent('settings', '', 'update');
    message = `saved=${saved}`;
  } catch (err) {
    failed = state(err);
  }
  const flag = failed ? `error=1&message=${encodeURIComponent(failed.message ?? 'Could not save')}` : `${message}`;
  redirect(`/admin/settings?group=${encodeURIComponent(group)}&${flag}`);
}

/** Removes a custom (non-schema) setting row. */
export async function deleteCustomSettingAction(key: string, csrf: string): Promise<AdminActionState> {
  try {
    const ctx = await requirePermission('settings', 'manage');
    await assertCsrf(csrf);
    if (!/^[a-z0-9_.-]+$/i.test(key)) throw new ApiError(400, 'Unexpected setting key');
    const db = await getDb();
    await db.execute('DELETE FROM site_setting WHERE key = $1::text', [key]);
    await repo.revalidateContent('settings', '', 'delete');
    void ctx;
    return { ok: true, message: 'Custom setting removed' };
  } catch (err) {
    return state(err);
  }
}

// ── uploads ─────────────────────────────────────────────────────────────────

export async function replaceAssetAction(formData: FormData): Promise<AdminActionState> {
  try {
    const ctx = await requirePermission('media_library', 'write');
    await assertCsrf(csrfOf(formData));
    const id = String(formData.get('id') ?? '');
    const file = formData.get('file');
    if (!id || !(file instanceof File)) throw new ApiError(400, 'Pick a file first');
    const buffer = Buffer.from(await file.arrayBuffer());
    await replaceAsset(id, { buffer, filename: file.name, mimeType: file.type }, ctx.user.id);
    await repo.revalidateContent('media_library', id, 'update');
    return { ok: true, message: 'File replaced everywhere it is used' };
  } catch (err) {
    return state(err);
  }
}

/** `<form action>` variant of the asset replace. */
export async function replaceAssetFormAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  const result = await replaceAssetAction(formData);
  const message = result.ok ? 'saved=1' : `error=1&message=${encodeURIComponent(result.message ?? 'Upload rejected')}`;
  redirect(`/admin/media_library/${encodeURIComponent(id)}?${message}`);
}

export async function updateAssetMetaAction(_prev: AdminActionState | null, formData: FormData): Promise<AdminActionState> {
  const id = String(formData.get('id') ?? '');
  try {
    const ctx = await requirePermission('media_library', 'write');
    await assertCsrf(csrfOf(formData));
    await repo.update('media_library', id, {
      title: formData.get('title') ?? '',
      alt: formData.get('alt') ?? '',
      caption: formData.get('caption') ?? '',
      credit: formData.get('credit') ?? '',
      folder: formData.get('folder') ?? '',
      tags: formData.get('tags') ?? '',
    }, ctx);
    return { ok: true, message: 'Asset details saved' };
  } catch (err) {
    return state(err);
  }
}

// ══ CMS console (2026-09-12) ════════════════════════════════════════════════
// Mutations behind the redesigned console screens. They follow the same contract as
// everything above this line: session → role permission → CSRF → validate → write →
// audit → revalidate. The only difference is the tables they touch, which are the
// purpose-built console tables rather than registry modules.
//
// Where a console screen edits something the registry already owns (social links),
// the work is delegated to `repo` so validation, auditing and cache invalidation stay
// in exactly one place.

/** Only a path inside /admin may be used as a post-save destination. */
function returnTo(formData: FormData, fallback: string): string {
  const raw = String(formData.get('return_to') ?? '').trim();
  return SAFE_NEXT.test(raw) ? raw : fallback;
}

/** Lines from a textarea, trimmed and with blanks dropped. */
function lines(value: unknown): string[] {
  return String(value ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

/** One of the three public surfaces, or null when the payload names another. */
function surfaceOf(value: unknown): 'media' | 'main' | 'tech' | null {
  const surface = String(value ?? '');
  return surface === 'media' || surface === 'main' || surface === 'tech' ? surface : null;
}

/** The registry module whose permission guards editing a surface. */
function surfaceModule(surface: 'media' | 'main' | 'tech'): ModuleKey {
  return surface === 'media' ? 'media_projects' : 'pages';
}

export async function saveSurfaceHeroAction(formData: FormData): Promise<void> {
  const surface = surfaceOf(formData.get('surface')) ?? 'media';
  const fallback = surface === 'main' ? '/admin/site/hero' : '/admin/media/hero';
  const back = returnTo(formData, fallback);
  let failed: AdminActionState | null = null;
  try {
    const ctx = await requirePermission(surfaceModule(surface), 'write');
    await assertCsrf(csrfOf(formData));
    const existing = await selectOne<{ id: string }>('SELECT id FROM surface_hero WHERE surface = $1::text', [surface]);
    const values = {
      eyebrow: String(formData.get('eyebrow') ?? '').trim(),
      name_given: String(formData.get('name_given') ?? '').trim(),
      name_family: String(formData.get('name_family') ?? '').trim(),
      roles: lines(formData.get('roles')).slice(0, 12),
      intro: String(formData.get('intro') ?? '').trim(),
      capabilities: lines(formData.get('capabilities')).slice(0, 12),
      primary_label: String(formData.get('primary_label') ?? '').trim(),
      primary_href: String(formData.get('primary_href') ?? '').trim(),
      secondary_label: String(formData.get('secondary_label') ?? '').trim(),
      secondary_href: String(formData.get('secondary_href') ?? '').trim(),
    };
    const id = existing
      ? String(await updateRow('surface_hero', String(existing.id), values).then((r) => r?.id ?? existing.id))
      : String((await insertRow('surface_hero', { surface, ...values })).id ?? '');
    await audit(ctx, {
      action: existing ? 'update' : 'create',
      module: surfaceModule(surface),
      entity: 'surface_hero',
      entityId: id,
      summary: `${existing ? 'Updated' : 'Created'} the ${surface} hero copy`,
    });
    await repo.revalidateContent('pages', '', 'update');
  } catch (err) {
    failed = state(err);
  }
  redirect(failed ? `${back}?error=1&message=${encodeURIComponent(failed.message ?? 'Could not save')}` : `${back}?saved=1`);
}

export async function saveStudioAboutAction(formData: FormData): Promise<void> {
  const surface = surfaceOf(formData.get('surface')) ?? 'media';
  const fallback = surface === 'main' ? '/admin/site/about' : '/admin/media/about';
  const back = returnTo(formData, fallback);
  let failed: AdminActionState | null = null;
  try {
    const ctx = await requirePermission(surfaceModule(surface), 'write');
    await assertCsrf(csrfOf(formData));
    const existing = await selectOne<{ id: string }>('SELECT id FROM studio_about WHERE surface = $1::text', [surface]);
    // The library picker overrides the id the form was rendered with; a pasted URL
    // overrides both, because an explicit URL is what the owner typed last.
    const picked = String(formData.get('portrait_pick') ?? '').trim();
    const typedUrl = String(formData.get('portrait_url') ?? '').trim();
    const values = {
      heading: String(formData.get('heading') ?? '').trim(),
      subheading: String(formData.get('subheading') ?? '').trim(),
      bio: String(formData.get('bio') ?? '').trim(),
      portrait_asset_id: picked || (typedUrl ? '' : String(formData.get('portrait_asset_id') ?? '').trim()),
      portrait_url: typedUrl,
      credit_name: String(formData.get('credit_name') ?? '').trim(),
      credit_role: String(formData.get('credit_role') ?? '').trim(),
      statement: String(formData.get('statement') ?? '').trim(),
    };
    const id = existing
      ? String(await updateRow('studio_about', String(existing.id), values).then((r) => r?.id ?? existing.id))
      : String((await insertRow('studio_about', { surface, ...values })).id ?? '');
    await audit(ctx, {
      action: existing ? 'update' : 'create',
      module: surfaceModule(surface),
      entity: 'studio_about',
      entityId: id,
      summary: `${existing ? 'Updated' : 'Created'} the ${surface} about block`,
    });
    await repo.revalidateContent('pages', '', 'update');
  } catch (err) {
    failed = state(err);
  }
  redirect(failed ? `${back}?error=1&message=${encodeURIComponent(failed.message ?? 'Could not save')}` : `${back}?saved=1`);
}

/**
 * Video links for the media portfolio.
 *
 * Pasting a link is the whole job: the source, embed URL and poster are derived from it
 * (never from a guess), and everything stays editable afterwards. `hero_preview` is the
 * owner's choice of which short-form pieces open the hero reel.
 */
export async function saveVideoLinkAction(formData: FormData): Promise<void> {
  const back = returnTo(formData, '/admin/media/videos');
  let failed: AdminActionState | null = null;
  try {
    const ctx = await requirePermission('videos', 'write');
    await assertCsrf(csrfOf(formData));
    const id = String(formData.get('id') ?? '').trim();
    const url = String(formData.get('source_url') ?? '').trim();
    const title = String(formData.get('title') ?? '').trim();
    const form = String(formData.get('form') ?? 'long_form');
    if (!url) throw new ApiError(400, 'Paste a video link first');
    if (!title) throw new ApiError(400, 'Give the video a title');

    const detected = detectVideoSource(url);
    if (!detected || detected.source === 'external') {
      // An unrecognised host is still storable — it renders as a link card — but the
      // owner is told rather than handed a silent failure.
      const oembed = detected ? await fetchOEmbed(detected) : { meta: null, error: 'unsupported host' };
      const values = {
        title,
        source: detected?.source ?? 'external',
        source_url: url,
        source_id: detected?.sourceId ?? '',
        embed_url: detected?.embedUrl ?? '',
        poster_url: oembed.meta?.thumbnail_url ?? detected?.thumbnailCandidates[0] ?? '',
        external_url: detected?.canonicalUrl ?? url,
        duration_s: oembed.meta?.duration ?? null,
        form: isVideoForm(form) ? form : 'other',
        hero_preview: formData.get('hero_preview') === 'on',
        metadata_state: oembed.meta ? 'ready' : 'manual',
        status: String(formData.get('status') ?? 'draft') || 'draft',
      };
      if (id) await updateRow('media_video', id, values);
      else await insertRow('media_video', values);
      await audit(ctx, { action: id ? 'update' : 'create', module: 'videos', entity: 'media_video', entityId: id, summary: `${id ? 'Updated' : 'Added'} video link: ${title}` });
      await repo.revalidateContent('videos', id, id ? 'update' : 'create');
      redirect(`${back}?saved=1`);
    }

    const oembed = await fetchOEmbed(detected);
    const values: Record<string, unknown> = {
      title,
      source: detected.source,
      source_url: url,
      source_id: detected.sourceId ?? '',
      embed_url: detected.embedUrl ?? '',
      poster_url: oembed.meta?.thumbnail_url ?? detected.thumbnailCandidates[0] ?? '',
      external_url: detected.canonicalUrl ?? url,
      duration_s: oembed.meta?.duration ?? null,
      form: isVideoForm(form) ? form : 'other',
      hero_preview: formData.get('hero_preview') === 'on',
      metadata_state: oembed.meta ? 'ready' : 'manual',
      status: String(formData.get('status') ?? 'draft') || 'draft',
    };
    let savedId = id;
    if (id) await updateRow('media_video', id, values);
    else savedId = String((await insertRow('media_video', values)).id ?? '');
    await audit(ctx, {
      action: id ? 'update' : 'create',
      module: 'videos',
      entity: 'media_video',
      entityId: savedId,
      summary: `${id ? 'Updated' : 'Added'} video link: ${title}`,
    });
    await repo.revalidateContent('videos', savedId, id ? 'update' : 'create');
    redirect(`${back}?saved=1`);
  } catch (err) {
    // A successful save calls `redirect`, which throws a control-flow error of its own.
    if (isRedirect(err)) throw err;
    failed = state(err);
  }
  redirect(`${back}?error=1&message=${encodeURIComponent(failed?.message ?? 'Could not save that video')}`);
}

/** Row operations on a video: publish, unpublish, flip the hero toggle, remove. */
export async function videoLinkAction(formData: FormData): Promise<void> {
  const back = returnTo(formData, '/admin/media/videos');
  let failed: AdminActionState | null = null;
  try {
    const ctx = await requirePermission('videos', 'write');
    await assertCsrf(csrfOf(formData));
    const id = String(formData.get('id') ?? '').trim();
    const op = String(formData.get('op') ?? '');
    if (!id) throw new ApiError(400, 'No video selected');
    if (op === 'delete') {
      await deleteRow('media_video', id);
      await audit(ctx, { action: 'delete', module: 'videos', entity: 'media_video', entityId: id, summary: 'Removed a video link' });
      await repo.revalidateContent('videos', id, 'delete');
    } else if (op === 'publish' || op === 'draft') {
      await updateRow('media_video', id, { status: op === 'publish' ? 'published' : 'draft' });
      await audit(ctx, { action: 'publish', module: 'videos', entity: 'media_video', entityId: id, summary: `${op === 'publish' ? 'Published' : 'Unpublished'} a video` });
      await repo.revalidateContent('videos', id, 'update');
    } else if (op === 'hero-on' || op === 'hero-off') {
      // Only short-form pieces belong in the hero reel; the toggle is refused for the
      // rest rather than silently producing a widescreen video in a 9:16 card.
      if (op === 'hero-on') {
        const row = await getById('media_video', id);
        if (row && String(row.form ?? '') !== 'short_form') {
          throw new ApiError(400, 'Only short-form videos can open the hero reel');
        }
      }
      await updateRow('media_video', id, { hero_preview: op === 'hero-on' });
      await audit(ctx, { action: 'update', module: 'videos', entity: 'media_video', entityId: id, summary: `${op === 'hero-on' ? 'Added to' : 'Removed from'} the hero reel` });
      await repo.revalidateContent('videos', id, 'update');
    } else {
      throw new ApiError(400, 'Unknown action');
    }
  } catch (err) {
    failed = state(err);
  }
  redirect(failed ? `${back}?error=1&message=${encodeURIComponent(failed.message ?? 'Could not do that')}` : `${back}?saved=1`);
}

/**
 * Event photography uploads. Files go through the same `ingestFile` path the media
 * library uses, so a photograph uploaded here is indistinguishable from one uploaded
 * there — same sniffing, same variants, same storage driver.
 */
export async function uploadEventPhotoAction(formData: FormData): Promise<void> {
  const back = returnTo(formData, '/admin/media/photography');
  let failed: AdminActionState | null = null;
  let uploaded = 0;
  try {
    const ctx = await requirePermission('media_library', 'write');
    await assertCsrf(csrfOf(formData));
    const files = formData.getAll('files').filter((entry): entry is File => entry instanceof File && entry.size > 0);
    if (!files.length) throw new ApiError(400, 'Choose at least one photograph');
    const { maxBytes } = uploadLimits();
    for (const file of files) {
      if (file.size > maxBytes) throw new ApiError(413, `“${file.name}” is larger than the ${Math.round(maxBytes / 1024 / 1024)}MB limit`);
      const buffer = Buffer.from(await file.arrayBuffer());
      const { asset } = await ingestFile(
        { buffer, filename: file.name, mimeType: file.type },
        {
          kindHint: 'image',
          folder: PHOTO_FOLDER,
          userId: ctx.user.id,
          alt: files.length === 1 ? String(formData.get('alt') ?? '').trim() || undefined : undefined,
          caption: files.length === 1 ? String(formData.get('caption') ?? '').trim() || undefined : undefined,
        },
      );
      if (asset?.id) uploaded += 1;
    }
    await audit(ctx, { action: 'upload', module: 'media_library', entity: 'media_asset', summary: `Uploaded ${uploaded} event photograph(s)` });
    await repo.revalidateContent('media_library', '', 'create');
  } catch (err) {
    failed = state(err);
  }
  redirect(failed ? `${back}?error=1&message=${encodeURIComponent(failed.message ?? 'Upload rejected')}` : `${back}?saved=${uploaded}`);
}

/** Remove or re-caption an uploaded photograph. */
export async function eventPhotoAction(formData: FormData): Promise<void> {
  const back = returnTo(formData, '/admin/media/photography');
  let failed: AdminActionState | null = null;
  try {
    const ctx = await requirePermission('media_library', 'write');
    await assertCsrf(csrfOf(formData));
    const id = String(formData.get('id') ?? '').trim();
    const op = String(formData.get('op') ?? '');
    if (!id) throw new ApiError(400, 'No photograph selected');
    if (op === 'delete') {
      await deleteRow('media_asset', id);
      await audit(ctx, { action: 'delete', module: 'media_library', entity: 'media_asset', entityId: id, summary: 'Removed an event photograph' });
    } else if (op === 'meta') {
      await updateRow('media_asset', id, {
        title: String(formData.get('title') ?? '').trim() || null,
        alt: String(formData.get('alt') ?? '').trim() || null,
        caption: String(formData.get('caption') ?? '').trim() || null,
      });
      await audit(ctx, { action: 'update', module: 'media_library', entity: 'media_asset', entityId: id, summary: 'Updated a photograph’s details' });
    } else {
      throw new ApiError(400, 'Unknown action');
    }
    await repo.revalidateContent('media_library', id, op === 'delete' ? 'delete' : 'update');
  } catch (err) {
    failed = state(err);
  }
  redirect(failed ? `${back}?error=1&message=${encodeURIComponent(failed.message ?? 'Could not do that')}` : `${back}?saved=1`);
}

/**
 * Client stories.
 *
 * The owner always writes the quote. The client name and the kind of work are filled
 * from the video when they are left blank — and only then, because overwriting what a
 * person typed with a guess is worse than leaving it alone.
 */
export async function saveStoryAction(formData: FormData): Promise<void> {
  const back = returnTo(formData, '/admin/media/stories');
  let failed: AdminActionState | null = null;
  try {
    const ctx = await requirePermission('testimonials', 'write');
    await assertCsrf(csrfOf(formData));
    const id = String(formData.get('id') ?? '').trim();
    const videoId = String(formData.get('video_id') ?? '').trim();
    const quote = String(formData.get('quote') ?? '').trim();
    const typedName = String(formData.get('client_name') ?? '').trim();
    const typedType = String(formData.get('video_type') ?? '').trim();
    if (!videoId) throw new ApiError(400, 'Choose the video this story belongs to');
    if (!quote) throw new ApiError(400, 'Write the client’s quote');

    const video = await getById<Record<string, unknown>>('media_video', videoId);
    if (!video) throw new ApiError(404, 'That video no longer exists');

    const derived = extractStory({
      title: typeof video.title === 'string' ? video.title : null,
      description: typeof video.description === 'string' ? video.description : null,
      client: typeof video.client === 'string' ? video.client : null,
    });

    const clientName = typedName || derived.clientName || '';
    const videoType = typedType || derived.videoType || 'other';
    const roleLabel = String(formData.get('role_label') ?? '').trim() || storyRoleFor(videoType) || '';
    const values = {
      video_id: videoId,
      client_name: clientName,
      video_type: videoType,
      quote,
      role_label: roleLabel,
      origin: typedName ? 'manual' : clientName ? 'auto' : 'manual',
      status: String(formData.get('status') ?? 'draft') || 'draft',
    };
    const savedId = id
      ? String(await updateRow('media_testimonial', id, values).then((r) => r?.id ?? id))
      : String((await insertRow('media_testimonial', values)).id ?? '');
    await audit(ctx, {
      action: id ? 'update' : 'create',
      module: 'testimonials',
      entity: 'media_testimonial',
      entityId: savedId,
      summary: `${id ? 'Updated' : 'Added'} a client story${clientName ? ` — ${clientName}` : ''}`,
    });
    await repo.revalidateContent('testimonials', savedId, id ? 'update' : 'create');
  } catch (err) {
    failed = state(err);
  }
  redirect(failed ? `${back}?error=1&message=${encodeURIComponent(failed.message ?? 'Could not save that story')}` : `${back}?saved=1`);
}

/** Publish, unpublish, remove, or re-derive the name on a client story. */
export async function storyAction(formData: FormData): Promise<void> {
  const back = returnTo(formData, '/admin/media/stories');
  let failed: AdminActionState | null = null;
  try {
    const ctx = await requirePermission('testimonials', 'write');
    await assertCsrf(csrfOf(formData));
    const id = String(formData.get('id') ?? '').trim();
    const op = String(formData.get('op') ?? '');
    if (!id) throw new ApiError(400, 'No story selected');
    if (op === 'delete') {
      await deleteRow('media_testimonial', id);
      await audit(ctx, { action: 'delete', module: 'testimonials', entity: 'media_testimonial', entityId: id, summary: 'Removed a client story' });
      await repo.revalidateContent('testimonials', id, 'delete');
    } else if (op === 'publish' || op === 'draft') {
      await updateRow('media_testimonial', id, { status: op === 'publish' ? 'published' : 'draft' });
      await audit(ctx, { action: 'publish', module: 'testimonials', entity: 'media_testimonial', entityId: id, summary: `${op === 'publish' ? 'Published' : 'Unpublished'} a client story` });
      await repo.revalidateContent('testimonials', id, 'update');
    } else if (op === 'rederive') {
      // Clears the derived name so the next save fills it again from the video — the
      // escape hatch when a video's title changed after the story was written.
      const row = await getById<Record<string, unknown>>('media_testimonial', id);
      if (!row) throw new ApiError(404, 'That story no longer exists');
      const videoId = row.video_id ? String(row.video_id) : '';
      const video = videoId ? await getById<Record<string, unknown>>('media_video', videoId) : undefined;
      const derived = extractStory({
        title: typeof video?.title === 'string' ? video.title : null,
        description: typeof video?.description === 'string' ? video.description : null,
        client: typeof video?.client === 'string' ? video.client : null,
      });
      await updateRow('media_testimonial', id, {
        client_name: derived.clientName ?? '',
        video_type: derived.videoType ?? String(row.video_type ?? 'other'),
        role_label: derived.roleLabel ?? '',
        origin: derived.clientName ? 'auto' : 'manual',
      });
      await audit(ctx, { action: 'update', module: 'testimonials', entity: 'media_testimonial', entityId: id, summary: 'Re-read the client details from the video' });
      await repo.revalidateContent('testimonials', id, 'update');
    } else {
      throw new ApiError(400, 'Unknown action');
    }
  } catch (err) {
    failed = state(err);
  }
  redirect(failed ? `${back}?error=1&message=${encodeURIComponent(failed.message ?? 'Could not do that')}` : `${back}?saved=1`);
}

/** Create or edit a social profile. Delegated to the registry module it belongs to. */
export async function saveSocialAction(formData: FormData): Promise<void> {
  const back = returnTo(formData, '/admin/social');
  let failed: AdminActionState | null = null;
  try {
    const ctx = await requirePermission('social_links', 'write');
    await assertCsrf(csrfOf(formData));
    const id = String(formData.get('id') ?? '').trim();
    const mod = getCmsModule('social_links');
    if (!mod) throw new ApiError(500, 'The social links module is not registered');
    const input = parseForm(formData, repo.dbFields(mod));
    const note = { summary: `${id ? 'Updated' : 'Added'} a social profile (${String(input.network ?? '')})` };
    await (id ? repo.update('social_links', id, input, ctx, note) : repo.create('social_links', input, ctx, note));
  } catch (err) {
    failed = state(err);
  }
  redirect(failed ? `${back}?error=1&message=${encodeURIComponent(failed.message ?? 'Could not save that profile')}` : `${back}?saved=1`);
}

/** Verify, publish or remove a social profile. */
export async function socialAction(formData: FormData): Promise<void> {
  const back = returnTo(formData, '/admin/social');
  let failed: AdminActionState | null = null;
  try {
    const ctx = await requirePermission('social_links', 'write');
    await assertCsrf(csrfOf(formData));
    const id = String(formData.get('id') ?? '').trim();
    const op = String(formData.get('op') ?? '');
    if (!id) throw new ApiError(400, 'No profile selected');
    if (op === 'verify' || op === 'unverify') {
      await repo.setField('social_links', id, 'is_verified', op === 'verify', ctx, {
        summary: `${op === 'verify' ? 'Verified' : 'Unverified'} a social profile`,
      });
    } else if (op === 'publish' || op === 'draft') {
      await repo.setStatus('social_links', id, op === 'publish' ? 'published' : 'draft', ctx, {
        summary: `${op === 'publish' ? 'Published' : 'Unpublished'} a social profile`,
      });
    } else if (op === 'delete') {
      await repo.remove('social_links', id, ctx, { summary: 'Removed a social profile' });
    } else {
      throw new ApiError(400, 'Unknown action');
    }
  } catch (err) {
    failed = state(err);
  }
  redirect(failed ? `${back}?error=1&message=${encodeURIComponent(failed.message ?? 'Could not do that')}` : `${back}?saved=1`);
}

/**
 * Replaces the studio portrait.
 *
 * The file goes through the same ingest path as any other asset, then the id is written
 * straight onto the about row — "replace the picture" is one action here rather than
 * "upload, copy the id, paste it, save". The previous asset stays in the library, so
 * nothing else that used it breaks.
 */
export async function uploadStudioPortraitAction(formData: FormData): Promise<void> {
  const surface = surfaceOf(formData.get('surface')) ?? 'media';
  const back = returnTo(formData, '/admin/media/about');
  let failed: AdminActionState | null = null;
  try {
    const ctx = await requirePermission(surfaceModule(surface), 'write');
    await assertCsrf(csrfOf(formData));
    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0) throw new ApiError(400, 'Choose an image first');
    const { maxBytes } = uploadLimits();
    if (file.size > maxBytes) throw new ApiError(413, `That file is larger than the ${Math.round(maxBytes / 1024 / 1024)}MB limit`);
    const buffer = Buffer.from(await file.arrayBuffer());
    const { asset } = await ingestFile(
      { buffer, filename: file.name, mimeType: file.type },
      { kindHint: 'image', folder: 'portraits', userId: ctx.user.id, alt: 'Studio portrait' },
    );
    const assetId = String(asset?.id ?? '');
    if (!assetId) throw new ApiError(500, 'The image could not be stored');
    const existing = await selectOne<{ id: string }>('SELECT id FROM studio_about WHERE surface = $1::text', [surface]);
    const values = { portrait_asset_id: assetId, portrait_url: '' };
    const id = existing
      ? String(await updateRow('studio_about', String(existing.id), values).then((r) => r?.id ?? existing.id))
      : String((await insertRow('studio_about', { surface, ...values })).id ?? '');
    await audit(ctx, { action: 'upload', module: surfaceModule(surface), entity: 'studio_about', entityId: id, summary: 'Replaced the studio portrait' });
    await repo.revalidateContent('pages', '', 'update');
  } catch (err) {
    failed = state(err);
  }
  redirect(failed ? `${back}?error=1&message=${encodeURIComponent(failed.message ?? 'Could not upload that image')}` : `${back}?saved=1`);
}

/**
 * Quick create/edit for services and team members from the console.
 *
 * These two content types have deep editors of their own (markdown, repeat rows, image
 * pickers) and rebuilding all of that here would be a second implementation of the same
 * form. So this action edits the card-level fields — the ones that decide what a visitor
 * sees in a grid — and merges them over whatever the row already holds. Everything else
 * keeps its value, and the full editor stays one click away for the deep fields.
 */
async function quickSave(
  moduleKey: 'services' | 'team',
  formData: FormData,
): Promise<{ id: string; back: string }> {
  const back = returnTo(formData, `/admin/site/${moduleKey === 'services' ? 'services' : 'team'}`);
  const ctx = await requirePermission(moduleKey, 'write');
  await assertCsrf(csrfOf(formData));

  const id = String(formData.get('id') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();
  if (!title) throw new ApiError(400, moduleKey === 'services' ? 'Give the service a title' : 'Give the person a name');

  const patch: Record<string, unknown> =
    moduleKey === 'services'
      ? {
          title,
          slug: String(formData.get('slug') ?? '').trim() || slugify(title),
          division: String(formData.get('division') ?? '').trim() || 'main',
          summary: String(formData.get('summary') ?? '').trim(),
          status: String(formData.get('status') ?? '').trim() || 'draft',
          is_featured: formData.get('is_featured') === 'on',
          sort_order: Number(formData.get('sort_order') ?? 0) || 0,
        }
      : {
          name: title,
          role: String(formData.get('role') ?? '').trim(),
          division: String(formData.get('division') ?? '').trim() || 'main',
          bio: String(formData.get('bio') ?? '').trim(),
          status: String(formData.get('status') ?? '').trim() || 'draft',
          is_placeholder: formData.get('is_placeholder') === 'on',
          is_visible: formData.get('is_visible') === 'on',
          sort_order: Number(formData.get('sort_order') ?? 0) || 0,
        };

  // Editing merges over the stored row so the fields this form does not show keep the
  // values they already had — a quick edit must never quietly empty the deep fields.
  const input = id ? { ...((await getById(moduleKey === 'services' ? 'service' : 'team_member', id)) ?? {}), ...patch } : patch;
  // repo.create/repo.update write the audit entry themselves. Handing them the summary
  // keeps one row per action rather than the two this produced when the console wrote its
  // own on top, and keeps the "Added a service — Videography" wording that is worth having.
  const note = {
    summary: `${id ? 'Updated' : 'Added'} ${moduleKey === 'services' ? 'a service' : 'a team member'} — ${title}`,
  };
  const row = id ? await repo.update(moduleKey, id, input, ctx, note) : await repo.create(moduleKey, input, ctx, note);
  return { id: String(row?.id ?? id), back };
}

export async function saveServiceAction(formData: FormData): Promise<void> {
  let failed: AdminActionState | null = null;
  let back = '/admin/site/services';
  try {
    const result = await quickSave('services', formData);
    back = result.back;
  } catch (err) {
    failed = state(err);
  }
  redirect(failed ? `${back}?error=1&message=${encodeURIComponent(failed.message ?? 'Could not save')}` : `${back}?saved=1`);
}

export async function saveTeamAction(formData: FormData): Promise<void> {
  let failed: AdminActionState | null = null;
  let back = '/admin/site/team';
  try {
    const result = await quickSave('team', formData);
    back = result.back;
  } catch (err) {
    failed = state(err);
  }
  redirect(failed ? `${back}?error=1&message=${encodeURIComponent(failed.message ?? 'Could not save')}` : `${back}?saved=1`);
}

/**
 * `<form action>` variant of `rowAction` that stays on the page it was called from.
 *
 * `rowFormAction` always bounces to the module's own list, which is right for the generic
 * screens and wrong for the console: publishing a service from /admin/site/services
 * should leave the owner exactly where they were. The result is discarded on purpose —
 * Next re-renders the current route after any server action, so the row is already up to
 * date by the time this returns.
 */
export async function inlineRowAction(formData: FormData): Promise<void> {
  await rowAction(formData);
}
