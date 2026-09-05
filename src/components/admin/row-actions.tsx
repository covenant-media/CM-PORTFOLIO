'use client';
/**
 * Per-row quick actions. Real `<form>` posts so publish and delete work even before
 * JavaScript has loaded — the only client-side piece is the delete confirmation.
 */
import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { rowFormAction } from '@/app/admin/actions';
import { useCsrf } from './providers';
import { cx } from '@/lib/utils/text';

export interface RowAction {
  op: string;
  label: string;
  icon: string;
  tone?: 'default' | 'accent' | 'danger';
  confirm?: string;
  force?: boolean;
}

export function RowActionForm({ module, id, action, compact = false }: { module: string; id: string; action: RowAction; compact?: boolean }) {
  const csrf = useCsrf();
  const [armed, setArmed] = useState(false);

  if (action.confirm && !armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        title={action.confirm}
        className={cx(
          'inline-flex items-center gap-1.5 rounded-2 border border-line px-2 py-1 text-[11.5px] text-fg-muted transition-colors',
          action.tone === 'danger' ? 'hover:border-alert-400/50 hover:text-alert-400' : 'hover:border-[var(--accent)]/50 hover:text-fg',
        )}
      >
        <Icon name={action.icon} size={12} />
        {!compact ? action.label : null}
      </button>
    );
  }

  return (
    <form action={rowFormAction} className="inline-flex items-center">
      <input type="hidden" name="_csrf" value={csrf} />
      <input type="hidden" name="module" value={module} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="op" value={action.op} />
      {action.force ? <input type="hidden" name="force" value="1" /> : null}
      {action.confirm ? (
        <span className="mr-1.5 text-[11px] text-alert-400">{action.confirm}</span>
      ) : null}
      <button
        type="submit"
        className={cx(
          'inline-flex items-center gap-1.5 rounded-2 border px-2 py-1 text-[11.5px] transition-colors',
          action.confirm
            ? 'border-alert-400/50 text-alert-400 hover:bg-alert-400/12'
            : action.tone === 'accent'
              ? 'border-[var(--accent)]/45 text-[var(--accent)] hover:bg-[var(--accent-glow)]'
              : 'border-line text-fg-muted hover:border-[var(--accent)]/40 hover:text-fg',
        )}
      >
        <Icon name={action.icon} size={12} />
        {action.confirm ? 'Confirm' : !compact ? action.label : null}
      </button>
      {action.confirm ? (
        <button type="button" onClick={() => setArmed(false)} className="ml-1 rounded px-1 text-[11px] text-fg-dim hover:text-fg">
          Cancel
        </button>
      ) : null}
    </form>
  );
}
