/**
 * CMS field system.
 *
 * A single declarative field definition powers:
 *   1. server-side validation + coercion of every admin write
 *   2. the admin editor UI (no per-module bespoke forms)
 *   3. defaults / placeholder strategy
 *
 * Nothing in the CMS accepts arbitrary keys: unknown keys are dropped, which is
 * what makes "create/edit/delete anything" safe without hand-written controllers.
 */

import { slugify } from '../utils/text';

export type FieldType =
  | 'text'
  | 'textarea'
  | 'markdown'
  | 'number'
  | 'money'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'tags'
  | 'list'
  | 'repeat'
  | 'date'
  | 'datetime'
  | 'url'
  | 'email'
  | 'slug'
  | 'color'
  | 'asset'
  | 'image'
  | 'video'
  | 'relation'
  | 'seo'
  | 'json';

export interface FieldOption {
  value: string;
  label: string;
  hint?: string;
}

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  help?: string;
  placeholder?: string;
  group?: string;
  options?: FieldOption[];
  /** for relation fields: the module whose records are referenced */
  module?: string;
  /** relation: allow several references */
  multiple?: boolean;
  /** relation filter, e.g. { division: 'media' } */
  filter?: Record<string, string>;
  min?: number;
  max?: number;
  maxLength?: number;
  rows?: number;
  /** repeat: subfield definitions */
  itemFields?: FieldDef[];
  itemLabel?: string;
  /** multiselect/tags: allow new values */
  free?: boolean;
  default?: unknown;
  /** show only when another field equals a value */
  showIf?: { key: string; equals: string | string[] };
  width?: 'full' | 'half' | 'third';
}

export interface ValidationResult {
  ok: boolean;
  value: Record<string, unknown>;
  errors: Record<string, string>;
}

const URL_SAFE = /^(https?:)?\/\//i;

export function isSafeUrl(raw: string): boolean {
  const value = (raw ?? '').trim();
  if (!value) return false;
  if (/^(javascript|data|vbscript|file):/i.test(value)) return false;
  if (value.startsWith('//')) return true;
  if (value.startsWith('/')) return !value.startsWith('/\\');
  if (/^(mailto:|tel:|sms:|whatsapp:)/i.test(value)) return true;
  if (/^https?:\/\/wa\.me\//i.test(value)) return true;
  return URL_SAFE.test(value) || /^[\w-]+(\.[\w-]+)+([/?#]|$)/i.test(value);
}

function emptyFor(field: FieldDef): unknown {
  switch (field.type) {
    case 'boolean':
      return false;
    case 'number':
    case 'money':
      return null;
    case 'multiselect':
    case 'tags':
    case 'list':
    case 'repeat':
      return [];
    case 'seo':
    case 'json':
      return {};
    default:
      return null;
  }
}

export function fieldDefault(field: FieldDef): unknown {
  if (field.default !== undefined) return field.default;
  return emptyFor(field);
}

type CoerceResult = { value?: unknown; error?: string };

function coerceScalar(field: FieldDef, raw: unknown): CoerceResult {
  switch (field.type) {
    case 'text':
    case 'textarea':
    case 'url':
    case 'email':
    case 'slug':
    case 'color':
    case 'asset':
    case 'image':
    case 'video':
    case 'relation': {
      if (field.multiple && Array.isArray(raw)) {
        const arr = Array.from(new Set(raw.map((v) => String(v ?? '').trim()).filter(Boolean))).slice(0, 60);
        return { value: arr };
      }
      const str = raw === null || raw === undefined ? '' : String(raw).trim();
      if (!str) return { value: null };
      if (field.maxLength && str.length > field.maxLength) {
        return { error: `${field.label} must be ${field.maxLength} characters or fewer` };
      }
      if (field.type === 'url' && !isSafeUrl(str)) return { error: `${field.label} must be a valid http(s), mailto/tel or relative URL` };
      if (field.type === 'email' && !/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(str)) return { error: `${field.label} is not a valid email address` };
      if (field.type === 'slug') {
        const slug = slugify(str, { allowSlashes: true });
        if (!slug) return { error: `${field.label} must contain letters or numbers` };
        return { value: slug };
      }
      return { value: str };
    }
    case 'markdown':
    case 'json':
    case 'seo': {
      if (typeof raw === 'string') {
        const str = raw.trim();
        if (!str) return { value: field.type === 'markdown' ? '' : {} };
        if (field.type === 'markdown') return { value: str };
        try {
          return { value: JSON.parse(str) as unknown };
        } catch {
          return { error: `${field.label} must be valid JSON` };
        }
      }
      if (raw === null || raw === undefined) return { value: field.type === 'markdown' ? '' : {} };
      return { value: raw };
    }
    case 'number':
    case 'money': {
      if (raw === '' || raw === null || raw === undefined) return { value: null };
      const num = typeof raw === 'number' ? raw : Number(String(raw).replace(/[^0-9.\-]/g, ''));
      if (!Number.isFinite(num)) return { error: `${field.label} must be a number` };
      if (field.min !== undefined && num < field.min) return { error: `${field.label} must be ${field.min} or more` };
      if (field.max !== undefined && num > field.max) return { error: `${field.label} must be ${field.max} or less` };
      return { value: num };
    }
    case 'boolean':
      return { value: raw === true || raw === 'true' || raw === 1 || raw === '1' || raw === 'on' };
    case 'select': {
      const str = raw === null || raw === undefined ? '' : String(raw);
      if (!str) return { value: null };
      if (field.options?.length && !field.options.some((o) => o.value === str)) {
        return { error: `${field.label} must be one of: ${field.options.map((o) => o.value).join(', ')}` };
      }
      return { value: str };
    }
    case 'date': {
      const str = raw === null || raw === undefined ? '' : String(raw).trim();
      if (!str) return { value: null };
      const iso = str.slice(0, 10);
      return Number.isNaN(Date.parse(iso)) ? { error: `${field.label} is not a valid date` } : { value: iso };
    }
    case 'datetime': {
      const str = raw === null || raw === undefined ? '' : String(raw).trim();
      if (!str) return { value: null };
      const date = new Date(str);
      return Number.isNaN(date.getTime()) ? { error: `${field.label} is not a valid date/time` } : { value: date.toISOString() };
    }
    case 'multiselect': {
      const arr = Array.isArray(raw) ? raw.map(String) : String(raw ?? '').split(',').map((s) => s.trim()).filter(Boolean);
      if (field.options?.length && !field.free) {
        const allowed = new Set(field.options.map((o) => o.value));
        const bad = arr.filter((v) => !allowed.has(v));
        if (bad.length) return { error: `${field.label}: unknown option "${bad[0]}"` };
      }
      return { value: Array.from(new Set(arr.filter(Boolean))) };
    }
    case 'tags':
    case 'list': {
      const arr = Array.isArray(raw)
        ? raw
        : String(raw ?? '')
            .split(/\r?\n|,/)
            .map((s) => s.trim())
            .filter(Boolean);
      const cleaned = arr
        .map((v) => (typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v).trim()))
        .filter(Boolean)
        .slice(0, field.max ?? 200);
      return { value: field.type === 'tags' ? Array.from(new Set(cleaned.map((v) => v.toLowerCase()))) : cleaned };
    }
    case 'repeat': {
      const rows = Array.isArray(raw) ? raw : [];
      const itemFields = field.itemFields ?? [];
      const out: Record<string, unknown>[] = [];
      for (let i = 0; i < Math.min(rows.length, field.max ?? 120); i += 1) {
        const row = rows[i];
        if (!row || typeof row !== 'object') continue;
        const record: Record<string, unknown> = {};
        for (const sub of itemFields) {
          const res = coerceScalar(sub, (row as Record<string, unknown>)[sub.key]);
          if (res.error) return { error: `${field.label} row ${i + 1}: ${res.error}` };
          const value = res.value === null || res.value === undefined ? fieldDefault(sub) : res.value;
          if (sub.required && (value === null || value === '' || (Array.isArray(value) && value.length === 0))) {
            return { error: `${field.label} row ${i + 1}: ${sub.label} is required` };
          }
          record[sub.key] = value;
        }
        const meaningful = Object.values(record).some((v) => v !== null && v !== '' && !(Array.isArray(v) && v.length === 0));
        if (meaningful) out.push(record);
      }
      return { value: out };
    }
    default:
      return { value: raw };
  }
}

export function validateFields(fields: FieldDef[], input: Record<string, unknown>): ValidationResult {
  const value: Record<string, unknown> = {};
  const errors: Record<string, string> = {};

  for (const field of fields) {
    const { value: coerced, error } = coerceScalar(field, input[field.key]);
    if (error) {
      errors[field.key] = error;
      continue;
    }
    const isBlank = coerced === null || coerced === '' || (Array.isArray(coerced) && coerced.length === 0);
    const hidden = field.showIf
      ? !(Array.isArray(field.showIf.equals)
          ? field.showIf.equals.includes(String(input[field.showIf.key] ?? ''))
          : String(input[field.showIf.key] ?? '') === field.showIf.equals)
      : false;
    if (field.required && isBlank && !hidden) {
      errors[field.key] = `${field.label} is required`;
      continue;
    }
    value[field.key] = isBlank ? fieldDefault(field) : coerced;
  }

  return { ok: Object.keys(errors).length === 0, value, errors };
}

export function fieldsForGroup(fields: FieldDef[], group: string | undefined): FieldDef[] {
  return fields.filter((f) => (f.group ?? 'main') === (group ?? 'main'));
}

export function withDefault(field: FieldDef, value: unknown): unknown {
  return value === undefined || value === null ? fieldDefault(field) : value;
}
