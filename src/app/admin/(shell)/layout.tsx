import { redirect } from 'next/navigation';
import { Shell } from '@/components/admin/Shell';
import { AdminProviders } from '@/components/admin/providers';
import { readSession } from '@/lib/auth/session';
import { permissionsForRole } from '@/lib/auth/guard';
import { adminNav, consoleNav } from '@/lib/cms/admin';
import { submissionCounts } from '@/lib/cms/repository';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await readSession();
  if (!session) redirect('/admin/login');

  const roleMap = await permissionsForRole(session.user.role);
  // The unread count is a nav badge, so it has to exist before the nav is built.
  const counts = await submissionCounts().catch(() => ({ total: 0, new: 0, byForm: {} as Record<string, number> }));
  const [groups, legacy] = await Promise.all([
    consoleNav(session.user.role, roleMap, { enquiries: counts.new }),
    adminNav(session.user.role, roleMap),
  ]);

  return (
    <AdminProviders csrf={session.csrfToken}>
      <Shell
        groups={groups}
        legacy={legacy}
        user={{ name: session.user.name || session.user.email, email: session.user.email, role: session.user.role }}
      >
        {children}
      </Shell>
    </AdminProviders>
  );
}
