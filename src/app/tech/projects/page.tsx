import { CmsPage } from '@/components/site/CmsPage';
import { ProjectCatalog } from '@/components/site/CatalogView';
import { pageMetadata } from '@/lib/seo/page';

export const revalidate = 60;

export function generateMetadata() {
  return pageMetadata({ path: '/tech/projects', division: 'tech', title: 'Projects' });
}

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const query = await searchParams;
  return (
    <CmsPage surface="tech" path="/tech/projects" title="Projects" eyebrow="Selected builds">
      <ProjectCatalog division="tech" query={query} basePath="/tech/projects" perPage={9} />
    </CmsPage>
  );
}
