/**
 * The Media portfolio section landing.
 *
 * Each card is one job the owner comes here to do, with the current figure on it so the
 * section reads as a status as well as a menu. This is the only page in the section that
 * does not edit anything.
 */
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { PageHeader, Panel, StatCard } from '@/components/admin/ui';
import { consoleCounts, surfaceHero, studioAbout } from '@/lib/cms/console';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Media portfolio' };

export default async function MediaSectionPage() {
  const [counts, hero, about] = await Promise.all([
    consoleCounts().catch(() => null),
    surfaceHero('media').catch(() => null),
    studioAbout('media').catch(() => null),
  ]);

  const cards = [
    {
      href: '/admin/media/hero',
      label: 'Hero & intro text',
      icon: 'sparkle',
      blurb: 'The greeting, the name, the rolling role line and the intro under it.',
      state: hero?.name_given || hero?.name_family ? `${hero.name_given} ${hero.name_family}`.trim() : 'Not written yet',
    },
    {
      href: '/admin/media/videos',
      label: 'Video links',
      icon: 'film',
      blurb: 'Paste short-form and long-form links; pick which short-form pieces open the hero reel.',
      state: `${counts?.videos_total ?? 0} links · ${counts?.hero_previews ?? 0} in the reel`,
    },
    {
      href: '/admin/media/photography',
      label: 'Event photography',
      icon: 'image',
      blurb: 'Upload photographs straight from here — they land in the media library.',
      state: `${counts?.photos ?? 0} uploaded`,
    },
    {
      href: '/admin/media/stories',
      label: 'Client stories',
      icon: 'quote',
      blurb: 'Attach a quote to a video. Leave the name blank and it is read from the video.',
      state: `${counts?.stories ?? 0} stories · ${counts?.stories_published ?? 0} published`,
    },
    {
      href: '/admin/media/about',
      label: 'About the studio',
      icon: 'user',
      blurb: 'The studio portrait and the biography under it.',
      state: about?.bio ? 'Biography written' : 'No biography yet',
    },
    {
      href: '/admin/social',
      label: 'Social profiles',
      icon: 'share',
      blurb: 'The profile links behind the hero row and the footer.',
      state: `${counts?.socials ?? 0} profiles · ${counts?.socials_verified ?? 0} verified`,
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Media portfolio"
        title="The cinematic one-pager"
        lede="Everything shown on /media lives in this section. The public page reads this content first and falls back to what is bundled with the site only when a field is empty."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Video links" value={counts?.videos_total ?? 0} hint={`${counts?.videos_published ?? 0} published`} />
        <StatCard label="Short-form" value={counts?.short_form ?? 0} />
        <StatCard label="Long-form" value={counts?.long_form ?? 0} />
        <StatCard label="Hero reel" value={counts?.hero_previews ?? 0} tone="accent" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group rounded-4 border border-line bg-ink-900/60 px-5 py-4 transition-colors hover:border-[var(--accent)]/45"
          >
            <span className="mb-3 grid h-8 w-8 place-items-center rounded-2 border border-[var(--accent)]/35 text-[var(--accent)]">
              <Icon name={card.icon} size={15} />
            </span>
            <span className="block text-[13px] font-medium text-fg">{card.label}</span>
            <span className="mt-1 block text-[12px] leading-relaxed text-fg-muted">{card.blurb}</span>
            <span className="mt-3 block border-t border-line pt-2.5 text-[11.5px] text-fg-dim">{card.state}</span>
          </Link>
        ))}
      </div>

      <Panel title="How the hero reel works" hint="Worth knowing before you toggle anything." className="mt-6">
        <ul className="space-y-2 text-[12.5px] leading-relaxed text-fg-muted">
          <li>
            <span className="text-fg">Toggled</span> short-form pieces play in the hero card at the top of /media. They roll in
            the order you set.
          </li>
          <li>
            <span className="text-fg">Untoggled</span> pieces stay in the short-form rail lower down the page — nothing is
            hidden by turning the toggle off.
          </li>
          <li>Every short-form and long-form piece is listed in its catalog, reached from “View Catalog” on the public page.</li>
        </ul>
      </Panel>
    </>
  );
}
