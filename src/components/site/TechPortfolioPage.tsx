/**
 * Single-page tech portfolio — Covenant Nsikan.
 *
 * Hero → About → Skills → Services → Portfolio → Experience → Testimonials →
 * Contact → Resume — one continuous scroll, modelled on the reference
 * portfolio.alphexdigitalz.pro layout.
 */
import Link from 'next/link';
import Image from 'next/image';
import { Icon } from '@/components/ui/Icon';
import { Section, SectionHeader, Eyebrow } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import { FadeIn, MaskReveal, Tilt, CountUp, SpotlightCard, Parallax } from '@/components/ui/Motion';
import { TechAnchorNav } from './TechAnchorNav';
import { BackToTop } from '@/components/ui/BackToTop';
import { TechFooter } from './TechFooter';
import { Typewriter } from '@/components/ui/Typewriter';
import { ScrollProgress } from './SiteFooter';
import { SiteHeader } from './SiteHeader';
import { SiteBehaviours } from '@/components/ui/SiteBehaviours';
import { LightboxHost } from '@/components/ui/Lightbox';
import {
  activeResume,
  projectCards,
  siteContext,
} from '@/lib/cms/content';
import { stripHtml, truncate } from '@/lib/utils/text';
import type { ProjectCard, SocialItem, ResumeInfo } from '@/lib/types/content';

export const revalidate = 60;

export async function generateMetadata() {
  return {
    title: 'Covenant Nsikan — Full Stack Developer, GRC Analyst & Digital Technology Consultant',
    description:
      'Full Stack Developer, GRC Analyst, and Digital Technology Consultant crafting exceptional digital experiences — web platforms, UI/UX, cloud, cybersecurity, governance & compliance.',
  };
}

const ANCHORS = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'skills', label: 'Skills' },
  { id: 'services', label: 'Services' },
  { id: 'projects', label: 'Portfolio' },
  { id: 'experience', label: 'Experience' },
  { id: 'testimonials', label: 'Testimonials' },
  { id: 'contact', label: 'Contact' },
  { id: 'resume', label: 'Resume' },
];

/* ── curated content ──────────────────────────────────────────────────── */

const NAME = 'Covenant Nsikan';
const ROLE_LINE = 'Full Stack Developer | GRC Analyst | UI/UX Designer | Digital Technology Consultant | Frontend Developer | Backend Developer | Cybersecurity Analyst';
const TYPER_PHRASES = [
  'Full Stack Developer',
  'GRC Analyst',
  'UI/UX Designer',
  'Digital Technology Consultant',
  'Frontend Developer',
  'Backend Developer',
  'Cybersecurity Analyst',
];
const INTRO =
  'A versatile Full Stack Developer, GRC Analyst, and Digital Technology Consultant with years of experience crafting exceptional digital experiences — from production web platforms to governance, risk & compliance programs that keep organisations honest.';
const LOCATION = 'Lagos / Akwa Ibom, Nigeria';
const PHONE = '09064095620';
const PHONE_TEL = '+2349064095620';
const EMAIL = 'covenantmedia0015@gmail.com';
const WHATSAPP = 'https://wa.me/2349064095620';
const AVAILABILITY = 'Available: 24/7';

// User-uploaded portraits, served at fixed paths.
const PORTRAIT_1 = '/uploads/portraits/portrait-1.png'; // hero (collared shirt — file_...8b84)
const PORTRAIT_2 = '/uploads/portraits/portrait-2.png'; // about (white t-shirt — file_...ec00)

const HERO_STATS = [
  { label: 'Years of Experience', value: 8, suffix: '+' },
  { label: 'Completed Projects', value: 60, suffix: '+' },
  { label: 'Happy Clients', value: 40, suffix: '+' },
  { label: 'Client Satisfaction', value: 98, suffix: '%' },
];

const ABOUT_INTRO = 'A passionate technologist and strategic builder dedicated to delivering impactful digital solutions with clean craft and honest scope.';
const ABOUT_PARAGRAPH_1 =
  'With a strong foundation in software engineering, UI/UX, cybersecurity, and governance, risk & compliance, I bring a rare blend of technical depth and operational discipline to every project — building platforms that ship, scale, and stay compliant.';
const ABOUT_PARAGRAPH_2 =
  'Every year I challenge myself to get sharper: cleaner code, tighter risk posture, better-designed interfaces, and clearer communication with the people paying for the work. Growth is a continuous journey, and I remain committed to becoming a better version of myself with each passing day.';

const CAPABILITIES = [
  'Full Stack Web Development',
  'UI/UX Design',
  'GRC Analysis & Compliance',
  'Cloud Deployment & DevOps',
  'Cybersecurity & Audits',
  'IT Consulting & Support',
];

const SKILL_GROUPS: Array<{ label: string; items: string[] }> = [
  { label: 'Frontend', items: ['HTML5', 'CSS3', 'JavaScript', 'TypeScript', 'React', 'Next.js', 'TailwindCSS', 'BootStrap'] },
  { label: 'Backend', items: ['Node.js', 'Express', 'GO', 'Python', 'Java'] },
  { label: 'Databases', items: ['MongoDB', 'MySQL', 'PostgreSQL', 'Firebase'] },
  { label: 'UI/UX', items: ['Figma', 'Wireframing', 'Prototyping', 'Usability Testing'] },
  { label: 'GRC & Security', items: ['GRC Analysis', 'Risk Assessment', 'Compliance Frameworks', 'Audit', 'SOX / ISO 27001', 'Cybersecurity'] },
];

const SERVICES: Array<{ title: string; desc: string; icon: string }> = [
  { title: 'Full Stack Development', desc: 'End-to-end web applications with modern frameworks and battle-tested practices — database to pixel.', icon: 'code' },
  { title: 'Frontend Development', desc: 'Pixel-perfect, responsive interfaces with smooth animations and exceptional UX on every device.', icon: 'layout' },
  { title: 'Backend Development', desc: 'Scalable, secure server-side architecture with robust API design, idempotency and audit logs.', icon: 'server' },
  { title: 'Website Design', desc: 'Stunning conversion-focused websites that elevate brand identity — designed in the same codebase they ship in.', icon: 'palette' },
  { title: 'UI/UX Design', desc: 'User-centred design from wireframes to prototypes, accessibility audits, and usability testing with real users.', icon: 'grid' },
  { title: 'REST API Development', desc: 'Well-documented, versioned REST APIs with auth, rate limits, idempotency keys and SDKs.', icon: 'link' },
  { title: 'Database Design', desc: 'Optimised schemas, indexing, migrations, backup/restore drills and query tuning.', icon: 'database' },
  { title: 'Cloud Deployment', desc: 'Reliable AWS infrastructure with CI/CD, monitoring, paging and cost alarms before bill shock.', icon: 'rocket' },
  { title: 'Cybersecurity', desc: 'Audits, vulnerability assessments, threat modelling and protection strategies prioritised by real risk.', icon: 'shield' },
  { title: 'GRC Analysis', desc: 'Governance, Risk & Compliance — policy frameworks, risk registers, control mapping, SOX/ISO 27001/NDPR readiness, audit support.', icon: 'layers' },
  { title: 'IT Support', desc: 'Professional technical support and IT consulting — workstations, email, SaaS procurement, and a phone that gets answered.', icon: 'settings' },
  { title: 'Networking', desc: 'Secure network configuration, VLANs, firewalls, Wi-Fi, VPNs and documentation your next IT person can follow.', icon: 'shield' },
  { title: 'Digital Consulting', desc: 'Strategic roadmaps, build-vs-buy, vendor evaluation, hiring plans and second opinions on architecture decisions.', icon: 'book' },
];

const EXPERIENCE: Array<{ range: string; role: string; org: string; summary: string; tags: string[] }> = [
  { range: 'Present', role: 'Web Developer & IT Consultant', org: 'NAAKISS Worldwide', summary: 'Building and maintaining the organisation\u2019s web presence, internal tooling, IT operations and digital transformation roadmap.', tags: ['Web', 'Consulting', 'Support', 'Cloud'] },
  { range: 'Jan 2025 — Present', role: 'Backend Developer', org: 'PalKeeper', summary: 'Backend developer for the PalKeeper application — API design, database schema, auth, payments and cloud deployment.', tags: ['Node', 'Postgres', 'REST', 'AWS'] },
  { range: '2021 — Present', role: 'Senior Full Stack Developer', org: 'Covenant Media', summary: 'Lead engineer and founder — full-stack product development, security reviews, design systems and cloud deployments for client engagements across fintech, logistics and media.', tags: ['TypeScript', 'Next.js', 'Node', 'Postgres', 'AWS', 'Security'] },
  { range: '2018 — 2021', role: 'Freelance Developer', org: 'Independent', summary: 'Freelance web development for local businesses — websites, small internal tools, and IT support while completing my degree.', tags: ['Development', 'Web', 'Client work'] },
];

const TESTIMONIALS: Array<{ quote: string; name: string; title: string }> = [
  { quote: 'Covenant is one of the most technically solid developers I have worked with. Clean code, clear communication, and he ships when he says he will.', name: 'Uko Uko', title: 'CEO, PalKeeper' },
  { quote: 'From our first call to launch day, Covenant guided us perfectly — no scope creep, no surprises, just a working system our staff actually enjoy using.', name: 'Okon Favour', title: 'CEO, Opulent Media' },
  { quote: 'Exceptional problem-solving skills. Robust code every time, and he leaves the codebase cleaner than he found it.', name: 'Sylvester Iwong', title: 'CTO, TechInnovate' },
  { quote: 'Covenant delivered an exceptional platform that transformed how we run operations. The GRC work alone saved us two audit cycles. I will hire him again.', name: 'Isaac James', title: 'CEO, Glee Industrial Solutionz' },
  { quote: 'Design sensibility that is genuinely world-class. He made our product feel premium long before we had a brand team.', name: 'Joseph Etim', title: "CEO, Maby's Mega Business" },
  { quote: 'Working with Covenant was refreshing — honest scope, tight delivery, and a platform that has not missed a day since launch.', name: 'Abraham James', title: 'CEO, Alphex Digitalz' },
];

export default async function TechPortfolioPage() {
  const [ctx, projectResult, resume] = await Promise.all([
    siteContext(),
    projectCards({ division: 'tech', limit: 6 }),
    activeResume().catch(() => null as ResumeInfo | null),
  ]);
  const projects = projectResult.cards;
  const cmsName = String(ctx.settings['founder.name'] ?? '').trim();
  const name = cmsName && cmsName !== 'Abraham James' ? cmsName : NAME;
  const socials = defaultSocials();
  const wordmark = { primary: name, secondary: 'Technology' };

  // Single Download Resume button: CMS PDF if published, otherwise bundled placeholder.
  const resumePdfUrl = resume?.url || '/uploads/Covenant-Nsikan-Resume.pdf';

  return (
    <div className="theme-tech relative flex min-h-dvh flex-col overflow-x-clip">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:inline-flex focus:h-10 focus:items-center focus:rounded-pill focus:bg-[var(--accent)] focus:px-4 focus:text-sm focus:font-medium focus:text-[var(--accent-ink)]">Skip to content</a>
      <ScrollProgress />
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10" style={{ backgroundImage: 'linear-gradient(to bottom, rgba(127,167,255,0.07), transparent 45%)' }} />
      <div aria-hidden className="grain pointer-events-none fixed inset-0 -z-10 opacity-[0.5]" />

      <SiteHeader surface="tech" homeHref="/tech" wordmark={wordmark} nav={ctx.nav['tech_header'] ?? []} cta={{ label: 'Hire Me', href: '/tech#contact' }} socials={socials} />

      <main id="main" className="flex-1">
        <TechAnchorNav anchors={ANCHORS} />

        {/* ── HERO ───────────────────────────────────────────────────
            Desktop (reference): LEFT text column stacked Hello,I'm → name
            (big) → role (smaller) → intro → CTAs → socials. RIGHT portrait.
            Top Availability / Location pills REMOVED per request.

            Mobile: portrait first (top, centered), then Hello,I'm → name →
            role → intro → Hire Me / View Projects / Download Resume (all
            visible above the fold) → social icons. No location pill.
        ─────────────────────────────────────────────────────────── */}
        <section id="home" data-hero className="relative isolate overflow-hidden pt-16 pb-12 md:pt-24 md:pb-16 lg:pt-28 lg:pb-20">
          <div aria-hidden className="tech-grid pointer-events-none absolute inset-x-0 -top-24 -z-10 h-[120vh] opacity-70" />
          <div aria-hidden className="pointer-events-none absolute -right-24 top-8 -z-10 h-80 w-80 rounded-full bg-[var(--accent)]/15 blur-[100px]" />
          <div aria-hidden className="pointer-events-none absolute -left-24 bottom-0 -z-10 h-80 w-80 rounded-full bg-[var(--accent)]/5 blur-[100px]" />
          <svg aria-hidden className="pointer-events-none absolute right-6 top-28 hidden h-64 w-64 text-[var(--accent)]/20 lg:block" viewBox="0 0 200 200" fill="none">
            <circle cx="100" cy="100" r="96" stroke="currentColor" strokeDasharray="2 6" />
            <circle cx="100" cy="100" r="70" stroke="currentColor" strokeDasharray="1 4" />
            <circle cx="100" cy="100" r="4" fill="currentColor" />
          </svg>

          <div className="container-page">
            <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
              {/* Portrait — mobile DOM-first (top), desktop right column */}
              <div className="min-w-0 lg:col-span-5 lg:col-start-8 lg:order-2">
                <FadeIn delay={200} y={16}>
                  <Tilt max={4}>
                    <SpotlightCard className="mx-auto max-w-[260px] rounded-4 sm:max-w-[300px] lg:max-w-none">
                      <figure className="relative isolate overflow-hidden rounded-4 border border-[rgba(243,241,236,.12)] bg-[color:var(--color-ink-900)] p-2.5 shadow-[var(--shadow-3)]">
                        <span aria-hidden className="absolute left-3 top-3 z-10 size-3 border-l-2 border-t-2 border-[var(--accent)]" />
                        <span aria-hidden className="absolute right-3 top-3 z-10 size-3 border-r-2 border-t-2 border-[var(--accent)]" />
                        <span aria-hidden className="absolute bottom-3 left-3 z-10 size-3 border-b-2 border-l-2 border-[var(--accent)]" />
                        <span aria-hidden className="absolute bottom-3 right-3 z-10 size-3 border-b-2 border-r-2 border-[var(--accent)]" />
                        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-3">
                          <Image src={PORTRAIT_1} alt={`${name} — professional portrait`} fill priority sizes="(max-width:1024px) 75vw, 30vw" className="object-cover object-top transition duration-700 hover:scale-[1.02]" />
                          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[color:var(--color-ink-1000)]/55 via-transparent to-transparent" />
                        </div>
                      </figure>
                    </SpotlightCard>
                  </Tilt>
                </FadeIn>
              </div>

              {/* Text column — centered on mobile, left-aligned on desktop */}
              <div className="min-w-0 text-center lg:col-span-7 lg:col-start-1 lg:order-1 lg:text-left">
                <FadeIn delay={100}>
                  <p className="font-mono text-[0.8125rem] uppercase tracking-[0.22em] text-fg-muted">
                    Hello, I&apos;m
                  </p>
                </FadeIn>

                <MaskReveal
                  as="h1"
                  lines={[name]}
                  className="mt-3 font-display text-[clamp(2.75rem,9vw,5.8rem)] font-medium leading-[0.95] tracking-[-0.04em] lg:mt-4"
                  delay={180}
                />

                <FadeIn delay={400} y={8}>
                  <div className="mt-3 flex items-baseline justify-center gap-2 font-mono text-[0.85rem] font-normal leading-snug tracking-[0.02em] text-[var(--accent)] md:text-[0.95rem] lg:justify-start">
                    <span className="sr-only">{ROLE_LINE}</span>
                    <Typewriter phrases={TYPER_PHRASES} />
                  </div>
                </FadeIn>

                <FadeIn delay={520}>
                  <p className="lede mx-auto mt-5 max-w-xl text-center lg:mx-0 lg:mt-6 lg:max-w-xl lg:text-left">{INTRO}</p>
                </FadeIn>

                <FadeIn delay={640}>
                  <div className="mt-7 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                    <Button href="#contact" size="lg" iconEnd="arrow-right">Hire Me</Button>
                    <Button href="#projects" size="lg" variant="outline">View Projects</Button>
                    <Button href={resumePdfUrl} size="lg" variant="outline" icon="download" download>Download Resume</Button>
                  </div>
                </FadeIn>

                <FadeIn delay={760}>
                  <ul className="mt-7 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                    {socials.map((s) => (
                      <li key={s.url}>
                        <Link href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="group inline-flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(243,241,236,.14)] bg-[rgba(243,241,236,.03)] text-fg-muted transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--accent)]/50 hover:bg-[var(--accent)]/10 hover:text-fg" aria-label={s.label ?? s.network}>
                          <Icon name={s.network} size={15} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </FadeIn>
              </div>
            </div>

            {/* Stats band */}
            <FadeIn delay={200}>
              <dl className="mt-12 grid grid-cols-2 gap-x-6 gap-y-6 rounded-4 border border-[rgba(243,241,236,.09)] bg-[color:var(--color-ink-900)]/50 p-5 backdrop-blur md:mt-14 md:grid-cols-4 md:p-6">
                {HERO_STATS.map((k) => (
                  <div key={k.label} className="relative text-center md:pl-7 md:text-left">
                    <span aria-hidden className="absolute left-0 top-2 hidden size-1.5 rounded-full bg-[var(--accent)] md:block" />
                    <dt className="eyebrow">{k.label}</dt>
                    <dd className="tnum mt-2 flex items-baseline justify-center font-display text-2xl leading-none tracking-[-0.03em] md:justify-start md:text-[2rem]">
                      <CountUp to={k.value} />
                      <span className="ml-0.5 text-[var(--accent)]">{k.suffix}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </FadeIn>

            {/* marquee */}
            <FadeIn delay={900}>
              <div className="relative mt-8 overflow-hidden border-y border-[rgba(243,241,236,.08)] py-4">
                <div className="flex animate-marquee gap-3 whitespace-nowrap">
                  {[...STACK, ...STACK].map((s, i) => (
                    <span key={`${s}-${i}`} className="inline-flex items-center gap-2 rounded-pill border border-[rgba(243,241,236,.1)] bg-[rgba(243,241,236,.03)] px-3 py-1 font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-fg-dim">
                      <span aria-hidden className="size-1 rounded-full bg-[var(--accent)]" />{s}
                    </span>
                  ))}
                </div>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ── ABOUT (centered "Crafting Digital Excellence" spanning both cols,
            two equal columns below: portrait LEFT, text+capabilities RIGHT.
            NO stat cards — per request. Matches dkndkmmkmd.PNG reference
            with the 4-stat strip removed. ─────────────────────────── */}
        <Section id="about" tone="raised">
          <div className="container-page">
            {/* Section header centered, spanning both columns */}
            <div className="mx-auto max-w-2xl text-center">
              <Eyebrow center>About Me</Eyebrow>
              <h2 className="display-2 mt-3">Crafting Digital Excellence</h2>
              <p className="lede mt-4">{ABOUT_INTRO}</p>
            </div>

            {/* Two equal columns: portrait left, prose+capabilities right */}
            <div className="mt-12 grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
              <FadeIn className="flex justify-center lg:justify-start">
                <div className="relative w-full max-w-sm overflow-hidden rounded-4 border border-[rgba(243,241,236,.1)] bg-[color:var(--color-ink-900)] p-2">
                  <div className="relative aspect-[4/5] w-full overflow-hidden rounded-3">
                    <Image src={PORTRAIT_2} alt={name} fill sizes="(max-width:1024px) 80vw, 40vw" className="object-cover object-top" />
                    <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[color:var(--color-ink-1000)]/60 via-transparent to-transparent" />
                  </div>
                </div>
              </FadeIn>

              <div className="prose-cm max-w-xl lg:max-w-none">
                <FadeIn><p className="text-[1.0625rem] leading-relaxed text-fg">{ABOUT_PARAGRAPH_1}</p></FadeIn>
                <FadeIn delay={120}><p className="mt-5 text-[1.0625rem] leading-relaxed">{ABOUT_PARAGRAPH_2}</p></FadeIn>

                <FadeIn delay={220}>
                  <ul className="mt-7 grid gap-3 sm:grid-cols-2">
                    {CAPABILITIES.map((b) => (
                      <li key={b} className="flex items-center gap-3 rounded-2 border border-[rgba(243,241,236,.08)] bg-[rgba(243,241,236,.02)] px-3 py-2 text-[0.9rem] text-fg-muted transition hover:border-[var(--accent)]/30 hover:text-fg">
                        <Icon name="check" size={14} className="text-[var(--accent)]" />{b}
                      </li>
                    ))}
                  </ul>
                </FadeIn>

                <FadeIn delay={320}>
                  <p className="mt-8 border-l-2 border-[var(--accent)] pl-4 font-display text-xl italic leading-snug tracking-[-0.01em] text-fg">
                    “Growth is a continuous journey — I remain committed to becoming a better version of myself with each passing day.”
                  </p>
                  <p className="mt-2 pl-4 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-fg-dim">— {name}</p>
                </FadeIn>
              </div>
            </div>
          </div>
        </Section>

        {/* ── SKILLS ───────────────────────────────────────────────── */}
        <Section id="skills">
          <div className="container-page">
            <SectionHeader eyebrow="My Skills" title="Technologies &amp; Expertise" lede="A comprehensive toolkit refined through years of hands-on experience across engineering, design, security, and governance." />
            <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {SKILL_GROUPS.map((group, gi) => (
                <FadeIn key={group.label} delay={gi * 70}>
                  <SpotlightCard className="h-full rounded-4">
                    <div className="flex h-full flex-col rounded-4 border border-[rgba(243,241,236,.09)] bg-[color:var(--color-ink-900)]/60 p-6 backdrop-blur transition hover:border-[var(--accent)]/30">
                      <div className="flex items-baseline justify-between gap-4 border-b border-[rgba(243,241,236,.1)] pb-3">
                        <h3 className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-[var(--accent)]">{group.label}</h3>
                        <span className="tnum font-mono text-[0.625rem] text-fg-dim">{group.items.length}</span>
                      </div>
                      <ul className="mt-5 flex flex-wrap gap-2">
                        {group.items.map((skill) => (
                          <li key={skill} className="inline-flex items-center gap-1.5 rounded-pill border border-[rgba(243,241,236,.1)] bg-[rgba(243,241,236,.03)] px-3 py-1.5 font-mono text-[0.75rem] uppercase tracking-[0.08em] text-fg-muted transition hover:-translate-y-0.5 hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/8 hover:text-fg">
                            {skill}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </SpotlightCard>
                </FadeIn>
              ))}
            </div>
          </div>
        </Section>

        {/* ── SERVICES ──────────────────────────────────────────── */}
        <Section id="services" tone="accent">
          <div className="container-page">
            <SectionHeader eyebrow="Services" title="What I Offer" lede="End-to-end digital and governance services tailored to elevate your brand, harden your systems and keep you compliant." />
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {SERVICES.map((svc, i) => (
                <FadeIn key={svc.title} delay={i * 35}>
                  <SpotlightCard intensity={0.12} className="h-full rounded-4">
                    <article className="group relative flex h-full flex-col rounded-4 border border-[rgba(243,241,236,.09)] bg-[color:var(--color-ink-900)] p-6 transition duration-300 hover:-translate-y-1 hover:border-[var(--accent)]/40 hover:shadow-[0_20px_40px_-20px_rgba(127,167,255,.3)]">
                      <span className="relative grid h-12 w-12 place-items-center rounded-3 border border-[var(--accent)]/25 bg-[var(--accent)]/8 text-[var(--accent)] transition group-hover:bg-[var(--accent)] group-hover:text-[var(--accent-ink)]">
                        <Icon name={svc.icon} size={19} />
                      </span>
                      <h3 className="mt-5 font-display text-[1.075rem] leading-tight tracking-[-0.015em]">{svc.title}</h3>
                      <p className="mt-2.5 flex-1 text-[0.85rem] leading-relaxed text-fg-muted">{svc.desc}</p>
                      <span className="mt-5 inline-flex items-center gap-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-fg-dim transition group-hover:text-[var(--accent)]">
                        Learn more <Icon name="arrow-right" size={11} />
                      </span>
                    </article>
                  </SpotlightCard>
                </FadeIn>
              ))}
            </div>
          </div>
        </Section>

        {/* ── PROJECTS ────────────────────────────────────────── */}
        <Section id="projects">
          <div className="container-page">
            <SectionHeader eyebrow="Portfolio" title="Featured Projects" lede="Explore my work across web applications, governance programs, and digital products." />
            <div className="mt-12 grid gap-6 md:grid-cols-2">
              {projects.slice(0, 6).map((p, i) => (
                <FadeIn key={p.id} delay={i * 60}>
                  <ProjectCardComponent project={p} />
                </FadeIn>
              ))}
              {projects.length === 0 ? (
                <div className="col-span-full rounded-4 border border-dashed border-[rgba(243,241,236,.12)] bg-[color:var(--color-ink-900)]/40 p-10 text-center text-fg-dim">
                  <p className="font-mono text-[0.6875rem] uppercase tracking-[0.14em]">Portfolio coming soon</p>
                  <p className="mt-2 text-fg-muted">Case studies are being prepared. Check GitHub for the latest code.</p>
                </div>
              ) : null}
            </div>
            <div className="mt-10 text-center">
              <Button href="https://github.com/" variant="outline" icon="github">View My GitHub</Button>
            </div>
          </div>
        </Section>

        {/* ── EXPERIENCE ─────────────────────────────────────── */}
        <Section id="experience" tone="raised">
          <div className="container-page">
            <SectionHeader eyebrow="Experience" title="Professional Journey" lede="A timeline of growth, shipping, and the lessons that stick." />
            <Parallax distance={14}>
              <ol className="relative mt-12 space-y-10 border-l-2 border-[rgba(243,241,236,.12)] pl-8 md:pl-12">
                {EXPERIENCE.map((item, i) => (
                  <FadeIn key={`${item.org}-${item.range}`} as="li" delay={i * 60} className="relative">
                    <span aria-hidden className="absolute -left-[42px] top-1.5 grid h-6 w-6 place-items-center rounded-full border-2 border-[var(--accent)] bg-[color:var(--color-ink-900)] md:-left-[50px]">
                      <span className="size-2 rounded-full bg-[var(--accent)] shadow-[0_0_12px_var(--accent)]" />
                    </span>
                    <div className="rounded-4 border border-[rgba(243,241,236,.08)] bg-[color:var(--color-ink-900)]/60 p-6 backdrop-blur transition hover:border-[var(--accent)]/30">
                      <p className="inline-flex items-center gap-2 rounded-pill border border-[var(--accent)]/25 bg-[var(--accent)]/8 px-2.5 py-1 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-[var(--accent)]">
                        <Icon name="calendar" size={11} /> {item.range}
                      </p>
                      <h3 className="mt-3 font-display text-[1.3rem] leading-tight tracking-[-0.02em]">{item.role}</h3>
                      <p className="mt-1 text-[0.95rem] text-[var(--accent)]">{item.org}</p>
                      <p className="mt-3 max-w-2xl text-[0.9375rem] leading-relaxed text-fg-muted">{item.summary}</p>
                      <ul className="mt-4 flex flex-wrap gap-1.5">
                        {item.tags.map((t) => (<li key={t} className="rounded-pill border border-[rgba(243,241,236,.1)] bg-[rgba(243,241,236,.04)] px-2 py-0.5 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-fg-dim">{t}</li>))}
                      </ul>
                    </div>
                  </FadeIn>
                ))}
              </ol>
            </Parallax>
          </div>
        </Section>

        {/* ── TESTIMONIALS ────────────────────────────────── */}
        <Section id="testimonials">
          <div className="container-page">
            <SectionHeader eyebrow="Testimonials" title="What Clients Say" lede="Feedback from clients and collaborators I have had the pleasure of working with." />
            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {TESTIMONIALS.map((t, i) => (
                <FadeIn key={t.name} delay={i * 55}>
                  <SpotlightCard intensity={0.1} className="h-full rounded-4">
                    <figure className="flex h-full flex-col justify-between rounded-4 border border-[rgba(243,241,236,.09)] bg-[color:var(--color-ink-900)] p-6 transition duration-300 hover:-translate-y-1 hover:border-[var(--accent)]/30">
                      <div>
                        <div className="flex items-start justify-between">
                          <Icon name="quote" size={28} className="text-[var(--accent)]/50" />
                          <div className="flex gap-0.5">{Array.from({ length: 5 }).map((_, j) => (<Icon key={j} name="starFilled" size={12} className="text-[var(--accent)]" filled />))}</div>
                        </div>
                        <blockquote className="mt-4 text-[0.95rem] leading-relaxed text-fg">&ldquo;{t.quote}&rdquo;</blockquote>
                      </div>
                      <figcaption className="mt-6 flex items-center gap-3 border-t border-[rgba(243,241,236,.08)] pt-4">
                        <span className="grid size-10 place-items-center rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/8 font-mono text-xs text-[var(--accent)]">
                          {t.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[0.9rem] font-medium text-fg">{t.name}</span>
                          <span className="block truncate text-[0.75rem] text-fg-dim">{t.title}</span>
                        </span>
                      </figcaption>
                    </figure>
                  </SpotlightCard>
                </FadeIn>
              ))}
            </div>
          </div>
        </Section>

        {/* ── CONTACT (matches getintouch.PNG reference): left = heading +
            filled-accent-circle contact tiles, right = form card top-aligned.
            Tiles show label + value just like Covenant's data. ─────── */}
        <Section id="contact" tone="accent">
          <div className="container-page grid gap-10 lg:grid-cols-12 lg:gap-14 lg:items-start">
            <div className="lg:col-span-5">
              <Eyebrow>Get in Touch</Eyebrow>
              <h2 className="display-2 mt-3">Let&apos;s Work Together</h2>
              <p className="lede mt-3 max-w-md">Have a project in mind? I&apos;d love to hear about it.</p>
              <ul className="mt-8 space-y-3.5">
                <ContactInfoTile icon="pin" label="Location" value={LOCATION} />
                <ContactInfoTile icon="phone" label="Phone / WhatsApp" value={PHONE} href={`tel:${PHONE_TEL}`} />
                <ContactInfoTile icon="mail" label="Email" value={EMAIL} href={`mailto:${EMAIL}`} />
                <ContactInfoTile icon="whatsapp" label="WhatsApp" value="Chat on WhatsApp" href={WHATSAPP} external />
                <ContactInfoTile icon="clock" label="Availability" value={AVAILABILITY} />
              </ul>
            </div>

            <FadeIn className="lg:col-span-7">
              <form action="/api/forms" method="post" className="space-y-4 rounded-4 border border-[rgba(243,241,236,.1)] bg-[color:var(--color-ink-900)]/80 p-7 shadow-[var(--shadow-2)] backdrop-blur" data-analytics="form_submit" data-form="tech">
                <input type="hidden" name="form" value="tech" />
                <Field label="Your Full Name" name="name" placeholder="John Doe" required />
                <Field label="Your Email Address" name="email" type="email" placeholder="you@email.com" required />
                <Field label="Subject" name="subject" placeholder="Project inquiry" />
                <label className="block">
                  <span className="mb-1.5 block font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-fg-dim">Your Message</span>
                  <textarea name="message" required rows={6} placeholder="Tell me about your project, timeline and budget..." className="w-full resize-none rounded-2 border border-[rgba(243,241,236,.12)] bg-[color:var(--color-ink-950)]/70 px-4 py-3 text-[0.9375rem] text-fg outline-none transition placeholder:text-fg-dim focus:border-[var(--accent)]/60 focus:bg-[color:var(--color-ink-950)]" />
                </label>
                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                  <label className="flex items-start gap-2 text-[11.5px] text-fg-dim">
                    <input type="checkbox" name="consent" required defaultChecked className="mt-0.5 accent-[var(--accent)]" />
                    I&apos;m okay with my message being stored to receive a reply.
                  </label>
                  <button type="submit" className="group inline-flex items-center gap-2 rounded-pill bg-[var(--accent)] px-6 py-3 text-[0.9375rem] font-medium text-[var(--accent-ink)] transition hover:brightness-[1.08] hover:-translate-y-px">
                    Send Message <Icon name="send" size={14} className="transition group-hover:translate-x-0.5" />
                  </button>
                </div>
              </form>
            </FadeIn>
          </div>
        </Section>

        {/* ── RESUME (centered, single Download Resume outline button,
            rewritten copy). Download Resume matches View Projects style. ─ */}
        <Section id="resume">
          <div className="container-page">
            <FadeIn>
              <div className="relative mx-auto max-w-3xl overflow-hidden rounded-4 border border-[rgba(243,241,236,.1)] bg-gradient-to-br from-[color:var(--color-ink-900)] via-[color:var(--color-ink-900)] to-[var(--accent)]/10 p-8 text-center md:p-12">
                <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[var(--accent)]/20 blur-3xl" />
                <div aria-hidden className="tech-grid pointer-events-none absolute inset-0 opacity-30" />
                <div className="relative flex flex-col items-center gap-4 text-center">
                  <Eyebrow center>Download My Resume</Eyebrow>
                  <h2 className="mt-2 font-display text-[clamp(1.75rem,3.6vw,2.6rem)] leading-[1.05] tracking-[-0.03em]">Let my work do more of the talking.</h2>
                  <p className="mx-auto mt-2 max-w-xl text-[0.95rem] leading-relaxed text-fg-muted">
                    A concise one-page summary of my experience, core skills and highlighted projects. Click below to download the PDF directly.
                  </p>
                  <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row">
                    <Button href={resumePdfUrl} size="lg" variant="outline" icon="download" download>Download Resume (PDF)</Button>
                    <Button href="#contact" size="lg" variant="outline">Hire Me</Button>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </Section>
      </main>

      <TechFooter
        name={name}
        role="Full Stack Developer, GRC Analyst & Digital Technology Consultant crafting premium digital experiences worldwide."
        nav={ctx.nav['tech_footer'] ?? []}
        socials={socials}
        contact={{ email: EMAIL, phone: PHONE, whatsappHref: WHATSAPP, location: LOCATION, responseTime: AVAILABILITY + ' — replies within hours' }}
        ctaLabel="Hire Me"
        ctaHref="#contact"
      />
      <BackToTop />
      <SiteBehaviours division="tech" />
      <LightboxHost />
    </div>
  );
}

/* ── helpers ─────────────────────────────────────────────────────── */

const STACK = ['TypeScript', 'Next.js', 'React', 'Node.js', 'Postgres', 'TailwindCSS', 'AWS', 'Figma', 'GRC', 'Cybersecurity', 'REST APIs'];

function Field({ label, name, type = 'text', placeholder, required }: { label: string; name: string; type?: string; placeholder?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-fg-dim">{label}{required ? ' *' : ''}</span>
      <input name={name} type={type} required={required} placeholder={placeholder} className="w-full rounded-2 border border-[rgba(243,241,236,.12)] bg-[color:var(--color-ink-950)]/70 px-4 py-3 text-[0.9375rem] text-fg outline-none transition placeholder:text-fg-dim focus:border-[var(--accent)]/60 focus:bg-[color:var(--color-ink-950)]" />
    </label>
  );
}

function ContactInfoTile({ icon, label, value, href, external }: { icon: string; label: string; value: string; href?: string; external?: boolean }) {
  // Filled accent circle icons, matching the getintouch.PNG reference.
  const inner = (
    <>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-[var(--accent-ink)] shadow-[0_8px_20px_-10px_var(--accent-glow)]">
        <Icon name={icon} size={17} />
      </span>
      <div className="min-w-0 self-center">
        <p className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-fg-dim">{label}</p>
        <p className="mt-0.5 break-all text-[0.95rem] text-fg-muted transition group-hover:text-fg">{value}</p>
      </div>
    </>
  );
  if (href) {
    return (
      <li>
        <a href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className="group flex items-start gap-3 rounded-2 border border-[rgba(243,241,236,.08)] bg-[rgba(243,241,236,.02)] p-3 transition hover:border-[var(--accent)]/30">{inner}</a>
      </li>
    );
  }
  return <li className="group flex items-start gap-3 rounded-2 border border-[rgba(243,241,236,.08)] bg-[rgba(243,241,236,.02)] p-3 transition hover:border-[var(--accent)]/30">{inner}</li>;
}

function ProjectCardComponent({ project }: { project: ProjectCard }) {
  return (
    <SpotlightCard intensity={0.12} className="h-full rounded-4">
      <Link href={`/tech/projects/${project.slug}`} className="group block h-full overflow-hidden rounded-4 border border-[rgba(243,241,236,.09)] bg-[color:var(--color-ink-900)] transition duration-500 hover:-translate-y-1 hover:border-[var(--accent)]/40 hover:shadow-[0_30px_60px_-30px_rgba(127,167,255,.35)]">
        {project.cover ? (
          <div className="relative aspect-[16/10] w-full overflow-hidden">
            <Image src={project.cover.url} alt={project.cover.alt ?? project.title} fill sizes="(max-width:768px) 92vw, 44vw" className="object-cover transition duration-700 group-hover:scale-[1.05]" unoptimized />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[color:var(--color-ink-1000)]/70 via-transparent to-transparent" />
            <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-pill border border-[rgba(243,241,236,.2)] bg-[color:var(--color-ink-1000)]/60 px-2.5 py-1 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-[color:var(--color-paper)]/80 backdrop-blur">
              <span className="size-1 rounded-full bg-[var(--accent)]" />{project.categoryLabel ?? project.category ?? 'Project'}
            </span>
          </div>
        ) : (
          <div className="relative flex aspect-[16/10] w-full items-center justify-center bg-[color:var(--color-ink-800)]"><Icon name="folder" size={36} className="text-fg-dim/40" /></div>
        )}
        <div className="p-6">
          <h3 className="font-display text-[1.3rem] leading-tight tracking-[-0.02em] transition group-hover:text-[var(--accent)]">{project.title}</h3>
          {project.summary ? <p className="mt-2 text-[0.9rem] leading-relaxed text-fg-muted">{truncate(stripHtml(project.summary), 140)}</p> : null}
          {project.technologies?.length ? (
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {project.technologies.slice(0, 4).map((s) => (<li key={s} className="rounded-pill border border-[rgba(243,241,236,.1)] bg-[rgba(243,241,236,.04)] px-2 py-0.5 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-fg-dim">{s}</li>))}
            </ul>
          ) : null}
          <span className="mt-5 inline-flex items-center gap-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-fg-dim transition group-hover:text-[var(--accent)]">View case study <Icon name="arrow-right" size={11} /></span>
        </div>
      </Link>
    </SpotlightCard>
  );
}

function defaultSocials(): SocialItem[] {
  return [
    { network: 'github', url: 'https://github.com/', label: 'GitHub' } as SocialItem,
    { network: 'linkedin', url: 'https://linkedin.com/', label: 'LinkedIn' } as SocialItem,
    { network: 'x', url: 'https://x.com/', label: 'X' } as SocialItem,
    { network: 'instagram', url: 'https://instagram.com/', label: 'Instagram' } as SocialItem,
    { network: 'whatsapp', url: WHATSAPP, label: 'WhatsApp' } as SocialItem,
    { network: 'mail', url: `mailto:${EMAIL}`, label: 'Email' } as SocialItem,
  ];
}
