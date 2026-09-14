import Link from 'next/link';
import type { Metadata } from 'next';
import { Icon } from '@/components/ui/Icon';
import { Notice } from '@/components/admin/notice';
import { HubHeader, StatRow, ToolGrid } from '@/components/admin/hub';
import { HeroBoard, StoryBoard } from '@/components/admin/media-boards';
import { importVideoFormAction } from '@/app/admin/actions';
import { SettingsForm } from '@/components/admin/settings-form';
import { Uploader } from '@/components/admin/uploader';
import { Panel, Pill, StatusPill } from '@/components/admin/ui';
import { readSession } from '@/lib/auth/session';
import { levelFor } from '@/lib/auth/permissions';
import { permissionsForRole } from '@/lib/auth/guard';
import { mediaHeroOrder, mediaVideoBoard, sectionHub } from '@/lib/cms/admin';
import { dashboardCounts } from '@/lib/cms/repository';
import { getSettings, settingDefs } from '@/lib/cms/settings';
import { mediaPhotoGalleries } from '@/lib/media/portfolio';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Media portfolio' };

type SearchParams = Record<string, string | string[] | undefined>;

export default async function MediaPortfolioHub({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const raw = await searchParams;
  const session = await readSession();
  if (!session) return null;
  const role = session.user.role;
  const roleMap = await permissionsForRole(role);
  const canWrite =
    levelFor(role, 'settings', roleMap) === 'write' || levelFor(role, 'settings', roleMap) === 'manage';

  const counts: Record<string, number> = await dashboardCounts();
  const [settings, hub, videos, heroOrder, photoSets] = await Promise.all([
    getSettings({ includePrivate: true }),
    sectionHub('media', { role, roleMap, counts, omit: ['videos', 'photos', 'testimonials'] }),
    mediaVideoBoard(),
    mediaHeroOrder(),
    mediaPhotoGalleries(),
  ]);

  const heroCopy = {
    eyebrow: String(settings['media.hero_eyebrow'] ?? ''),
    name: String(settings['media.hero_name'] ?? ''),
    intro: String(settings['media.hero_intro'] ?? ''),
    capabilities: String(settings['media.capabilities'] ?? ''),
  };
  const portrait = String(settings['founder.portrait'] ?? '');
  const bio = String(settings['founder.bio_paragraphs'] ?? '');
  const portraitUrl = portrait.startsWith('/') ? `/api/admin/asset?path=${encodeURIComponent(portrait)}` : portrait;

  return (
    <div className="space-y-6">
      <HubHeader eyebrow="Section 1 of 3" title="Media portfolio" hint={hub.section.hint} live={hub.section.live}>
        <Link
          href="/admin/videos?form=short_form"
          className="inline-flex items-center gap-1.5 rounded-2 border border-line px-3 py-1.5 text-[12.5px] text-fg-muted transition-colors hover:border-[var(--accent)]/50 hover:text-fg"
        >
          <Icon name="film" size={13} /> Short-form rail
        </Link>
      </HubHeader>

      <Notice params={raw} />
      <StatRow stats={hub.stats} />

      <section className="space-y-3">
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-fg-dim">Editors in this section</h2>
        <ToolGrid tools={hub.tools} />
      </section>

      <VideoLinksBoard csrf={session.csrfToken} canWrite={canWrite} />

      <HeroBoard copy={heroCopy} items={videos} canWrite={canWrite} returnTo="/admin/media-portfolio" />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <StoryBoard rows={videos} canWrite={canWrite} returnTo="/admin/media-portfolio" />
        <PhotographyBoard canWrite={canWrite} sets={photoSets} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel
          title="About the studio"
          hint="The portrait and the biography under it on the media portfolio. Saving here updates the page immediately."
          action={
            <Link href="/admin/settings?group=identity" className="rounded-2 border border-line px-2.5 py-1 text-[11.5px] text-fg-muted hover:text-fg">
              Full identity settings
            </Link>
          }
        >
          <div className="flex gap-4">
            <div className="w-[110px] shrink-0">
              <span className="block overflow-hidden rounded-3 border border-line bg-ink-950">
                {portrait ? (
                  <img src={portraitUrl} alt="Studio portrait" className="aspect-[4/5] w-full object-cover" />
                ) : (
                  <span className="grid aspect-[4/5] w-full place-items-center text-fg-dim">
                    <Icon name="user" size={20} />
                  </span>
                )}
              </span>
              <span className="mt-1.5 block text-center text-[10.5px] text-fg-dim">
                {portrait ? 'Current portrait' : 'Built-in placeholder'}
              </span>
            </div>
            <p className="min-w-0 flex-1 text-[12.5px] leading-relaxed text-fg-muted">
              {bio ? (
                bio
                  .split('\n')
                  .map((line) => line.trim())
                  .filter(Boolean)
                  .slice(0, 3)
                  .map((line, index) => <span key={index} className="mb-1.5 block">{line}</span>)
              ) : (
                <span className="text-fg-dim">
                  No biography saved yet — the built-in studio story shows on the page. Write one below and it replaces it
                  line for line.
                </span>
              )}
            </p>
          </div>
          <div className="mt-4 border-t border-line/60 pt-4">
            <SettingsForm
              group="identity"
              label="Studio picture & biography"
              hint="Upload a new portrait, or pick one from the library. One paragraph per line in the biography."
              canWrite={canWrite}
              returnTo="/admin/media-portfolio"
              custom={[]}
              fields={settingDefs('identity').map((def) => ({
                key: def.key,
                label: def.label,
                type: def.type,
                help: def.help,
                options: def.options,
                rows: def.rows,
                maxLength: def.maxLength,
                value: settings[def.key] ?? def.default,
                isPublic: def.is_public,
              }))}
            />
          </div>
        </Panel>

        <Panel
          title="What the visitor sees in the hero"
          hint="The order below is the actual order of the hero card on /media-portfolio — tick more pieces in the hero board above to lengthen it."
        >
          {heroOrder.length === 0 ? (
            <p className="text-[12.5px] text-fg-dim">
              Nothing ticked yet, so the built-in preview set plays. Tick short-form pieces above and they take over.
            </p>
          ) : (
            <ol className="flex flex-wrap gap-2.5">
              {heroOrder.map((item, index) => (
                <li key={item.id} className="w-[92px]">
                  <span className="relative block overflow-hidden rounded-3 border border-line bg-ink-950">
                    {item.poster ? (
                          <img src={item.poster} alt="" className="aspect-[9/16] w-full object-cover" />
                    ) : (
                      <span className="grid aspect-[9/16] w-full place-items-center text-fg-dim">
                        <Icon name="film" size={16} />
                      </span>
                    )}
                    <span className="absolute left-1 top-1 grid h-5 w-5 place-items-center rounded-pill bg-ink-950/85 text-[10.5px] text-fg">
                      {index + 1}
                    </span>
                  </span>
                  <span className="mt-1 block truncate text-[10.5px] text-fg-dim" title={item.title}>
                    {item.title}
                  </span>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-4 border-t border-line/60 pt-3 text-[11.5px] leading-relaxed text-fg-dim">
            Reorder the ticked pieces with the arrows on the{' '}
            <Link href="/admin/videos?form=short_form" className="text-[var(--accent)] hover:underline">
              short-form list
            </Link>
            . Long-form films keep their own rail and the “View Catalog” button reveals every published piece.
          </p>
        </Panel>
      </div>
    </div>
  );
}

/** Event photography: drop files straight in, then place them in a set. */
function PhotographyBoard({
  sets,
  canWrite,
}: {
  sets: { id: string; title: string; slug: string; status: string; frames: number; isFeatured: boolean }[];
  canWrite: boolean;
}) {
  const frames = sets.reduce((total, set) => total + set.frames, 0);
  return (
    <Panel
      title="Event photography"
      hint="Upload the frames from a shoot here, then open the set and place them — the wall reads each set in order."
      action={
        <Link href="/admin/photos/new" className="rounded-2 border border-line px-2.5 py-1 text-[11.5px] text-fg-muted hover:text-fg">
          New photo set
        </Link>
      }
    >
      <Uploader folder="media/photography" canWrite={canWrite} />

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line/60 pt-3 text-[11.5px] text-fg-dim">
        <Pill tone={frames ? 'ok' : 'warn'}>
          <Icon name="camera" size={11} /> {frames} frame{frames === 1 ? '' : 's'} across {sets.length} set{sets.length === 1 ? '' : 's'}
        </Pill>
        {canWrite ? <span>Uploads land in the media library — pick them when editing a set.</span> : null}
      </div>

      <ul className="mt-2 divide-y divide-line/60">
        {sets.length === 0 ? (
          <li className="py-3 text-[12.5px] text-fg-dim">
            No photo sets yet. Create one and the event-photography wall appears on the page.
          </li>
        ) : null}
        {sets.map((set) => (
          <li key={set.id} className="flex items-center gap-3 py-2.5">
            <StatusPill status={set.status} />
            <span className="min-w-0 flex-1">
              <Link href={`/admin/photos/${set.id}`} className="block truncate text-[13px] text-fg hover:underline">
                {set.title}
              </Link>
              <span className="mt-0.5 block text-[11.5px] text-fg-dim">
                {set.frames} frame{set.frames === 1 ? '' : 's'}
                {set.isFeatured ? ' · leads the wall' : ''}
              </span>
            </span>
            <Link
              href={`/admin/photos/${set.id}`}
              className="shrink-0 rounded-2 border border-line px-2.5 py-1 text-[11.5px] text-fg-muted hover:text-fg"
            >
              Open
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/**
 * Paste a link, get a draft in the right rail. The format is chosen here rather than after the
 * fact, because that choice decides where the piece appears: the hero rail (short-form) or the
 * long-form catalog.
 */
function VideoLinksBoard({ csrf, canWrite }: { csrf: string; canWrite: boolean }) {
  const boxes = [
    {
      form: 'short_form',
      label: 'Short-form preview',
      hint: 'Reels, TikToks and Shorts. Ticked short-form pieces roll in the hero.',
      placeholder: 'https://www.tiktok.com/@covenantmedia/video/…',
    },
    {
      form: 'long_form',
      label: 'Long-form preview',
      hint: 'Films, documentaries and full event edits. These land in the long-form catalog.',
      placeholder: 'https://www.youtube.com/watch?v=…',
    },
  ];
  return (
    <Panel
      title="Video links"
      hint="Paste the link — the platform is detected, the poster and duration are filled in, and the piece arrives as a draft for you to check before it goes live."
      action={
        <Link href="/admin/videos" className="rounded-2 border border-line px-2.5 py-1 text-[11.5px] text-fg-muted hover:text-fg">
          All videos
        </Link>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {boxes.map((box) => (
          <form key={box.form} action={canWrite ? importVideoFormAction : undefined} className="rounded-3 border border-line/70 bg-ink-950/40 p-3.5">
            <input type="hidden" name="_csrf" value={csrf} />
            <input type="hidden" name="form" value={box.form} />
            <p className="text-[12.5px] text-fg">{box.label}</p>
            <p className="mt-1 text-[11.5px] leading-snug text-fg-dim">{box.hint}</p>
            <input
              name="source_url"
              required
              disabled={!canWrite}
              placeholder={box.placeholder}
              className="mt-2.5 w-full rounded-2 border border-line bg-ink-950/70 px-3 py-2 font-mono text-[12px] text-fg outline-none placeholder:text-fg-dim/70 focus:border-[var(--accent)]/60 disabled:opacity-60"
            />
            {canWrite ? (
              <button
                type="submit"
                className="mt-2.5 inline-flex items-center gap-1.5 rounded-2 border border-[var(--accent)]/45 px-3 py-1.5 text-[12px] text-[var(--accent)] transition-colors hover:bg-[var(--accent-glow)]"
              >
                <Icon name="wand" size={12} /> Add to {box.form === 'short_form' ? 'short-form' : 'long-form'}
              </button>
            ) : (
              <span className="mt-2.5 inline-flex rounded-2 border border-line px-2.5 py-1 text-[11.5px] text-fg-dim">Read only</span>
            )}
          </form>
        ))}
      </div>
    </Panel>
  );
}
