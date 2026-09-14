/**
 * /media/photography — the event photography catalog.
 *
 * Photographs are presented as photographs: a plain, well-proportioned grid with restrained
 * hover, reusing the same lightbox host as the rest of the site.
 */
import { MediaCatalogScreen } from '@/components/site/MediaCatalogScreen';
import { pageMetadata } from '@/lib/seo/page';
import { mediaRails } from '@/lib/media/portfolio';

export const revalidate = 60;

export function generateMetadata() {
  return pageMetadata({
    path: '/media/photography',
    division: 'media',
    title: 'Event photography',
    description: 'Event, ceremony and studio photography from Covenant Media.',
  });
}

export default async function Page() {
  const rails = await mediaRails();

  return (
    <MediaCatalogScreen
      format="photo"
      eyebrow="Catalog"
      title="Event photography"
      lede="Conferences, ceremonies and campaign days photographed alongside the films, so your print, web and social imagery all carry one look."
      items={rails.photos}
    />
  );
}
