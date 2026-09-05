/**
 * /about — rendered from the CMS page of the same slug when it exists, and from
 * this route's structural plan otherwise. No copy lives in this file.
 */
import { CmsPage } from '@/components/site/CmsPage';
import { pageMetadata } from '@/lib/seo/page';

export const revalidate = 60;

export function generateMetadata() {
  return pageMetadata({
    path: '/about',
    division: 'main',
    title: 'About',
  });
}

export default function Page() {
  return (
    <CmsPage
      surface="main"
      path="/about"
      title="About"
      eyebrow="The studio"
    />
  );
}
