/**
 * /media/short-form — the short-form catalog.
 *
 * Vertical work only, one aspect ratio throughout, in the same card system as the rail on
 * the portfolio page.
 */
import { MediaCatalogScreen } from '@/components/site/MediaCatalogScreen';
import { pageMetadata } from '@/lib/seo/page';
import { SHORT_FORM_ITEMS } from '@/lib/media/sample-portfolio';

export const revalidate = 60;

export function generateMetadata() {
  return pageMetadata({
    path: '/media/short-form',
    division: 'media',
    title: 'Short-form work',
    description: 'Vertical edits for TikTok, Reels and Shorts from Covenant Media.',
  });
}

export default function Page() {
  return (
    <MediaCatalogScreen
      format="short"
      eyebrow="Catalog"
      title="Short-form work"
      lede="Vertical edits built for TikTok, Reels and Shorts: hooks in the first second, captions burned in and cuts that land on the beat."
      items={SHORT_FORM_ITEMS}
    />
  );
}
