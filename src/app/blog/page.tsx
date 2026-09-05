import { CmsPage } from '@/components/site/CmsPage';
import { WritingCatalog } from '@/components/site/CatalogView';
import { pageMetadata } from '@/lib/seo/page';

export const revalidate = 60;

export function generateMetadata() {
  return pageMetadata({ path: '/blog', division: 'main', title: 'Writing' });
}

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const query = await searchParams;
  return (
    <CmsPage surface="main" path="/blog" title="Writing" eyebrow="Journal">
      <WritingCatalog query={query} />
    </CmsPage>
  );
}
