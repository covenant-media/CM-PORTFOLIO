/**
 * Video links for the media portfolio.
 *
 * Two jobs in one screen: add a link (paste it — the source, embed URL and poster are
 * derived from the URL, never guessed), and decide which short-form pieces open the hero
 * reel. Untoggled pieces are not hidden; they simply stay in the short-form rail and the
 * catalogs, which is what the "View Catalog" button on the public page lists.
 *
 * Editing happens inline in a <details>, so a row can be corrected without a second
 * route and without JavaScript.
 */
import { redirect } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { PageHeader, Pill, EmptyState, StatCard } from '@/components/admin/ui';
import { Notice } from '@/components/admin/notice';
import { ActionButton, Select, SubmitButton, TextInput, Toggle } from '@/components/admin/controls';
import { ConfirmSubmit } from '@/components/admin/confirm';
import { readSession } from '@/lib/auth/session';
import { levelFor } from '@/lib/auth/permissions';
import { permissionsForRole } from '@/lib/auth/guard';
import { VIDEO_FORMS, videosForConsole, type VideoRow } from '@/lib/cms/console';
import { saveVideoLinkAction, videoLinkAction } from '@/app/admin/actions';
import { cx } from '@/lib/utils/text';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Video links' };

export default async function MediaVideosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await readSession();
  if (!session) redirect('/admin/login');
  const [videos, roleMap] = await Promise.all([videosForConsole(), permissionsForRole(session.user.role)]);
  const level = levelFor(session.user.role, 'videos', roleMap);
  const canWrite = level === 'write' || level === 'manage';
  const params = await searchParams;

  const heroShort = videos.short.filter((video) => video.hero_preview);

  return (
    <>
      <PageHeader
        eyebrow="Media portfolio"
        title="Video links"
        lede="Paste a YouTube, Vimeo, TikTok, Facebook or Instagram link. What the platform publishes is filled in for you and stays editable. Turn on Hero reel for the short-form pieces that should open the top of /media."
      />

      <Notice params={params} />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total links" value={videos.short.length + videos.long.length + videos.other.length} />
        <StatCard label="Short-form" value={videos.short.length} />
        <StatCard label="Long-form" value={videos.long.length} />
        <StatCard label="In the hero reel" value={heroShort.length} tone="accent" hint="Short-form only" />
      </div>

      {canWrite ? (
        <section className="mb-6 rounded-4 border border-line bg-ink-900/60">
          <header className="border-b border-line px-5 py-3">
            <h3 className="text-[12.5px] font-medium text-fg">Add a video link</h3>
            <p className="mt-0.5 text-[11.5px] leading-snug text-fg-dim">
              The source, embed and poster are read from the link. Anything the platform withholds, you can type yourself.
            </p>
          </header>
          <form action={saveVideoLinkAction} className="px-5 py-4">
            <input type="hidden" name="_csrf" value={session.csrfToken} />
            <input type="hidden" name="return_to" value="/admin/media/videos" />
            <div className="grid gap-4 lg:grid-cols-2">
              <TextInput
                label="Video link"
                name="source_url"
                type="url"
                required
                placeholder="https://www.youtube.com/watch?v=…"
                help="Direct file URLs (…mp4) work too and play with native controls."
              />
              <TextInput label="Title" name="title" required placeholder="Wedding Clients: Mary and Real" maxLength={160} />
              <Select label="Format" name="form" defaultValue="long_form" options={VIDEO_FORMS.map((f) => ({ value: f.value, label: f.label }))} />
              <Select
                label="Status"
                name="status"
                defaultValue="draft"
                options={[
                  { value: 'draft', label: 'Draft — not on the site yet' },
                  { value: 'published', label: 'Published — visible on /media' },
                ]}
              />
            </div>
            <div className="mt-4">
              <Toggle
                label="Show this video in the hero reel"
                name="hero_preview"
                help="Only short-form pieces can open the hero. Turn this on after saving if the format is set to short-form."
              />
            </div>
            <div className="mt-4">
              <SubmitButton pendingLabel="Adding…">Add video link</SubmitButton>
            </div>
          </form>
        </section>
      ) : null}

      <VideoGroup
        title="Short-form"
        hint="Vertical work for TikTok, Reels and Shorts. These are the pieces that can open the hero reel."
        videos={videos.short}
        csrf={session.csrfToken}
        canWrite={canWrite}
        heroEligible
      />
      <VideoGroup
        title="Long-form"
        hint="Widescreen work: campaigns, conference coverage, ceremony highlights and full productions."
        videos={videos.long}
        csrf={session.csrfToken}
        canWrite={canWrite}
      />
      {videos.other.length ? (
        <VideoGroup title="Other" hint="Links whose format has not been set." videos={videos.other} csrf={session.csrfToken} canWrite={canWrite} />
      ) : null}
    </>
  );
}

function VideoGroup({
  title,
  hint,
  videos,
  csrf,
  canWrite,
  heroEligible = false,
}: {
  title: string;
  hint: string;
  videos: VideoRow[];
  csrf: string;
  canWrite: boolean;
  heroEligible?: boolean;
}) {
  return (
    <section className="mb-6">
      <div className="mb-2.5 flex items-baseline gap-2">
        <h3 className="text-[13px] font-medium text-fg">{title}</h3>
        <span className="text-[11.5px] text-fg-dim">{videos.length}</span>
      </div>
      <p className="mb-3 max-w-[72ch] text-[11.5px] leading-relaxed text-fg-dim">{hint}</p>
      {videos.length === 0 ? (
        <EmptyState title={`No ${title.toLowerCase()} links yet`} hint="Add one with the form above." />
      ) : (
        <ul className="space-y-2.5">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} csrf={csrf} canWrite={canWrite} heroEligible={heroEligible} />
          ))}
        </ul>
      )}
    </section>
  );
}

function VideoCard({
  video,
  csrf,
  canWrite,
  heroEligible,
}: {
  video: VideoRow;
  csrf: string;
  canWrite: boolean;
  heroEligible: boolean;
}) {
  return (
    <li className={cx('rounded-4 border bg-ink-900/60', video.hero_preview ? 'border-[var(--accent)]/45' : 'border-line')}>
      <div className="flex flex-wrap items-start gap-3.5 px-4 py-3.5">
        {video.poster_url ? (
          <img src={video.poster_url} alt="" className="h-[52px] w-[92px] shrink-0 rounded-2 object-cover" loading="lazy" />
        ) : (
          <span className="grid h-[52px] w-[92px] shrink-0 place-items-center rounded-2 bg-ink-800 text-fg-dim">
            <Icon name="film" size={16} />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] text-fg">{video.title}</p>
          <p className="mt-0.5 truncate font-mono text-[11px] text-fg-dim">{video.source_url ?? video.external_url ?? '—'}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Pill tone={video.status === 'published' ? 'ok' : 'warn'}>{video.status}</Pill>
            <span className="rounded-pill border border-line px-2 py-[2px] text-[10.5px] uppercase tracking-[0.1em] text-fg-dim">
              {video.source}
            </span>
            {video.hero_preview ? (
              <span className="inline-flex items-center gap-1 rounded-pill border border-[var(--accent)]/45 px-2 py-[2px] text-[10.5px] text-[var(--accent)]">
                <Icon name="star" size={10} /> Hero reel
              </span>
            ) : null}
            {video.duration_s ? <span className="text-[11px] text-fg-dim">{Math.round(video.duration_s / 60)} min</span> : null}
          </div>
        </div>

        {canWrite ? (
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            {heroEligible ? (
              <form action={videoLinkAction}>
                <input type="hidden" name="_csrf" value={csrf} />
                <input type="hidden" name="id" value={video.id} />
                <input type="hidden" name="op" value={video.hero_preview ? 'hero-off' : 'hero-on'} />
                <input type="hidden" name="return_to" value="/admin/media/videos" />
                <ActionButton variant={video.hero_preview ? 'accent' : 'ghost'} pendingLabel="…">
                  {video.hero_preview ? 'Remove from hero' : 'Add to hero'}
                </ActionButton>
              </form>
            ) : null}
            <form action={videoLinkAction}>
              <input type="hidden" name="_csrf" value={csrf} />
              <input type="hidden" name="id" value={video.id} />
              <input type="hidden" name="op" value={video.status === 'published' ? 'draft' : 'publish'} />
              <input type="hidden" name="return_to" value="/admin/media/videos" />
              <ActionButton pendingLabel="…">{video.status === 'published' ? 'Unpublish' : 'Publish'}</ActionButton>
            </form>
          </div>
        ) : null}
      </div>

      {canWrite ? (
        <details className="border-t border-line">
          <summary className="cursor-pointer list-none px-4 py-2 text-[11.5px] text-fg-dim transition-colors hover:text-fg-muted">
            Edit details or remove
          </summary>
          <div className="border-t border-line/60 px-4 py-4">
            <form action={saveVideoLinkAction} className="grid gap-4 lg:grid-cols-2">
              <input type="hidden" name="_csrf" value={csrf} />
              <input type="hidden" name="id" value={video.id} />
              <input type="hidden" name="return_to" value="/admin/media/videos" />
              <TextInput label="Title" name="title" defaultValue={video.title} required maxLength={160} />
              <TextInput label="Video link" name="source_url" type="url" defaultValue={video.source_url ?? ''} required />
              <Select
                label="Format"
                name="form"
                defaultValue={video.form}
                options={VIDEO_FORMS.map((f) => ({ value: f.value, label: f.label }))}
              />
              <Select
                label="Status"
                name="status"
                defaultValue={video.status}
                options={[
                  { value: 'draft', label: 'Draft' },
                  { value: 'published', label: 'Published' },
                ]}
              />
              <div className="lg:col-span-2">
                <Toggle
                  label="Show this video in the hero reel"
                  name="hero_preview"
                  defaultChecked={video.hero_preview}
                  help={heroEligible ? 'Short-form pieces only.' : 'Change the format to short-form to use this.'}
                />
              </div>
              <div className="flex items-center gap-2 lg:col-span-2">
                <SubmitButton>Save changes</SubmitButton>
              </div>
            </form>
            <form action={videoLinkAction} className="mt-3 border-t border-line/60 pt-3">
              <input type="hidden" name="_csrf" value={csrf} />
              <input type="hidden" name="id" value={video.id} />
              <input type="hidden" name="op" value="delete" />
              <input type="hidden" name="return_to" value="/admin/media/videos" />
              <ConfirmSubmit message={`Remove “${video.title}”? This only deletes the link, not the video on the platform.`}>
                Remove this link
              </ConfirmSubmit>
            </form>
          </div>
        </details>
      ) : null}
    </li>
  );
}
