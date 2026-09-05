'use client';
/**
 * The CMS frame: grouped navigation from the module registry, a search field that
 * filters it, the signed-in identity, and a drawer on small screens. Everything the
 * shell renders is derived — adding a module to the registry puts it in this menu.
 */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { signOutAction } from '@/app/admin/actions';
import { adminIcon, Pill, type AdminNavGroupLite } from './ui';
import { cx } from '@/lib/utils/text';

export interface ShellProps {
  groups: AdminNavGroupLite[];
  user: { name: string; email: string; role: string };
  badges?: Record<string, number>;
  children: React.ReactNode;
}

export function Shell({ groups, user, badges = {}, children }: ShellProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((group) => ({ ...group, items: group.items.filter((item) => item.label.toLowerCase().includes(q)) }))
      .filter((group) => group.items.length > 0);
  }, [groups, query]);

  const current = useMemo(() => {
    const key = pathname.split('/').filter(Boolean)[1] ?? '';
    return groups.flatMap((g) => g.items).find((item) => item.key === key);
  }, [groups, pathname]);

  return (
    <div className="theme-admin min-h-dvh bg-ink-950 text-fg">
      <a href="#cm-main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-2 focus:bg-ink-800 focus:px-3 focus:py-2 focus:text-sm">
        Skip to content
      </a>

      <div className="lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside
          className={cx(
            'fixed inset-y-0 left-0 z-40 flex w-[268px] flex-col border-r border-line bg-ink-1000 transition-transform lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0',
            open ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="flex items-center gap-2.5 border-b border-line px-5 py-4">
            <span className="grid h-8 w-8 place-items-center rounded-2 border border-[var(--accent)]/40 text-[var(--accent)]">
              <Icon name="sliders" size={16} />
            </span>
            <span className="leading-tight">
              <span className="block font-display text-[15px]">Covenant</span>
              <span className="block text-[10px] uppercase tracking-[0.2em] text-fg-dim">Content</span>
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
              <span className="sr-only">Search the CMS</span>
              <Icon name="search" size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-dim" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Jump to…"
                className="w-full rounded-2 border border-line bg-ink-900 py-1.5 pl-8 pr-2 text-[12.5px] text-fg placeholder:text-fg-dim focus:border-[var(--accent)]/60 focus:outline-none"
              />
            </label>
          </div>

          <nav className="flex-1 overflow-y-auto px-2.5 py-3" aria-label="CMS sections">
            <Link
              href="/admin"
              className={cx(
                'mb-3 flex items-center gap-2.5 rounded-2 px-2.5 py-[7px] text-[12.5px] transition-colors',
                pathname === '/admin' ? 'bg-ink-800 text-fg' : 'text-fg-muted hover:bg-ink-900 hover:text-fg',
              )}
            >
              <Icon name="home" size={15} className={pathname === '/admin' ? 'text-[var(--accent)]' : 'text-fg-dim'} />
              Dashboard
            </Link>
            {filtered.length === 0 ? (
              <p className="px-2.5 py-3 text-[12px] text-fg-dim">No section matches “{query}”.</p>
            ) : null}
            {filtered.map((group) => (
              <div key={group.key} className="mb-3.5">
                <p className="px-2.5 pb-1 text-[10px] uppercase tracking-[0.16em] text-fg-dim">{group.label}</p>
                <ul className="space-y-[2px]">
                  {group.items.map((item) => {
                    const active = pathname === `/admin/${item.key}` || pathname.startsWith(`/admin/${item.key}/`);
                    const badge = badges[item.key] ?? 0;
                    return (
                      <li key={item.key}>
                        <Link
                          href={`/admin/${item.key}`}
                          aria-current={active ? 'page' : undefined}
                          className={cx(
                            'group flex items-center gap-2.5 rounded-2 px-2.5 py-[7px] text-[12.5px] transition-colors',
                            active ? 'bg-ink-800 text-fg' : 'text-fg-muted hover:bg-ink-900 hover:text-fg',
                          )}
                        >
                          <Icon name={adminIcon(item.icon)} size={15} className={active ? 'text-[var(--accent)]' : 'text-fg-dim group-hover:text-fg-muted'} />
                          <span className="truncate">{item.label}</span>
                          <span className="ml-auto flex shrink-0 items-center gap-1.5">
                            {item.level === 'read' ? <Icon name="lock" size={11} className="text-fg-dim" title="Read only for your role" /> : null}
                            {badge > 0 ? (
                              <span className="grid h-4 min-w-4 place-items-center rounded-pill bg-[var(--accent)]/18 px-1 text-[10px] font-medium text-[var(--accent)]">
                                {badge > 99 ? '99+' : badge}
                              </span>
                            ) : null}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
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
              <Link href="/admin/account" className={cx('rounded-2 border border-line px-2 py-1 text-[11.5px] text-fg-muted hover:text-fg', pathname === '/admin/account' && 'border-[var(--accent)]/50 text-fg')}>
                Account
              </Link>
              <Link href="/" target="_blank" className="rounded-2 border border-line px-2 py-1 text-[11.5px] text-fg-muted hover:text-fg">
                View site
              </Link>
              <form action={signOutAction} className="ml-auto">
                <button type="submit" className="inline-flex items-center gap-1 rounded-2 border border-line px-2 py-1 text-[11.5px] text-fg-muted transition-colors hover:border-alert-400/50 hover:text-alert-400">
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
            <button type="button" onClick={() => setOpen(true)} className="rounded-2 border border-line p-1.5 text-fg-muted hover:text-fg lg:hidden" aria-label="Open menu">
              <Icon name="menu" size={16} />
            </button>
            <div className="min-w-0">
              <h1 className="truncate font-display text-[17px] leading-tight">{current?.label ?? 'Dashboard'}</h1>
            </div>
            <div className="ml-auto flex items-center gap-2">
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
