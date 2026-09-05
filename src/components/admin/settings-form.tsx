'use client';
/**
 * Site settings, grouped. One form per group so saving a group cannot clobber edits
 * happening in another, and every control is the same field renderer the row editor
 * uses — no second form system.
 */
import { useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { saveSettingsFormAction } from '@/app/admin/actions';
import { AdminField } from './fields';
import { useCsrf } from './providers';
import { cx } from '@/lib/utils/text';
import type { FieldDef } from '@/lib/cms/fields';

export interface SettingField {
  key: string;
  label: string;
  type: string;
  help?: string;
  options?: { value: string; label: string }[];
  rows?: number;
  maxLength?: number;
  value: string | number | boolean;
  isPublic: boolean;
}

export function SettingsForm({
  group,
  label,
  hint,
  fields,
  custom,
  canWrite,
}: {
  group: string;
  label: string;
  hint: string;
  fields: SettingField[];
  custom: { key: string; label: string; value: string }[];
  canWrite: boolean;
}) {
  const csrf = useCsrf();
  const action = canWrite ? saveSettingsFormAction.bind(null, group) : undefined;
  const [openCustom, setOpenCustom] = useState(false);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="_csrf" value={csrf} />
      <div className="rounded-4 border border-line bg-ink-900/50">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-3.5">
          <div>
            <h2 className="font-display text-[18px] leading-tight text-fg">{label}</h2>
            <p className="mt-1 max-w-[68ch] text-[12.5px] leading-relaxed text-fg-dim">{hint}</p>
          </div>
          {canWrite ? (
            <button type="submit" className="inline-flex items-center gap-1.5 rounded-2 bg-[var(--accent)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--accent-ink)] transition-opacity hover:opacity-90">
              <Icon name="check" size={13} /> Save this group
            </button>
          ) : (
            <span className="rounded-2 border border-line px-2.5 py-1 text-[11.5px] text-fg-dim">Read only</span>
          )}
        </header>

        <div className="grid grid-cols-12 gap-x-4 gap-y-4 px-5 py-4">
          {fields.map((def) => (
            <AdminField
              key={def.key}
              field={
                {
                  key: def.key,
                  label: def.label,
                  type: def.type as FieldDef['type'],
                  help: def.help,
                  options: def.options,
                  rows: def.rows,
                  maxLength: def.maxLength,
                  width: def.type === 'boolean' ? 'third' : def.type === 'text' || def.type === 'email' || def.type === 'number' || def.type === 'select' ? 'half' : 'full',
                } satisfies FieldDef
              }
              value={def.value}
              readOnly={!canWrite}
              watch={() => undefined}
              onWatch={() => undefined}
            />
          ))}
        </div>
      </div>

      {custom.length > 0 || canWrite ? (
        <div className="rounded-4 border border-line bg-ink-900/40">
          <button
            type="button"
            onClick={() => setOpenCustom((v) => !v)}
            className="flex w-full items-center gap-2 px-5 py-3 text-left text-[12.5px] text-fg-muted"
          >
            <Icon name={openCustom ? 'chevron-down' : 'chevron-right'} size={13} />
            Custom settings
            <span className="text-[11px] text-fg-dim">({custom.length})</span>
            <span className="ml-auto text-[11px] text-fg-dim">Keys written by hand, e.g. by a block override</span>
          </button>
          {openCustom ? (
            <div className="border-t border-line px-5 py-4">
              {custom.length === 0 ? <p className="text-[12px] text-fg-dim">Nothing stored outside the schema.</p> : null}
              <ul className="space-y-2.5">
                {custom.map((row) => (
                  <li key={row.key} className="grid gap-2 sm:grid-cols-[220px_minmax(0,1fr)]">
                    <span className="font-mono text-[11px] text-fg-dim">{row.key}</span>
                    <input name={`custom:${row.key}`} defaultValue={row.value} disabled={!canWrite} className={cx('w-full rounded-2 border border-line bg-ink-950/70 px-2.5 py-1.5 font-mono text-[12px] text-fg', !canWrite && 'opacity-60')} />
                  </li>
                ))}
              </ul>
              {canWrite ? (
                <p className="mt-3 text-[11.5px] text-fg-dim">
                  Add a new key by naming it below — dotted keys only, and only keys you would be happy to read aloud to a client.
                  <input name="custom:new.key" placeholder="custom.key" className="mt-2 w-full max-w-[260px] rounded-2 border border-line bg-ink-950/70 px-2.5 py-1.5 font-mono text-[12px] text-fg placeholder:text-fg-dim/70" />
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <p className="flex items-center gap-2 text-[11.5px] text-fg-dim">
        <Icon name="info" size={12} />
        Values marked private (API keys, SMTP) are stored in the database and never rendered into public HTML.{' '}
        <Link href="/admin/settings?group=system" className="text-fg-muted underline decoration-line hover:text-fg">
          System settings
        </Link>
      </p>
    </form>
  );
}
