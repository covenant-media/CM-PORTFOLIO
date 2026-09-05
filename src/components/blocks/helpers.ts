/** Small typed accessors for CMS section props (stored as JSON). */

export type Props = Record<string, unknown>;

export function ps(props: Props, key: string, fallback = ''): string {
  const value = props[key];
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

export function pn(props: Props, key: string, fallback = 0): number {
  const value = props[key];
  if (value === null || value === undefined || value === '') return fallback;
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export function pb(props: Props, key: string, fallback = false): boolean {
  const value = props[key];
  if (value === undefined || value === null) return fallback;
  return value === true || value === 'true' || value === 1;
}

export function parr(props: Props, key: string): Record<string, unknown>[] {
  const value = props[key];
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
}

export function pstrs(props: Props, key: string): string[] {
  const value = props[key];
  if (!Array.isArray(value)) return [];
  return value.filter((v) => typeof v === 'string' && v.trim()).map(String);
}

/** A CMS link row → safe href (internal paths and http(s)/mailto/tel only). */
export function safeHref(href: string | null | undefined, fallback = '#'): string {
  const value = (href ?? '').trim();
  if (!value) return fallback;
  if (/^(javascript|data|vbscript|file):/i.test(value)) return fallback;
  return value;
}

/** Comma/space separated id lists coming from the CMS `media` field type. */
export function idsOf(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item : ((item as Record<string, unknown>)?.id as string) ?? ''))
      .map((s) => String(s).trim())
      .filter(Boolean);
  }
  return String(value ?? '')
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export type Division = 'main' | 'media' | 'tech';
export type Settings = Record<string, string | number | boolean | null>;
