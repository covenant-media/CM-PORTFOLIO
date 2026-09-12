/**
 * Hero & headline text for the main website — the same editor as the media hero,
 * pointed at the `main` surface.
 */
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/admin/ui';
import { Notice } from '@/components/admin/notice';
import { MAIN_HERO_COPY, SurfaceHeroForm } from '@/components/admin/surface-hero-form';
import { readSession } from '@/lib/auth/session';
import { levelFor } from '@/lib/auth/permissions';
import { permissionsForRole } from '@/lib/auth/guard';
import { surfaceHero } from '@/lib/cms/console';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Hero & headline text' };

export default async function SiteHeroPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await readSession();
  if (!session) redirect('/admin/login');
  const [hero, roleMap] = await Promise.all([surfaceHero('main'), permissionsForRole(session.user.role)]);
  const level = levelFor(session.user.role, 'pages', roleMap);
  const canWrite = level === 'write' || level === 'manage';
  const params = await searchParams;

  return (
    <>
      <PageHeader eyebrow="Main website" title={MAIN_HERO_COPY.title} lede={MAIN_HERO_COPY.lede} />
      <Notice params={params} />
      <SurfaceHeroForm surface="main" hero={hero} csrf={session.csrfToken} canWrite={canWrite} copy={MAIN_HERO_COPY} returnTo="/admin/site/hero" />
    </>
  );
}
