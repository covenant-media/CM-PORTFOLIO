/**
 * Media Portfolio, the single page at `/media`.
 *
 * Sections in scroll order: Hero (greeting, rolling role line, social row, figures, hero video
 * card), Work (long-form rows, short-form rail, photography), Services, Process, Client Stories,
 * About, Contact. Each work section links to its full catalog.
 *
 * **Scope.** Media-only. It replaces `CmsPage` for this route the way `TechPortfolioPage`
 * does for `/tech-portfolio`, and it consumes the shared primitives (Section, Button, Icon,
 * Motion, LightboxHost, SiteFooter) exactly as the other surfaces do. Nothing outside the
 * media surface is modified, and the one shared component it needs a variation of
 * (`forms/PublicForm`) is wrapped rather than edited.
 *
 * **Data.** Everything rendered here comes from `src/lib/media/sample-portfolio.ts`, which
 * mirrors the CMS columns (`project`, `media_video`, `media_asset`, `testimonial`,
 * `pricing_package`). Swapping those arrays for database loaders is a change to that file
 * only. See the header of that module for exactly what is real and what is simulated.
 */
import { Section, SectionHeader, Eyebrow } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { FadeIn, Parallax } from '@/components/ui/Motion';
import { MediaHeader, type MediaAnchor } from './MediaHeader';
import { MediaRoleLine } from './MediaRoleLine';
import { MediaHeroVideo } from './MediaHeroVideo';
import { MediaStats } from './MediaStats';
import { MediaTools } from './MediaTools';
import { MediaSocialButtons } from './MediaSocialButtons';
import { MediaBackToTop } from './MediaBackToTop';
import { MediaInquiryForm } from './MediaInquiryForm';
import { MediaLongFormRows, MediaShortFormRail, MediaPhotoWall, MediaTestimonialRail } from './MediaGalleries';
import { SiteFooter, ScrollProgress } from './SiteFooter';
import { SiteBehaviours } from '@/components/ui/SiteBehaviours';
import { LightboxHost } from '@/components/ui/Lightbox';
import { FORM_CONFIGS } from '@/lib/cms/forms';
import { issueFormToken } from '@/lib/security/forms';
import { assetsByIds, contactDetails, siteContext, testimonialsFor } from '@/lib/cms/content';
import {
  LONG_FORM_ITEMS,
  MEDIA_CAPABILITIES,
  MEDIA_PROCESS,
  MEDIA_ROLES,
  MEDIA_SERVICES,
  MEDIA_SOCIALS,
  MEDIA_TOOLS,
  MEDIA_STUDIO,
  MEDIA_TESTIMONIALS,
  PHOTO_ITEMS,
  SHORT_FORM_ITEMS,
  type MediaItem,
  type MediaTestimonial,
} from '@/lib/media/sample-portfolio';
import type { SocialItem } from '@/lib/types/content';

export const revalidate = 60;

const ANCHORS: MediaAnchor[] = [
  { id: 'home', label: 'Home' },
  { id: 'work', label: 'Work' },
  { id: 'services', label: 'Services' },
  { id: 'process', label: 'Process' },
  { id: 'stories', label: 'Client Stories' },
  { id: 'about', label: 'About' },
  { id: 'contact', label: 'Contact' },
];

/**
 * The pieces the hero card cycles through.
 *
 * The hero presents vertical work, so the set is the short-form library ordered for the card
 * rather than the rail: the wedding highlight opens because it is the strongest piece, and the
 * rest rotate after it. Held as its own list so re-ordering the hero never touches the rail.
 */
const HERO_SHORT_ITEMS: MediaItem[] = [
  SHORT_FORM_ITEMS[3]!,
  SHORT_FORM_ITEMS[0]!,
  SHORT_FORM_ITEMS[2]!,
  SHORT_FORM_ITEMS[1]!,
  SHORT_FORM_ITEMS[4]!,
];

const CAPABILITIES = [
  'Videography',
  'Video editing',
  'Live streaming',
  'Motion graphics',
  'Cinematography',
  'Photography',
  'Colour grading',
  'Social media content',
];

export default async function MediaPortfolioPage() {
  const [ctx, contact, testimonials] = await Promise.all([
    siteContext(),
    contactDetails(),
    testimonialsFor('media', 6).catch(() => []),
  ]);

  const settings = ctx.settings;
  const brandName = String(settings['brand.name'] ?? '').trim() || MEDIA_STUDIO.brand;
  const founderName = String(settings['founder.name'] ?? '').trim() || MEDIA_STUDIO.founder;
  // The portrait setting is an image-picker value: it can hold an uploaded asset id or a plain
  // URL. Resolve an id through the media library so a picture chosen in the CMS actually renders;
  // a URL or a repository path is used as-is, and an unset setting falls back to the published
  // portrait. Without this, picking an image in the CMS wrote an id straight into the `src`.
  const portraitValue = String(settings['founder.portrait'] ?? '').trim();
  const portraitAsset =
    portraitValue && !/^(https?:)?\/\//.test(portraitValue) && !portraitValue.startsWith('/')
      ? (await assetsByIds([portraitValue]))[portraitValue]?.url ?? null
      : null;
  const portrait = portraitAsset || portraitValue || MEDIA_STUDIO.portrait;
  // The greeting prints the given name plainly and the surname in the accent, the way the
  // reference and the tech hero both do. A single-word name simply renders without the accent.
  const nameParts = founderName.trim().split(/\s+/);
  const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : nameParts[0] ?? '';
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] ?? '' : '';

  // The CMS wins whenever the owner has filled a field in; the published studio details are
  // the fallback so the page is never blank. Both are real, published values.
  const studio = {
    phone: contact.phone ?? MEDIA_STUDIO.phone,
    email: contact.email ?? MEDIA_STUDIO.email,
    whatsapp: (contact.whatsappHref as string) ?? `https://wa.me/${MEDIA_STUDIO.whatsapp}`,
    whatsappLabel: (contact.whatsappLabel as string) ?? MEDIA_STUDIO.whatsappLabel,
    location: contact.location ?? MEDIA_STUDIO.location,
    availability: contact.availability ?? MEDIA_STUDIO.availability,
  };
  const telHref = (contact.telHref as string) ?? `tel:${studio.phone.replace(/[^\d+]/g, '')}`;
  const mailHref = `mailto:${studio.email}`;
  const whatsappHref = studio.whatsapp.includes('?') ? studio.whatsapp : `${studio.whatsapp}?text=${encodeURIComponent('Hello Covenant, I would like to discuss a shoot.')}`;

  // Approved CMS testimonials come first; the written set follows until they are replaced.
  const clientStories: MediaTestimonial[] = [
    ...testimonials.map((item) => ({
      id: item.id,
      quote: item.quote,
      author: item.authorName ?? 'Client',
      context: [item.authorRole, item.authorOrg].filter(Boolean).join(', '),
      isSample: item.isSample,
    })),
    ...MEDIA_TESTIMONIALS,
  ].slice(0, 8);

  /**
   * The studio's profiles: the CMS rows when the owner has published and verified them,
   * otherwise the five the studio publishes on today. `MEDIA_SOCIALS` is the single source for
   * both this page's hero row and its footer, so a handle is edited in one place.
   */
  const socials: SocialItem[] = (ctx.social.length ? ctx.social : MEDIA_SOCIALS).map((entry) => ({
    network: entry.network,
    url: entry.url,
    label: entry.label,
    handle: null,
  }));

  /**
   * The paragraph under the footer's brand: the owner's `brand.footer_note` when it is filled in,
   * otherwise the studio described in its own published words — what it makes, how a project runs
   * and who carries it. No figures, no claims, nothing that is not already on this page.
   */
  const footerNote =
    String(settings['brand.footer_note'] ?? '').trim() ||
    'Covenant Media films, photographs and live-streams conferences, ceremonies, campaigns and brand productions. One crew carries a project from the first conversation through production, editing, colour and finishing, so nothing important is handed between departments.';

  const formConfig = FORM_CONFIGS.media;
  const formToken = issueFormToken();
  const successMessage = String(settings[formConfig.successSetting] ?? '').trim() || null;

  const CONTACT_CARDS = [
    {
      key: 'location',
      label: 'Location',
      value: studio.location,
      note: 'Available for shoots nationwide, with travel arranged per project.',
      icon: 'pin',
      href: null as string | null,
      action: null as string | null,
      external: false,
    },
    {
      key: 'phone',
      label: 'Phone',
      value: studio.phone,
      note: 'Call directly for dates already on the calendar.',
      icon: 'phone',
      href: telHref,
      action: 'Call now',
      external: false,
    },
    {
      key: 'email',
      label: 'Email',
      value: studio.email,
      note: 'Briefs, quotes and file delivery.',
      icon: 'mail',
      href: mailHref,
      action: 'Send an email',
      external: false,
    },
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      value: studio.whatsappLabel,
      note: 'The fastest route for a quick date check.',
      icon: 'whatsapp',
      href: whatsappHref,
      action: 'Open chat',
      external: true,
    },
    {
      key: 'availability',
      label: 'Availability',
      value: studio.availability,
      note: 'Send the date and location below and I will confirm within the day.',
      icon: 'calendar',
      href: '#contact',
      action: 'Request a date',
      external: false,
    },
  ];

  return (
    <div className="theme-media relative flex min-h-dvh flex-col overflow-x-clip">
      {/* Every in-page anchor on this page (nav links, the hero's buttons, the footer, the
          catalog cards) lands 96px clear of the sticky header, so a section heading never sits
          under the bar. One scoped rule covers all of them; MediaHeader's own smooth scroll
          uses the same offset. */}
      <style>{`.theme-media section[id] { scroll-margin-top: 96px; }`}</style>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:inline-flex focus:h-10 focus:items-center focus:rounded-pill focus:bg-[var(--accent)] focus:px-4 focus:text-sm focus:font-medium focus:text-[var(--accent-ink)]"
      >
        Skip to content
      </a>
      <ScrollProgress />
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10" style={{ backgroundImage: 'var(--surface-tone, none)' }} />
      <div aria-hidden className="grain pointer-events-none fixed inset-0 -z-10 opacity-[0.5]" />

      <MediaHeader anchors={ANCHORS} />

      <main id="main" className="flex-1">
        {/* ── HERO ─────────────────────────────────────────────────────────────────
            Two columns: the greeting and everything that belongs with it on the left, the
            hero video card on the right. The text column is a little wider than the card
            because the name is the first thing to read; the card is a contained, finished
            object rather than a full-bleed background, so both halves stay comparable. On a
            narrow screen the text comes first and the card follows it, which is the order
            the composition reads in anyway. */}
        <section id="home" data-hero className="relative isolate overflow-hidden pb-14 pt-10 md:pb-20 md:pt-14">
          <div aria-hidden className="pointer-events-none absolute -left-40 -top-24 -z-10 h-[40rem] w-[40rem] rounded-full bg-[var(--accent)]/8 blur-[130px]" />
          <div aria-hidden className="pointer-events-none absolute -right-32 top-24 -z-10 h-[30rem] w-[30rem] rounded-full bg-[var(--accent)]/6 blur-[120px]" />

          <div className="container-page">
            <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.06fr)_minmax(0,1fr)] lg:gap-14 xl:gap-16">
              {/* ── greeting side ── */}
              <div className="min-w-0">
                {/* The greeting: a small mono line, the name at display size, then the rolling
                    role line directly under it. This is the reference's hero block, built from
                    this surface's own type scale — and there is deliberately no brand line above
                    the eyebrow, because the header already carries the wordmark.

                    The name wears the logo: the given name in the brand's gold, the surname in
                    its white, set at a weight that holds on a dark page. It is the same split
                    the wordmark uses, so the hero and the mark read as one brand. */}
                <FadeIn>
                  <p className="text-center font-mono text-[0.75rem] uppercase tracking-[0.28em] text-fg-muted md:text-[0.8125rem] lg:text-left">
                    Hello, I&apos;m
                  </p>
                </FadeIn>

                {/* The name is rendered the way the Tech hero renders its own: plain text at display
                    size inside a FadeIn, never behind a masked in-view reveal. The mask variant
                    shipped the text already clipped and offset (opacity 0.001, translated 108% out
                    of its overflow box) and its reveal never ran, because the observed element sat
                    outside its own clip, so the name stayed invisible while still being present in
                    the DOM. The split is the logo's: given name in the brand gold, surname in the
                    surface white. */}
                <FadeIn delay={140} y={10}>
                  <h1 className="mt-3 text-center font-display text-[clamp(2.1rem,5.4vw,3.5rem)] font-semibold leading-[1.08] tracking-[-0.03em] md:mt-4 lg:text-left">
                    <span className="text-[var(--accent)]">{firstName}</span> {lastName ? <span className="text-fg max-lg:block">{lastName}</span> : null}
                  </h1>
                </FadeIn>

                <FadeIn delay={220}>
                  <p className="mt-5 flex items-center justify-center gap-3 md:mt-6 lg:justify-start">
                    <span aria-hidden className="h-px w-6 shrink-0 bg-[var(--accent)]/60 md:w-9" />
                    <MediaRoleLine
                      prefix="A"
                      phrases={MEDIA_ROLES}
                      className="font-mono text-[0.9rem] uppercase tracking-[0.16em] text-[var(--accent)] md:text-[1rem]"
                    />
                  </p>
                </FadeIn>

                <FadeIn delay={300}>
                  <p className="lede mx-auto mt-6 max-w-xl text-justify text-[1.0625rem] lg:mx-0 lg:max-w-xl lg:text-left">
                    Covenant Media produces films, photography and live streams for brands, events and creators. I take a project from the
                    first conversation through production, editing, colour and finishing, and hand over work that is ready to publish.
                  </p>
                </FadeIn>

                <FadeIn delay={380}>
                  <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                    <Button href="#work" size="lg" iconEnd="arrow-right">
                      See the Work
                    </Button>
                    <Button href="#contact" size="lg" variant="outline">
                      Start a Project
                    </Button>
                  </div>
                </FadeIn>

                <FadeIn delay={460}>
                  <div className="mt-7">
                    <MediaSocialButtons />
                  </div>
                </FadeIn>
              </div>

              {/* ── video side ── */}
              <FadeIn delay={240} y={20} className="min-w-0">
                <MediaHeroVideo items={HERO_SHORT_ITEMS} />
              </FadeIn>
            </div>

            {/* ── figures ── directly under the calls to action, above the capability list ── */}
            <MediaStats className="mt-12 md:mt-16" />

            {/* ── capability list ── */}
            <FadeIn delay={120}>
              <ul className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-2.5 border-t border-[rgba(243,241,236,.08)] pt-6 lg:justify-start">
                {MEDIA_CAPABILITIES.map((fact) => (
                  <li key={fact} className="flex items-center gap-2 text-[0.8125rem] text-fg-muted">
                    <span aria-hidden className="size-1 rounded-full bg-[var(--accent)]" />
                    {fact}
                  </li>
                ))}
              </ul>
            </FadeIn>
          </div>
        </section>

        {/* ── WORK: LONG-FORM ────────────────────────────────────────────────────── */}
        <Section id="work" tone="raised" size="compact">
          <div className="container-page">
            <SectionHeader
              eyebrow="Long-form content"
              title="Films that carry the whole story"
              lede="Campaign films, conference coverage and full event highlights, from the first brief to the finished master. Select any piece to watch it in full."
            />
            <MediaLongFormRows items={LONG_FORM_ITEMS} more={{ href: '/media/long-form', label: 'View Catalog' }} />
          </div>
        </Section>

        {/* ── WORK: SHORT-FORM ───────────────────────────────────────────────────── */}
        <Section id="shortform" size="compact">
          <div className="container-page">
            <SectionHeader
              eyebrow="Short-form content"
              title="Built for the scroll"
              lede="Vertical edits that hold attention on TikTok, Reels and Shorts. Hooks in the first second, captions burned in, and cuts that land on the beat."
            />
            <MediaShortFormRail items={SHORT_FORM_ITEMS} more={{ href: '/media/short-form', label: 'View Catalog' }} />
          </div>
        </Section>

        {/* ── WORK: EVENT PHOTOGRAPHY ────────────────────────────────────────────── */}
        <Section id="photography" tone="raised" size="compact">
          <div className="container-page">
            <SectionHeader
              eyebrow="Event photography"
              title="Stills from the same storytelling"
              lede="Conferences, ceremonies and campaign days photographed alongside the films, so your print, web and social imagery all come from one look."
            />
            <MediaPhotoWall items={PHOTO_ITEMS} more={{ href: '/media/photography', label: 'View Catalog' }} />
          </div>
        </Section>

        {/* ── SERVICES ───────────────────────────────────────────────────────────── */}
        <Section id="services" tone="sunken" size="compact">
          <div className="container-page">
            <SectionHeader
              eyebrow="What we do"
              title="Eight services, one crew"
              lede="Production and post-production under one roof, with the same person accountable from the first planning call to the final file."
            />
            <ul className="mt-11 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {MEDIA_SERVICES.map((service, index) => (
                <FadeIn key={service.title} as="li" delay={(index % 4) * 70}>
                  <article className="group flex h-full flex-col rounded-4 border border-[rgba(243,241,236,.08)] bg-[color:var(--color-ink-950)]/70 p-6 backdrop-blur transition duration-400 hover:-translate-y-1 hover:border-[var(--accent)]/30 hover:bg-[color:var(--color-ink-900)]/70">
                    <span aria-hidden className="grid size-11 place-items-center rounded-3 border border-[var(--accent)]/25 bg-[var(--accent)]/8 text-[var(--accent)] transition duration-400 group-hover:border-[var(--accent)]/50">
                      <Icon name={service.icon} size={18} />
                    </span>
                    <h3 className="mt-5 font-display text-[1.15rem] leading-tight tracking-[-0.02em] text-fg">{service.title}</h3>
                    <p className="mt-2.5 flex-1 text-[0.875rem] leading-relaxed text-fg-muted">{service.body}</p>
                    <ul className="mt-5 flex flex-wrap gap-1.5">
                      {service.deliverables.map((item) => (
                        <li key={item} className="rounded-pill border border-[rgba(243,241,236,.1)] bg-[rgba(243,241,236,.04)] px-2.5 py-0.5 font-mono text-[0.5625rem] uppercase tracking-[0.14em] text-fg-dim">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </article>
                </FadeIn>
              ))}
            </ul>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Button href="#contact" iconEnd="arrow-right">
                Discuss a project
              </Button>
              <Button href="/media/pricing" variant="outline">
                See pricing
              </Button>
            </div>
          </div>
        </Section>

        {/* ── PROCESS ────────────────────────────────────────────────────────────── */}
        <Section id="process" size="compact">
          <div className="container-page">
            <SectionHeader
              eyebrow="The process"
              title="From enquiry to delivery"
              lede="Five steps, the same on every project, so you always know what happens next and what is expected from you."
            />
            <Parallax distance={10}>
              <ol className="mt-11 grid gap-4 md:grid-cols-3 lg:grid-cols-5">
                {MEDIA_PROCESS.map((step, index) => (
                  <FadeIn key={step.step} as="li" delay={index * 70}>
                    <div className="relative flex h-full flex-col rounded-4 border border-[rgba(243,241,236,.08)] bg-[color:var(--color-ink-900)]/60 p-5 backdrop-blur transition duration-400 hover:-translate-y-1 hover:border-[var(--accent)]/30">
                      <span className="flex items-center justify-between">
                        <span className="tnum font-mono text-[1.75rem] leading-none text-[var(--accent)]/35">{step.step}</span>
                        <Icon name={step.icon} size={16} className="text-[var(--accent)]/70" />
                      </span>
                      <h3 className="mt-4 font-display text-[1.05rem] leading-tight tracking-[-0.02em]">{step.title}</h3>
                      <p className="mt-2 text-[0.875rem] leading-relaxed text-fg-muted">{step.body}</p>
                    </div>
                  </FadeIn>
                ))}
              </ol>
            </Parallax>
          </div>
        </Section>

        {/* ── TOOLS ───────────────────────────────────────────────────────────────
            A quiet band between the process and the client stories: the marks of the tools the
            work is made with, drifting slowly right to left inside one restrained container.
            Deliberately not in the navbar and deliberately nameless — the logos carry it. */}
        <MediaTools tools={MEDIA_TOOLS} className="pb-14 md:pb-20" />

        {/* ── CLIENT STORIES ─────────────────────────────────────────────────────── */}
        <Section id="stories" tone="raised" size="compact">
          <div className="container-page">
            <SectionHeader
              eyebrow="Client stories"
              title="What the work did for them"
              lede="Weddings, church media, conferences and campaigns, in the words of the people who commissioned them."
            />
          </div>
          <MediaTestimonialRail items={clientStories} />
        </Section>

        {/* ── ABOUT ────────────────────────────────────────────────────────────────
            One composition, two orders.

            The left column reads exactly as the owner lists it: the eyebrow, the heading, the
            three-paragraph biography, the services card, the studio statement, then the two
            ways to act on it. The founder portrait is held in the right column beside it, with
            its credit set *under* the frame rather than over the picture.

            On a narrow screen the same blocks re-order so the reader meets the portrait and its
            credit straight after the heading, and the long text follows. That is what the
            `order-*` classes below do; the grid placement only applies from `lg` up. */}
        <Section id="about" tone="sunken" size="compact">
          <div className="container-page">
            <div className="flex flex-col lg:grid lg:grid-cols-12 lg:gap-x-14">
              {/* 1 + 2: eyebrow and heading */}
              <div className="order-1 text-center lg:col-span-7 lg:row-start-1 lg:text-left">
                <FadeIn>
                  <Eyebrow>About the Studio</Eyebrow>
                  <h2 className="display-3 mt-4">The FACE Behind the Brand</h2>
                </FadeIn>
              </div>

              {/* The portrait: right column on desktop, second block on mobile. The picture
                  itself is untouched; its name and its credit take the brand's gold, and the
                  credit sits outside the frame, under the picture. */}
              <div className="order-2 mt-9 lg:col-span-5 lg:col-start-8 lg:row-span-5 lg:row-start-1 lg:mt-0">
                <FadeIn delay={100}>
                  <figure className="mx-auto w-full max-w-[21rem] sm:max-w-[26rem] lg:max-w-none">
                    <div className="relative aspect-[4/5] overflow-hidden rounded-4 border border-[rgba(243,241,236,.12)] bg-[color:var(--color-ink-900)]">
                      {/* Framed slightly tighter than the frame and anchored to the top, so the
                          subject fills the card rather than floating inside it. */}
                      <img
                        src={portrait}
                        alt={`${founderName}, ${MEDIA_STUDIO.founderCredit}`}
                        loading="lazy"
                        decoding="async"
                        className="size-full scale-[1.07] object-cover object-top"
                      />
                      <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-[rgba(5,5,7,.82)] via-[rgba(5,5,7,.04)] to-transparent" />
                      {/* The name still belongs to the picture. It wears the logo's split: the
                          given name in the brand's gold, the surname in its white. */}
                      <span className="absolute inset-x-0 bottom-0 px-4 pb-4 text-center">
                        <span className="block font-display text-[1.15rem] leading-tight tracking-[-0.02em] text-[var(--accent)]">
                          {firstName}
                          {lastName ? <span className="text-white"> {lastName}</span> : null}
                        </span>
                      </span>
                    </div>
                    {/* The credit, under the picture and outside it, in the brand white. */}
                    <figcaption className="mt-3.5 text-center font-mono text-[0.625rem] uppercase tracking-[0.2em] text-white">
                      {MEDIA_STUDIO.founderCredit}
                    </figcaption>
                  </figure>
                </FadeIn>
              </div>

              {/* 3: the biography — the introduction and the full story, as one piece of text. */}
              <div className="order-3 mt-10 lg:col-span-7 lg:row-start-2 lg:mt-9">
                <FadeIn delay={60}>
                  <div className="space-y-4 text-[0.9375rem] leading-relaxed text-fg-muted">
                    <p>
                      I am {founderName}, founder of {brandName}. I direct, shoot and edit, which means the person who plans your project is
                      the person on set and the person in the edit. Nothing important gets handed between departments, because there are no
                      departments.
                    </p>
                    <p>
                      The studio grew out of the work rather than the other way round. It began with filming services and events for people
                      who needed the day kept properly, then being asked to cut it afterwards. Coverage became editing, editing became colour
                      and finishing, and live streaming followed because clients needed the room to reach people who could not be in it.
                    </p>
                    <p>
                      That is still how the studio runs. Conferences, conventions, ceremonies, campaigns and brand productions, planned in
                      pre-production, captured on the day and finished in post, with one standard from the first brief to the final file.
                    </p>
                  </div>
                </FadeIn>
              </div>

              {/* 4: what the studio covers */}
              <div className="order-4 mt-9 lg:col-span-7 lg:row-start-3 lg:mt-10">
                <FadeIn delay={100}>
                  <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-4 border border-[rgba(243,241,236,.08)] bg-[rgba(243,241,236,.06)]">
                    {CAPABILITIES.map((item) => (
                      <li key={item} className="flex items-center gap-3 bg-[color:var(--color-ink-950)] px-4 py-4">
                        <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full border border-[var(--accent)]/35 text-[var(--accent)]">
                          <Icon name="check" size={11} />
                        </span>
                        <span className="text-[0.8125rem] text-fg-muted">{item}</span>
                      </li>
                    ))}
                  </ul>
                </FadeIn>
              </div>

              {/* 5: the studio statement */}
              <div className="order-5 mt-9 lg:col-span-7 lg:row-start-4 lg:mt-10">
                <FadeIn delay={120}>
                  <p className="text-center font-display text-[1.05rem] uppercase tracking-[0.28em] text-[var(--accent)] md:text-[1.15rem] lg:text-left">
                    {MEDIA_STUDIO.statement.split('. ').map((phrase, index, all) => (<span key={phrase} className={index === all.length - 1 ? 'text-white' : undefined}>{index < all.length - 1 ? `${phrase}. ` : phrase}</span>))}
                  </p>
                </FadeIn>
              </div>

              {/* 6: the two ways to act on it */}
              <div className="order-6 mt-8 lg:col-span-7 lg:row-start-5 lg:mt-9">
                <FadeIn delay={160}>
                  <div className="flex flex-wrap gap-3">
                    <Button href="#contact" iconEnd="arrow-right">
                      Work with the Studio
                    </Button>
                    <Button href="#work" variant="outline">
                      See Works
                    </Button>
                  </div>
                </FadeIn>
              </div>
            </div>
          </div>
        </Section>

        {/* ── CONTACT ────────────────────────────────────────────────────────────── */}
        <Section id="contact" size="compact">
          <div className="container-page">
            <SectionHeader
              eyebrow="Inquiries"
              title="Tell me more about your shoot."
              lede="Share the date, the location and what the footage is for. Every brief gets a personal reply, usually the same day."
            />

            <div className="mt-11 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16">
              <div className="min-w-0">
                <ul className="grid gap-3 sm:grid-cols-2">
                  {CONTACT_CARDS.map((card, index) => (
                    <FadeIn key={card.key} as="li" delay={index * 60} className={card.key === 'location' ? 'sm:col-span-2' : undefined}>
                      <a
                        href={card.href ?? undefined}
                        {...(card.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                        {...(card.href ? { 'data-analytics': 'outbound_click', 'data-analytics-target': card.href } : {})}
                        aria-label={card.action ? `${card.action}: ${card.value}` : undefined}
                        className="group flex h-full flex-col rounded-4 border border-[rgba(243,241,236,.1)] bg-[color:var(--color-ink-900)]/70 p-5 backdrop-blur transition duration-400 hover:-translate-y-0.5 hover:border-[var(--accent)]/40"
                      >
                        <span className="flex items-center gap-2.5">
                          <span aria-hidden className="grid size-8 place-items-center rounded-full border border-[var(--accent)]/25 bg-[var(--accent)]/8 text-[var(--accent)]">
                            <Icon name={card.icon} size={14} />
                          </span>
                          <span className="font-mono text-[0.5625rem] uppercase tracking-[0.18em] text-fg-dim">{card.label}</span>
                        </span>
                        <span className="mt-3.5 block text-[0.9375rem] font-medium leading-snug text-fg">{card.value}</span>
                        <span className="mt-1.5 block text-[0.8125rem] leading-relaxed text-fg-dim">{card.note}</span>
                        {card.action ? (
                          <span className="mt-4 inline-flex items-center gap-1.5 font-mono text-[0.5625rem] uppercase tracking-[0.16em] text-[var(--accent)]">
                            {card.action}
                            <Icon name="arrow-right" size={12} className="transition group-hover:translate-x-0.5" />
                          </span>
                        ) : null}
                      </a>
                    </FadeIn>
                  ))}
                </ul>
              </div>

              <FadeIn delay={120} className="min-w-0">
                <div className="rounded-4 border border-[rgba(243,241,236,.09)] bg-[color:var(--color-ink-950)]/70 p-6 backdrop-blur md:p-8">
                  <MediaInquiryForm
                    config={formConfig}
                    action="/api/forms"
                    token={formToken}
                    successMessage={successMessage}
                    submitNote="Goes straight to the studio. No lists, no tracking pixels."
                  />
                </div>
              </FadeIn>
            </div>
          </div>
        </Section>
      </main>

      <SiteFooter
        surface="media"
        wordmark={{ primary: brandName, secondary: 'Media Portfolio' }}
        nav={ctx.nav.media_footer ?? []}
        socials={socials}
        description={footerNote}
        contact={{
          email: studio.email,
          phone: studio.phone,
          whatsappHref: whatsappHref,
          whatsappLabel: studio.whatsappLabel,
          location: studio.location,
          responseTime: (contact.responseTime as string) ?? null,
        }}
        cta={{
          headline: 'Tell me what you are making.',
          body: 'Shoots, edits, coverage and campaigns, with a clear process from brief to final delivery.',
          primary: { label: 'Start a Project', href: '#contact' },
        }}
        legal={{
          privacyHref: '/security',
          termsHref: '/security#working-terms',
          brandLine: String(settings['brand.legal_name'] ?? '').trim() || brandName,
          tagline: MEDIA_STUDIO.statement,
        }}
      />

      {/* One persistent control only: the back-to-top button, which appears after the hero.
          The floating WhatsApp / email / call rail and the mobile action band are gone; every
          contact route they offered is still here in the contact section, in the header CTA
          and in the footer. */}
      <MediaBackToTop />
      <SiteBehaviours division="media" />
      <LightboxHost />
    </div>
  );
}
