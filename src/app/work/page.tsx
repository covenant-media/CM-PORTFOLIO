import { CmsPage } from '@/components/site/CmsPage';
import { ProjectCatalog } from '@/components/site/CatalogView';
import { pageMetadata } from '@/lib/seo/page';

export const revalidate = 60;

export function generateMetadata() {
  return pageMetadata({ path: '/work', division: 'main', title: 'Work' });
}

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const query = await searchParams;
  return (
    <CmsPage surface="main" path="/work" title="Work" eyebrow="Portfolio">
      <ProjectCatalog division="media" query={query} basePath="/work" />
    </CmsPage>
  );
}
