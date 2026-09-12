/**
 * The console overview.
 *
 * One screen that answers "what does the platform contain right now, and what needs
 * me?" — a figure per content type, a card per surface, whatever needs attention, and
 * the recent audit trail. Every figure links to the screen that owns it, so the
 * dashboard is a map rather than a second place to edit things.
 *
 * Nothing here is estimated or derived: counts come straight from the tables, and an
 * empty database reads as zeros rather than as a progress bar.
 */
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Panel, Pill, StatCard, whenLabel } from '@/components/admin/ui';
import { consoleCounts, videosForConsole } from '@/lib/cms/console';
import { needsAttention, recentActivity, type AttentionItem } from '@/lib/cms/admin';
import { getSettings } from '@/lib/cms/settings';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Overview' };

interface SurfaceCard {
  key: string;
  label: string;
  href: string;
  blurb: string;
  rows: { label: string; value: string }[];
}

export default async function DashboardPage() {
  const [counts, attention, activity, settings, videos] = await Promise.all([
    consoleCounts(),
    needsAttention().catch(() => [] as AttentionItem[]),
    recentActivity(8).catch(() => []),
    getSettings().catch(() => ({}) as Record<string, unknown>),
    videosForConsole().catch(() => ({ short: [], long: [], other: [] })),
  ]);

  const brand = String(settings['brand.name'] ?? 'Covenant Media');
  const heroCount = counts.hero_previews;

  const surfaces: SurfaceCard[] = [
    {
      key: 'media',
      label: 'Media portfolio',
      href: '/admin/media',
      blurb: 'The cinematic one-pager: hero copy, video links, photography and client stories.',
      rows: [
        { label: 'Video links', value: `${counts.videos_published} of ${counts.videos_total} published` },
        { label: 'Short / long', value: `${counts.short_form} short · ${counts.long_form} long` },
        { label: 'Hero reel', value: heroCount ? `${heroCount} in the reel` : 'Nothing in the reel yet' },
        { label: 'Photographs', value: `${counts.photos} uploaded` },
        { label: 'Client stories', value: `${counts.stories_published} of ${counts.stories} published` },
      ],
    },
    {
      key: 'site',
      label: 'Main website',
      href: '/admin/site',
      blurb: 'The brand house at the root: headline copy, services and the team.',
      rows: [
        { label: 'Services', value: `${counts.services} listed` },
        { label: 'Team', value: `${counts.team} members` },
        { label: 'Enquiries', value: `${counts.enquiries_new} unread of ${counts.enquiries_total}` },
      ],
    },
  ];

  return (
    <>
      <header className="mb-6">
        <p className="mb-1 text-[10.5px] uppercase tracking-[0.18em] text-fg-dim">Overview</p>
        <h2 className="font-display text-[24px] leading-tight text-fg">{brand}</h2>
        <p className="mt-1.5 max-w-[68ch] text-[12.5px] leading-relaxed text-fg-muted">
          Everything the three public surfaces publish, and what is still waiting on you. Pick a surface to edit its
          content; the full registry of content types stays under <span className="text-fg-dim">All content</span> in the
          sidebar.
        </p>
      </header>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Video links" value={counts.videos_total} hint={`${counts.videos_published} published`} href="/admin/media/videos" />
        <StatCard
          label="Hero reel"
          value={heroCount}
          hint={heroCount ? 'Short-form pieces on the hero' : 'Pick videos in Video links'}
          href="/admin/media/videos"
          tone={heroCount ? 'accent' : 'neutral'}
        />
        <StatCard label="Photographs" value={counts.photos} hint="Event photography" href="/admin/media/photography" />
        <StatCard label="Client stories" value={counts.stories} hint={`${counts.stories_published} published`} href="/admin/media/stories" />
        <StatCard label="Social profiles" value={counts.socials} hint={`${counts.socials_verified} verified`} href="/admin/social" />
        <StatCard
          label="Enquiries"
          value={counts.enquiries_new}
          hint={`${counts.enquiries_total} received`}
          href="/admin/submissions"
          tone={counts.enquiries_new ? 'warn' : 'neutral'}
        />
        <StatCard label="Services" value={counts.services} href="/admin/site/services" />
        <StatCard label="Team" value={counts.team} href="/admin/site/team" />
      </div>

      {attention.length ? (
        <Panel title="Needs your attention" hint="Gaps the public surfaces cannot fill on their own." className="mb-6">
          <ul className="space-y-2.5">
            {attention.map((item) => (
              <li key={`${item.href}-${item.label}`} className="flex items-start gap-2.5">
                <Icon
                  name={item.severity === 'warn' ? 'alert' : 'info'}
                  size={14}
                  className={item.severity === 'warn' ? 'mt-[2px] shrink-0 text-alert-400' : 'mt-[2px] shrink-0 text-signal-400'}
                />
                <span className="min-w-0 text-[12.5px] leading-relaxed">
                  <Link href={item.href} className="text-fg underline decoration-line underline-offset-2 hover:text-[var(--accent)]">
                    {item.label}
                  </Link>
                  <span className="block text-fg-dim">{item.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        {surfaces.map((surface) => (
          <section key={surface.key} className="rounded-4 border border-line bg-ink-900/60">
            <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-3.5">
              <div className="min-w-0">
                <h3 className="text-[13px] font-medium text-fg">{surface.label}</h3>
                <p className="mt-0.5 text-[11.5px] leading-snug text-fg-dim">{surface.blurb}</p>
              </div>
              <Link
                href={surface.href}
                className="inline-flex shrink-0 items-center gap-1 rounded-2 border border-line px-2.5 py-1 text-[11.5px] text-fg-muted transition-colors hover:border-[var(--accent)]/50 hover:text-fg"
              >
                Open
                <Icon name="arrow-right" size={12} />
              </Link>
            </header>
            <dl className="px-5 py-3">
              {surface.rows.map((row) => (
                <div key={row.label} className="flex items-baseline justify-between gap-4 border-b border-line/50 py-1.5 last:border-0">
                  <dt className="text-[12px] text-fg-dim">{row.label}</dt>
                  <dd className="text-right text-[12.5px] text-fg">{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="Latest video links" hint="The most recent additions to the media library." action={<Link href="/admin/media/videos" className="text-[11.5px] text-fg-muted hover:text-fg">Manage</Link>}>
          {videos.short.length + videos.long.length + videos.other.length === 0 ? (
            <p className="text-[12.5px] text-fg-dim">
              No video links yet. <Link href="/admin/media/videos" className="text-fg underline underline-offset-2">Add the first one</Link>.
            </p>
          ) : (
            <ul className="space-y-2">
              {[...videos.short, ...videos.long, ...videos.other]
                .sort((a, b) => String(b.updated_at ?? '').localeCompare(String(a.updated_at ?? '')))
                .slice(0, 5)
                .map((video) => (
                  <li key={video.id} className="flex items-center gap-2.5">
                    {video.poster_url ? (
                      <img src={video.poster_url} alt="" className="h-8 w-14 shrink-0 rounded-2 object-cover" loading="lazy" />
                    ) : (
                      <span className="grid h-8 w-14 shrink-0 place-items-center rounded-2 bg-ink-800 text-fg-dim">
                        <Icon name="film" size={13} />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] text-fg">{video.title}</span>
                      <span className="block text-[11px] text-fg-dim">
                        {video.form === 'short_form' ? 'Short-form' : video.form === 'long_form' ? 'Long-form' : 'Other'}
                        {video.hero_preview ? ' · in the hero reel' : ''}
                      </span>
                    </span>
                    <Pill tone={video.status === 'published' ? 'ok' : 'warn'}>{video.status}</Pill>
                  </li>
                ))}
            </ul>
          )}
        </Panel>

        <Panel title="Recent activity" hint="Every save, publish and upload, newest first.">
          {activity.length === 0 ? (
            <p className="text-[12.5px] text-fg-dim">Nothing has been changed from the console yet.</p>
          ) : (
            <ul className="space-y-2.5">
              {activity.map((row) => (
                <li key={row.id} className="flex items-baseline gap-2.5">
                  <span className="shrink-0 text-[11px] uppercase tracking-[0.1em] text-fg-dim">{row.action}</span>
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-fg-muted">{row.summary || '—'}</span>
                  <span className="shrink-0 text-[11px] text-fg-dim">{whenLabel(row.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
