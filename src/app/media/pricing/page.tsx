/**
 * /media/pricing — the one standalone page in the Media Portfolio.
 *
 * Bespoke rather than CMS-block-composed, so it shares the single page's header, footer,
 * motion language and contact access. Copy and package scope come from
 * `lib/media/sample-portfolio.ts`; no fee is stated anywhere, because every project is
 * quoted individually.
 */
import { MediaPricingPage } from '@/components/site/MediaPricingPage';
import { pageMetadata } from '@/lib/seo/page';

export const revalidate = 60;

export function generateMetadata() {
  return pageMetadata({
    path: '/media/pricing',
    division: 'media',
    title: 'Pricing',
    description: 'Photography, long-form and short-form video packages from Covenant Media, quoted per project.',
  });
}

export default function Page() {
  return <MediaPricingPage />;
}
