/**
 * Client stories.
 *
 * A story belongs to a video. The owner always writes the quote; the client name and the
 * kind of work are filled from the video when they are left blank — "Wedding Clients:
 * Mary and Real" names the couple without anyone retyping it.
 *
 * The extraction is never hidden. The panel at the bottom of this screen shows, for every
 * video, exactly what would be derived, so the rule is auditable and a wrong reading is
 * visible before it reaches the public site. And it never invents: where a video says
 * nothing about a client, the field stays empty rather than being filled with a guess.
 */
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { PageHeader, Pill, EmptyState, StatCard } from '@/components/admin/ui';
import { Notice } from '@/components/admin/notice';
import { ActionButton, Select, SubmitButton, TextArea, TextInput } from '@/components/admin/controls';
import { ConfirmSubmit } from '@/components/admin/confirm';
import { readSession } from '@/lib/auth/session';
import { levelFor } from '@/lib/auth/permissions';
import { permissionsForRole } from '@/lib/auth/guard';
import { stories, storySources, videoOptions } from '@/lib/cms/console';
import { STORY_TYPES, extractStory, storyTypeLabel } from '@/lib/media/story-extract';
import { saveStoryAction, storyAction } from '@/app/admin/actions';
import { cx } from '@/lib/utils/text';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Client stories' };

const TYPE_OPTIONS = [{ value: '', label: 'Detect from the video' }, ...STORY_TYPES.map((t) => ({ value: t.value, label: t.label }))];

export default async function MediaStoriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await readSession();
  if (!session) redirect('/admin/login');
  const [rows, options, sources, roleMap] = await Promise.all([
    stories(),
    videoOptions(),
    storySources(),
    permissionsForRole(session.user.role),
  ]);
  const level = levelFor(session.user.role, 'testimonials', roleMap);
  const canWrite = level === 'write' || level === 'manage';
  const params = await searchParams;

  const derived = new Map(sources.map((source) => [source.id, extractStory(source)]));

  return (
    <>
      <PageHeader
        eyebrow="Media portfolio"
        title="Client stories"
        lede="Attach a quote to a video. Leave the client name blank and it is read from the video’s own title or description; type it and yours wins."
      />

      <Notice params={params} />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="Stories" value={rows.length} />
        <StatCard label="Published" value={rows.filter((r) => r.status === 'published').length} tone="accent" />
        <StatCard label="Named automatically" value={rows.filter((r) => r.origin === 'auto').length} />
      </div>

      {canWrite ? (
        <section className="mb-6 rounded-4 border border-line bg-ink-900/60">
          <header className="border-b border-line px-5 py-3">
            <h3 className="text-[12.5px] font-medium text-fg">Add a client story</h3>
            <p className="mt-0.5 text-[11.5px] leading-snug text-fg-dim">
              Pick the video, write the quote, and leave the name blank if the video already says who the client was.
            </p>
          </header>
          {options.length === 0 ? (
            <div className="px-5 py-4">
              <EmptyState
                title="Add a video first"
                hint="A client story is attached to a video, so there needs to be at least one."
                action={
                  <Link
                    href="/admin/media/videos"
                    className="inline-flex items-center gap-1.5 rounded-2 border border-[var(--accent)]/45 px-3 py-1.5 text-[12px] text-[var(--accent)]"
                  >
                    <Icon name="plus" size={12} /> Add a video link
                  </Link>
                }
              />
            </div>
          ) : (
            <form action={saveStoryAction} className="grid gap-4 px-5 py-4 lg:grid-cols-2">
              <input type="hidden" name="_csrf" value={session.csrfToken} />
              <input type="hidden" name="return_to" value="/admin/media/stories" />
              <Select label="Video" name="video_id" options={options} placeholder="Choose a video…" required className="lg:col-span-2" />
              <TextInput
                label="Client name"
                name="client_name"
                hint="optional"
                placeholder="Mary and Real"
                maxLength={90}
                help="Leave blank to read it from the video. Anything you type here is used instead."
              />
              <Select label="Video type" name="video_type" options={TYPE_OPTIONS} defaultValue="" help="“Detect from the video” reads the kind of work from the title." />
              <TextInput label="Role line" name="role_label" hint="optional" placeholder="Wedding client" maxLength={80} help="Shown under the name. Filled from the type when blank." />
              <Select
                label="Status"
                name="status"
                defaultValue="draft"
                options={[
                  { value: 'draft', label: 'Draft — not shown publicly' },
                  { value: 'published', label: 'Published' },
                ]}
              />
              <div className="lg:col-span-2">
                <TextArea
                  label="Quote"
                  name="quote"
                  required
                  rows={4}
                  maxLength={600}
                  placeholder="What the client said about the work."
                  help="The only field you have to write. Keep it to what was actually said."
                />
              </div>
              <div className="lg:col-span-2">
                <SubmitButton pendingLabel="Saving…">Add client story</SubmitButton>
              </div>
            </form>
          )}
        </section>
      ) : null}

      <section className="mb-6">
        <h3 className="mb-2.5 text-[13px] font-medium text-fg">
          Stories <span className="text-[11.5px] text-fg-dim">{rows.length}</span>
        </h3>
        {rows.length === 0 ? (
          <EmptyState title="No client stories yet" hint="Add one above — the quote is yours, the name can come from the video." />
        ) : (
          <ul className="space-y-2.5">
            {rows.map((story) => (
              <li key={story.id} className="rounded-4 border border-line bg-ink-900/60">
                <div className="flex flex-wrap items-start gap-3 px-4 py-3.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line bg-ink-800 text-fg-dim">
                    <Icon name="quote" size={14} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-fg">{story.client_name || <span className="text-fg-dim/60">No client name</span>}</p>
                    {story.role_label ? <p className="text-[11.5px] text-fg-dim">{story.role_label}</p> : null}
                    <blockquote className="mt-2 border-l-2 border-line pl-3 text-[12.5px] leading-relaxed text-fg-muted">
                      {story.quote || '—'}
                    </blockquote>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Pill tone={story.status === 'published' ? 'ok' : 'warn'}>{story.status}</Pill>
                      {story.video_type ? <span className="rounded-pill border border-line px-2 py-[2px] text-[10.5px] text-fg-dim">{storyTypeLabel(story.video_type) ?? story.video_type}</span> : null}
                      {story.origin === 'auto' ? (
                        <span className="inline-flex items-center gap-1 rounded-pill border border-signal-400/35 px-2 py-[2px] text-[10.5px] text-signal-400">
                          <Icon name="wand" size={10} /> name from the video
                        </span>
                      ) : null}
                      {story.video_title ? <span className="text-[11px] text-fg-dim">· {story.video_title}</span> : null}
                    </div>
                  </div>
                  {canWrite ? (
                    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                      <form action={storyAction}>
                        <input type="hidden" name="_csrf" value={session.csrfToken} />
                        <input type="hidden" name="id" value={story.id} />
                        <input type="hidden" name="op" value={story.status === 'published' ? 'draft' : 'publish'} />
                        <input type="hidden" name="return_to" value="/admin/media/stories" />
                        <ActionButton pendingLabel="…">{story.status === 'published' ? 'Unpublish' : 'Publish'}</ActionButton>
                      </form>
                    </div>
                  ) : null}
                </div>

                {canWrite ? (
                  <details className="border-t border-line">
                    <summary className="cursor-pointer list-none px-4 py-2 text-[11.5px] text-fg-dim hover:text-fg-muted">
                      Edit, re-read from the video, or remove
                    </summary>
                    <div className="border-t border-line/60 px-4 py-4">
                      <form action={saveStoryAction} className="grid gap-4 lg:grid-cols-2">
                        <input type="hidden" name="_csrf" value={session.csrfToken} />
                        <input type="hidden" name="id" value={story.id} />
                        <input type="hidden" name="return_to" value="/admin/media/stories" />
                        <Select label="Video" name="video_id" options={options} defaultValue={story.video_id ?? ''} required className="lg:col-span-2" />
                        <TextInput label="Client name" name="client_name" defaultValue={story.client_name} maxLength={90} hint="optional" />
                        <Select label="Video type" name="video_type" options={TYPE_OPTIONS} defaultValue={story.video_type} />
                        <TextInput label="Role line" name="role_label" defaultValue={story.role_label} maxLength={80} hint="optional" />
                        <Select
                          label="Status"
                          name="status"
                          defaultValue={story.status}
                          options={[
                            { value: 'draft', label: 'Draft' },
                            { value: 'published', label: 'Published' },
                          ]}
                        />
                        <div className="lg:col-span-2">
                          <TextArea label="Quote" name="quote" defaultValue={story.quote} rows={4} required maxLength={600} />
                        </div>
                        <div className="lg:col-span-2">
                          <SubmitButton>Save changes</SubmitButton>
                        </div>
                      </form>
                      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line/60 pt-3">
                        <form action={storyAction}>
                          <input type="hidden" name="_csrf" value={session.csrfToken} />
                          <input type="hidden" name="id" value={story.id} />
                          <input type="hidden" name="op" value="rederive" />
                          <input type="hidden" name="return_to" value="/admin/media/stories" />
                          <ActionButton variant="accent" pendingLabel="…" title="Clears the name and reads it from the video again">
                            <Icon name="refresh" size={11} /> Re-read from the video
                          </ActionButton>
                        </form>
                        <form action={storyAction}>
                          <input type="hidden" name="_csrf" value={session.csrfToken} />
                          <input type="hidden" name="id" value={story.id} />
                          <input type="hidden" name="op" value="delete" />
                          <input type="hidden" name="return_to" value="/admin/media/stories" />
                          <ConfirmSubmit message="Remove this client story? The video itself is untouched.">Remove</ConfirmSubmit>
                        </form>
                      </div>
                    </div>
                  </details>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {sources.length ? (
        <section className="rounded-4 border border-line bg-ink-900/60">
          <header className="border-b border-line px-5 py-3">
            <h3 className="text-[12.5px] font-medium text-fg">What we can read from each video</h3>
            <p className="mt-0.5 text-[11.5px] leading-snug text-fg-dim">
              Exactly what the console would fill in if you saved a story against that video with the name left blank. Where a
              video says nothing, nothing is invented.
            </p>
          </header>
          <ul className="divide-y divide-line/60">
            {sources.map((source) => {
              const out = derived.get(source.id);
              return (
                <li key={source.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-2.5">
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-fg-muted">{source.title}</span>
                  <span className={cx('text-[11.5px]', out?.clientName ? 'text-[var(--accent)]' : 'text-fg-dim/70')}>
                    {out?.clientName ?? 'no client named'}
                  </span>
                  <span className="text-[11px] text-fg-dim">{out?.videoType ? (storyTypeLabel(out.videoType) ?? out.videoType) : 'type unknown'}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </>
  );
}
