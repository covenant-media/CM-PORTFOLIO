import TechPortfolioPage from '@/components/site/TechPortfolioPage';

export const revalidate = 60;

/**
 * /tech-portfolio — the canonical URL for the single-page Tech Portfolio
 * (hero → about → skills → services → projects → experience → testimonials
 * → contact → résumé, one continuous scroll).
 *
 * The legacy `/tech` route intentionally serves the same experience so existing
 * bookmarks, the DB-driven nav entries and case-study crumb chains keep working;
 * everything new links here.
 */
export default function Page() {
  return <TechPortfolioPage />;
}
