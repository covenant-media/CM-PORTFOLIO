/**
 * /media — the single-page Media Portfolio.
 *
 * This route renders `MediaPortfolioPage` directly (like `/tech-portfolio` does for the
 * tech surface) rather than going through `CmsPage`, because the experience is built
 * around one continuous cinematic scroll with its own header, anchored sections and
 * video theatre. The `/media/**` sub-routes still resolve from the CMS as before.
 */
import MediaPortfolioPage from '@/components/site/MediaPortfolioPage';

export const revalidate = 60;

/**
 * Metadata mirrors what `pageMetadata({ path: '/media' })` resolved to before this
 * route became a bespoke page: the same title, and the CMS SEO record when one exists.
 */
export async function generateMetadata() {
  const { pageMetadata } = await import('@/lib/seo/page');
  return pageMetadata({
    path: '/media',
    division: 'media',
    title: 'Covenant Media, cinematic event, brand and story films',
  });
}

export default function Page() {
  return <MediaPortfolioPage />;
}
