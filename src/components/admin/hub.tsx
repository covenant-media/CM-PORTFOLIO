/**
 * Section-hub building blocks.
 *
 * The CMS is organised as an overview plus three portfolio sections (media, tech, main website)
 * and a system section. Every hub is assembled from these pieces — a header with the live pages,
 * a row of counters, a grid of the section's tools and a couple of panels — so the four hubs
 * stay identical in behaviour and only differ in what they contain.
 *
 * Server components: they take data, render markup, and never fetch.
 */
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { Panel, Pill, adminIcon } from './ui';
import { cx } from '@/lib/utils/text';
import type { HubStat, HubTool } from '@/lib/cms/admin';

export function HubHeader({
  eyebrow,
  title,
  hint,
  live,
  children,
}: {
  eyebrow: string;
  title: string;
  hint: string;
  live?: { label: string; href: string }[];
  children?: React.ReactNode;
}) {
  return (
    <header className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.2em] text-fg-dim">{eyebrow}</p>
          <h1 className="mt-1 font-display text-[26px] leading-tight">{title}</h1>
          <p className="mt-1.5 max-w-[68ch] text-[13px] leading-relaxed text-fg-muted">{hint}</p>
        </div>
        {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
      </div>
      {live?.length ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <span className="text-[11px] uppercase tracking-[0.14em] text-fg-dim">See it live</span>
          {live.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-2 border border-line px-2.5 py-1 text-[12px] text-fg-muted transition-colors hover:border-[var(--accent)]/50 hover:text-fg"
            >
              {item.label}
              <Icon name="external" size={11} />
            </Link>
          ))}
        </div>
      ) : null}
    </header>
  );
}

export function StatRow({ stats }: { stats: HubStat[] }) {
  if (!stats.length) return null;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.key} className="rounded-4 border border-line bg-ink-900/60 px-4 py-3.5">
          <span className="block text-[11px] uppercase tracking-[0.14em] text-fg-dim">{stat.label}</span>
          <span className="mt-2 block font-display text-[26px] leading-none text-fg">{stat.value}</span>
          {stat.hint ? <span className="mt-1.5 block text-[11.5px] leading-snug text-fg-dim">{stat.hint}</span> : null}
        </div>
      ))}
    </div>
  );
}

/** The section's modules as a tool grid — the fastest route to any editor in this section. */
export function ToolGrid({ tools, columns = 3 }: { tools: HubTool[]; columns?: 2 | 3 }) {
  if (!tools.length) return null;
  return (
    <div className={cx('grid gap-3', columns === 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2')}>
      {tools.map((tool) => (
        <Link
          key={tool.key}
          href={tool.href}
          className="group flex h-full flex-col rounded-4 border border-line bg-ink-900/50 p-4 transition-colors hover:border-[var(--accent)]/45 hover:bg-ink-900/80"
        >
          <span className="flex items-start gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-2 border border-[var(--accent)]/25 bg-[var(--accent-glow)] text-[var(--accent)]">
              <Icon name={adminIcon(tool.icon)} size={15} />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-2">
                <span className="truncate text-[13.5px] text-fg">{tool.label}</span>
                {typeof tool.count === 'number' ? (
                  <span className="shrink-0 rounded-pill border border-line px-1.5 text-[10.5px] text-fg-dim">{tool.count}</span>
                ) : null}
              </span>
              <span className="mt-1 block text-[11.5px] leading-snug text-fg-dim line-clamp-2">{tool.description}</span>
            </span>
          </span>
          <span className="mt-auto flex items-center gap-1.5 pt-3 text-[11px] uppercase tracking-[0.12em] text-[var(--accent)]">
            {tool.level === 'read' ? 'View' : 'Open'}
            <Icon name="arrow-right" size={11} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      ))}
    </div>
  );
}

/** A one-line status strip: what the section publishes and whether the public site is live. */
export function SectionStatus({ live, maintenance }: { live: boolean; maintenance: boolean }) {
  return (
    <p className="flex flex-wrap items-center gap-2 text-[11.5px] text-fg-dim">
      <Pill tone={maintenance ? 'warn' : 'ok'}>
        <Icon name={maintenance ? 'alert' : 'check'} size={11} />
        {maintenance ? 'Maintenance mode is on' : 'Public site is live'}
      </Pill>
      {live ? <span>Publishing here revalidates the public pages — changes appear immediately.</span> : null}
    </p>
  );
}

export { Panel };
