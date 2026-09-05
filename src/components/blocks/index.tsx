/**
 * Section renderer registry.
 *
 * One switch maps every CMS `content_block.block_type` to its React renderer.
 * Block renderers are async server components: they ask `lib/cms/content` for
 * exactly the data the section is configured to show, so an editor changing a
 * limit, a category or a video list changes the public page without a deploy.
 *
 * An unknown or unwired type renders an honest note in development and nothing
 * at all in production — a page must never blank out because of one section.
 */
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Section';
import { Icon } from '@/components/ui/Icon';
import { blockProps } from '@/lib/cms/blocks';
import {
  activeResume,
  assetsByIds,
  certifications,
  crossDisciplineWork,
  experienceTimeline,
  featuredVideos,
  galleriesFor,
  postsFor,
  pricingFor,
  projectCards,
  projectCountFor,
  servicesFor,
  siteContext,
  skillsGrouped,
  teamFor,
  testimonialsFor,
  videosByIds,
} from '@/lib/cms/content';
import { getSetting } from '@/lib/cms/settings';
import type { AssetRef, SectionData } from '@/lib/types/content';
import { HeroBrand, HeroMedia, HeroTech, PageHeader } from './heroes';
import { AboutSplit, LogoMarquee, ProjectGrid, ServiceGrid, Statement, StatsBand, TwoWorlds, RichText } from './catalog';
import { BlogPreview, Faq, PhotoStrip, ProcessTimeline, TeamGrid, ToolsGrid, VideoWall } from './media';
import { Certifications, PricingTable, ResumeBlock, TestimonialWall } from './trust';
import { ExperienceTimeline, SkillMatrix } from './tech';
import { ContactBlock } from './contact';
import { idsOf, type Division } from './helpers';

export type { Division };

export interface BlockScope {
  /** Which experience the page belongs to — drives division-scoped queries. */
  division: Division;
  /** The CMS page slug, used for "related" fallbacks and analytics. */
  pageSlug: string;
}

export async function Blocks({ blocks, scope }: { blocks: SectionData[]; scope: BlockScope }) {
  if (!blocks.length) return null;
  return (
    <>
      {blocks.map((block, index) => (
        <Block key={`${block.id}-${index}`} block={block} scope={scope} index={index} />
      ))}
    </>
  );
}

export async function Block({ block, scope, index = 0 }: { block: SectionData; scope: BlockScope; index?: number }) {
  const props = blockProps(block.type, block.props);
  const division = ((props.division as Division) ?? scope.division) as Division;
  /** `all` is the loader convention for "do not filter by division". */
  const scopeArg = division === 'main' ? 'all' : division;

  switch (block.type) {
    /* ── heroes ─────────────────────────────────────────────────────────── */
    case 'hero_brand': {
      const [site, media, tech] = await Promise.all([
        siteContext(),
        projectCountFor('media'),
        projectCountFor('tech'),
      ]);
      const ids = idsOf(props.videoIds);
      const videos = ids.length ? await videosByIds(ids) : await featuredVideos({ limit: 6 });
      const work = await crossDisciplineWork(4).catch(() => [] as Awaited<ReturnType<typeof crossDisciplineWork>>);
      const withVideos = videos.length ? work.map((card, i) => (card.videos.length ? card : { ...card, videos: videos[i] ? [videos[i]] : card.videos })) : work;
      return (
        <HeroBrand
          block={block}
          settings={site.settings}
          work={withVideos}
          counts={{ media, tech }}
        />
      );
    }
    case 'hero_media': {
      const ids = idsOf(props.videoIds);
      const [site, videos] = await Promise.all([
        siteContext(),
        ids.length ? videosByIds(ids) : featuredVideos({ limit: 8 }),
      ]);
      return <HeroMedia block={block} videos={videos} settings={site.settings} />;
    }
    case 'hero_tech': {
      const [site, groups, resume] = await Promise.all([siteContext(), skillsGrouped(), activeResume()]);
      const portraitAsset = block.media.find((item) => item.asset)?.asset ?? null;
      const topSkills = groups.flatMap((g) => g.skills).slice(0, 5).map((skill) => skill.name);
      return (
        <HeroTech
          block={block}
          settings={site.settings}
          portrait={portraitAsset ? { url: portraitAsset.url, alt: portraitAsset.alt } : null}
          stats={await techStats(site.settings)}
          resumeAvailable={resume.available}
          topSkills={topSkills}
        />
      );
    }

    /* ── narrative ──────────────────────────────────────────────────────── */
    case 'two_worlds':
      return <TwoWorlds block={block} />;
    case 'statement':
      return <Statement block={block} index={index} />;
    case 'rich_text': {
      const site = await siteContext();
      return <RichText block={block} settings={site.settings} />;
    }
    case 'about_split': {
      const site = await siteContext();
      const portrait = block.media.find((item) => item.asset)?.asset ?? null;
      return (
        <AboutSplit
          block={block}
          portrait={portrait}
          name={String(site.settings['founder.name'] ?? '') || undefined}
          socials={site.social}
        />
      );
    }

    /* ── catalogues ─────────────────────────────────────────────────────── */
    case 'service_grid':
      return <ServiceGrid block={block} services={await servicesFor(division === 'main' ? ['media', 'tech'] : [division])} />;
    case 'project_grid':
      return <ProjectGrid block={block} />;
    case 'video_wall': {
      const ids = idsOf(props.videoIds);
      const videos = ids.length ? await videosByIds(ids) : await featuredVideos({ limit: Number(props.limit ?? 8), form: props.form ? String(props.form) : null });
      return <VideoWall block={block} videos={videos} />;
    }
    case 'photo_strip': {
      const ids = idsOf(props.images);
      let images: AssetRef[] = [];
      let gallery = null as Awaited<ReturnType<typeof galleriesFor>>[number] | null;
      if (ids.length) {
        const map = await assetsByIds(ids);
        images = ids.map((id) => map[id]).filter(Boolean);
      } else if (props.gallerySlug) {
        const slug = String(props.gallerySlug);
        const list = await galleriesFor(division === 'tech' ? 'tech' : 'media', { limit: 12 });
        gallery = (slug === 'all' ? list[0] : list.find((item) => item.slug === slug)) ?? null;
      } else {
        const list = await galleriesFor(division === 'tech' ? 'tech' : 'media', { limit: 1 });
        gallery = list[0] ?? null;
      }
      return <PhotoStrip block={block} gallery={gallery} images={images} />;
    }
    case 'process_timeline': {
      let steps: { title: string; description?: string | null; duration?: string | null }[] = [];
      if (props.serviceSlug) {
        const services = await servicesFor(['media', 'tech']);
        steps = services.find((service) => service.slug === String(props.serviceSlug))?.process ?? [];
      }
      return <ProcessTimeline block={block} steps={steps} />;
    }
    case 'tools_grid': {
      const groups = await skillsGrouped();
      const aggregated = Array.from(
        new Set(
          groups
            .flatMap((group) => group.skills)
            .map((skill) => skill.evidence ?? '')
            .filter((value) => value.length > 0 && value.length < 40),
        ),
      );
      return <ToolsGrid block={block} aggregated={aggregated} />;
    }

    /* ── trust ──────────────────────────────────────────────────────────── */
    case 'testimonial_wall':
      return <TestimonialWall block={block} items={await testimonialsFor(scopeArg, Number(props.limit ?? 6))} />;
    case 'pricing_table': {
      const packages = await pricingFor(division === 'tech' ? 'tech' : 'media');
      const note = await getSetting('pricing.disclaimer').catch(() => null);
      return <PricingTable block={block} packages={packages} note={props.note ? String(props.note) : note} />;
    }
    case 'certifications':
      return <Certifications block={block} items={await certifications()} />;
    case 'resume_block':
      return <ResumeBlock block={block} resume={await activeResume()} />;

    /* ── tech detail ────────────────────────────────────────────────────── */
    case 'skill_matrix':
      return <SkillMatrix block={block} groups={await skillsGrouped()} />;
    case 'experience_timeline':
      return <ExperienceTimeline block={block} items={await experienceTimeline()} />;
    case 'team_grid':
      return <TeamGrid block={block} team={await teamFor(scopeArg)} />;

    /* ── content ────────────────────────────────────────────────────────── */
    case 'blog_preview': {
      const posts = await postsFor({ limit: Number(props.limit ?? 3) });
      return <BlogPreview block={block} posts={posts.posts} allHref={props.allHref ? String(props.allHref) : '/blog'} />;
    }
    case 'faq':
      return <Faq block={block} />;
    case 'contact_block':
      return <ContactBlock block={block} division={division} />;

    /* ── page furniture ─────────────────────────────────────────────────── */
    case 'logo_marquee':
      return <LogoMarquee block={block} />;
    case 'stats_band': {
      if (props.autoCounts !== true) return <StatsBand block={block} />;
      const [media, tech, posts] = await Promise.all([projectCountFor('media'), projectCountFor('tech'), postsFor({ limit: 1 })]);
      return <StatsBand block={block} autoCounts={{ media, tech, posts: posts.total }} />;
    }
    case 'page_header':
      return (
        <PageHeader
          block={block}
          surface={division === 'tech' ? 'tech' : division === 'media' ? 'media' : 'main'}
          eyebrow={block.eyebrow ?? ''}
          lede={block.body}
        />
      );
    default:
      return process.env.NODE_ENV === 'production' ? null : <UnrenderedBlock type={block.type} label={block.name} />;
  }
}

async function techStats(settings: Record<string, string | number | boolean | null>) {
  const rows: { label: string; value: string; note?: string }[] = [];
  const explicit = (settings['tech.hero_stats'] as string) ?? '';
  if (explicit.trim()) {
    for (const line of explicit.split('\n').slice(0, 4)) {
      const [label, value, note] = line.split('|').map((part) => part.trim());
      if (label && value) rows.push({ label, value, note: note || undefined });
    }
    return rows;
  }
  const [projects, since] = await Promise.all([projectCountFor('tech'), getSetting<number>('tech.experience_since').catch(() => null)]);
  const years = since && since > 1990 ? new Date().getFullYear() - Number(since) : 0;
  if (years > 0) rows.push({ label: 'Years building', value: `${years}`, note: `since ${since}` });
  if (projects) rows.push({ label: 'Shipped projects', value: `${projects}` });
  return rows;
}

function UnrenderedBlock({ type, label }: { type: string; label: string }) {
  return (
    <EmptyState
      compact
      icon="alert"
      title={`Section “${label || type}” has no renderer`}
      body={`block_type "${type}" is registered in the CMS but not wired into src/components/blocks/index.tsx.`}
      className="mx-auto my-10 max-w-xl"
    />
  );
}

/* ── page-level helpers shared by the public routes ───────────────────────── */

export function EmptyPage({ title, body, href = '/', cta = 'Back home' }: { title: string; body: string; href?: string; cta?: string }) {
  return (
    <div className="container-page py-28">
      <div className="mx-auto max-w-xl text-center">
        <Icon name="info" size={22} className="mx-auto text-fg-dim" />
        <h1 className="display-2 mt-6">{title}</h1>
        <p className="lede mt-4">{body}</p>
        <div className="mt-8 flex justify-center gap-3">
          <Button href={href} size="sm" iconEnd="arrow-right">
            {cta}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Count + filter bar shared by /work, /media/work, /tech/projects, /blog. */
export function CatalogToolbar({
  facets,
  active,
  basePath,
  total,
  q,
}: {
  facets: { key: 'category' | 'form'; label: string; value: string; count: number }[];
  active: Record<string, string | null>;
  basePath: string;
  total: number;
  q?: string;
}) {
  const groups = Array.from(new Set(facets.map((facet) => facet.key)));
  const hrefFor = (key: string, value: string | null) => {
    const params = new URLSearchParams();
    for (const group of groups) {
      const next = group === key ? value : active[group] ?? null;
      if (next) params.set(group, next);
    }
    if (q) params.set('q', q);
    const query = params.toString();
    return `${basePath}${query ? `?${query}` : ''}`;
  };
  return (
    <div className="container-page">
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-[rgba(243,241,236,.09)] pb-5">
        {groups.map((group) => {
          const options = facets.filter((facet) => facet.key === group);
          if (options.length < 2) return null;
          return (
            <nav key={group} className="min-w-0" aria-label={`${group} filters`}>
              <p className="font-mono text-[0.5625rem] uppercase tracking-[0.16em] text-fg-dim">{group === 'category' ? 'Category' : 'Format'}</p>
              <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
                <li>
                  <Link href={hrefFor(group, null)} className={cxText(!active[group])}>
                    All {options.reduce((sum, option) => sum + option.count, 0)}
                  </Link>
                </li>
                {options.map((option) => (
                  <li key={option.value}>
                    <Link href={hrefFor(option.key, option.value)} className={cxText(active[option.key] === option.value)}>
                      {option.label} <span className="tnum opacity-55">{option.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          );
        })}
        <p className="tnum ml-auto shrink-0 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-fg-dim">
          {total} shown
        </p>
      </div>
    </div>
  );
}

function cxText(active: boolean) {
  return active
    ? 'text-[var(--accent)] transition'
    : 'text-fg-muted transition hover:text-fg';
}

