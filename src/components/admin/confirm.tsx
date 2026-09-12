'use client';
/**
 * A submit button that asks first.
 *
 * Deleting a client story or untoggling a hero video is one click away from being an
 * accident, so the destructive row actions route through this. It is a plain submit
 * button that intercepts its own click: with JavaScript off the button still posts,
 * which is the honest fallback — an unconfirmed delete is worse than a missing prompt.
 */
import { useFormStatus } from 'react-dom';
import { cx } from '@/lib/utils/text';

export function ConfirmSubmit({
  children,
  message,
  pendingLabel = '…',
  className,
  title,
}: {
  children: React.ReactNode;
  message: string;
  pendingLabel?: string;
  className?: string;
  title?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      title={title}
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
      className={cx(
        'inline-flex items-center gap-1 rounded-2 border border-alert-400/35 px-2 py-[3px] text-[11.5px] text-alert-400/90 transition-colors hover:border-alert-400/70 hover:text-alert-400 disabled:opacity-50',
        className,
      )}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
