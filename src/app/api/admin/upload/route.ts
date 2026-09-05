/**
 * Upload endpoint for the CMS pickers and the media library.
 * Bytes are sniffed, size and type enforced, and the asset row is written by the same
 * ingest path the CLI uses — so a file that lands here behaves identically everywhere.
 */
import { NextResponse } from 'next/server';
import { ApiError, assertCsrf, requirePermission } from '@/lib/auth/guard';
import { ingestFile, uploadLimits } from '@/lib/media/storage';
import { normaliseAsset } from '@/lib/media/storage';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const csrf = request.headers.get('x-csrf-token') ?? request.headers.get('x-csrf');
    const form = await request.formData().catch(() => null);
    if (!form) throw new ApiError(400, 'Expected a multipart upload');
    const token = csrf ?? String(form.get('_csrf') ?? '');
    const ctx = await requirePermission('media_library', 'write');
    await assertCsrf(token);

    const file = form.get('file');
    if (!(file instanceof File)) throw new ApiError(400, 'No file received');
    const { maxBytes } = uploadLimits();
    if (file.size > maxBytes) {
      throw new ApiError(413, `That file is larger than the ${Math.round(maxBytes / 1024 / 1024)}MB limit`);
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const folder = String(form.get('folder') ?? '').trim() || null;
    const { asset, warnings } = await ingestFile(
      { buffer, filename: file.name, mimeType: file.type },
      {
        userId: ctx.user.id,
        folder,
        title: String(form.get('title') ?? '') || undefined,
        alt: String(form.get('alt') ?? '') || undefined,
        caption: String(form.get('caption') ?? '') || undefined,
        kindHint: (String(form.get('kind') ?? '') || undefined) as never,
      },
    );
    const { revalidateContent } = await import('@/lib/cms/repository');
    await revalidateContent('media_library', String(asset.id ?? ''), 'create');
    const shaped = normaliseAsset(asset);
    return NextResponse.json({
      ok: true,
      message: warnings.length ? warnings.join(' ') : undefined,
      asset: {
        id: String(shaped.id ?? ''),
        title: String(shaped.title ?? shaped.filename ?? ''),
        filename: String(shaped.filename ?? ''),
        url: String(shaped.url ?? ''),
        kind: String(shaped.kind ?? 'image'),
        width: shaped.width == null ? null : Number(shaped.width),
        height: shaped.height == null ? null : Number(shaped.height),
        bytes: Number(shaped.bytes ?? 0),
        alt: (shaped.alt as string) ?? null,
        folder: (shaped.folder as string) ?? null,
      },
    });
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 400;
    return NextResponse.json({ ok: false, message: err instanceof Error ? err.message : 'Upload rejected' }, { status });
  }
}
