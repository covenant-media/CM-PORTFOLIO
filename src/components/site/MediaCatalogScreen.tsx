/**
 * Catalog screen wrapper.
 *
 * Resolves everything a catalog needs from the CMS (site context, contact details, footer
 * nav) in one place, so the three catalog routes are three tiny files that only choose their
 * format, copy and item list. Keeps the header, footer and metadata identical between them.
 */
import { MediaCatalogView } from './MediaCatalogView';
import { MediaInquiryForm } from './MediaInquiryForm';
import { SiteFooter } from './SiteFooter';
import { FORM_CONFIGS } from '@/lib/cms/forms';
import { issueFormToken } from '@/lib/security/forms';
import { contactDetails, siteContext } from '@/lib/cms/content';
import { MEDIA_SOCIALS, MEDIA_STUDIO, type MediaFormat, type MediaItem } from '@/lib/media/sample-portfolio';
import type { SocialItem } from '@/lib/types/content';
import { truncate } from '@/lib/utils/text';

export async function MediaCatalogScreen({
  format,
  eyebrow,
  title,
  lede,
  items,
}: {
  format: MediaFormat;
  eyebrow: string;
  title: string;
  lede: string;
  items: MediaItem[];
}) {
  const [ctx, contact] = await Promise.all([siteContext(), contactDetails()]);
  const settings = ctx.settings;
  const formConfig = FORM_CONFIGS.media;
  const formToken = issueFormToken();
  const successMessage = String(settings[formConfig.successSetting] ?? '').trim() || null;
  const brandName = String(settings['brand.name'] ?? '').trim() || 'Covenant Media';
  const tagline = String(settings['brand.media_tagline'] ?? '').trim() || 'Capturing moments. Crafting stories.';

  // CMS rows first, the studio's published profiles otherwise, so the footer social row is
  // never empty while the CMS rows are still drafts.
  const socials: SocialItem[] = (ctx.social.length ? ctx.social : MEDIA_SOCIALS).map((entry) => ({
    network: entry.network,
    url: entry.url,
    label: entry.label,
    handle: null,
  }));

  const resolved = {
    phone: contact.phone ?? MEDIA_STUDIO.phone,
    email: contact.email ?? MEDIA_STUDIO.email,
    whatsapp: (contact.whatsappHref as string) ?? `https://wa.me/${MEDIA_STUDIO.whatsapp}`,
    whatsappLabel: (contact.whatsappLabel as string) ?? 'Chat on WhatsApp',
    location: contact.location ?? MEDIA_STUDIO.location,
  };

  return (
    <MediaCatalogView
      format={format}
      eyebrow={eyebrow}
      title={title}
      lede={lede}
      items={items}
      inquiry={
        <MediaInquiryForm
          config={formConfig}
          action="/api/forms"
          token={formToken}
          successMessage={successMessage}
          submitNote="Goes straight to the studio. No lists, no tracking pixels."
        />
      }
      footer={
        <SiteFooter
          surface="media"
          wordmark={{ primary: brandName, secondary: 'Media Portfolio' }}
          nav={ctx.nav.media_footer ?? []}
          socials={socials}
          contact={{
            email: resolved.email,
            phone: resolved.phone,
            whatsappHref: resolved.whatsapp,
            whatsappLabel: resolved.whatsappLabel,
            location: resolved.location,
            responseTime: (contact.responseTime as string) ?? null,
          }}
          cta={{
            headline: 'Tell me what you are making.',
            body: 'Shoots, edits, coverage and campaigns, with a clear process from brief to final delivery.',
            primary: { label: 'Start a Project', href: '/media#contact' },
          }}
          legal={{
            privacyHref: '/security',
            termsHref: '/security#working-terms',
            brandLine: String(settings['brand.legal_name'] ?? '').trim() || brandName,
            tagline: truncate(tagline, 60) || null,
          }}
        />
      }
    />
  );
}
