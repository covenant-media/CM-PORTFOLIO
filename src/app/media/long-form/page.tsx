/**
 * /media/long-form — the long-form catalog.
 *
 * One format per catalog on purpose: long-form work, short-form work and photography each
 * have their own screen so nothing unrelated is listed together. Renders the same cards and
 * the same details card as the main portfolio page.
 */
import { MediaCatalogScreen } from '@/components/site/MediaCatalogScreen';
import { pageMetadata } from '@/lib/seo/page';
import { mediaRails } from '@/lib/media/portfolio';

export const revalidate = 60;

export function generateMetadata() {
  return pageMetadata({
    path: '/media/long-form',
    division: 'media',
    title: 'Long-form work',
    description: 'Event coverage, awareness films and full highlight videos from Covenant Media.',
  });
}

export default async function Page() {
  const rails = await mediaRails();

  return (
    <MediaCatalogScreen
      format="long"
      eyebrow="Catalog"
      title="Long-form work"
      lede="Campaign films, conference coverage, ceremony highlights and full productions. Select any piece to read what it covers and watch it in full."
      items={rails.long}
    />
  );
}
