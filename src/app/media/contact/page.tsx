/**
 * /media/contact — rendered from the CMS page of the same slug when it exists, and from
 * this route's structural plan otherwise. No copy lives in this file.
 */
import { CmsPage } from '@/components/site/CmsPage';
import { pageMetadata } from '@/lib/seo/page';

export const revalidate = 60;

export function generateMetadata() {
  return pageMetadata({
    path: '/media/contact',
    division: 'media',
    title: 'Book a date',
  });
}

export default function Page() {
  return (
    <CmsPage
      surface="media"
      path="/media/contact"
      title="Book a date"
      eyebrow="Enquiries"
    />
  );
}
