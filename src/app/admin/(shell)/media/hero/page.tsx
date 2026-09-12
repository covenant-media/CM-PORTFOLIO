/**
 * Hero & intro text for the media portfolio — see `SurfaceHeroForm` for the editor
 * itself. This route only decides which surface it edits and where saving lands.
 */
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/admin/ui';
import { Notice } from '@/components/admin/notice';
import { MEDIA_HERO_COPY, SurfaceHeroForm } from '@/components/admin/surface-hero-form';
import { readSession } from '@/lib/auth/session';
import { levelFor } from '@/lib/auth/permissions';
import { permissionsForRole } from '@/lib/auth/guard';
import { surfaceHero } from '@/lib/cms/console';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Hero & intro text' };

export default async function MediaHeroPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await readSession();
  if (!session) redirect('/admin/login');
  const [hero, roleMap] = await Promise.all([surfaceHero('media'), permissionsForRole(session.user.role)]);
  const level = levelFor(session.user.role, 'media_projects', roleMap);
  const canWrite = level === 'write' || level === 'manage';
  const params = await searchParams;

  return (
    <>
      <PageHeader eyebrow="Media portfolio" title={MEDIA_HERO_COPY.title} lede={MEDIA_HERO_COPY.lede} />
      <Notice params={params} />
      <SurfaceHeroForm surface="media" hero={hero} csrf={session.csrfToken} canWrite={canWrite} copy={MEDIA_HERO_COPY} returnTo="/admin/media/hero" />
    </>
  );
}
