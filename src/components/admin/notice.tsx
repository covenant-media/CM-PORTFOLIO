import { Icon } from '@/components/ui/Icon';
import { cx } from '@/lib/utils/text';

export type NoticeParams = Record<string, string | string[] | undefined>;

const COPY: Record<string, { tone: 'ok' | 'warn'; text: string }> = {
  saved: { tone: 'ok', text: 'Saved.' },
  created: { tone: 'ok', text: 'Created as a draft. Publish it when the facts are in.' },
  deleted: { tone: 'ok', text: 'Deleted.' },
  duplicated: { tone: 'ok', text: 'Duplicated — you are editing the copy.' },
  imported: { tone: 'ok', text: 'Imported from that link. Check the metadata before publishing.' },
  error: { tone: 'warn', text: 'That change was rejected.' },
};

const KEYS = ['saved', 'created', 'deleted', 'duplicated', 'imported', 'error'] as const;

/** Surveys the query string after a mutation and reports what happened. */
export function Notice({ params }: { params: NoticeParams }) {
  const first = (key: string): string | undefined => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const flag = KEYS.find((key) => first(key));
  if (!flag) return null;
  const info = COPY[flag]!;
  const detail = first('message') ? ` ${String(first('message')).slice(0, 240)}` : '';
  return (
    <p
      className={cx(
        'mb-4 flex items-start gap-2 rounded-3 border px-4 py-2.5 text-[12.5px] leading-snug',
        info.tone === 'ok' ? 'border-ok-400/40 bg-ok-400/8 text-ok-400' : 'border-alert-400/45 bg-alert-400/8 text-alert-400',
      )}
      role={info.tone === 'warn' ? 'alert' : 'status'}
    >
      <Icon name={info.tone === 'ok' ? 'check' : 'alert'} size={14} className="mt-[2px] shrink-0" />
      <span>
        {info.text}
        {detail}
      </span>
    </p>
  );
}
