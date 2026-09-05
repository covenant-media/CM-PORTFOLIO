/**
 * Read-only asset lookup for the CMS pickers (search, preview, id hydration).
 * Signed-in and permission-checked like every other admin surface; it exposes no
 * writes, so a stolen cookie cannot use it to alter the site.
 */
import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guard';
import { getDb } from '@/lib/db';
import { normaliseAsset } from '@/lib/media/storage';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requirePermission('media_library', 'read');
  } catch {
    return NextResponse.json({ ok: false, message: 'Not allowed' }, { status: 403 });
  }

  const url = new URL(request.url);
  const db = await getDb();

  const single = url.searchParams.get('id');
  if (single) {
    const rows = await db.select<Record<string, unknown>>('SELECT * FROM media_asset WHERE id = $1::text OR public_id = $2::text', [single, single]);
    if (!rows.length) return NextResponse.json({ ok: false, message: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true, asset: shape(rows[0]!) });
  }

  const kind = url.searchParams.get('kind');
  const q = url.searchParams.get('q')?.slice(0, 60) ?? '';
  const per = Math.min(Math.max(Number(url.searchParams.get('per') ?? 24), 1), 60);
  const where: string[] = ['1=1'];
  const params: unknown[] = [];
  if (q) {
    params.push(`%${q}%`);
    where.push(`(filename ILIKE $${params.length} OR title ILIKE $${params.length} OR alt ILIKE $${params.length} OR folder ILIKE $${params.length})`);
  }
  if (kind && kind !== 'any') {
    params.push(kind);
    where.push(`kind = $${params.length}::text`);
  }
  const rows = await db.select<Record<string, unknown>>(
    `SELECT * FROM media_asset WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT ${per}`,
    params,
  );
  return NextResponse.json({ ok: true, assets: rows.map(shape) });
}

function shape(row: Record<string, unknown>) {
  const asset = normaliseAsset(row);
  return {
    id: String(asset.id ?? ''),
    title: String(asset.title ?? asset.filename ?? ''),
    filename: String(asset.filename ?? ''),
    url: String(asset.url ?? ''),
    kind: String(asset.kind ?? 'image'),
    width: asset.width == null ? null : Number(asset.width),
    height: asset.height == null ? null : Number(asset.height),
    bytes: Number(asset.bytes ?? 0),
    alt: (asset.alt as string) ?? null,
    folder: (asset.folder as string) ?? null,
  };
}
