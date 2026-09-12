/**
 * The full content index.
 *
 * Every registry module, grouped the way the CMS has always grouped them. The console
 * sections above are shortcuts into the content owners use daily; this page is the map of
 * everything, so nothing the platform can edit is more than two clicks away.
 */
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { PageHeader, Pill } from '@/components/admin/ui';
import { adminIcon } from '@/components/admin/ui';
import { readSession } from '@/lib/auth/session';
import { permissionsForRole } from '@/lib/auth/guard';
import { adminNav } from '@/lib/cms/admin';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'All content' };

export default async function AllContentPage() {
  const session = await readSession();
  if (!session) redirect('/admin/login');
  const groups = await adminNav(session.user.role, await permissionsForRole(session.user.role));
  const total = groups.reduce((n, group) => n + group.items.length, 0);

  return (
    <>
      <PageHeader
        eyebrow="Everything"
        title="All content"
        lede={`${total} content types, filtered to what your role can open. These are the full editors — the console sections link to most of them, and anything else lives only here.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <section key={group.key} className="rounded-4 border border-line bg-ink-900/60">
            <header className="border-b border-line px-5 py-3">
              <h3 className="text-[12.5px] font-medium text-fg">{group.label}</h3>
              <p className="mt-0.5 text-[11.5px] leading-snug text-fg-dim">{group.hint}</p>
            </header>
            <ul className="px-2.5 py-2.5">
              {group.items.map((item) => (
                <li key={item.key}>
                  <Link
                    href={`/admin/${item.key}`}
                    className="group flex items-center gap-2.5 rounded-2 px-2.5 py-[6px] text-[12.5px] text-fg-muted transition-colors hover:bg-ink-800 hover:text-fg"
                  >
                    <Icon name={adminIcon(item.icon)} size={14} className="text-fg-dim group-hover:text-fg-muted" />
                    <span className="truncate">{item.label}</span>
                    {item.level === 'read' ? (
                      <Pill tone="neutral" className="ml-auto">
                        read only
                      </Pill>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
