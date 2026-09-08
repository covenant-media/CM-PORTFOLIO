import TechPortfolioPage from '@/components/site/TechPortfolioPage';

export const revalidate = 60;

/**
 * /tech — single-page portfolio in the style of a modern developer portfolio:
 * hero → about → skills → services → projects → experience → testimonials
 * → contact → résumé, with a side anchor nav and smooth scrolling.
 */
export default function Page() {
  return <TechPortfolioPage />;
}
