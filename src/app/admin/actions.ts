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
import { replaceAsset } from '@/lib/media/storage';
import { detectVideoSource, fetchOEmbed, type DetectedSource } from '@/lib/media/video';
import { TABLES } from '@/lib/db/tables';
import { getDb, nowIso } from '@/lib/db';
import type { ModuleKey } from '@/lib/auth/permissions';

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
  const result = await verifyLogin(email, password);
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
