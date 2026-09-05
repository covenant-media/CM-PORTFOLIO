/**
 * Section (content block) registry.
 *
 * `headline` / `eyebrow` / `body` / `links` / `media` are real columns on
 * content_block; `props` holds only the per-type query + layout config, which is
 * what lets editors change what a section *shows* without touching code.
 * The public renderer registry mirrors these types 1:1.
 */
import type { FieldDef } from './fields';
import { DIVISION_OPTIONS, MEDIA_CATEGORIES, PORTFOLIO_DIVISION_OPTIONS, VIDEO_FORM_OPTIONS } from './options';

export interface BlockTypeDef {
  type: string;
  label: string;
  description: string;
  surfaces: Array<'main' | 'media' | 'tech'>;
  /** props exposed to the editor (stored in content_block.props) */
  propFields: FieldDef[];
  defaults?: Record<string, unknown>;
  icon: string;
}

const text = (key: string, label: string, extra: Partial<FieldDef> = {}): FieldDef => ({ key, label, type: 'text', ...extra });
const num = (key: string, label: string, extra: Partial<FieldDef> = {}): FieldDef => ({ key, label, type: 'number', width: 'third', ...extra });
const bool = (key: string, label: string, extra: Partial<FieldDef> = {}): FieldDef => ({ key, label, type: 'boolean', width: 'third', ...extra });
const layout = (options: { value: string; label: string }[] = [], key = 'layout'): FieldDef => ({
  key,
  label: 'Layout',
  type: 'select',
  width: 'third',
  default: options[0]?.value ?? 'grid',
  options,
});
const div = (opts: readonly { value: string; label: string }[] = DIVISION_OPTIONS, key = 'division'): FieldDef => ({
  key,
  label: key === 'divisions' ? 'Divisions' : 'Division',
  type: 'select',
  width: 'third',
  options: opts.map((o) => ({ value: o.value, label: o.label })),
});

export const BLOCK_TYPES: BlockTypeDef[] = [
  {
    type: 'hero_brand',
    label: 'Brand hero (two-world)',
    description: 'The homepage opener: headline, brand statement and the two pathways into Media and Tech.',
    surfaces: ['main'],
    icon: 'sparkle',
    propFields: [
      text('statement', 'Statement under headline', { maxLength: 220, help: 'Falls back to the Brand statement in Site settings.' }),
      layout([{ value: 'stacked', label: 'Stacked type' }, { value: 'split', label: 'Split with media' }, { value: 'collage', label: 'Work collage' }], 'variant'),
      bool('showPathways', 'Show Media / Tech pathway cards', { default: true }),
      bool('showStats', 'Show counts', { default: true }),
      bool('marquee', 'Discipline marquee', { default: true }),
    ],
  },
  {
    type: 'hero_media',
    label: 'Media hero (floating videos)',
    description: 'Cinematic hero with drifting, muted preview cards that open a real player on click.',
    surfaces: ['media'],
    icon: 'film',
    propFields: [
      layout([{ value: 'floating', label: 'Floating card wall' }, { value: 'strip', label: 'Horizontal strip' }, { value: 'split', label: 'Split with portrait' }], 'variant'),
      num('limit', 'Preview count', { min: 0, max: 12, default: 6, help: 'Hard cap — previews never auto-play and never all load at once.' }),
      bool('autoDrift', 'Drift animation', { default: true }),
      bool('showCategories', 'Category chips', { default: true }),
      text('durationLabel', 'Overlay label', { maxLength: 40, placeholder: 'Selected work' }),
    ],
  },
  {
    type: 'hero_tech',
    label: 'Tech hero (portrait)',
    description: 'Professional introduction with portrait, positioning and résumé/project CTAs.',
    surfaces: ['tech'],
    icon: 'code',
    propFields: [
      layout([{ value: 'split', label: 'Split with portrait' }, { value: 'statement', label: 'Type-led' }], 'variant'),
      bool('showStatus', 'Availability line', { default: true }),
      bool('showResume', 'Résumé button', { default: true }),
      bool('showStack', 'Stack strip', { default: true }),
      text('greeting', 'Small line above the name', { maxLength: 60, placeholder: 'Uyo · Lagos · Remote' }),
    ],
  },
  {
    type: 'two_worlds',
    label: 'Two worlds — media & tech',
    description: 'The one-screen explanation of the two divisions with direct entry into each.',
    surfaces: ['main', 'media', 'tech'],
    icon: 'layers',
    propFields: [
      text('mediaTitle', 'Media panel title', { default: 'Media', maxLength: 40 }),
      text('mediaBlurb', 'Media blurb', { maxLength: 240, rows: 3 }),
      text('mediaHref', 'Media link', { default: '/media' }),
      text('techTitle', 'Tech panel title', { default: 'Technology', maxLength: 40 }),
      text('techBlurb', 'Tech blurb', { maxLength: 240, rows: 3 }),
      text('techHref', 'Tech link', { default: '/tech' }),
      bool('showCounts', 'Show project counts', { default: true }),
    ],
  },
  {
    type: 'statement',
    label: 'Statement / manifesto',
    description: 'One large idea, quietly typeset. Use for positioning, belief or transition lines.',
    surfaces: ['main', 'media', 'tech'],
    icon: 'quote',
    propFields: [
      text('emphasis', 'Emphasis line', { maxLength: 120, help: 'Optional second line set in accent colour.' }),
      layout([{ value: 'default', label: 'Dark' }, { value: 'paper', label: 'Paper panel' }, { value: 'split', label: 'Two column' }], 'variant'),
      bool('showRule', 'Hairline rules', { default: true }),
    ],
  },
  {
    type: 'service_grid',
    label: 'Service grid',
    description: 'CMS services rendered as cards or an editorial list. Pulls from the Services module.',
    surfaces: ['main', 'media', 'tech'],
    icon: 'briefcase',
    propFields: [
      div([
        { value: 'main', label: 'Brand (main)' },
        { value: 'media', label: 'Media' },
        { value: 'tech', label: 'Tech' },
        { value: 'all', label: 'All divisions' },
      ]),
      num('limit', 'Maximum items', { min: 1, max: 24, default: 8 }),
      layout([{ value: 'grid', label: 'Grid cards' }, { value: 'list', label: 'Editorial list' }, { value: 'stack', label: 'Stacked panels' }]),
      bool('showBullets', 'Show key points', { default: true }),
      bool('showPrice', 'Show pricing note', { default: false }),
      bool('linkToDetail', 'Link to service detail', { default: true }),
    ],
  },
  {
    type: 'project_grid',
    label: 'Work / case-study grid',
    description: 'Projects from either division (or both) with optional filters and video previews.',
    surfaces: ['main', 'media', 'tech'],
    icon: 'grid',
    propFields: [
      div([{ value: 'media', label: 'Media portfolio' }, { value: 'tech', label: 'Tech portfolio' }, { value: 'all', label: 'Both portfolios' }]),
      { key: 'category', label: 'Category', type: 'select', width: 'third', options: MEDIA_CATEGORIES.map((c) => ({ value: c.value, label: c.label })), help: 'Optional filter.' },
      num('limit', 'Items', { min: 1, max: 48, default: 8 }),
      bool('featuredOnly', 'Featured only', { default: false }),
      layout([{ value: 'grid', label: 'Grid' }, { value: 'wide', label: 'Two-up wide' }, { value: 'mosaic', label: 'Mosaic' }, { value: 'list', label: 'Index list' }]),
      bool('showFilters', 'Show filter chips', { default: false }),
      bool('showVideos', 'Show video previews', { default: true }),
      text('ctaLabel', 'Footer link label', { maxLength: 40 }),
      text('ctaHref', 'Footer link href', { maxLength: 120 }),
    ],
  },
  {
    type: 'video_wall',
    label: 'Video wall',
    description: 'Short-form / long-form showcase rail. Poster frames only until interaction.',
    surfaces: ['media', 'main'],
    icon: 'video',
    propFields: [
      { key: 'form', label: 'Format', type: 'select', width: 'third', options: VIDEO_FORM_OPTIONS.map((o) => ({ value: o.value, label: o.label })) },
      num('limit', 'Items', { min: 1, max: 24, default: 8 }),
      layout([{ value: 'wall', label: 'Wall' }, { value: 'strip', label: 'Continuous strip' }, { value: 'stack', label: 'Stacked pairs' }]),
      text('caption', 'Section footer caption', { maxLength: 140 }),
      bool('openInLightbox', 'Open in player', { default: true }),
    ],
  },
  {
    type: 'photo_strip',
    label: 'Photo strip / gallery',
    description: 'Stills from the Media library or a curated gallery.',
    surfaces: ['media', 'main', 'tech'],
    icon: 'image',
    propFields: [
      text('gallerySlug', 'Gallery slug (optional)', { maxLength: 80, help: 'Leave blank to use recent library images.' }),
      num('limit', 'Items', { min: 1, max: 30, default: 8 }),
      layout([{ value: 'strip', label: 'Continuous strip' }, { value: 'grid', label: 'Grid' }, { value: 'mosaic', label: 'Mosaic' }]),
      bool('showCaptions', 'Show captions', { default: false }),
    ],
  },
  {
    type: 'process_timeline',
    label: 'Process timeline',
    description: 'Discovery → planning → production → review → delivery, or your own steps.',
    surfaces: ['media', 'tech', 'main'],
    icon: 'sliders',
    propFields: [
      {
        key: 'steps',
        label: 'Steps (overrides the service defaults)',
        type: 'repeat',
        max: 8,
        itemLabel: 'Step',
        itemFields: [
          text('title', 'Title', { required: true, maxLength: 50 }),
          text('description', 'Description', { maxLength: 220 }),
          text('duration', 'Duration', { maxLength: 40 }),
        ],
      },
      text('serviceSlug', 'Or read steps from a service slug', { maxLength: 80 }),
      layout([{ value: 'numbered', label: 'Numbered rail' }, { value: 'stack', label: 'Stacked cards' }]),
    ],
  },
  {
    type: 'skill_matrix',
    label: 'Skill matrix',
    description: 'Capability matrix from the Skills module, grouped by discipline.',
    surfaces: ['tech', 'main'],
    icon: 'cpu',
    propFields: [
      layout([{ value: 'matrix', label: 'Grouped matrix' }, { value: 'bars', label: 'Depth meters' }, { value: 'cloud', label: 'Compact chips' }]),
      bool('showEvidence', 'Show evidence line', { default: false }),
      num('limit', 'Maximum skills', { min: 1, max: 80, default: 30 }),
    ],
  },
  {
    type: 'experience_timeline',
    label: 'Experience timeline',
    description: 'Chronological career timeline from the Experience module.',
    surfaces: ['tech', 'main'],
    icon: 'clock',
    propFields: [
      num('limit', 'Entries', { min: 1, max: 40, default: 12 }),
      bool('showStack', 'Show stack chips', { default: true }),
      bool('compact', 'Compact rows', { default: false }),
    ],
  },
  {
    type: 'testimonial_wall',
    label: 'Testimonials',
    description: 'Quotes from the Testimonials module. Sample rows are labelled automatically.',
    surfaces: ['main', 'media', 'tech'],
    icon: 'quote',
    propFields: [
      div([...DIVISION_OPTIONS, { value: 'all', label: 'Any division' }]),
      num('limit', 'Items', { min: 1, max: 12, default: 4 }),
      layout([{ value: 'wall', label: 'Wall' }, { value: 'featured', label: 'One large quote' }, { value: 'carousel', label: 'Rotating' }]),
    ],
  },
  {
    type: 'pricing_table',
    label: 'Pricing',
    description: 'Packages from the Pricing module. Renders a quote-first panel when nothing is published.',
    surfaces: ['media', 'tech', 'main'],
    icon: 'tag',
    propFields: [
      div(PORTFOLIO_DIVISION_OPTIONS),
      bool('showNote', 'Show pricing note from settings', { default: true }),
      text('ctaLabel', 'CTA label', { maxLength: 40, default: 'Request a quote' }),
      text('ctaHref', 'CTA href', { maxLength: 120, default: '/media/contact' }),
    ],
  },
  {
    type: 'logo_marquee',
    label: 'Marquee band',
    description: 'Continuously moving band of capabilities or client-side words (only add real client names).',
    surfaces: ['main', 'media', 'tech'],
    icon: 'arrow-right',
    propFields: [
      { key: 'items', label: 'Words', type: 'list', help: 'One per line. Use real client names only.' },
      num('speed', 'Duration (s per loop)', { min: 8, max: 120, default: 42 }),
      bool('reverse', 'Reverse direction', { default: false }),
      bool('rules', 'Hairline separators', { default: true }),
    ],
  },
  {
    type: 'stats_band',
    label: 'Stats band',
    description: 'A few numbers with their source. Leave empty rather than inventing figures.',
    surfaces: ['main', 'media', 'tech'],
    icon: 'gauge',
    propFields: [
      {
        key: 'items',
        label: 'Stats',
        type: 'repeat',
        max: 6,
        itemLabel: 'Stat',
        itemFields: [
          text('value', 'Value', { required: true, maxLength: 24 }),
          text('label', 'Label', { required: true, maxLength: 40 }),
          text('note', 'Basis / source', { maxLength: 80, help: 'e.g. "since 2019", "measured in Lightroom catalogue".' }),
        ],
      },
      bool('autoCounts', 'Add live project counts', { default: false }),
    ],
  },
  {
    type: 'about_split',
    label: 'About — split media',
    description: 'Portrait/media on one side, story on the other. Used for founder and division about pages.',
    surfaces: ['main', 'media', 'tech'],
    icon: 'user',
    propFields: [
      list('bullets', 'Highlights'),
      text('signature', 'Signature line', { maxLength: 80, placeholder: 'Covenant Nsikan' }),
      { key: 'portrait', label: 'Portrait image', type: 'asset' },
      bool('showSocial', 'Social links', { default: false }),
      layout([{ value: 'default', label: 'Image left' }, { value: 'reverse', label: 'Image right' }], 'align'),
    ],
  },
  {
    type: 'team_grid',
    label: 'Team grid',
    description: 'Founder and collaborators from the Team module.',
    surfaces: ['main', 'media', 'tech'],
    icon: 'users',
    propFields: [
      div([...DIVISION_OPTIONS, { value: 'all', label: 'All' }]),
      num('limit', 'People', { min: 1, max: 24, default: 8 }),
      bool('showPlaceholders', 'Show labelled placeholders', { default: true }),
    ],
  },
  {
    type: 'blog_preview',
    label: 'Blog preview',
    description: 'Recent writing, filtered by division.',
    surfaces: ['main', 'media', 'tech'],
    icon: 'book',
    propFields: [
      div([...DIVISION_OPTIONS, { value: 'all', label: 'All writing' }]),
      num('limit', 'Items', { min: 1, max: 12, default: 3 }),
      layout([{ value: 'cards', label: 'Cards' }, { value: 'list', label: 'Index list' }]),
      bool('showMeta', 'Show date / reading time', { default: true }),
    ],
  },
  {
    type: 'contact_block',
    label: 'Contact / CTA block',
    description: 'Form (main, media or tech variant) with routing details and WhatsApp.',
    surfaces: ['main', 'media', 'tech'],
    icon: 'send',
    propFields: [
      { key: 'form', label: 'Form variant', type: 'select', width: 'third', default: 'main', options: [{ value: 'main', label: 'Brand' }, { value: 'media', label: 'Media enquiry' }, { value: 'tech', label: 'Tech brief' }] },
      bool('showForm', 'Render form', { default: true }),
      bool('showDetails', 'Render contact details', { default: true }),
      text('asideTitle', 'Aside title', { maxLength: 60 }),
      text('asideBody', 'Aside copy', { maxLength: 320, rows: 3 }),
      bool('whatsappCta', 'WhatsApp button', { default: true }),
    ],
  },
  {
    type: 'rich_text',
    label: 'Rich text page body',
    description: 'Markdown authored in the section itself — the escape hatch for any page.',
    surfaces: ['main', 'media', 'tech'],
    propFields: [
      { key: 'source', label: 'Content source', type: 'select', width: 'third', default: 'body', options: [{ value: 'body', label: 'This section' }, { value: 'setting', label: 'A site setting' }] },
      text('settingKey', 'Setting key', { maxLength: 60, placeholder: 'founder.bio' }),
      layout([{ value: 'default', label: 'Reading measure' }, { value: 'wide', label: 'Full width' }], 'width'),
    ],
    icon: 'layout',
  },
  {
    type: 'certifications',
    label: 'Certifications',
    description: 'Credentials, honestly labelled as earned / in progress / planned.',
    surfaces: ['tech', 'main'],
    icon: 'shield',
    propFields: [
      layout([{ value: 'cards', label: 'Cards' }, { value: 'rows', label: 'Rows' }]),
      bool('showInProgress', 'Include in-progress items', { default: true }),
    ],
  },
  {
    type: 'tools_grid',
    label: 'Tools grid',
    description: 'What the work is made with. Manual list, or aggregated from services/projects.',
    surfaces: ['media', 'tech', 'main'],
    icon: 'settings',
    propFields: [
      { key: 'source', label: 'Source', type: 'select', width: 'third', default: 'manual', options: [{ value: 'manual', label: 'Manual list' }, { value: 'services', label: 'From services' }, { value: 'projects', label: 'From projects' }] },
      list('items', 'Manual tools'),
      div([...DIVISION_OPTIONS], 'division'),
      layout([{ value: 'grid', label: 'Grid' }, { value: 'chips', label: 'Chips' }]),
    ],
  },
  {
    type: 'resume_block',
    label: 'Resume download',
    description: 'Active résumé version, hidden entirely when nothing is published.',
    surfaces: ['tech'],
    icon: 'download',
    propFields: [
      bool('showMeta', 'Show version and date', { default: true }),
      text('ctaLabel', 'Button label', { maxLength: 40, default: 'Download résumé' }),
    ],
  },
  {
    type: 'faq',
    label: 'FAQ',
    description: 'Questions and answers authored in the section.',
    surfaces: ['main', 'media', 'tech'],
    icon: 'info',
    propFields: [
      {
        key: 'items',
        label: 'Questions',
        type: 'repeat',
        max: 12,
        itemLabel: 'Q&A',
        itemFields: [
          text('question', 'Question', { required: true, maxLength: 140 }),
          { key: 'answer', label: 'Answer', type: 'textarea', required: true, rows: 4, maxLength: 900 },
        ],
      },
      layout([{ value: 'accordion', label: 'Accordion' }, { value: 'list', label: 'Plain list' }]),
    ],
  },
];

export const BLOCK_TYPE_MAP: Record<string, BlockTypeDef> = Object.fromEntries(BLOCK_TYPES.map((b) => [b.type, b]));

export function blockDef(type: string): BlockTypeDef | undefined {
  return BLOCK_TYPE_MAP[type];
}

/** Shallow-merges defaults so a partially-configured section still renders well. */
export function blockProps(type: string, raw: Record<string, unknown> = {}): Record<string, unknown> {
  const def = BLOCK_TYPE_MAP[type];
  const out: Record<string, unknown> = {};
  for (const field of def?.propFields ?? []) {
    if (field.default !== undefined) out[field.key] = field.default;
  }
  if (def?.defaults) Object.assign(out, def.defaults);
  for (const [key, value] of Object.entries(raw ?? {})) {
    if (value !== undefined && value !== null && value !== '') out[key] = value;
  }
  return out;
}

function list(key: string, label: string, extra: Partial<FieldDef> = {}): FieldDef {
  return { key, label, type: 'list', ...extra };
}

export const BLOCK_TYPES_BY_SURFACE = {
  main: BLOCK_TYPES.filter((b) => b.surfaces.includes('main')),
  media: BLOCK_TYPES.filter((b) => b.surfaces.includes('media')),
  tech: BLOCK_TYPES.filter((b) => b.surfaces.includes('tech')),
};
