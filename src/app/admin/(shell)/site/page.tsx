/**
 * The main website section landing.
 *
 * The brand house at the root of the site. Headline copy is edited here; services and
 * team are managed here at the card level, with the deep editors one click away for the
 * fields that do not belong in a grid.
 */
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { PageHeader, StatCard, Panel } from '@/components/admin/ui';
import { consoleCounts, servicesForConsole, surfaceHero, teamForConsole } from '@/lib/cms/console';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Main website' };

export default async function SiteSectionPage() {
  const [counts, hero, services, team] = await Promise.all([
    consoleCounts().catch(() => null),
    surfaceHero('main').catch(() => null),
    servicesForConsole().catch(() => []),
    teamForConsole().catch(() => []),
  ]);

  const cards = [
    {
      href: '/admin/site/hero',
      label: 'Hero & headline text',
      icon: 'sparkle',
      blurb: 'The eyebrow, the name, the disciplines and the intro at the top of the landing page.',
      state: hero?.intro ? 'Intro written' : 'Not written yet',
    },
    {
      href: '/admin/site/services',
      label: 'Services',
      icon: 'briefcase',
      blurb: 'What the studio takes on, across all three divisions.',
      state: `${services.length} services · ${services.filter((s) => s.status === 'published').length} published`,
    },
    {
      href: '/admin/site/team',
      label: 'Team',
      icon: 'users',
      blurb: 'Covenant plus collaborators. Placeholders stay labelled as placeholders.',
      state: `${team.length} members · ${team.filter((t) => t.status === 'published').length} published`,
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Main website"
        title="The brand house"
        lede="The root of the site: the landing page and the content behind /about, /services, /work and /team."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Services" value={counts?.services ?? services.length} href="/admin/site/services" />
        <StatCard label="Team" value={counts?.team ?? team.length} href="/admin/site/team" />
        <StatCard label="Enquiries" value={counts?.enquiries_new ?? 0} hint={`${counts?.enquiries_total ?? 0} received`} href="/admin/submissions" tone={(counts?.enquiries_new ?? 0) ? 'warn' : 'neutral'} />
        <StatCard label="Social profiles" value={counts?.socials ?? 0} hint={`${counts?.socials_verified ?? 0} verified`} href="/admin/social" />
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

      <Panel title="Where the rest lives" hint="The main site composes its pages from the CMS, so these still matter." className="mt-6">
        <ul className="grid gap-2 text-[12.5px] leading-relaxed text-fg-muted sm:grid-cols-2">
          {[
            { href: '/admin/pages', label: 'Pages & layouts', detail: 'Which sections each route renders, and in what order.' },
            { href: '/admin/blocks', label: 'Sections', detail: 'The reusable section library behind every page.' },
            { href: '/admin/navigation', label: 'Navigation', detail: 'The header and footer menus for all three surfaces.' },
            { href: '/admin/blog', label: 'Journal', detail: 'Posts that appear on /blog and in the feed.' },
            { href: '/admin/seo', label: 'SEO', detail: 'Titles, descriptions and share cards per route.' },
            { href: '/admin/settings', label: 'Site settings', detail: 'Brand, contact details, legal copy and analytics.' },
          ].map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="text-fg underline decoration-line underline-offset-2 hover:text-[var(--accent)]">
                {item.label}
              </Link>
              <span className="block text-fg-dim">{item.detail}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}
