import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Shell } from '@/components/admin/Shell';
import { AdminProviders } from '@/components/admin/providers';
import { readSession } from '@/lib/auth/session';
import { permissionsForRole } from '@/lib/auth/guard';
import { adminNav } from '@/lib/cms/admin';
import { submissionCounts } from '@/lib/cms/repository';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: { default: 'Covenant CMS', template: '%s — Covenant CMS' },
    robots: { index: false, follow: false },
  };
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await readSession();
  if (!session) redirect('/admin/login');

  const [groups, counts] = await Promise.all([
    adminNav(session.user.role, await permissionsForRole(session.user.role)),
    submissionCounts().catch(() => ({ total: 0, new: 0, byForm: {} })),
  ]);

  return (
    <AdminProviders csrf={session.csrfToken}>
      <Shell
        groups={groups}
        user={{ name: session.user.name || session.user.email, email: session.user.email, role: session.user.role }}
        badges={{ submissions: counts.new }}
      >
        {children}
      </Shell>
    </AdminProviders>
  );
}
