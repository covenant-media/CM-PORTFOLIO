'use client';
/**
 * Drag-and-drop / multi-file upload for the media library. Sends each file to the
 * admin upload route, which sniffs bytes, rejects anything unexpected and writes the
 * asset row — this component only reports what came back.
 */
import { useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { replaceAssetFormAction } from '@/app/admin/actions';
import { useCsrf } from './providers';
import { bytesLabel } from './ui';
import { cx } from '@/lib/utils/text';

function ReplaceButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-2 bg-[var(--accent)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--accent-ink)] hover:opacity-90 disabled:opacity-50"
    >
      {pending ? 'Replacing…' : 'Replace file'}
    </button>
  );
}

/**
 * Swapping the bytes under an existing URL updates every page that uses it, so this is
 * offered instead of "delete and re-link". The pending label comes from useFormStatus: the
 * server action itself revalidates, so there is nothing for this component to refetch.
 */
export function ReplacePanel({ assetId, current }: { assetId: string; current: { filename?: string; bytes?: number; width?: number | null; height?: number | null } }) {
  const csrf = useCsrf();

  return (
    <div className="rounded-4 border border-line bg-ink-900/50 p-4">
      <p className="text-[11px] uppercase tracking-[0.14em] text-fg-dim">Replace this file</p>
      <p className="mt-1.5 text-[12px] leading-relaxed text-fg-muted">
        Swaps the bytes under the same URL so every page using it updates at once — nothing to re-link. Current file:{' '}
        <span className="font-mono text-[11px] text-fg-dim">{current.filename ?? 'unknown'}</span>
        {current.bytes ? ` · ${bytesLabel(current.bytes)}` : ''}
        {current.width ? ` · ${current.width}×${current.height}` : ''}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <form action={replaceAssetFormAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="_csrf" value={csrf} />
          <input type="hidden" name="id" value={assetId} />
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-2 border border-line px-3 py-1.5 text-[12.5px] text-fg-muted hover:border-[var(--accent)]/50 hover:text-fg">
            <Icon name="refresh" size={13} /> Choose a new file
            <input type="file" name="file" className="sr-only" accept="image/*,video/mp4,video/webm,video/quicktime,application/pdf" />
          </label>
          <ReplaceButton />
        </form>
      </div>
    </div>
  );
}

interface Result {
  ok: boolean;
  message?: string;
  asset?: { id: string; filename: string };
}

export function Uploader({ folder, canWrite = true }: { folder?: string; canWrite?: boolean }) {
  const csrf = useCsrf();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(0);
  const [results, setResults] = useState<Result[]>([]);

  const send = async (files: FileList | File[]) => {
    const list = Array.from(files).slice(0, 12);
    if (!list.length) return;
    setBusy(list.length);
    const out: Result[] = [];
    for (const file of list) {
      const data = new FormData();
      data.set('file', file);
      data.set('_csrf', csrf);
      if (folder) data.set('folder', folder);
      try {
        const res = await fetch('/api/admin/upload', { method: 'POST', body: data });
        out.push((await res.json()) as Result);
      } catch {
        out.push({ ok: false, message: `${file.name}: the request never reached the server` });
      }
      setBusy((n) => n - 1);
    }
    setResults(out);
    router.refresh();
  };

  if (!canWrite) return null;

  return (
    <div>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void send(event.dataTransfer.files);
        }}
        className={cx(
          'flex flex-col items-center justify-center gap-2 rounded-4 border border-dashed px-5 py-8 text-center transition-colors',
          dragging ? 'border-[var(--accent)] bg-[var(--accent-glow)]' : 'border-line',
        )}
      >
        <Icon name="upload" size={20} className={dragging ? 'text-[var(--accent)]' : 'text-fg-dim'} />
        <p className="text-[13px] text-fg-muted">Drop images, video or a PDF here</p>
        <p className="max-w-[52ch] text-[11.5px] leading-snug text-fg-dim">
          Files are checked by their bytes, not their names. SVG is refused, alt text is asked for straight after, and
          replacing an asset updates every page that uses it.
        </p>
        <button type="button" onClick={() => input.current?.click()} className="mt-1 rounded-2 border border-line px-3 py-1.5 text-[12.5px] text-fg-muted hover:border-[var(--accent)]/50 hover:text-fg">
          Choose files
        </button>
        <input ref={input} type="file" multiple className="sr-only" accept="image/*,video/mp4,video/webm,video/quicktime,application/pdf,audio/*" onChange={(event) => event.target.files && void send(event.target.files)} />
        {busy > 0 ? (
          <p className="mt-1 flex items-center gap-2 text-[12px] text-[var(--accent)]">
            <Icon name="spinner" size={13} className="animate-spin" /> Uploading {busy}…
          </p>
        ) : null}
      </div>

      {results.length ? (
        <ul className="mt-2 space-y-1">
          {results.map((result, index) => (
            <li key={index} className={cx('flex items-start gap-2 rounded-2 border px-3 py-1.5 text-[12px]', result.ok ? 'border-ok-400/35 text-ok-400' : 'border-alert-400/40 text-alert-400')}>
              <Icon name={result.ok ? 'check' : 'alert'} size={12} className="mt-[3px] shrink-0" />
              {result.ok ? `Stored: ${result.asset?.filename ?? 'file'}` : result.message}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
