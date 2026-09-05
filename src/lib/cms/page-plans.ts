/**
 * Fallback section plans for every public route.
 *
 * A CMS page (Pages → Layout) always wins: the moment a page exists, its own
 * ordered sections replace the plan below. The plan is deliberately *structural*
 * — which sections appear, for which division, with which limits — and carries no
 * prose, so nothing here competes with real copy from the CMS.
 */
import type { SectionData } from '@/lib/types/content';

/** Kept as a string on purpose: the registry in `blocks.ts` is the source of
 *  truth, and `tests/blocks.test.ts` asserts every plan type resolves. */
type BlockType = string;

export interface PlanStep {
  type: BlockType;
  props?: Record<string, unknown>;
}

const block = (step: PlanStep, index: number): SectionData => ({
  id: `plan-${step.type}-${index}`,
  type: step.type,
  name: step.type,
  eyebrow: null,
  headline: null,
  body: null,
  props: step.props ?? {},
  media: [],
  links: [],
  placement: 'default',
  variant: null,
  overrides: {},
  isSample: true,
});

export const PAGE_PLANS: Record<string, PlanStep[]> = {
  home: [
    { type: 'hero_brand' },
    { type: 'two_worlds' },
    { type: 'stats_band', props: { autoCounts: true } },
    { type: 'project_grid', props: { division: 'all', limit: 6, layout: 'mosaic', ctaLabel: 'See all work', ctaHref: '/work' } },
    { type: 'service_grid', props: { division: 'main', limit: 6 } },
    { type: 'statement', props: { variant: 'split' } },
    { type: 'video_wall', props: { layout: 'strip', limit: 6 } },
    { type: 'testimonial_wall', props: { division: 'all', limit: 3 } },
    { type: 'logo_marquee' },
    { type: 'contact_block', props: { variant: 'main' } },
  ],
  about: [
    { type: 'about_split', props: { division: 'main' } },
    { type: 'stats_band', props: { autoCounts: true } },
    { type: 'two_worlds' },
    { type: 'team_grid', props: { division: 'main' } },
    { type: 'statement' },
    { type: 'contact_block', props: { variant: 'main' } },
  ],
  services: [
    { type: 'service_grid', props: { division: 'main', limit: 12 } },
    { type: 'process_timeline', props: {} },
    { type: 'statement' },
    { type: 'contact_block', props: { variant: 'main' } },
  ],
  work: [{ type: 'project_grid', props: { division: 'all', limit: 12, layout: 'grid' } }],
  team: [{ type: 'team_grid', props: { division: 'all' } }, { type: 'contact_block', props: { variant: 'main' } }],
  blog: [],
  security: [
    { type: 'rich_text', props: { source: 'setting', settingKey: 'legal.summary', width: 'default' } },
    { type: 'rich_text', props: { source: 'setting', settingKey: 'legal.collected' } },
    { type: 'rich_text', props: { source: 'setting', settingKey: 'legal.not_collected' } },
    { type: 'rich_text', props: { source: 'setting', settingKey: 'legal.practices' } },
    { type: 'rich_text', props: { source: 'setting', settingKey: 'legal.rights' } },
    { type: 'rich_text', props: { source: 'setting', settingKey: 'legal.terms' } },
  ],
  contact: [{ type: 'contact_block', props: { variant: 'main' } }],

  // ── media portfolio ──────────────────────────────────────────────────────
  media: [
    { type: 'hero_media' },
    { type: 'video_wall', props: { layout: 'wall', limit: 6 } },
    { type: 'project_grid', props: { division: 'media', limit: 6, layout: 'mosaic', ctaLabel: 'All work', ctaHref: '/media/work' } },
    { type: 'two_worlds', props: {} },
    { type: 'service_grid', props: { division: 'media', limit: 6 } },
    { type: 'photo_strip', props: { layout: 'strip' } },
    { type: 'stats_band', props: { autoCounts: true } },
    { type: 'testimonial_wall', props: { division: 'media', limit: 3 } },
    { type: 'contact_block', props: { variant: 'media' } },
  ],
  'media/work': [{ type: 'project_grid', props: { division: 'media', limit: 12 } }],
  'media/work/[slug]': [
    { type: 'project_grid', props: { division: 'media', limit: 3, layout: 'grid', ctaLabel: 'More work', ctaHref: '/media/work' } },
  ],
  'media/services': [
    { type: 'service_grid', props: { division: 'media', limit: 12 } },
    { type: 'process_timeline', props: {} },
    { type: 'contact_block', props: { variant: 'media' } },
  ],
  'media/about': [
    { type: 'about_split', props: { division: 'media' } },
    { type: 'statement', props: { variant: 'split' } },
    { type: 'photo_strip', props: { layout: 'grid' } },
    { type: 'contact_block', props: { variant: 'media' } },
  ],
  'media/pricing': [
    { type: 'pricing_table', props: { division: 'media' } },
    { type: 'statement' },
    { type: 'contact_block', props: { variant: 'media' } },
  ],
  'media/contact': [{ type: 'contact_block', props: { variant: 'media' } }],

  // ── tech portfolio ───────────────────────────────────────────────────────
  tech: [
    { type: 'hero_tech' },
    { type: 'skill_matrix', props: { layout: 'matrix', limit: 18 } },
    { type: 'project_grid', props: { division: 'tech', limit: 3, layout: 'wide', ctaLabel: 'All projects', ctaHref: '/tech/projects' } },
    { type: 'service_grid', props: { division: 'tech', limit: 4 } },
    { type: 'experience_timeline', props: { limit: 3 } },
    { type: 'tools_grid', props: { layout: 'chips' } },
    { type: 'testimonial_wall', props: { division: 'tech', limit: 3 } },
    { type: 'certifications', props: {} },
    { type: 'contact_block', props: { variant: 'tech' } },
  ],
  'tech/about': [
    { type: 'about_split', props: { division: 'tech' } },
    { type: 'statement', props: { variant: 'split' } },
    { type: 'experience_timeline', props: { limit: 12 } },
    { type: 'certifications', props: {} },
    { type: 'contact_block', props: { variant: 'tech' } },
  ],
  'tech/skills': [
    { type: 'skill_matrix', props: { layout: 'bars', limit: 40, showEvidence: true } },
    { type: 'tools_grid', props: { layout: 'grid' } },
    { type: 'certifications', props: {} },
    { type: 'contact_block', props: { variant: 'tech' } },
  ],
  'tech/services': [
    { type: 'service_grid', props: { division: 'tech', limit: 12 } },
    { type: 'process_timeline', props: {} },
    { type: 'statement' },
    { type: 'contact_block', props: { variant: 'tech' } },
  ],
  'tech/projects': [{ type: 'project_grid', props: { division: 'tech', limit: 12 } }],
  'tech/projects/[slug]': [
    { type: 'project_grid', props: { division: 'tech', limit: 2, ctaLabel: 'All projects', ctaHref: '/tech/projects' } },
  ],
  'tech/experience': [
    { type: 'experience_timeline', props: { limit: 24 } },
    { type: 'contact_block', props: { variant: 'tech' } },
  ],
  'tech/testimonials': [
    { type: 'testimonial_wall', props: { division: 'tech', limit: 12 } },
    { type: 'contact_block', props: { variant: 'tech' } },
  ],
  'tech/resume': [{ type: 'resume_block', props: {} }],
  'tech/contact': [{ type: 'contact_block', props: { variant: 'tech' } }],
};

export function planFor(slug: string): SectionData[] {
  const steps = PAGE_PLANS[slug];
  if (!steps) return [];
  return steps.map((step, index) => block(step, index));
}
