'use client';
/**
 * The CMS frame.
 *
 * Two navigation zones on purpose. The top zone is the console: the hand-ordered
 * sections an owner actually thinks in (Overview, Media, Website, Tech, Reach). The
 * lower zone is the full registry — every module the generic engine exposes — kept
 * reachable so nothing that used to be editable becomes unreachable, but collapsed
 * because it is the long tail rather than the daily path.
 *
 * Everything the sidebar renders is still derived from data: the console groups come
 * from `consoleNav()`, the long tail from the module registry, and both are filtered
 * by what the signed-in role may read.
 */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { signOutAction } from '@/app/admin/actions';
import { adminIcon, Pill, type AdminNavGroupLite, type ConsoleNavGroup, type ConsoleNavItem } from './ui';
import { cx } from '@/lib/utils/text';

export interface ShellProps {
  groups: ConsoleNavGroup[];
  legacy: AdminNavGroupLite[];
  user: { name: string; email: string; role: string };
  children: React.ReactNode;
}

interface Crumb {
  group: string;
  section: string | null;
  page: string;
}

export function Shell({ groups, legacy, user, children }: ShellProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(`${href}/`));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((group) => ({
        ...group,
        items: group.items
          .map((item) => {
            const inChildren = (item.children ?? []).some((child) => child.label.toLowerCase().includes(q));
            if (item.label.toLowerCase().includes(q) || inChildren) return item;
            // A section matches through its pages even when the section name does not
            // contain the query — that is the whole point of searching "hero".
            const matchingChildren = (item.children ?? []).filter((child) => child.label.toLowerCase().includes(q));
            return matchingChildren.length ? { ...item, children: matchingChildren } : null;
          })
          .filter((item): item is ConsoleNavItem => item !== null),
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, query]);

  const legacyFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return legacy;
    return legacy
      .map((group) => ({ ...group, items: group.items.filter((item) => item.label.toLowerCase().includes(q)) }))
      .filter((group) => group.items.length > 0);
  }, [legacy, query]);

  /** Breadcrumb + page title, resolved from whichever link matches the URL closest. */
  const crumb = useMemo<Crumb>(() => {
    // Matches on its own copy of the predicate so the memo does not depend on a function
    // that is re-created on every render.
    const hits = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(`${href}/`));
    for (const group of groups) {
      for (const item of group.items) {
        const child = (item.children ?? []).find((c) => pathname === c.href);
        if (child) return { group: group.label, section: item.label, page: child.label };
        if (item.href !== '/admin' && hits(item.href)) return { group: group.label, section: null, page: item.label };
      }
    }
    for (const group of legacy) {
      const item = group.items.find((i) => pathname === `/admin/${i.key}` || pathname.startsWith(`/admin/${i.key}/`));
      if (item) return { group: 'All content', section: group.label, page: item.label };
    }
    if (pathname.startsWith('/admin/account')) return { group: 'Account', section: null, page: 'Your account' };
    if (pathname === '/admin') return { group: 'Overview', section: null, page: 'Dashboard' };
    return { group: 'Covenant CMS', section: null, page: 'Content' };
  }, [groups, legacy, pathname]);

  const nothingMatches = query.trim() && filtered.length === 0 && legacyFiltered.length === 0;

  return (
    <div className="theme-admin min-h-dvh bg-ink-950 text-fg">
      <a
        href="#cm-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-2 focus:bg-ink-800 focus:px-3 focus:py-2 focus:text-sm"
      >
        Skip to content
      </a>

      <div className="lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
        <aside
          className={cx(
            'fixed inset-y-0 left-0 z-40 flex w-[272px] flex-col border-r border-line bg-ink-1000 transition-transform lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0',
            open ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="flex items-center gap-2.5 border-b border-line px-5 py-4">
            <span className="grid h-8 w-8 place-items-center rounded-2 border border-[var(--accent)]/40 text-[var(--accent)]">
              <Icon name="sliders" size={16} />
            </span>
            <span className="leading-tight">
              <span className="block font-display text-[15px]">Covenant</span>
              <span className="block text-[10px] uppercase tracking-[0.2em] text-fg-dim">Console</span>
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="ml-auto rounded-2 p-1.5 text-fg-muted hover:bg-ink-800 hover:text-fg lg:hidden"
              aria-label="Close menu"
            >
              <Icon name="close" size={16} />
            </button>
          </div>

          <div className="border-b border-line px-4 py-3">
            <label className="relative block">
              <span className="sr-only">Search the console</span>
              <Icon name="search" size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-dim" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Jump to…"
                className="w-full rounded-2 border border-line bg-ink-900 py-1.5 pl-8 pr-2 text-[12.5px] text-fg placeholder:text-fg-dim focus:border-[var(--accent)]/60 focus:outline-none"
              />
            </label>
          </div>

          <nav className="flex-1 overflow-y-auto px-2.5 py-3" aria-label="Console sections">
            {nothingMatches ? (
              <p className="px-2.5 py-3 text-[12px] text-fg-dim">Nothing matches “{query}”.</p>
            ) : null}

            {filtered.map((group) => (
              <div key={group.key} className="mb-4">
                <p className="px-2.5 pb-1.5 text-[10px] uppercase tracking-[0.16em] text-fg-dim">{group.label}</p>
                <ul className="space-y-[2px]">
                  {group.items.map((item) => {
                    const active = isActive(item.href);
                    const expanded = active || Boolean(query.trim());
                    return (
                      <li key={item.key}>
                        <Link
                          href={item.href}
                          aria-current={active ? 'page' : undefined}
                          className={cx(
                            'group flex items-center gap-2.5 rounded-2 px-2.5 py-[7px] text-[12.5px] transition-colors',
                            active ? 'bg-ink-800 text-fg' : 'text-fg-muted hover:bg-ink-900 hover:text-fg',
                          )}
                        >
                          <Icon
                            name={adminIcon(item.icon)}
                            size={15}
                            className={active ? 'text-[var(--accent)]' : 'text-fg-dim group-hover:text-fg-muted'}
                          />
                          <span className="truncate">{item.label}</span>
                          <span className="ml-auto flex shrink-0 items-center gap-1.5">
                            {item.level === 'read' ? <Icon name="lock" size={11} className="text-fg-dim" title="Read only for your role" /> : null}
                            {item.badge ? (
                              <span className="grid h-4 min-w-4 place-items-center rounded-pill bg-[var(--accent)]/18 px-1 text-[10px] font-medium text-[var(--accent)]">
                                {item.badge > 99 ? '99+' : item.badge}
                              </span>
                            ) : null}
                          </span>
                        </Link>
                        {item.children?.length && expanded ? (
                          <ul className="ml-[19px] mt-[2px] space-y-[1px] border-l border-line pl-2.5">
                            {item.children.map((child) => {
                              const childActive = pathname === child.href;
                              return (
                                <li key={child.href}>
                                  <Link
                                    href={child.href}
                                    aria-current={childActive ? 'page' : undefined}
                                    className={cx(
                                      'block rounded-2 px-2 py-[5px] text-[12px] transition-colors',
                                      childActive ? 'bg-ink-800/70 text-fg' : 'text-fg-dim hover:bg-ink-900 hover:text-fg-muted',
                                    )}
                                  >
                                    {child.label}
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}

            {/* The long tail: every registry module, exactly as before. */}
            <div className="mb-3 border-t border-line pt-3">
              <button
                type="button"
                onClick={() => setShowAll((value) => !value)}
                aria-expanded={showAll}
                className="flex w-full items-center gap-2 rounded-2 px-2.5 py-[7px] text-left text-[11px] uppercase tracking-[0.14em] text-fg-dim transition-colors hover:bg-ink-900 hover:text-fg-muted"
              >
                <Icon name={showAll ? 'chevron-down' : 'chevron-right'} size={13} />
                All content
                <span className="ml-auto text-[10px] normal-case tracking-normal">{legacy.reduce((n, g) => n + g.items.length, 0)}</span>
              </button>
              {showAll || query.trim() ? (
                <div className="mt-1 space-y-3">
                  {legacyFiltered.map((group) => (
                    <div key={group.key}>
                      <p className="px-2.5 pb-1 text-[10px] uppercase tracking-[0.16em] text-fg-dim/70">{group.label}</p>
                      <ul className="space-y-[1px]">
                        {group.items.map((item) => {
                          const active = pathname === `/admin/${item.key}` || pathname.startsWith(`/admin/${item.key}/`);
                          return (
                            <li key={item.key}>
                              <Link
                                href={`/admin/${item.key}`}
                                aria-current={active ? 'page' : undefined}
                                className={cx(
                                  'group flex items-center gap-2 rounded-2 px-2.5 py-[5px] text-[12px] transition-colors',
                                  active ? 'bg-ink-800 text-fg' : 'text-fg-muted hover:bg-ink-900 hover:text-fg',
                                )}
                              >
                                <Icon
                                  name={adminIcon(item.icon)}
                                  size={13}
                                  className={active ? 'text-[var(--accent)]' : 'text-fg-dim group-hover:text-fg-muted'}
                                />
                                <span className="truncate">{item.label}</span>
                                {item.level === 'read' ? <Icon name="lock" size={10} className="ml-auto text-fg-dim" /> : null}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </nav>

          <div className="border-t border-line px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line bg-ink-900 text-[11px] font-medium text-fg-muted">
                {user.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-[12px] text-fg">{user.name}</span>
                <span className="block truncate text-[10.5px] text-fg-dim">{user.role}</span>
              </span>
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              <Link
                href="/admin/account"
                className={cx(
                  'rounded-2 border border-line px-2 py-1 text-[11.5px] text-fg-muted hover:text-fg',
                  pathname === '/admin/account' && 'border-[var(--accent)]/50 text-fg',
                )}
              >
                Account
              </Link>
              <Link href="/" target="_blank" className="rounded-2 border border-line px-2 py-1 text-[11.5px] text-fg-muted hover:text-fg">
                View site
              </Link>
              <form action={signOutAction} className="ml-auto">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 rounded-2 border border-line px-2 py-1 text-[11.5px] text-fg-muted transition-colors hover:border-alert-400/50 hover:text-alert-400"
                >
                  <Icon name="logout" size={12} />
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </aside>

        {open ? (
          <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-ink-1000/70 lg:hidden" />
        ) : null}

        <div className="min-w-0">
          <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-ink-950/85 px-4 py-3 backdrop-blur-md lg:px-8">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-2 border border-line p-1.5 text-fg-muted hover:text-fg lg:hidden"
              aria-label="Open menu"
            >
              <Icon name="menu" size={16} />
            </button>
            <nav aria-label="Breadcrumb" className="min-w-0">
              <ol className="flex min-w-0 items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-fg-dim">
                <li className="truncate">{crumb.group}</li>
                {crumb.section ? (
                  <>
                    <li aria-hidden>/</li>
                    <li className="truncate">{crumb.section}</li>
                  </>
                ) : null}
              </ol>
              <h1 className="truncate font-display text-[17px] leading-tight text-fg">{crumb.page}</h1>
            </nav>
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <Pill tone="neutral">
                <Icon name="database" size={11} />
                {user.role}
              </Pill>
            </div>
          </header>
          <main id="cm-main" className="px-4 py-6 lg:px-8 lg:py-8">
            <div className="mx-auto w-full max-w-[1180px]">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
