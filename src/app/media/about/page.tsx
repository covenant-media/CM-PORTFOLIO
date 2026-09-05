/**
 * /media/about — rendered from the CMS page of the same slug when it exists, and from
 * this route's structural plan otherwise. No copy lives in this file.
 */
import { CmsPage } from '@/components/site/CmsPage';
import { pageMetadata } from '@/lib/seo/page';

export const revalidate = 60;

export function generateMetadata() {
  return pageMetadata({
    path: '/media/about',
    division: 'media',
    title: 'About',
  });
}

export default function Page() {
  return (
    <CmsPage
      surface="media"
      path="/media/about"
      title="About"
      eyebrow="Behind the camera"
    />
  );
}
