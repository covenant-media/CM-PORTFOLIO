'use client';
/**
 * The row editor. Fields come from the module registry, so every module gets the same
 * validation, the same error placement and the same publish affordances — and a new
 * module needs no new form code.
 */
import { useMemo, useState, useActionState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { cx } from '@/lib/utils/text';
import { saveRowAction, rowFormAction, detectVideoAction } from '@/app/admin/actions';
import { AdminField, SchemaJsonField, type RelationOption } from './fields';
import { useCsrf } from './providers';
import type { FieldDef } from '@/lib/cms/fields';
import type { AdminActionState } from '@/lib/cms/admin';

const GROUP_LABELS: Record<string, string> = {
  content: 'Content',
  details: 'Details',
  media: 'Media',
  links: 'Links',
  meta: 'Meta & scheduling',
  seo: 'SEO',
  pricing: 'Pricing',
  options: 'Options',
  basics: 'The essentials',
};

const GROUP_ORDER = ['basics', 'content', 'media', 'details', 'pricing', 'links', 'options', 'meta', 'seo'];

export interface RowFormProps {
  moduleKey: string;
  id: string | null;
  label: string;
  singular: string;
  fields: FieldDef[];
  values: Record<string, unknown>;
  relations?: Record<string, RelationOption[]>;
  readOnly: boolean;
  publicUrl?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  isSample?: boolean;
  statusField?: string;
  propsSchema?: { when: string; byType: Record<string, FieldDef[]> };
  deletable?: boolean;
  duplicateLabel?: string;
  /** field key holding a video URL: shows a "detect metadata" control */
  detectable?: string;
}

export function RowForm(props: RowFormProps) {
  const router = useRouter();
  const csrf = useCsrf();
  const [values, setValues] = useState<Record<string, unknown>>(() => ({ ...props.values }));
  const [formKey, setFormKey] = useState(0);
  const [detecting, setDetecting] = useState<string | null>(null);
  const [watch, setWatch] = useState<Record<string, unknown>>(() => ({ ...props.values }));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [state, formAction, pending] = useActionState<AdminActionState | null, FormData>(
    props.id ? saveRowAction.bind(null, props.moduleKey, props.id) : saveRowAction.bind(null, props.moduleKey, null),
    null,
  );
  const flashed = useRef(false);

  useEffect(() => {
    if (state?.ok && !flashed.current) {
      flashed.current = true;
      router.refresh();
      setTimeout(() => {
        flashed.current = false;
      }, 1200);
    }
  }, [state, router]);

  const onWatch = (key: string, value: unknown) => setWatch((prev) => ({ ...prev, [key]: value }));

  const detect = async () => {
    const urlField = props.detectable ?? 'source_url';
    const url = String(watch[urlField] ?? values[urlField] ?? '');
    if (!url.trim()) {
      setDetecting('Paste the link first.');
      return;
    }
    setDetecting('Reading the platform…');
    const data = new FormData();
    data.set('source_url', url);
    try {
      const result = await detectVideoAction(data);
      if (!result.ok || !result.detected) {
        setDetecting(result.message ?? 'Nothing could be read from that link.');
        return;
      }
      // Re-key the fields so the detected values take effect on uncontrolled inputs.
      setValues((prev) => ({ ...prev, ...watch, ...result.detected }));
      setWatch((prev) => ({ ...prev, ...result.detected }));
      setFormKey((n) => n + 1);
      setDetecting(result.message ?? 'Filled in.');
    } catch {
      setDetecting('The lookup failed — fill the fields in by hand.');
    }
  };

  const sections = useMemo(() => {
    const buckets = new Map<string, FieldDef[]>();
    for (const field of props.fields) {
      if (field.showIf) {
        const expected = Array.isArray(field.showIf.equals) ? field.showIf.equals : [field.showIf.equals];
        if (!expected.includes(String(watch[field.showIf.key] ?? ''))) continue;
      }
      const group = field.group ?? 'basics';
      const list = buckets.get(group) ?? [];
      list.push(field);
      buckets.set(group, list);
    }
    return [...buckets.entries()]
      .sort((a, b) => GROUP_ORDER.indexOf(a[0]) - GROUP_ORDER.indexOf(b[0]))
      .map(([key, fields]) => ({ key, label: GROUP_LABELS[key] ?? key, fields }));
  }, [props.fields, watch]);

  const propsField = props.fields.find((f) => f.key === 'props' && f.type === 'json');
  const activeType = props.propsSchema ? String(watch[props.propsSchema.when] ?? props.values[props.propsSchema.when] ?? '') : '';
  const schema = props.propsSchema?.byType[activeType] ?? [];

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_296px]">
      <form action={formAction} className="min-w-0 space-y-4">
        <input type="hidden" name="_csrf" value={csrf} />

        {state && !state.ok ? (
          <div role="alert" className="rounded-3 border border-alert-400/45 bg-alert-400/8 px-4 py-3">
            <p className="flex items-center gap-2 text-[13px] text-alert-400">
              <Icon name="alert" size={14} />
              {state.message ?? 'Could not save'}
            </p>
            {state.errors && Object.keys(state.errors).length > 1 ? (
              <ul className="mt-2 space-y-1 text-[12px] text-alert-400/90">
                {Object.entries(state.errors).map(([key, message]) => (
                  <li key={key}>
                    · {message}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {state?.ok ? (
          <p className="flex items-center gap-2 rounded-3 border border-ok-400/40 bg-ok-400/8 px-4 py-2.5 text-[12.5px] text-ok-400">
            <Icon name="check" size={14} /> Saved. The public page updates on the next request.
          </p>
        ) : null}

        {props.isSample ? (
          <p className="flex items-start gap-2 rounded-3 border border-line bg-ink-900/60 px-4 py-2.5 text-[12px] leading-snug text-fg-muted">
            <Icon name="info" size={14} className="mt-[2px] shrink-0 text-[var(--accent)]" />
            This row is placeholder content. Replace the copy with real facts, then clear the “sample” flag at the
            bottom of this form so it stops showing the placeholder badge.
          </p>
        ) : null}

        {sections.map((section) => (
          <section key={`${formKey}-${section.key}`} className="rounded-4 border border-line bg-ink-900/50">
            <header className="border-b border-line px-5 py-3">
              <h2 className="text-[12px] font-medium uppercase tracking-[0.14em] text-fg-dim">{section.label}</h2>
            </header>
            <div className="grid grid-cols-12 gap-x-4 gap-y-4 px-5 py-4">
              {section.fields.map((field) => {
                if (props.propsSchema && field.key === 'props' && field.type === 'json') {
                  return (
                    <SchemaJsonField
                      key={field.key}
                      name="props"
                      label="Section options"
                      help={schema.length ? undefined : 'This section type has no options. Change the type above, or edit the raw JSON.'}
                      schema={schema}
                      value={watch.props ?? values.props}
                      readOnly={props.readOnly}
                      onWatch={onWatch}
                    />
                  );
                }
                return (
                  <AdminField
                    key={field.key}
                    field={field}
                    value={watch[field.key] !== undefined ? watch[field.key] : values[field.key]}
                    error={state?.errors?.[field.key]}
                    readOnly={props.readOnly}
                    relations={props.relations}
                    watch={(key) => (key === field.key ? props.values[key] : watch[key])}
                    onWatch={onWatch}
                  />
                );
              })}
              {props.propsSchema && propsField && schema.length === 0 ? null : null}
            </div>
            {props.detectable && section.fields.some((field) => field.key === props.detectable) && !props.readOnly ? (
              <div className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-3">
                <button type="button" onClick={detect} disabled={Boolean(detecting === 'Reading the platform…')} className="inline-flex items-center gap-1.5 rounded-2 border border-[var(--accent)]/45 px-3 py-1.5 text-[12px] text-[var(--accent)] hover:bg-[var(--accent-glow)]">
                  <Icon name={detecting === 'Reading the platform…' ? 'spinner' : 'wand'} size={13} className={detecting === 'Reading the platform…' ? 'animate-spin' : undefined} />
                  Detect from the link
                </button>
                <span className="text-[11.5px] text-fg-dim">
                  {detecting ?? 'Fills title, poster and embed settings from the platform. Everything stays editable — never publish metadata you have not read.'}
                </span>
              </div>
            ) : null}
          </section>
        ))}

        {!props.readOnly ? (
          <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center gap-3 border-t border-line bg-ink-950/90 px-1 py-3 backdrop-blur">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-2 bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-[var(--accent-ink)] transition-opacity hover:opacity-90 disabled:opacity-55"
            >
              {pending ? <Icon name="spinner" size={14} className="animate-spin" /> : <Icon name="check" size={14} />}
              {props.id ? 'Save changes' : 'Create'}
            </button>
            <Link href={`/admin/${props.moduleKey}`} className="rounded-2 border border-line px-3 py-2 text-[12.5px] text-fg-muted hover:text-fg">
              Back to list
            </Link>
            <span className="ml-auto text-[11.5px] text-fg-dim">
              {props.updatedAt ? `Updated ${new Date(props.updatedAt).toLocaleString()}` : 'Not saved yet'}
            </span>
          </div>
        ) : (
          <p className="rounded-3 border border-line px-4 py-2.5 text-[12px] text-fg-dim">
            Your role can read this section but not change it.
          </p>
        )}
      </form>

      <aside className="space-y-3 lg:sticky lg:top-[76px] lg:self-start">
        <div className="rounded-4 border border-line bg-ink-900/50 p-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-fg-dim">{props.label}</p>
          <p className="mt-2 text-[13px] text-fg">{String(props.values.title ?? props.values.name ?? props.values.label ?? props.values.scope ?? 'Untitled')}</p>
          <dl className="mt-3 space-y-1.5 text-[11.5px]">
            <div className="flex justify-between gap-2">
              <dt className="text-fg-dim">Status</dt>
              <dd className="text-fg-muted">{String(props.values[props.statusField ?? 'status'] ?? 'draft')}</dd>
            </div>
            {props.publishedAt ? (
              <div className="flex justify-between gap-2">
                <dt className="text-fg-dim">Published</dt>
                <dd className="text-fg-muted">{new Date(props.publishedAt).toLocaleDateString()}</dd>
              </div>
            ) : null}
            {props.id ? (
              <div className="flex justify-between gap-2">
                <dt className="text-fg-dim">Reference</dt>
                <dd className="truncate font-mono text-[10.5px] text-fg-dim">{props.id}</dd>
              </div>
            ) : null}
          </dl>

          {props.publicUrl ? (
            <Link
              href={props.publicUrl}
              target="_blank"
              className="mt-3 flex items-center justify-center gap-1.5 rounded-2 border border-line px-3 py-1.5 text-[12px] text-fg-muted hover:border-[var(--accent)]/50 hover:text-fg"
            >
              <Icon name="external" size={12} /> View on site
            </Link>
          ) : null}
        </div>

        {props.id && !props.readOnly ? (
          <div className="rounded-4 border border-line bg-ink-900/50 p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-fg-dim">Actions</p>
            <div className="mt-2.5 space-y-2">
              {props.values.status !== 'published' ? (
                <ActionForm module={props.moduleKey} id={props.id} op="publish" label="Publish now" icon="rocket" />
              ) : (
                <ActionForm module={props.moduleKey} id={props.id} op="draft" label="Unpublish" icon="eye-off" />
              )}
              {props.duplicateLabel ? <ActionForm module={props.moduleKey} id={props.id} op="duplicate" label={props.duplicateLabel} icon="copy" /> : null}
              {props.deletable ? (
                confirmDelete ? (
                  <form action={rowFormAction} className="rounded-2 border border-alert-400/45 bg-alert-400/8 p-2.5">
                    <input type="hidden" name="_csrf" value={csrf} />
                    <input type="hidden" name="module" value={props.moduleKey} />
                    <input type="hidden" name="id" value={props.id} />
                    <input type="hidden" name="op" value="delete" />
                    <p className="text-[11.5px] leading-snug text-alert-400">Delete permanently? This cannot be undone from the interface.</p>
                    <div className="mt-2 flex gap-2">
                      <button type="submit" className="rounded border border-alert-400/50 px-2 py-1 text-[11.5px] text-alert-400 hover:bg-alert-400/15">
                        Yes, delete
                      </button>
                      <button type="button" onClick={() => setConfirmDelete(false)} className="rounded border border-line px-2 py-1 text-[11.5px] text-fg-muted">
                        Keep it
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className={cx('flex w-full items-center gap-2 rounded-2 border border-line px-3 py-1.5 text-[12px] text-fg-muted transition-colors hover:border-alert-400/50 hover:text-alert-400')}
                  >
                    <Icon name="trash" size={12} /> Delete this {props.singular.toLowerCase()}
                  </button>
                )
              ) : null}
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function ActionForm({ module, id, op, label, icon }: { module: string; id: string; op: string; label: string; icon: string }) {
  const csrf = useCsrf();
  return (
    <form action={rowFormAction} className="flex">
      <input type="hidden" name="_csrf" value={csrf} />
      <input type="hidden" name="module" value={module} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="op" value={op} />
      <button type="submit" className="flex w-full items-center gap-2 rounded-2 border border-line px-3 py-1.5 text-[12px] text-fg-muted transition-colors hover:border-[var(--accent)]/50 hover:text-fg">
        <Icon name={icon as never} size={12} /> {label}
      </button>
    </form>
  );
}
