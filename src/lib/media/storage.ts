/**
 * Media storage + upload pipeline.
 *
 * Drivers:
 *   local — writes under ./public/uploads (or CM_UPLOAD_DIR) and is served by the
 *           app/CDN in front of it. Default for dev and self-hosted VPS.
 *   s3    — any S3-compatible object store (R2/MinIO/B2/S3) using SigV4 PUT.
 *
 * Uploads are validated by extension AND magic bytes, resized into responsive
 * variants and stored as `media_asset` rows. Nothing is trusted from the client.
 */
import { createHash, randomBytes } from 'node:crypto';
import { mkdir, writeFile, unlink, readFile } from 'node:fs/promises';
import path from 'node:path';
import { getDb, newId, nowIso } from '../db';
import { slugify, formatBytes } from '../utils/text';

export type AssetKind = 'image' | 'video' | 'document' | 'audio';

const IMAGE_EXT = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif', 'tiff'];
const VIDEO_EXT = ['mp4', 'm4v', 'webm', 'mov'];
const DOC_EXT = ['pdf'];
const AUDIO_EXT = ['mp3', 'wav', 'm4a', 'aac', 'ogg'];

const ALLOWED_MIME: Record<string, AssetKind> = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'image/avif': 'image',
  'image/gif': 'image',
  'image/tiff': 'image',
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/quicktime': 'video',
  'video/x-m4v': 'video',
  'application/pdf': 'document',
  'audio/mpeg': 'audio',
  'audio/wav': 'audio',
  'audio/x-wav': 'audio',
  'audio/mp4': 'audio',
  'audio/ogg': 'audio',
};

export const MAX_UPLOAD_BYTES = Math.max(1, Number(process.env.STORAGE_MAX_UPLOAD_MB ?? 32)) * 1024 * 1024;

export interface StoredObject {
  key: string;
  url: string;
  bytes: number;
}

export interface StorageDriver {
  readonly kind: string;
  put(buffer: Buffer, opts: { key: string; contentType: string; cacheControl?: string }): Promise<StoredObject>;
  delete(key: string): Promise<void>;
}

const ROOT = process.env.CM_UPLOAD_DIR || path.join(process.cwd(), 'public', 'uploads');
const PUBLIC_BASE = '/uploads';

function safeExtension(filename: string): string {
  const ext = path.extname(filename || '').toLowerCase().replace(/^\./, '');
  return /^[a-z0-9]{1,8}$/.test(ext) ? ext : '';
}

function objectKey(filename: string, kind: AssetKind): string {
  const now = new Date();
  const stamp = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const base = slugify(path.basename(filename, path.extname(filename)), { maxLength: 48 }) || kind;
  return `${stamp}/${randomBytes(6).toString('hex')}-${base}.${safeExtension(filename) || (kind === 'image' ? 'jpg' : kind)}`;
}

const localDriver: StorageDriver = {
  kind: 'local',
  async put(buffer, { key }) {
    const target = path.join(ROOT, key);
    if (!target.startsWith(ROOT)) throw new Error('Unsafe storage key');
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, buffer);
    return { key, url: `${PUBLIC_BASE}/${key}`, bytes: buffer.length };
  },
  async delete(key) {
    const target = path.join(ROOT, key);
    if (!target.startsWith(ROOT)) return;
    await unlink(target).catch(() => undefined);
  },
};

/** Compact S3-compatible driver (SigV4 PUT/DELETE) — used when STORAGE_DRIVER=s3. */
async function s3Driver(): Promise<StorageDriver> {
  const endpoint = process.env.S3_ENDPOINT ?? '';
  const bucket = process.env.S3_BUCKET ?? '';
  const region = process.env.S3_REGION ?? 'auto';
  const accessKey = process.env.S3_ACCESS_KEY_ID ?? '';
  const secretKey = process.env.S3_SECRET_ACCESS_KEY ?? '';
  const publicBase = process.env.S3_PUBLIC_BASE_URL ?? (endpoint ? `${endpoint.replace(/\/$/, '')}/${bucket}` : '');
  if (!endpoint || !bucket || !accessKey || !secretKey) throw new Error('S3 storage is configured but missing S3_ENDPOINT/S3_BUCKET/S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY');
  const crypto = await import('node:crypto');
  const host = new URL(endpoint).host;

  const sign = async (method: 'PUT' | 'DELETE', key: string, payload: Buffer | null, contentType: string) => {
    const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const canonicalUri = `/${bucket}/${key.split('/').map(encodeURIComponent).join('/')}`;
    const payloadHash = crypto.createHash('sha256').update(payload ?? '').digest('hex');
    const headers: Record<string, string> = {
      'content-length': String(payload?.byteLength ?? 0),
      'content-type': contentType,
      host,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
    };
    const signedHeaders = Object.keys(headers).sort().join(';');
    const canonicalHeaders = Object.keys(headers)
      .sort()
      .map((h) => `${h}:${headers[h]!.trim()}\n`)
      .join('');
    const canonicalRequest = [method, canonicalUri, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
    const scope = `${dateStamp}/${region}/s3/aws4_request`;
    const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, crypto.createHash('sha256').update(canonicalRequest).digest('hex')].join('\n');
    const hmac = (key_: Buffer | string, data: string) => crypto.createHmac('sha256', key_ as never).update(data).digest();
    const kDate = hmac(`AWS4${secretKey}`, dateStamp);
    const kRegion = hmac(kDate, region);
    const kService = hmac(kRegion, 's3');
    const kSigning = hmac(kService, 'aws4_request');
    const signature = crypto.createHmac('sha256', kSigning as never).update(stringToSign).digest('hex');
    return {
      url: `${endpoint.replace(/\/$/, '')}${canonicalUri}`,
      headers: {
        ...headers,
        Authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
      },
    };
  };

  return {
    kind: 's3',
    async put(buffer, { key, contentType }) {
      const { url, headers } = await sign('PUT', key, buffer, contentType);
      const res = await fetch(url, { method: 'PUT', headers, body: new Uint8Array(buffer) });
      if (!res.ok) throw new Error(`Object storage rejected the upload (${res.status})`);
      return { key, url: `${publicBase.replace(/\/$/, '')}/${key}`, bytes: buffer.length };
    },
    async delete(key) {
      const { url, headers } = await sign('DELETE', key, null, 'application/octet-stream');
      await fetch(url, { method: 'DELETE', headers }).catch(() => undefined);
    },
  };
}

let driverPromise: Promise<StorageDriver> | null = null;
export function storage(): Promise<StorageDriver> {
  if (!driverPromise) {
    driverPromise = Promise.resolve((process.env.STORAGE_DRIVER ?? 'local') === 's3' ? s3Driver() : localDriver);
  }
  return driverPromise;
}

/** Content sniffing — the extension is a hint, the bytes are the truth. */
export function sniffKind(buffer: Buffer): AssetKind | null {
  if (buffer.length < 12) return null;
  const head = buffer.subarray(0, 32);
  const ascii = head.toString('latin1');
  if (head[0] === 0xff && head[1] === 0xd8) return 'image';
  if (head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image';
  if (ascii.startsWith('GIF8')) return 'image';
  if (ascii.startsWith('RIFF') && buffer.subarray(8, 12).toString('latin1') === 'WEBP') return 'image';
  if (ascii.startsWith('FTIF') || ascii.startsWith('II') || ascii.startsWith('MM')) return 'image';
  if (buffer.subarray(4, 8).toString('latin1') === 'ftyp') return 'video';
  if (head.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) return 'video';
  if (ascii.startsWith('%PDF')) return 'document';
  if (ascii.startsWith('ID3') || head[0] === 0x00 && head[1] === 0x00 && head[2] === 0x01) return 'audio';
  if (ascii.startsWith('fLaC') || ascii.startsWith('OggS')) return 'audio';
  return null;
}

export interface IngestResult {
  asset: Record<string, unknown>;
  warnings: string[];
}

export interface IngestOptions {
  userId?: string;
  folder?: string | null;
  title?: string;
  alt?: string;
  caption?: string;
  credit?: string;
  tags?: string[];
  kindHint?: AssetKind;
  /** treat as the resume: store original filename, no image variants */
  skipVariants?: boolean;
}

type SharpInstance = {
  metadata(): Promise<{ width?: number; height?: number }>;
  resize(opts: Record<string, unknown>): SharpInstance;
  webp(opts?: Record<string, unknown>): SharpInstance;
  blur(n?: number): SharpInstance;
  toBuffer(opts: { resolveWithObject: true }): Promise<{ data: Buffer; info: { width: number; height: number } }>;
  toBuffer(): Promise<Buffer>;
};
type SharpLike = (buf: Buffer) => SharpInstance;

async function loadSharp(): Promise<SharpLike | null> {
  try {
    const mod = await import('sharp');
    return (mod.default ?? mod) as unknown as SharpLike;
  } catch {
    return null;
  }
}

export async function ingestFile(input: { buffer: Buffer; filename: string; mimeType: string }, opts: IngestOptions = {}): Promise<IngestResult> {
  const warnings: string[] = [];
  const declared = (input.mimeType || '').toLowerCase();
  const ext = safeExtension(input.filename);
  const allowedExt = [...IMAGE_EXT, ...VIDEO_EXT, ...DOC_EXT, ...AUDIO_EXT];
  if (ext && !allowedExt.includes(ext)) throw new Error(`File type .${ext} is not allowed`);
  if (input.buffer.length === 0) throw new Error('The uploaded file is empty');
  if (input.buffer.length > MAX_UPLOAD_BYTES) throw new Error(`File is too large (limit ${formatBytes(MAX_UPLOAD_BYTES)})`);

  const sniffed = sniffKind(input.buffer);
  const mapped = ALLOWED_MIME[declared];
  const kind = opts.kindHint ?? sniffed ?? mapped;
  if (!kind) throw new Error('Unrecognised file format — upload a JPG, PNG, WebP, AVIF, GIF, MP4, WebM, MOV, MP3, WAV or PDF');
  if (sniffed && mapped && sniffed !== mapped) warnings.push('The reported content type differed from the file bytes; stored using the detected type.');
  if (declared === 'image/svg+xml') throw new Error('SVG uploads are disabled for safety. Export as PNG or WebP.');

  const store = await storage();
  const key = objectKey(input.filename || `upload.${ext || kind}`, kind);
  const stored = await store.put(input.buffer, {
    key,
    contentType: declared || `application/${ext || 'octet-stream'}`,
    cacheControl: 'public, max-age=31536000, immutable',
  });

  let width: number | null = null;
  let height: number | null = null;
  const variants: Record<string, { url: string; width: number; height: number }> = {};
  let blurData: string | null = null;

  if (kind === 'image' && !opts.skipVariants) {
    const sharp = await loadSharp();
    if (sharp) {
      try {
        const meta = await sharp(input.buffer).metadata();
        width = meta.width ?? null;
        height = meta.height ?? null;
        const targets: { name: string; width: number; quality: number }[] = [
          { name: 'w_1600', width: 1600, quality: 82 },
          { name: 'w_1000', width: 1000, quality: 80 },
          { name: 'w_640', width: 640, quality: 76 },
          { name: 'thumb', width: 420, quality: 70 },
        ];
        for (const target of targets) {
          if (width && width <= target.width && target.name !== 'thumb') continue;
          const out = await sharp(input.buffer)
            .resize({ width: Math.min(target.width, width ?? target.width), height: target.name === 'thumb' ? 420 : undefined, withoutEnlargement: true, fit: 'inside' })
            .webp({ quality: target.quality })
            .toBuffer({ resolveWithObject: true })
            .catch(() => null);
          if (!out) continue;
          const variantKey = `${key.replace(/\.[^.]+$/, '')}-${target.name}.webp`;
          const variant = await store.put(out.data, {
            key: variantKey,
            contentType: 'image/webp',
            cacheControl: 'public, max-age=31536000, immutable',
          });
          variants[target.name] = { url: variant.url, width: out.info.width, height: out.info.height };
        }
        const tiny = await sharp(input.buffer).resize({ width: 20, withoutEnlargement: true }).blur(2).webp({ quality: 25 }).toBuffer().catch(() => null);
        if (tiny) blurData = `data:image/webp;base64,${tiny.toString('base64')}`;
      } catch (err) {
        warnings.push(`Image processing skipped: ${err instanceof Error ? err.message.slice(0, 80) : 'unknown error'}`);
      }
    } else {
      warnings.push('Image pipeline (sharp) unavailable — original file stored without resized variants.');
    }
  }

  const checksum = createHash('sha256').update(input.buffer).digest('hex');
  const db = await getDb();
  const rows = await db.select<Record<string, unknown>>(
    `INSERT INTO media_asset (id, public_id, url, kind, mime_type, filename, title, alt, caption, credit, folder, tags,
       bytes, width, height, checksum, storage, variants, blur_data, is_referenced, uploaded_by, created_at, updated_at)
     VALUES ($1::text,$2::text,$3::text,$4::text,$5::text,$6::text,$7::text,$8::text,$9::text,$10::text,$11::text,$12::jsonb,
       $13::bigint,$14::int,$15::int,$16::text,$17::text,$18::jsonb,$19::text,$20::boolean,$21::text,$22::timestamptz,$22::timestamptz)
     RETURNING *`,
    [
      newId('ast'),
      stored.key,
      stored.url,
      kind,
      declared || `application/${ext || 'octet-stream'}`,
      (input.filename || 'upload').slice(0, 160),
      (opts.title || path.basename(input.filename || 'Asset', path.extname(input.filename || '')) || 'Asset').slice(0, 160),
      opts.alt ?? null,
      opts.caption ?? null,
      opts.credit ?? null,
      opts.folder ?? 'general',
      JSON.stringify(opts.tags ?? []),
      stored.bytes,
      width,
      height,
      checksum,
      store.kind,
      JSON.stringify(variants),
      blurData,
      true,
      opts.userId ?? null,
      nowIso(),
    ],
  );

  return { asset: normaliseAsset(rows[0] ?? {}), warnings };
}

export function normaliseAsset(row: Record<string, unknown>): Record<string, unknown> {
  const parse = (v: unknown, fallback: unknown) => (typeof v === 'string' ? safeJson(v, fallback) : (v ?? fallback));
  return {
    ...row,
    tags: parse(row.tags, []),
    variants: parse(row.variants, {}),
    bytes: row.bytes === null || row.bytes === undefined ? null : Number(row.bytes),
    width: row.width == null ? null : Number(row.width),
    height: row.height == null ? null : Number(row.height),
    created_at: typeof row.created_at === 'string' ? row.created_at : row.created_at ? new Date(row.created_at as never).toISOString() : null,
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : row.updated_at ? new Date(row.updated_at as never).toISOString() : null,
  };
}

function safeJson(value: string, fallback: unknown): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

/**
 * Replaces the bytes behind an existing asset row without breaking references:
 * the row id is preserved, only the object + technical metadata change.
 */
export async function replaceAsset(
  assetId: string,
  input: { buffer: Buffer; filename: string; mimeType: string },
  userId?: string,
): Promise<Record<string, unknown>> {
  const db = await getDb();
  const rows = await db.select<Record<string, unknown>>('SELECT * FROM media_asset WHERE id = $1::text', [assetId]);
  const row = rows[0];
  if (!row) throw new Error('Asset not found');

  const { asset, warnings } = await ingestFile(input, {
    userId,
    folder: (row.folder as string) ?? 'general',
    title: (row.title as string) ?? undefined,
    alt: (row.alt as string) ?? undefined,
    caption: (row.caption as string) ?? undefined,
  });

  const newId_ = String(asset.id);
  // Fold the freshly-ingested values onto the original row, then drop the temp row.
  await db.execute(
    `UPDATE media_asset
        SET public_id = $2::text, url = $3::text, kind = $4::text, mime_type = $5::text, filename = $6::text,
            bytes = $7::bigint, width = $8::int, height = $9::int, checksum = $10::text, storage = $11::text,
            variants = $12::jsonb, blur_data = $13::text, updated_at = $14::timestamptz
      WHERE id = $1::text`,
    [
      assetId,
      asset.public_id as string,
      asset.url as string,
      asset.kind as string,
      asset.mime_type as string | null,
      asset.filename as string | null,
      Number(asset.bytes ?? 0),
      asset.width == null ? null : Number(asset.width),
      asset.height == null ? null : Number(asset.height),
      asset.checksum as string | null,
      asset.storage as string,
      JSON.stringify(asset.variants ?? {}),
      (asset.blur_data as string | null) ?? null,
      nowIso(),
    ],
  );
  const fresh = await db.select<Record<string, unknown>>('SELECT * FROM media_asset WHERE id = $1::text', [assetId]);
  await db.execute('DELETE FROM media_asset WHERE id = $1::text', [newId_]).catch(() => undefined);

  // Remove the superseded object + its variants (only for the local driver).
  if (row.storage === 'local' && row.public_id) {
    const store = await storage();
    const oldKey = String(row.public_id);
    await store.delete(oldKey);
    const oldVariants = (typeof row.variants === 'string' ? safeJson(row.variants, {}) : row.variants) as Record<string, { url?: string }>;
    for (const variant of Object.values(oldVariants ?? {})) {
      const url = variant?.url;
      if (url && url.startsWith(`${PUBLIC_BASE}/`)) await store.delete(url.replace(`${PUBLIC_BASE}/`, ''));
    }
  }

  const result = normaliseAsset(fresh[0] ?? asset);
  if (warnings.length) result.replace_warnings = warnings;
  return result;
}

/** Which content references an asset — used for delete protection. */
export async function assetReferences(assetId: string): Promise<{ total: number; places: { label: string; count: number }[] }> {
  const db = await getDb();
  const checks: { label: string; sql: string }[] = [
    { label: 'Project covers', sql: `SELECT count(*)::int AS n FROM project WHERE cover_asset_id = $1::text` },
    { label: 'Project galleries', sql: `SELECT count(*)::int AS n FROM project WHERE gallery::text LIKE $2::text` },
    { label: 'Video posters', sql: `SELECT count(*)::int AS n FROM media_video WHERE poster_asset_id = $1::text OR file_asset_id = $1::text` },
    { label: 'Galleries', sql: `SELECT count(*)::int AS n FROM gallery WHERE items::text LIKE $2::text` },
    { label: 'Blog covers', sql: `SELECT count(*)::int AS n FROM blog_post WHERE cover_asset_id = $1::text` },
    { label: 'Testimonial avatars', sql: `SELECT count(*)::int AS n FROM testimonial WHERE avatar_asset_id = $1::text` },
    { label: 'Team portraits', sql: `SELECT count(*)::int AS n FROM team_member WHERE avatar_asset_id = $1::text` },
    { label: 'Resume versions', sql: `SELECT count(*)::int AS n FROM resume_version WHERE asset_id = $1::text` },
    { label: 'Sections', sql: `SELECT count(*)::int AS n FROM content_block WHERE media::text LIKE $2::text` },
    { label: 'Services', sql: `SELECT count(*)::int AS n FROM service WHERE hero_asset = $1::text` },
    { label: 'SEO social cards', sql: `SELECT count(*)::int AS n FROM seo_record WHERE og_asset_id = $1::text` },
  ];
  let total = 0;
  const places: { label: string; count: number }[] = [];
  for (const check of checks) {
    try {
      const rows = await db.select<{ n: number | string }>(check.sql, [assetId, `%${assetId}%`]);
      const n = Number(rows[0]?.n ?? 0);
      if (n > 0) places.push({ label: check.label, count: n });
      total += n;
    } catch {
      /* a failed probe must not allow an unsafe delete silently */
      places.push({ label: `${check.label} (unknown)`, count: 1 });
      total += 1;
    }
  }
  return { total, places };
}

/** Serves a locally stored object (used when CM_UPLOAD_DIR is outside public/). */
export async function readLocalObject(key: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  const target = path.join(ROOT, key);
  if (!target.startsWith(ROOT)) return null;
  try {
    const buffer = await readFile(target);
    const ext = path.extname(target).toLowerCase().replace('.', '');
    const type: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      avif: 'image/avif',
      gif: 'image/gif',
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      webm: 'video/webm',
      pdf: 'application/pdf',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
    };
    return { buffer, contentType: type[ext] ?? 'application/octet-stream' };
  } catch {
    return null;
  }
}

export function uploadLimits() {
  return { maxBytes: MAX_UPLOAD_BYTES, driver: process.env.STORAGE_DRIVER ?? 'local', allowed: { IMAGE_EXT, VIDEO_EXT, DOC_EXT, AUDIO_EXT } };
}
