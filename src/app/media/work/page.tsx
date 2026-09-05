import { CmsPage } from '@/components/site/CmsPage';
import { ProjectCatalog } from '@/components/site/CatalogView';
import { pageMetadata } from '@/lib/seo/page';

export const revalidate = 60;

export function generateMetadata() {
  return pageMetadata({ path: '/media/work', division: 'media', title: 'Work' });
}

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const query = await searchParams;
  return (
    <CmsPage surface="media" path="/media/work" title="Work" eyebrow="Selected projects">
      <ProjectCatalog division="media" query={query} basePath="/media/work" perPage={12} />
    </CmsPage>
  );
}
