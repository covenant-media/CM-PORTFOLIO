'use client';
/**
 * The section composer: what a page is made of, in what order, visible or not.
 * Saving writes the page_block rows; the public page picks the new order up on the
 * next request because the content tag is revalidated by the repository layer.
 */
import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { saveCompositionAction } from '@/app/admin/actions';
import { useCsrf } from './providers';
import { cx } from '@/lib/utils/text';

export interface ComposedBlock {
  block_id: string;
  block_type: string;
  name: string;
  headline: string | null;
  placement: string;
  sort_order: number;
  is_visible: boolean;
  status: string;
  overrides: Record<string, unknown>;
}

export interface AvailableBlock {
  id: string;
  name: string;
  block_type: string;
  headline: string | null;
  status: string;
  used_by: number;
}

export function Composer({
  pageId,
  pageSlug,
  pageTitle,
  blocks,
  available,
  canWrite,
}: {
  pageId: string;
  pageSlug: string;
  pageTitle: string;
  blocks: ComposedBlock[];
  available: AvailableBlock[];
  canWrite: boolean;
}) {
  const csrf = useCsrf();
  const router = useRouter();
  const [rows, setRows] = useState<ComposedBlock[]>(blocks);
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const signature = useMemo(() => blocks.map((b) => b.block_id).join('|'), [blocks]);

  useEffect(() => setRows(blocks), [signature]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = useMemo(() => {
    if (rows.length !== blocks.length) return true;
    return rows.some((row, index) => {
      const original = blocks[index];
      if (!original) return true;
      return row.block_id !== original.block_id || row.is_visible !== original.is_visible || row.placement !== original.placement;
    });
  }, [rows, blocks]);

  const move = (index: number, delta: number) =>
    setRows((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      const [row] = next.splice(index, 1);
      if (row) next.splice(target, 0, row);
      return next;
    });

  const save = () => {
    setNotice(null);
    startTransition(async () => {
      const result = await saveCompositionAction(
        pageId,
        csrf,
        rows.map((row, index) => ({ block_id: row.block_id, placement: row.placement, sort_order: index, is_visible: row.is_visible, overrides: row.overrides })),
      );
      setNotice(result.ok ? (result.message ?? 'Layout saved') : (result.message ?? 'Could not save'));
      if (result.ok) router.refresh();
    });
  };

  const attached = new Set(rows.map((row) => row.block_id));
  const options = available.filter((block) => !attached.has(block.id));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] text-fg">{pageTitle}</p>
          <p className="mt-0.5 font-mono text-[11px] text-fg-dim">
            /{pageSlug === 'home' ? '' : pageSlug} · {rows.length} section{rows.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canWrite ? (
            <button
              type="button"
              onClick={save}
              disabled={!dirty || pending}
              className={cx('inline-flex items-center gap-1.5 rounded-2 px-3 py-1.5 text-[12.5px] transition-colors', dirty ? 'bg-[var(--accent)] text-[var(--accent-ink)]' : 'border border-line text-fg-dim')}
            >
              {pending ? <Icon name="spinner" size={13} className="animate-spin" /> : <Icon name="check" size={13} />}
              {dirty ? 'Save layout' : 'Saved'}
            </button>
          ) : null}
          <Link href={`/${pageSlug === 'home' ? '' : pageSlug}`} target="_blank" className="rounded-2 border border-line px-2.5 py-1.5 text-[12px] text-fg-muted hover:text-fg">
            View page
          </Link>
        </div>
      </div>

      {notice ? (
        <p className={cx('rounded-2 border px-3 py-2 text-[12px]', dirty ? 'border-alert-400/40 text-alert-400' : 'border-ok-400/40 text-ok-400')}>{notice}</p>
      ) : null}

      {rows.length === 0 ? (
        <p className="rounded-3 border border-dashed border-line px-4 py-6 text-center text-[12.5px] text-fg-dim">
          This page has no sections attached. The public site falls back to its built-in plan, so it still renders —
          attach a section to take control of it.
        </p>
      ) : (
        <ul className="divide-y divide-line/60 overflow-hidden rounded-3 border border-line bg-ink-900/40">
          {rows.map((row, index) => (
            <li key={row.block_id} className="flex items-center gap-3 px-3 py-2.5">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded border border-line text-[10.5px] text-fg-dim">{index + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-[13px] text-fg">{row.name}</span>
                  <span className="shrink-0 rounded border border-line px-1.5 py-[1px] font-mono text-[10px] text-fg-dim">{row.block_type}</span>
                  {row.status !== 'published' ? <span className="shrink-0 rounded border border-[var(--accent)]/40 px-1.5 py-[1px] text-[10px] text-[var(--accent)]">{row.status}</span> : null}
                  {!row.is_visible ? <span className="shrink-0 rounded border border-line px-1.5 py-[1px] text-[10px] text-fg-dim">hidden</span> : null}
                </span>
                {row.headline ? <span className="mt-0.5 block truncate text-[11.5px] text-fg-dim">{row.headline}</span> : null}
              </span>
              {canWrite ? (
                <span className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setRows((prev) => prev.map((r, i) => (i === index ? { ...r, is_visible: !r.is_visible } : r)))}
                    className="rounded border border-line p-1 text-fg-dim hover:text-fg"
                    aria-label={row.is_visible ? `Hide ${row.name}` : `Show ${row.name}`}
                    title={row.is_visible ? 'Hide on the public page' : 'Currently hidden'}
                  >
                    <Icon name={row.is_visible ? 'eye' : 'eye-off'} size={13} />
                  </button>
                  <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="rounded border border-line p-1 text-fg-dim hover:text-fg disabled:opacity-25" aria-label="Move up">
                    <Icon name="chevron-up" size={13} />
                  </button>
                  <button type="button" onClick={() => move(index, 1)} disabled={index === rows.length - 1} className="rounded border border-line p-1 text-fg-dim hover:text-fg disabled:opacity-25" aria-label="Move down">
                    <Icon name="chevron-down" size={13} />
                  </button>
                  <button type="button" onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))} className="rounded border border-line p-1 text-fg-dim hover:text-alert-400" aria-label={`Detach ${row.name}`}>
                    <Icon name="minus" size={13} />
                  </button>
                  <Link href={`/admin/blocks/${row.block_id}`} className="rounded border border-line px-2 py-1 text-[11.5px] text-fg-muted hover:text-fg">
                    Edit
                  </Link>
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canWrite ? (
        <AttachRow
          options={options}
          onAttach={(block) => setRows((prev) => [...prev, { block_id: block.id, block_type: block.block_type, name: block.name, headline: block.headline, placement: 'body', sort_order: prev.length, is_visible: true, status: block.status, overrides: {} }])}
        />
      ) : null}
    </div>
  );
}

function AttachRow({ options, onAttach }: { options: AvailableBlock[]; onAttach: (block: AvailableBlock) => void }) {
  const [value, setValue] = useState('');
  const chosen = options.find((option) => option.id === value);
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-3 border border-line bg-ink-900/40 px-3 py-2.5">
      <span className="text-[11.5px] uppercase tracking-[0.13em] text-fg-dim">Attach a section</span>
      {options.length === 0 ? (
        <span className="text-[12px] text-fg-dim">Every existing section is already on this page.</span>
      ) : (
        <>
          <select
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="min-w-[220px] flex-1 rounded-2 border border-line bg-ink-950/70 px-2.5 py-1.5 text-[12.5px] text-fg"
          >
            <option value="">Choose a section…</option>
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name} — {option.block_type}
                {option.used_by ? ` (on ${option.used_by} page${option.used_by === 1 ? '' : 's'})` : ' (unused)'}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!chosen}
            onClick={() => {
              if (chosen) {
                onAttach(chosen);
                setValue('');
              }
            }}
            className="rounded-2 border border-line px-3 py-1.5 text-[12.5px] text-fg-muted hover:border-[var(--accent)]/50 hover:text-fg disabled:opacity-40"
          >
            Add to page
          </button>
        </>
      )}
    </div>
  );
}
