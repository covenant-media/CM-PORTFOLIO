/**
 * /media-portfolio — the canonical URL for the single-page Media Portfolio.
 *
 * This mirrors the Tech Portfolio pattern exactly: `/tech-portfolio` is the canonical
 * single-page route and the legacy `/tech` route serves the same component so existing
 * links keep working. Here, `/media` (and the `/media/**` catalog and pricing routes)
 * continue to serve the same experience, while everything new links to `/media-portfolio`.
 */
import MediaPortfolioPage from '@/components/site/MediaPortfolioPage';

export const revalidate = 60;

export async function generateMetadata() {
  const { pageMetadata } = await import('@/lib/seo/page');
  return pageMetadata({
    path: '/media-portfolio',
    division: 'media',
    title: 'Covenant Media, cinematic event, brand and story films',
  });
}

export default function Page() {
  return <MediaPortfolioPage />;
}