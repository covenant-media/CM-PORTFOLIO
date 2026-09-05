'use client';
/**
 * Ordering for any sortable module. Buttons rather than drag-only, because a list
 * that can only be reordered by dragging is unusable on a phone and hostile to a
 * keyboard — and this is the tool people use while on location.
 */
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { Icon } from '@/components/ui/Icon';
import { reorderAction } from '@/app/admin/actions';
import { useRouter } from 'next/navigation';
import { useCsrf } from './providers';
import { cx } from '@/lib/utils/text';

export interface ReorderItem {
  id: string;
  label: string;
  meta?: string;
}

export function ReorderList({ moduleKey, items, footer }: { moduleKey: string; items: ReorderItem[]; footer?: React.ReactNode }) {
  const csrf = useCsrf();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [order, setOrder] = useState<ReorderItem[]>(items);
  const signature = useMemo(() => items.map((item) => item.id).join('|'), [items]);
  useEffect(() => setOrder(items), [signature]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = useMemo(() => order.some((item, index) => item.id !== items[index]?.id), [order, items]);


  const move = useCallback((index: number, delta: number) => {
    setOrder((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      const [row] = next.splice(index, 1);
      if (row) next.splice(target, 0, row);
      return next;
    });
  }, []);

  const save = () => {
    startTransition(async () => {
      await reorderAction(moduleKey, csrf, order.map((item) => item.id));
      router.refresh();
    });
  };

  if (!items.length) return null;

  return (
    <div className="space-y-2">
      <ul className="divide-y divide-line/60 rounded-3 border border-line bg-ink-900/40">
        {order.map((item, index) => (
          <li key={item.id} className="flex items-center gap-3 px-3 py-2">
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded border border-line text-[10px] text-fg-dim">{index + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] text-fg">{item.label}</span>
              {item.meta ? <span className="block truncate text-[11px] text-fg-dim">{item.meta}</span> : null}
            </span>
            <span className="flex shrink-0 items-center gap-1">
              <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="rounded border border-line p-1 text-fg-dim transition-colors hover:text-fg disabled:opacity-25" aria-label={`Move ${item.label} up`}>
                <Icon name="chevron-up" size={13} />
              </button>
              <button type="button" onClick={() => move(index, 1)} disabled={index === order.length - 1} className="rounded border border-line p-1 text-fg-dim transition-colors hover:text-fg disabled:opacity-25" aria-label={`Move ${item.label} down`}>
                <Icon name="chevron-down" size={13} />
              </button>
            </span>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={!dirty || pending}
          className={cx(
            'inline-flex items-center gap-2 rounded-2 px-3 py-1.5 text-[12.5px] transition-colors',
            dirty ? 'bg-[var(--accent)] text-[var(--accent-ink)]' : 'border border-line text-fg-dim',
          )}
        >
          {pending ? <Icon name="spinner" size={13} className="animate-spin" /> : <Icon name="check" size={13} />}
          {dirty ? 'Save order' : 'Order is up to date'}
        </button>
        {dirty ? (
          <button type="button" onClick={() => setOrder(items)} className="rounded-2 border border-line px-2.5 py-1.5 text-[12px] text-fg-muted hover:text-fg">
            Reset
          </button>
        ) : null}
        {footer}
      </div>
    </div>
  );
}
