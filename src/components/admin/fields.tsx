'use client';
/**
 * One renderer for every field type the module registry can declare, so a new CMS
 * module needs no new UI. Text-like fields stay uncontrolled and post as normal form
 * fields; structured fields (repeat, json, seo, tags) keep local state and serialise
 * into the named input the server action reads.
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { cx, slugify } from '@/lib/utils/text';
import { useCsrf } from './providers';
import type { FieldDef } from '@/lib/cms/fields';

export interface RelationOption {
  value: string;
  label: string;
  meta?: string;
}

export interface FieldRenderProps {
  field: FieldDef;
  value: unknown;
  error?: string;
  readOnly: boolean;
  relations?: Record<string, RelationOption[]>;
  watch: (key: string) => unknown;
  onWatch: (key: string, value: unknown) => void;
  itemLabel?: string;
}

const inputBase =
  'w-full rounded-2 border border-line bg-ink-950/70 px-3 py-2 text-[13.5px] text-fg outline-none transition-colors placeholder:text-fg-dim/80 focus:border-[var(--accent)]/70 disabled:opacity-60';
const labelBase = 'mb-1.5 block text-[11px] uppercase tracking-[0.13em] text-fg-dim';

function asText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function asList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => (typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)));
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) return parsed.map((v) => String(v));
    } catch {
      return value.split(/\r?\n|,/).map((v) => v.trim()).filter(Boolean);
    }
  }
  return [];
}

function asRecords(value: unknown): Record<string, unknown>[] {
  const source = typeof value === 'string' ? safeParse(value) : value;
  if (!Array.isArray(source)) return [];
  return source.map((row) => (row && typeof row === 'object' ? (row as Record<string, unknown>) : { value: row }));
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function FieldShell({ field, error, children, hint }: { field: FieldDef; error?: string; children: React.ReactNode; hint?: string }) {
  const width = field.width === 'half' ? 'sm:col-span-6' : field.width === 'third' ? 'sm:col-span-4' : 'sm:col-span-12';
  return (
    <div className={cx('min-w-0', width)}>
      {children}
      {error ? (
        <p className="mt-1 flex items-start gap-1.5 text-[11.5px] leading-snug text-alert-400">
          <Icon name="alert" size={12} className="mt-[2px] shrink-0" />
          {error}
        </p>
      ) : field.help || hint ? (
        <p className="mt-1 text-[11.5px] leading-snug text-fg-dim">{field.help ?? hint}</p>
      ) : null}
    </div>
  );
}

export function AdminField(props: FieldRenderProps) {
  const { field, value, readOnly, error } = props;
  const id = useId();
  const common = { id: `${id}-input`, name: field.key, disabled: readOnly, required: field.required };

  const labelled = (control: React.ReactNode) => (
    <FieldShell field={field} error={error}>
      <label className={labelBase} htmlFor={common.id}>
        {field.label}
        {field.required ? <span className="ml-1 text-[var(--accent)]">*</span> : null}
        {readOnly ? <span className="ml-1 normal-case text-fg-dim">(locked)</span> : null}
      </label>
      {control}
    </FieldShell>
  );

  switch (field.type) {
    case 'textarea':
    case 'markdown':
      return labelled(
        <textarea
          {...common}
          rows={field.rows ?? 4}
          maxLength={field.maxLength}
          defaultValue={asText(value)}
          onChange={(e) => props.onWatch(field.key, e.target.value)}
          placeholder={field.placeholder}
          className={cx(inputBase, 'leading-relaxed', field.type === 'markdown' && 'font-mono text-[12.5px]')}
        />,
      );

    case 'boolean':
      return (
        <FieldShell field={field} error={error}>
          <label
            className={cx(
              'flex cursor-pointer items-center justify-between gap-3 rounded-2 border px-3 py-2.5 transition-colors',
              value === true || value === 'true' ? 'border-[var(--accent)]/45 bg-[var(--accent-glow)]' : 'border-line bg-ink-950/60',
              readOnly && 'cursor-not-allowed opacity-60',
            )}
          >
            <span className="min-w-0">
              <span className="block text-[13px] text-fg">{field.label}</span>
              {field.help ? <span className="mt-0.5 block text-[11.5px] leading-snug text-fg-dim">{field.help}</span> : null}
            </span>
            <span className="relative inline-flex h-5 w-9 shrink-0 items-center">
              <input
                type="checkbox"
                name={field.key}
                disabled={readOnly}
                defaultChecked={value === true || value === 'true'}
                onChange={(e) => props.onWatch(field.key, e.target.checked)}
                className="peer sr-only"
              />
              <span className="h-5 w-9 rounded-pill bg-ink-700 transition-colors peer-checked:bg-[var(--accent)]" />
              <span className="absolute left-[3px] h-[18px] w-[18px] rounded-full bg-ink-1000 transition-transform peer-checked:translate-x-4" />
            </span>
          </label>
        </FieldShell>
      );

    case 'select':
      return labelled(
        <select {...common} defaultValue={asText(value)} onChange={(e) => props.onWatch(field.key, e.target.value)} className={cx(inputBase, 'appearance-none pr-8')}>
          <option value="">{field.required ? 'Choose…' : '— none —'}</option>
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>,
      );

    case 'multiselect': {
      const selected = new Set(asList(value));
      return (
        <FieldShell field={field} error={error}>
          <span className={labelBase}>{field.label}</span>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {(field.options ?? []).map((option) => (
              <label key={option.value} className="flex items-center gap-2 rounded-2 border border-line bg-ink-950/60 px-2.5 py-1.5 text-[12.5px] text-fg-muted">
                <input type="checkbox" name={field.key} value={option.value} defaultChecked={selected.has(option.value)} disabled={readOnly} className="accent-[var(--accent)]" />
                <span className="truncate">{option.label}</span>
              </label>
            ))}
          </div>
          {field.help ? <p className="mt-1 text-[11.5px] text-fg-dim">{field.help}</p> : null}
        </FieldShell>
      );
    }

    case 'tags':
    case 'list':
      return <ListField {...props} id={common.id} common={common} />;

    case 'repeat':
      return <RepeatField {...props} />;

    case 'number':
    case 'money':
      return labelled(
        <div className="relative">
          {field.type === 'money' ? <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[12.5px] text-fg-dim">₦/$</span> : null}
          <input
            {...common}
            type="number"
            step={field.type === 'money' ? '0.01' : field.min !== undefined || field.max !== undefined ? '1' : 'any'}
            min={field.min}
            max={field.max}
            defaultValue={asText(value)}
            placeholder={field.placeholder ?? (field.type === 'money' ? 'Blank = not stated' : undefined)}
            className={cx(inputBase, field.type === 'money' && 'pl-10')}
          />
        </div>,
      );

    case 'date':
    case 'datetime':
      return labelled(
        <input
          {...common}
          type={field.type === 'date' ? 'date' : 'datetime-local'}
          defaultValue={field.type === 'date' ? asText(value).slice(0, 10) : asText(value).slice(0, 16)}
          className={inputBase}
        />,
      );

    case 'color':
      return labelled(
        <div className="flex items-center gap-2">
          <input
            type="color"
            aria-label={`${field.label} colour picker`}
            defaultValue={/^#[0-9a-f]{6}$/i.test(asText(value)) ? asText(value) : '#d8a24a'}
            disabled={readOnly}
            onChange={(e) => {
              const input = document.getElementById(`${id}-input`) as HTMLInputElement | null;
              if (input) input.value = e.target.value;
              props.onWatch(field.key, e.target.value);
            }}
            className="h-9 w-10 shrink-0 cursor-pointer rounded-2 border border-line bg-transparent p-1"
          />
          <input {...common} type="text" defaultValue={asText(value)} placeholder="#hex or leave blank" className={cx(inputBase, 'font-mono text-[12.5px]')} />
        </div>,
      );

    case 'slug':
      return labelled(
        <div className="flex items-stretch gap-2">
          <input
            {...common}
            type="text"
            defaultValue={asText(value)}
            onBlur={(e) => {
              if (!e.target.value.trim()) {
                const source = asText(props.watch('title') || props.watch('name') || props.watch('label'));
                if (source) {
                  e.target.value = slugify(source, { allowSlashes: true });
                  props.onWatch(field.key, e.target.value);
                }
              }
            }}
            placeholder={field.placeholder ?? 'about-this-work'}
            className={cx(inputBase, 'font-mono text-[12.5px]')}
          />
        </div>,
      );

    case 'url':
    case 'email':
      return labelled(<input {...common} type={field.type === 'email' ? 'email' : 'url'} defaultValue={asText(value)} placeholder={field.placeholder} className={cx(inputBase, field.type === 'url' && 'font-mono text-[12.5px]')} />);

    case 'relation':
      return <RelationField {...props} id={common.id} common={common} />;

    case 'asset':
    case 'image':
    case 'video':
      return <AssetField {...props} id={common.id} readOnly={readOnly} />;

    case 'seo':
      return <SeoField {...props} />;

    case 'json':
      return <JsonField {...props} id={common.id} common={common} />;

    default:
      return labelled(<input {...common} type="text" defaultValue={asText(value)} placeholder={field.placeholder} className={inputBase} />);
  }
}

// ── structured fields ───────────────────────────────────────────────────────

function ListField({ field, value, readOnly, error, id, onWatch }: FieldRenderProps & { id: string; common?: Record<string, unknown> }) {
  const [items, setItems] = useState<string[]>(() => asList(value));
  const [draft, setDraft] = useState('');
  const textarea = useRef<HTMLTextAreaElement>(null);

  const sync = (next: string[]) => {
    setItems(next);
    if (textarea.current) textarea.current.value = next.join('\n');
    onWatch(field.key, next);
  };

  const add = () => {
    const clean = draft.trim();
    if (!clean || items.includes(clean)) {
      setDraft('');
      return;
    }
    sync([...items, clean]);
    setDraft('');
  };

  return (
    <FieldShell field={field} error={error}>
      <label className={labelBase} htmlFor={id}>
        {field.label}
        {field.required ? <span className="ml-1 text-[var(--accent)]">*</span> : null}
      </label>
      {items.length > 0 ? (
        <ul className="mb-2 flex flex-wrap gap-1.5">
          {items.map((item, index) => (
            <li key={`${item}-${index}`} className="flex items-center gap-1.5 rounded-2 border border-line bg-ink-900 py-1 pl-2 pr-1 text-[12px] text-fg-muted">
              <span className="max-w-[22ch] truncate">{item}</span>
              {!readOnly ? (
                <button type="button" onClick={() => sync(items.filter((_, i) => i !== index))} className="rounded p-0.5 text-fg-dim hover:text-alert-400" aria-label={`Remove ${item}`}>
                  <Icon name="close" size={11} />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {!readOnly ? (
        <div className="flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
            placeholder={field.placeholder ?? 'Type and press Enter'}
            className={cx(inputBase, 'flex-1')}
          />
          <button type="button" onClick={add} className="rounded-2 border border-line px-2.5 py-2 text-[12.5px] text-fg-muted hover:border-[var(--accent)]/50 hover:text-fg">
            Add
          </button>
        </div>
      ) : null}
      <textarea ref={textarea} id={id} name={field.key} defaultValue={items.join('\n')} className="sr-only" aria-hidden readOnly />
      {field.help ? <p className="mt-1 text-[11.5px] text-fg-dim">{field.help}</p> : null}
      <p className="mt-1 text-[11px] text-fg-dim">{items.length} item{items.length === 1 ? '' : 's'} — one per line.</p>
    </FieldShell>
  );
}

function RepeatField(props: FieldRenderProps) {
  const { field, value, readOnly, error, relations, watch, onWatch } = props;
  const [rows, setRows] = useState<Record<string, unknown>[]>(() => asRecords(value));
  const holder = useRef<HTMLTextAreaElement>(null);
  const itemFields = useMemo(() => field.itemFields ?? [], [field.itemFields]);

  const sync = (next: Record<string, unknown>[]) => {
    setRows(next);
    if (holder.current) holder.current.value = JSON.stringify(next);
    onWatch(field.key, next);
  };

  const setCell = (index: number, key: string, raw: unknown) => {
    sync(rows.map((row, i) => (i === index ? { ...row, [key]: raw } : row)));
  };

  const blank = () => Object.fromEntries(itemFields.map((sub) => [sub.key, sub.type === 'boolean' ? false : sub.type === 'tags' || sub.type === 'list' || sub.type === 'repeat' ? [] : ''])) as Record<string, unknown>;

  return (
    <FieldShell field={field} error={error}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className={cx(labelBase, 'mb-0')}>{field.label}</span>
        {!readOnly ? (
          <button type="button" onClick={() => sync([...rows, blank()])} className="inline-flex items-center gap-1 rounded-2 border border-line px-2 py-1 text-[11.5px] text-fg-muted hover:border-[var(--accent)]/50 hover:text-fg">
            <Icon name="plus" size={12} /> Add {field.itemLabel?.toLowerCase() ?? 'row'}
          </button>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-2 border border-dashed border-line px-3 py-4 text-center text-[12px] text-fg-dim">
          Nothing added yet{field.help ? ` — ${field.help.toLowerCase()}` : '.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row, index) => (
            <li key={index} className="rounded-2 border border-line bg-ink-950/50 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-fg-dim">
                  {field.itemLabel ?? 'Entry'} {index + 1}
                </span>
                {!readOnly ? (
                  <span className="flex items-center gap-1">
                    <button type="button" disabled={index === 0} onClick={() => sync(rows.map((r, i) => (i === index - 1 ? rows[index] : i === index ? rows[index - 1] : r)))} className="rounded border border-line p-1 text-fg-dim hover:text-fg disabled:opacity-30" aria-label="Move up">
                      <Icon name="chevron-up" size={12} />
                    </button>
                    <button type="button" disabled={index === rows.length - 1} onClick={() => sync(rows.map((r, i) => (i === index + 1 ? rows[index] : i === index ? rows[index + 1] : r)))} className="rounded border border-line p-1 text-fg-dim hover:text-fg disabled:opacity-30" aria-label="Move down">
                      <Icon name="chevron-down" size={12} />
                    </button>
                    <button type="button" onClick={() => sync(rows.filter((_, i) => i !== index))} className="rounded border border-line p-1 text-fg-dim hover:text-alert-400" aria-label="Remove row">
                      <Icon name="trash" size={12} />
                    </button>
                  </span>
                ) : null}
              </div>
              <div className="grid grid-cols-12 gap-2.5">
                {itemFields.map((sub) => (
                  <AdminField
                    key={sub.key}
                    field={sub}
                    value={row[sub.key]}
                    readOnly={readOnly}
                    relations={relations}
                    watch={(key) => (key === sub.key ? row[key] : watch(key))}
                    onWatch={(key, raw) => setCell(index, key, raw)}
                  />
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
      <textarea ref={holder} name={field.key} defaultValue={JSON.stringify(rows)} className="sr-only" aria-hidden readOnly />
    </FieldShell>
  );
}

function JsonField({ field, value, readOnly, error, id, common, onWatch }: FieldRenderProps & { id: string; common: Record<string, unknown> }) {
  const initial = useMemo(() => {
    if (typeof value === 'string') return value;
    return value ? JSON.stringify(value, null, 2) : '';
  }, [value]);
  const [raw, setRaw] = useState(initial);
  const invalid = useMemo(() => (raw.trim() ? safeParse(raw) === null : false), [raw]);

  return (
    <FieldShell field={field} error={error ?? (invalid ? 'Not valid JSON — fix it or clear the field' : undefined)}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label className={cx(labelBase, 'mb-0')} htmlFor={id}>
          {field.label}
        </label>
        {!readOnly ? (
          <button
            type="button"
            onClick={() => {
              const parsed = safeParse(raw);
              if (parsed) setRaw(JSON.stringify(parsed, null, 2));
            }}
            className="rounded border border-line px-1.5 py-0.5 text-[11px] text-fg-dim hover:text-fg"
          >
            Format
          </button>
        ) : null}
      </div>
      <textarea
        {...common}
        id={id}
        name={field.key}
        value={raw}
        onChange={(e) => {
          setRaw(e.target.value);
          onWatch(field.key, e.target.value);
        }}
        rows={7}
        spellCheck={false}
        className={cx(inputBase, 'font-mono text-[12px] leading-relaxed', invalid && 'border-alert-400/60')}
      />
    </FieldShell>
  );
}

const SEO_KEYS: { key: string; label: string; type: string; help: string }[] = [
  { key: 'title', label: 'Meta title', type: 'text', help: 'Blank uses the headline.' },
  { key: 'description', label: 'Meta description', type: 'textarea', help: 'One sentence, no marketing filler.' },
  { key: 'og_asset_id', label: 'Social card image', type: 'asset', help: 'Falls back to the cover image.' },
  { key: 'canonical', label: 'Canonical override', type: 'text', help: 'Only for syndicated pages.' },
  { key: 'no_index', label: 'Hide from search', type: 'boolean', help: '' },
  { key: 'robots', label: 'Robots directive', type: 'text', help: 'e.g. noindex, nofollow.' },
];

function SeoField({ field, value, readOnly, error, onWatch }: FieldRenderProps) {
  const initial = useMemo(() => (value && typeof value === 'object' ? (value as Record<string, unknown>) : {}), [value]);
  const [state, setState] = useState<Record<string, unknown>>(initial);
  const holder = useRef<HTMLTextAreaElement>(null);

  const sync = (next: Record<string, unknown>) => {
    setState(next);
    if (holder.current) holder.current.value = JSON.stringify(next);
    onWatch(field.key, next);
  };

  return (
    <FieldShell field={field} error={error}>
      <details className="rounded-2 border border-line bg-ink-950/50" open={Object.keys(initial).length > 0}>
        <summary className="flex cursor-pointer items-center gap-2 px-3 py-2.5 text-[12.5px] text-fg-muted">
          <Icon name="search" size={13} />
          {field.label}
          <span className="ml-auto text-[11px] text-fg-dim">{Object.keys(initial).length ? 'customised' : 'inheriting defaults'}</span>
        </summary>
        <div className="grid grid-cols-12 gap-2.5 border-t border-line p-3">
          {SEO_KEYS.map((sub) => (
            <div key={sub.key} className={cx('min-w-0', sub.type === 'textarea' ? 'sm:col-span-12' : sub.type === 'asset' ? 'sm:col-span-6' : 'sm:col-span-6')}>
              {sub.type === 'boolean' ? (
                <label className="flex items-center gap-2 rounded-2 border border-line px-3 py-2 text-[12.5px] text-fg-muted">
                  <input
                    type="checkbox"
                    defaultChecked={state[sub.key] === true}
                    disabled={readOnly}
                    onChange={(e) => sync({ ...state, [sub.key]: e.target.checked })}
                    className="accent-[var(--accent)]"
                  />
                  {sub.label}
                </label>
              ) : sub.type === 'asset' ? (
                <AdminField
                  field={{ key: `${field.key}__${sub.key}` as string, label: sub.label, type: 'asset', help: sub.help }}
                  value={state[sub.key]}
                  readOnly={readOnly}
                  watch={() => undefined}
                  onWatch={(_key, raw) => sync({ ...state, og_asset_id: raw })}
                />
              ) : (
                <>
                  <span className={labelBase}>{sub.label}</span>
                  {sub.type === 'textarea' ? (
                    <textarea
                      rows={2}
                      maxLength={200}
                      disabled={readOnly}
                      defaultValue={asText(state[sub.key])}
                      onChange={(e) => sync({ ...state, [sub.key]: e.target.value })}
                      className={inputBase}
                    />
                  ) : (
                    <input
                      type="text"
                      maxLength={120}
                      disabled={readOnly}
                      defaultValue={asText(state[sub.key])}
                      onChange={(e) => sync({ ...state, [sub.key]: e.target.value })}
                      className={inputBase}
                    />
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </details>
      <textarea ref={holder} name={field.key} defaultValue={JSON.stringify(state)} className="sr-only" aria-hidden readOnly />
    </FieldShell>
  );
}

/**
 * Renders a schema (e.g. the props a section type accepts) and serialises it into one
 * JSON input, so section-specific options are proper controls instead of raw JSON.
 */
export function SchemaJsonField({ name, label, help, schema, value, readOnly, onWatch }: { name: string; label: string; help?: string; schema: FieldDef[]; value: unknown; readOnly: boolean; onWatch?: (key: string, value: unknown) => void }) {
  const initial = useMemo(() => {
    const source = typeof value === 'string' ? safeParse(value) : value;
    return source && typeof source === 'object' ? (source as Record<string, unknown>) : {};
  }, [value]);
  const [state, setState] = useState<Record<string, unknown>>(initial);
  const holder = useRef<HTMLTextAreaElement>(null);

  const sync = (next: Record<string, unknown>) => {
    setState(next);
    if (holder.current) holder.current.value = JSON.stringify(next);
    onWatch?.(name, next);
  };

  const active = schema.filter((sub) => {
    if (!sub.showIf) return true;
    const expected = Array.isArray(sub.showIf.equals) ? sub.showIf.equals : [sub.showIf.equals];
    return expected.includes(String(state[sub.showIf.key] ?? ''));
  });

  return (
    <div className="min-w-0 sm:col-span-12">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className={cx(labelBase, 'mb-0')}>{label}</span>
        <span className="text-[11px] text-fg-dim">{help ?? 'These options are what the section actually reads when it renders.'}</span>
      </div>
      <div className="grid grid-cols-12 gap-2.5 rounded-2 border border-line bg-ink-950/40 p-3">
        {active.length === 0 ? <p className="text-[12px] text-fg-dim">This section type has no options — headline and body are enough.</p> : null}
        {active.map((sub) => (
          <AdminField
            key={sub.key}
            // Prefixed so a schema input can never shadow a real column of the row.
            field={{ ...sub, key: `p__${sub.key}` }}
            value={state[sub.key]}
            readOnly={readOnly}
            watch={(key) => state[key.replace(/^p__/, '')]}
            onWatch={(_key, raw) => sync({ ...state, [_key.replace(/^p__/, '')]: raw })}
          />
        ))}
      </div>
      <textarea ref={holder} name={name} defaultValue={JSON.stringify(initial)} className="sr-only" aria-hidden readOnly />
    </div>
  );
}

// ── pickers ─────────────────────────────────────────────────────────────────

interface LibraryAsset {
  id: string;
  title: string;
  url: string;
  kind: string;
  width: number | null;
  height: number | null;
  filename: string;
  alt: string | null;
}

function RelationField({ field, value, readOnly, error, id, common, relations }: FieldRenderProps & { id: string; common: Record<string, unknown> }) {
  const options = relations?.[field.key] ?? [];
  if (field.multiple) {
    const selected = new Set(asList(value));
    return (
      <FieldShell field={field} error={error}>
        <span className={labelBase}>{field.label}</span>
        {options.length === 0 ? (
          <p className="rounded-2 border border-dashed border-line px-3 py-3 text-[12px] text-fg-dim">Nothing to pick yet — create the records first.</p>
        ) : (
          <div className="max-h-[220px] overflow-y-auto rounded-2 border border-line p-2">
            <div className="grid gap-1 sm:grid-cols-2">
              {options.map((option) => (
                <label key={option.value} className="flex items-center gap-2 rounded px-1.5 py-1 text-[12.5px] text-fg-muted hover:bg-ink-900">
                  <input type="checkbox" name={field.key} value={option.value} defaultChecked={selected.has(option.value)} disabled={readOnly} className="accent-[var(--accent)]" />
                  <span className="truncate">{option.label}</span>
                  {option.meta ? <span className="ml-auto shrink-0 text-[10.5px] text-fg-dim">{option.meta}</span> : null}
                </label>
              ))}
            </div>
          </div>
        )}
      </FieldShell>
    );
  }
  return (
    <FieldShell field={field} error={error}>
      <label className={labelBase} htmlFor={id}>
        {field.label}
      </label>
      <select {...common} id={id} defaultValue={asText(value)} className={cx(inputBase, 'appearance-none pr-8')}>
        <option value="">{field.required ? 'Choose…' : '— none —'}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
            {option.meta ? ` · ${option.meta}` : ''}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

function AssetField({ field, value, readOnly, error, id, onWatch }: FieldRenderProps & { id: string }) {
  const csrf = useCsrf();
  const [current, setCurrent] = useState<{ id: string; url: string; title: string; kind: string; width: number | null; height: number | null } | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<AdminActionNotice>(null);

  useEffect(() => {
    const raw = asText(value);
    if (!raw) {
      setCurrent(null);
      return;
    }
    if (raw.startsWith('http') || raw.startsWith('/')) {
      setCurrent({ id: raw, url: raw, title: 'Linked asset', kind: 'image', width: null, height: null });
      return;
    }
    let cancelled = false;
    fetch(`/api/admin/assets?id=${encodeURIComponent(raw)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { asset?: LibraryAsset } | null) => {
        if (!cancelled && data?.asset) {
          const asset = data.asset;
          setCurrent({ id: asset.id, url: asset.url, title: asset.title, kind: asset.kind, width: asset.width, height: asset.height });
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [value]);

  const choose = (asset: LibraryAsset | null) => {
    if (!asset) {
      setCurrent(null);
      onWatch(field.key, '');
      return;
    }
    setCurrent({ id: asset.id, url: asset.url, title: asset.title, kind: asset.kind, width: asset.width, height: asset.height });
    onWatch(field.key, asset.id);
  };

  const isDoc = field.type === 'asset' && /pdf|document/i.test(field.label);

  return (
    <FieldShell field={field} error={error}>
      <span className={labelBase}>
        {field.label}
        {field.required ? <span className="ml-1 text-[var(--accent)]">*</span> : null}
      </span>
      <div className={cx('rounded-2 border border-line bg-ink-950/50 p-3', isDoc && 'flex items-center gap-3')}>
        {current ? (
          <div className={cx(isDoc ? 'flex min-w-0 items-center gap-2' : 'flex items-start gap-3')}>
            {current.url.startsWith('data:') ? null : (
              <span className="grid h-14 w-20 shrink-0 place-items-center overflow-hidden rounded border border-line bg-ink-900">
                {current.kind === 'video' ? (
                  <video src={current.url} muted playsInline className="h-full w-full object-cover" />
                ) : (
                  <img src={current.url} alt="" className="h-full w-full object-cover" />
                )}
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate text-[12.5px] text-fg">{current.title || 'Selected asset'}</span>
              <span className="mt-0.5 block font-mono text-[10.5px] text-fg-dim">
                {current.width && current.height ? `${current.width}×${current.height} · ` : ''}
                {current.id}
              </span>
            </span>
          </div>
        ) : (
          <p className="text-[12px] text-fg-dim">
            {isDoc ? 'No file attached yet.' : field.type === 'video' ? 'Pick an uploaded video or paste a hosted file URL.' : 'Nothing selected — upload or pick from the library.'}
          </p>
        )}

        {!readOnly ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1.5 rounded-2 border border-line px-2.5 py-1.5 text-[12px] text-fg-muted hover:border-[var(--accent)]/50 hover:text-fg">
              <Icon name="gallery" size={12} /> Library
            </button>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-2 border border-line px-2.5 py-1.5 text-[12px] text-fg-muted hover:border-[var(--accent)]/50 hover:text-fg">
              <Icon name="upload" size={12} /> {busy ?? 'Upload'}
              <input
                type="file"
                className="sr-only"
                accept={field.type === 'video' ? 'video/*' : isDoc ? '.pdf' : 'image/*,.pdf'}
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setBusy('Uploading…');
                  const data = new FormData();
                  data.set('file', file);
                  data.set('_csrf', csrf);
                  data.set('folder', 'general');
                  try {
                    const res = await fetch('/api/admin/upload', { method: 'POST', body: data });
                    const json = (await res.json()) as { ok: boolean; message?: string; asset?: LibraryAsset };
                    if (json.ok && json.asset) choose(json.asset);
                    else setUploadState({ ok: false, message: json.message ?? 'Upload failed' });
                  } catch {
                    setUploadState({ ok: false, message: 'Upload failed — the request never reached the server' });
                  } finally {
                    setBusy(null);
                    event.target.value = '';
                  }
                }}
              />
            </label>
            {current ? (
              <button type="button" onClick={() => choose(null)} className="inline-flex items-center gap-1.5 rounded-2 border border-line px-2.5 py-1.5 text-[12px] text-fg-muted hover:border-alert-400/50 hover:text-alert-400">
                <Icon name="close" size={12} /> Clear
              </button>
            ) : null}
          </div>
        ) : null}

        {uploadState && !uploadState.ok ? <p className="mt-2 text-[11.5px] text-alert-400">{uploadState.message}</p> : null}

        {open && !readOnly ? (
          <AssetBrowser
            kind={field.type === 'video' ? 'video' : isDoc ? 'document' : 'image'}
            onPick={(asset) => {
              choose(asset);
              setOpen(false);
            }}
            onClose={() => setOpen(false)}
          />
        ) : null}
      </div>
      <input type="hidden" id={id} name={field.key} value={current?.id ?? asText(value)} readOnly />
    </FieldShell>
  );
}

type AdminActionNotice = { ok: boolean; message?: string } | null;

function AssetBrowser({ kind, onPick, onClose }: { kind: string; onPick: (asset: LibraryAsset | null) => void; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<LibraryAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      fetch(`/api/admin/assets?q=${encodeURIComponent(query)}&kind=${encodeURIComponent(kind)}&per=24`)
        .then((res) => res.json())
        .then((data: { assets?: LibraryAsset[] }) => {
          if (!cancelled) setRows(data.assets ?? []);
        })
        .catch(() => undefined)
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, kind]);

  return (
    <div className="mt-3 border-t border-line pt-3">
      <div className="mb-2 flex items-center gap-2">
        <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the library…" className={cx(inputBase, 'flex-1 py-1.5 text-[12.5px]')} />
        <button type="button" onClick={onClose} className="rounded-2 border border-line p-1.5 text-fg-dim hover:text-fg" aria-label="Close the library browser">
          <Icon name="close" size={13} />
        </button>
      </div>
      {loading ? (
        <p className="py-4 text-center text-[12px] text-fg-dim">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="py-4 text-center text-[12px] text-fg-dim">Nothing in the library yet — upload first.</p>
      ) : (
        <ul className="grid max-h-[280px] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
          {rows.map((asset) => (
            <li key={asset.id}>
              <button type="button" onClick={() => onPick(asset)} className="group w-full overflow-hidden rounded-2 border border-line text-left transition-colors hover:border-[var(--accent)]/60">
                <span className="block h-[74px] w-full bg-ink-900">
                 
                  <img src={asset.kind === 'video' ? asset.url : asset.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                </span>
                <span className="block truncate px-2 py-1.5 text-[11.5px] text-fg-muted">{asset.title || asset.filename}</span>
              </button>
            </li>
          ))}
          <li>
            <button type="button" onClick={() => onPick(null)} className="w-full rounded-2 border border-dashed border-line px-2 py-4 text-[11.5px] text-fg-dim hover:text-fg">
              Clear selection
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}

