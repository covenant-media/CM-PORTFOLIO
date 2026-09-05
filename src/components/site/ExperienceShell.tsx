import { siteContext, contactDetails } from '@/lib/cms/content';
import { truncate } from '@/lib/utils/text';
import { SiteHeader } from './SiteHeader';
import { SiteFooter, ScrollProgress } from './SiteFooter';
import { SiteBehaviours } from '@/components/ui/SiteBehaviours';
import { LightboxHost } from '@/components/ui/Lightbox';
import { MediaBand } from '@/components/site/MediaBand';

export type Surface = 'main' | 'media' | 'tech';

const SURFACE_DEFAULTS: Record<
  Surface,
  {
    homeHref: string;
    wordmark: { primary: string; secondary?: string | null };
    navLocation: { header: string; footer: string };
    socialPlacement: string;
    cta: { label: string; href: string };
  }
> = {
  main: {
    homeHref: '/',
    wordmark: { primary: 'Covenant Media', secondary: 'Media · Technology' },
    navLocation: { header: 'main_header', footer: 'main_footer' },
    socialPlacement: 'main',
    cta: { label: 'Start a project', href: '/contact' },
  },
  media: {
    homeHref: '/media',
    wordmark: { primary: 'Covenant Media', secondary: 'Portfolio' },
    navLocation: { header: 'media_header', footer: 'media_footer' },
    socialPlacement: 'media',
    cta: { label: 'Hire me', href: '/media/contact' },
  },
  tech: {
    homeHref: '/tech',
    wordmark: { primary: 'Covenant Nsikan', secondary: 'Technology' },
    navLocation: { header: 'tech_header', footer: 'tech_footer' },
    socialPlacement: 'tech',
    cta: { label: 'Available for work', href: '/tech/contact' },
  },
};

/**
 * One shell for the three experiences: shared structure, shared components,
 * scoped design tokens (.theme-*) + its own header/footer content from the CMS.
 */
export async function ExperienceShell({ surface, children }: { surface: Surface; children: React.ReactNode }) {
  const [ctx, contact] = await Promise.all([siteContext(), contactDetails()]);
  const settings = ctx.settings;
  const config = SURFACE_DEFAULTS[surface];

  const brandName = String(settings['brand.name'] ?? '').trim() || (surface === 'tech' ? 'Covenant Nsikan' : 'Covenant Media');
  const wordmark =
    surface === 'main'
      ? { primary: brandName, secondary: 'Media · Technology' }
      : surface === 'media'
        ? { primary: brandName, secondary: 'Media Portfolio' }
        : {
            primary: String(settings['founder.name'] ?? 'Covenant Nsikan'),
            secondary: 'Technology & Security',
          };

  const socials = ctx.social.filter((s) => {
    const placements = Array.isArray((s as { placements?: string[] }).placements) ? (s as unknown as { placements: string[] }).placements : null;
    return !placements || placements.includes(config.socialPlacement) || placements.includes('footer');
  });

  const ctaLabel =
    surface === 'media'
      ? String(settings['media.cta_secondary'] ?? config.cta.label)
      : surface === 'tech'
        ? 'Start a project'
        : config.cta.label;

  const tagline =
    surface === 'media'
      ? String(settings['brand.media_tagline'] ?? '')
      : surface === 'tech'
        ? String(settings['tech.role'] ?? '')
        : String(settings['brand.tagline'] ?? '');

  // Switched on from the CMS (Site settings → System). The admin area lives in
  // its own layout, so content can still be repaired while the site is down.
  if (settings['system.maintenance'] === true) {
    return <Maintenance surface={surface} message={String(settings['system.maintenance_message'] ?? '')} />;
  }

  return (
    <div className={`theme-${surface} relative flex min-h-dvh flex-col overflow-x-clip`}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:inline-flex focus:h-10 focus:items-center focus:rounded-pill focus:bg-[var(--accent)] focus:px-4 focus:text-sm focus:font-medium focus:text-[var(--accent-ink)]"
      >
        Skip to content
      </a>
      <ScrollProgress />
      {/* Atmosphere: one scoped gradient + grain, cheap and static. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{ backgroundImage: 'var(--surface-tone, none)' }}
      />
      <div aria-hidden className="grain pointer-events-none fixed inset-0 -z-10 opacity-[0.5]" />

      <SiteHeader
        surface={surface}
        homeHref={config.homeHref}
        wordmark={wordmark}
        nav={(ctx.nav[config.navLocation.header] ?? []).slice(0, 7)}
        cta={{ label: ctaLabel, href: config.cta.href }}
        socials={socials}
        note={surface === 'main' ? truncate(String(settings['founder.availability'] ?? ''), 44) || null : null}
      />

      <main id="main" className="flex-1">
        {children}
      </main>

      {surface === 'media' ? (
        <MediaBand
          primary={{ label: ctaLabel, href: config.cta.href }}
          whatsapp={(contact.whatsappHref as string) ?? null}
          whatsappLabel={(contact.whatsappLabel as string) ?? 'WhatsApp'}
        />
      ) : null}

      <SiteFooter
        surface={surface}
        wordmark={wordmark}
        nav={ctx.nav[config.navLocation.footer] ?? []}
        socials={socials}
        contact={{
          email: (contact.email as string) ?? null,
          phone: (contact.phone as string) ?? null,
          whatsappHref: (contact.whatsappHref as string) ?? null,
          whatsappLabel: (contact.whatsappLabel as string) ?? null,
          location: (contact.location as string) ?? null,
          responseTime: (contact.responseTime as string) ?? null,
        }}
        cta={{
          headline:
            surface === 'media'
              ? 'Tell me what you are making.'
              : surface === 'tech'
                ? 'Have something that needs building properly?'
                : 'Let us make something worth watching.',
          body:
            surface === 'media'
              ? truncate(String(settings['media.intro'] ?? ''), 150) || 'Shoots, edits, coverage and campaigns — with a clear process from brief to final delivery.'
              : truncate(String(settings['tech.intro'] ?? ''), 150) || 'Product work, design systems, security reviews. Send the brief and I will tell you what is realistic.',
          primary: { label: ctaLabel, href: config.cta.href },
        }}
        legal={{
          privacyHref: '/security',
          termsHref: '/security#working-terms',
          brandLine: String(settings['brand.legal_name'] ?? '').trim() || `${brandName}`,
          tagline: truncate(tagline, 60) || null,
        }}
      />
      <SiteBehaviours division={surface} />
      <LightboxHost />
    </div>
  )
}

function Maintenance({ surface, message }: { surface: Surface; message: string }) {
  return (
    <div className={`theme-${surface} flex min-h-dvh items-center justify-center px-6`}>
      <div className="max-w-md text-center">
        <p className="eyebrow">Maintenance</p>
        <h1 className="display-2 mt-5">Back shortly</h1>
        <p className="lede mt-4">{message || 'The site is being rebuilt right now.'}</p>
        <p className="mt-8 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-fg-dim">
          Admin stays reachable at /admin while this is on
        </p>
      </div>
    </div>
  );
}
