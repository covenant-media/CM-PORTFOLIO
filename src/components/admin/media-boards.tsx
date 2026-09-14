'use client';
/**
 * The two media-portfolio boards: the hero (copy + which short-form pieces roll in it) and the
 * client stories attached to each video.
 *
 * They are client components for one reason: both need to show the result of an edit before it
 * is saved — the hero copy in its own field, and the story attribution exactly as the public
 * rail will compute it (`deriveStory` is the same pure function the page uses). Everything they
 * submit still goes through the server actions, so permissions, CSRF, validation, audit and
 * cache revalidation are unchanged.
 */
import { useActionState, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { saveSettingsFormAction, saveVideoStoryAction } from '@/app/admin/actions';
import { RowActionForm } from './row-actions';
import { Panel, Pill, StatusPill } from './ui';
import { useCsrf } from './providers';
import { STORY_KINDS } from '@/lib/cms/options';
import { deriveStory } from '@/lib/media/story';
import type { MediaVideoBoardRow } from '@/lib/cms/admin';
import { cx } from '@/lib/utils/text';

/* ── hero ────────────────────────────────────────────────────────────────── */

export interface HeroCopy {
  eyebrow: string;
  name: string;
  intro: string;
  capabilities: string;
}

/**
 * Hero text + hero preview in one screen.
 *
 * The copy form posts only the four hero keys of the `media` settings group (a partial form —
 * the action writes just the fields it received), and returns to this page with the result.
 */
export function HeroBoard({
  copy,
  items,
  canWrite,
  returnTo,
}: {
  copy: HeroCopy;
  items: MediaVideoBoardRow[];
  canWrite: boolean;
  returnTo: string;
}) {
  // Only short-form pieces roll in the hero; long-form films keep their own rail.
  const shorts = items.filter((row) => row.format === 'short');
  const longForm = items.length - shorts.length;
  const rolling = shorts.filter((row) => row.heroPreview && row.status === 'published');
  const waiting = shorts.filter((row) => !(row.heroPreview && row.status === 'published'));

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <Panel
        title="Hero text"
        hint="The greeting, the name and the paragraph at the top of the media portfolio. Saved straight to the page."
      >
        <form action={canWrite ? saveSettingsFormAction.bind(null, 'media') : undefined} className="space-y-3">
          <CsrfInput />
          <input type="hidden" name="_return" value={returnTo} />
          <Field label="Small line above the name" name="media.hero_eyebrow" defaultValue={copy.eyebrow} placeholder="Hello, I'm" disabled={!canWrite} />
          <Field
            label="The name"
            name="media.hero_name"
            defaultValue={copy.name}
            placeholder="Covenant Nsikan"
            disabled={!canWrite}
            help="The given name prints in the brand gold and the surname in the surface white, like the logo."
          />
          <Area
            label="Introduction"
            name="media.hero_intro"
            defaultValue={copy.intro}
            rows={4}
            disabled={!canWrite}
            help="The paragraph under the name."
          />
          <Area
            label="Capability list"
            name="media.capabilities"
            defaultValue={copy.capabilities}
            rows={5}
            disabled={!canWrite}
            help="One capability per line — the list under the figures band."
          />
          {canWrite ? (
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-2 bg-[var(--accent)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--accent-ink)] transition-opacity hover:opacity-90"
            >
              <Icon name="check" size={13} /> Save hero text
            </button>
          ) : (
            <span className="inline-flex rounded-2 border border-line px-2.5 py-1 text-[11.5px] text-fg-dim">Read only for your role</span>
          )}
        </form>
      </Panel>

      <Panel
        title="Hero preview"
        hint="Short-form pieces ticked here roll inside the hero card at the top of the media portfolio, in this order. Everything else stays in the Short-form rail."
        action={
          <Link href="/admin/videos?form=short_form" className="rounded-2 border border-line px-2.5 py-1 text-[11.5px] text-fg-muted hover:text-fg">
            Manage videos
          </Link>
        }
      >
        <div className="flex flex-wrap items-center gap-2 border-b border-line/60 pb-3">
          <Pill tone={rolling.length ? 'ok' : 'warn'}>
            <Icon name={rolling.length ? 'play' : 'alert'} size={11} />
            {rolling.length ? `${rolling.length} rolling in the hero` : 'Nothing is rolling in the hero'}
          </Pill>
          {!rolling.length ? (
            <span className="text-[11.5px] text-fg-dim">Tick a piece below — the built-in default set shows until you do.</span>
          ) : null}
          {longForm ? (
            <span className="text-[11.5px] text-fg-dim">
              {longForm} long-form film{longForm === 1 ? '' : 's'} sit in the Long-form rail and the catalog, not here.
            </span>
          ) : null}
        </div>

        {rolling.length ? (
          <ul className="flex flex-wrap gap-2 py-3">
            {rolling.map((row) => (
              <li key={row.id} className="w-[86px]">
                <span className="block overflow-hidden rounded-2 border border-[var(--accent)]/40 bg-ink-950">
                  {row.poster ? (
                    <img src={row.poster} alt="" className="aspect-[9/16] w-full object-cover" />
                  ) : (
                    <span className="grid aspect-[9/16] w-full place-items-center text-fg-dim">
                      <Icon name="film" size={15} />
                    </span>
                  )}
                </span>
                <span className="mt-1 block truncate text-[10.5px] text-fg-dim" title={row.title}>
                  {row.title}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        <ul className="divide-y divide-line/60">
          {shorts.length === 0 ? (
            <li className="py-3 text-[12.5px] text-fg-dim">
              No short-form videos yet. Add one under{' '}
              <Link href="/admin/videos/new" className="text-[var(--accent)] hover:underline">
                Videos
              </Link>{' '}
              and set its format to short-form.
            </li>
          ) : null}
          {[...rolling, ...waiting].map((row) => (
            <li key={row.id} className="flex items-center gap-3 py-2.5">
              <StatusPill status={row.status} />
              <span className="min-w-0 flex-1">
                <Link href={`/admin/videos/${row.id}`} className="block truncate text-[13px] text-fg hover:underline">
                  {row.title}
                </Link>
                <span className="mt-0.5 block text-[11.5px] text-fg-dim">
                  {row.format === 'short' ? 'Short-form' : 'Long-form'}
                  {row.duration ? ` · ${row.duration}` : ''}
                  {row.heroPreview ? ' · in the hero' : ''}
                </span>
              </span>
              {canWrite ? (
                <RowActionForm
                  module="videos"
                  id={row.id}
                  returnTo={returnTo}
                  action={
                    row.heroPreview
                      ? { op: 'hero-off', label: 'Remove', icon: 'minus' }
                      : { op: 'hero-on', label: 'Add to hero', icon: 'plus', tone: 'accent' }
                  }
                />
              ) : null}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

/* ── client stories ──────────────────────────────────────────────────────── */

const KIND_OPTIONS = STORY_KINDS.map((option) => ({ value: option.value, label: option.label }));

export function StoryBoard({ rows, canWrite }: { rows: MediaVideoBoardRow[]; canWrite: boolean }) {
  const withStories = rows.filter((row) => (row.storyQuote ?? '').trim().length > 0);
  const candidates = rows.filter((row) => (row.storyQuote ?? '').trim().length === 0);
  return (
    <Panel
      title="Client stories"
      hint="One story per piece. Leave the name blank and the rail attributes it from the client field, then from what the title already says."
      action={
        <Link href="/admin/testimonials" className="rounded-2 border border-line px-2.5 py-1 text-[11.5px] text-fg-muted hover:text-fg">
          Standing testimonials
        </Link>
      }
    >
      <p className="flex flex-wrap items-center gap-2 border-b border-line/60 pb-3 text-[11.5px] text-fg-dim">
        <Pill tone={withStories.length ? 'ok' : 'neutral'}>
          <Icon name="quote" size={11} /> {withStories.length} on the rail
        </Pill>
        {candidates.length} piece{candidates.length === 1 ? '' : 's'} without a story yet.
      </p>

      <ul className="divide-y divide-line/60">
        {rows.length === 0 ? (
          <li className="py-3 text-[12.5px] text-fg-dim">No videos yet — add one under Videos first.</li>
        ) : null}
        {rows.map((row) => (
          <StoryRow key={row.id} row={row} canWrite={canWrite} />
        ))}
      </ul>
    </Panel>
  );
}

function StoryRow({ row, canWrite }: { row: MediaVideoBoardRow; canWrite: boolean }) {
  const [client, setClient] = useState(row.storyClient ?? '');
  const [kind, setKind] = useState(row.storyKind ?? '');
  const [quote, setQuote] = useState(row.storyQuote ?? '');
  // Bound to the row so the form works as a plain POST as well as with JavaScript.
  const [state, save] = useActionState(saveVideoStoryAction.bind(null, row.id), null);
  const preview = deriveStory({ title: row.title, client: row.client, storyClient: client, storyKind: kind });
  const written = quote.trim().length > 0;

  return (
    <li className="py-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/admin/videos/${row.id}`} className="block truncate text-[13px] text-fg hover:underline">
            {row.title}
          </Link>
          <span className="mt-0.5 flex flex-wrap items-center gap-2 text-[11.5px] text-fg-dim">
            <StatusPill status={row.status} />
            <span>{row.format === 'short' ? 'Short-form' : 'Long-form'}</span>
            <span className="text-fg-muted">
              {written ? 'Rail shows' : 'When you write one, it will read'} {preview.author ? `“${preview.author}”` : 'unnamed'} · {preview.context}
            </span>
          </span>
        </div>
        {!written ? <Pill tone="warn">No words yet</Pill> : null}
      </div>

      {canWrite ? (
        <form action={save} className="mt-3 grid gap-2.5 sm:grid-cols-2">
          <CsrfInput />
          <Field
            label="Client name (optional)"
            name="story_client"
            value={client}
            onChange={setClient}
            placeholder={row.client ? `Currently: ${row.client}` : 'e.g. Mary and Real'}
          />
          <label className="block">
            <span className="mb-1 block text-[10.5px] uppercase tracking-[0.13em] text-fg-dim">Type of work</span>
            <select
              name="story_kind"
              value={kind}
              onChange={(event) => setKind(event.target.value)}
              className="w-full rounded-2 border border-line bg-ink-950/70 px-3 py-1.5 text-[12.5px] text-fg outline-none focus:border-[var(--accent)]/60"
            >
              {KIND_OPTIONS.map((option) => (
                <option key={option.value || 'auto'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-[10.5px] uppercase tracking-[0.13em] text-fg-dim">What the client said</span>
            <textarea
              name="story_quote"
              value={quote}
              onChange={(event) => setQuote(event.target.value)}
              rows={3}
              maxLength={600}
              placeholder="Only their words — the rail never invents a quotation."
              className="w-full rounded-2 border border-line bg-ink-950/70 px-3 py-2 text-[12.5px] text-fg outline-none focus:border-[var(--accent)]/60"
            />
          </label>
          <div className="flex items-center gap-2 sm:col-span-2">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-2 border border-[var(--accent)]/45 bg-[var(--accent-glow)] px-3 py-1.5 text-[12px] text-[var(--accent)] transition-colors hover:bg-[var(--accent)]/20"
            >
              <Icon name="check" size={12} /> Save story
            </button>
            {state ? (
              <span className={cx('text-[11.5px]', state.ok ? 'text-ok-400' : 'text-alert-400')}>
                {state.message ?? (state.ok ? 'Client story saved' : 'Could not save')}
              </span>
            ) : null}
          </div>
        </form>
      ) : (
        <p className="mt-2 text-[12px] text-fg-dim">{row.storyQuote || 'No story written.'}</p>
      )}
    </li>
  );
}

/* ── shared bits ─────────────────────────────────────────────────────────── */

/** The CSRF token is supplied by `AdminProviders`; this keeps the hook call in one place. */
function CsrfInput() {
  const csrf = useCsrf();
  return <input type="hidden" name="_csrf" value={csrf} />;
}

function Field({
  label,
  name,
  defaultValue,
  value,
  onChange,
  placeholder,
  help,
  disabled,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  value?: string;
  onChange?: (next: string) => void;
  placeholder?: string;
  help?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10.5px] uppercase tracking-[0.13em] text-fg-dim">{label}</span>
      <input
        name={name}
        defaultValue={onChange ? undefined : defaultValue}
        value={onChange ? value : undefined}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        placeholder={placeholder}
        disabled={disabled}
        className={cx(
          'w-full rounded-2 border border-line bg-ink-950/70 px-3 py-1.5 text-[12.5px] text-fg outline-none focus:border-[var(--accent)]/60',
          disabled && 'opacity-60',
        )}
      />
      {help ? <span className="mt-1 block text-[11px] text-fg-dim">{help}</span> : null}
    </label>
  );
}

function Area({
  label,
  name,
  defaultValue,
  rows = 3,
  help,
  disabled,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  rows?: number;
  help?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10.5px] uppercase tracking-[0.13em] text-fg-dim">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={rows}
        disabled={disabled}
        className={cx(
          'w-full rounded-2 border border-line bg-ink-950/70 px-3 py-2 text-[12.5px] text-fg outline-none focus:border-[var(--accent)]/60',
          disabled && 'opacity-60',
        )}
      />
      {help ? <span className="mt-1 block text-[11px] text-fg-dim">{help}</span> : null}
    </label>
  );
}
