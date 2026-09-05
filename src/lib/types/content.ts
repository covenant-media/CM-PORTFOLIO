/** Public content types — the shape every renderer consumes from the CMS. */

export interface AssetRef {
  id: string;
  url: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  kind: string;
  variants: Record<string, { url: string; width: number; height: number }>;
  blur: string | null;
  caption: string | null;
}

export interface VideoRef {
  id: string;
  title: string;
  description: string | null;
  source: string;
  sourceUrl: string | null;
  embedUrl: string | null;
  posterUrl: string | null;
  posterAssetId: string | null;
  fileUrl: string | null;
  durationS: number | null;
  form: string | null;
  vertical: boolean;
  externalUrl: string | null;
  aspect: 'vertical' | 'wide' | 'square';
}

export interface ProjectCard {
  id: string;
  slug: string;
  division: 'media' | 'tech';
  title: string;
  summary: string | null;
  category: string | null;
  categoryLabel: string | null;
  form: string | null;
  year: number | null;
  client: string | null;
  role: string | null;
  location: string | null;
  durationLabel: string | null;
  cover: AssetRef | null;
  accent: string | null;
  isSample: boolean;
  technologies: string[];
  services: string[];
  videoCount: number;
  videos: VideoRef[];
  links: { label: string; url: string; kind?: string }[];
  repoUrl: string | null;
  liveUrl: string | null;
}

export interface ProjectDetail extends ProjectCard {
  problem: string | null;
  solution: string | null;
  outcomes: string[];
  deliverables: string[];
  tools: string[];
  credits: { role: string; name?: string | null }[];
  metrics: { label: string; value: string; verified?: boolean }[];
  gallery: { asset: AssetRef | null; assetId: string | null; caption: string | null; alt: string | null }[];
  heroVideo: VideoRef | null;
  seo: Record<string, unknown>;
  publishedAt: string | null;
  eventDate: string | null;
}

export interface PostCard {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  category: string | null;
  tags: string[];
  division: string;
  authorName: string | null;
  publishedAt: string | null;
  readingMinutes: number | null;
  cover: AssetRef | null;
  isSample: boolean;
}

export interface PostDetail extends PostCard {
  bodyHtml: string;
  body: string | null;
  relatedProjects: ProjectCard[];
  seo: Record<string, unknown>;
}

export interface ServiceItem {
  id: string;
  slug: string;
  division: string;
  title: string;
  summary: string | null;
  descriptionHtml: string;
  bullets: string[];
  deliverables: string[];
  tools: string[];
  process: { title: string; description?: string | null; duration?: string | null }[];
  priceNote: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  hero: AssetRef | null;
  isSample: boolean;
}

export interface TestimonialItem {
  id: string;
  quote: string;
  authorName: string | null;
  authorRole: string | null;
  authorOrg: string | null;
  location: string | null;
  avatar: AssetRef | null;
  rating: number | null;
  isSample: boolean;
  projectTitle: string | null;
}

export interface TeamItem {
  id: string;
  name: string;
  role: string | null;
  bio: string | null;
  isFounder: boolean;
  isPlaceholder: boolean;
  focus: string[];
  avatar: AssetRef | null;
  links: { label: string; url: string }[];
}

export interface SkillItem {
  id: string;
  name: string;
  slug: string;
  category: string;
  categoryLabel: string;
  level: number;
  description: string | null;
  evidence: string | null;
  yearsStart: number | null;
  isSample: boolean;
}

export interface ExperienceEntry {
  id: string;
  role: string;
  organization: string | null;
  location: string | null;
  summary: string | null;
  bullets: string[];
  highlights: string[];
  technologies: string[];
  rangeLabel: string;
  startDate: string | null;
  isCurrent: boolean;
  kind: string;
  isSample: boolean;
}

export interface CertificationItem {
  id: string;
  name: string;
  issuer: string | null;
  status: string;
  completed: boolean;
  issuedOn: string | null;
  expiresOn: string | null;
  verifyUrl: string | null;
  description: string | null;
  displayLabel: string;
}

export interface PricingPackage {
  id: string;
  name: string;
  tagline: string | null;
  mode: string;
  amount: number | null;
  currency: string;
  period: string | null;
  includes: string[];
  exclusions: string[];
  turnaround: string | null;
  notes: string | null;
  isFeatured: boolean;
  isSample: boolean;
  priceLabel: string | null;
}

export interface GalleryItem {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  kind: string;
  items: { asset: AssetRef | null; caption: string | null; alt: string | null }[];
  isSample: boolean;
  projectId: string | null;
}

export interface SectionData {
  id: string;
  type: string;
  name: string;
  eyebrow: string | null;
  headline: string | null;
  body: string | null;
  props: Record<string, unknown>;
  media: { assetId?: string | null; videoId?: string | null; role?: string; caption?: string | null; alt?: string | null; asset?: AssetRef | null; video?: VideoRef | null }[];
  links: { label: string; href: string; variant?: string }[];
  placement: string;
  variant: string | null;
  overrides: Record<string, unknown>;
  isSample: boolean;
}

export interface PageData {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  sections: SectionData[];
  seo: Record<string, unknown>;
  exists: boolean;
}

export interface NavItem {
  label: string;
  href: string;
  badge?: string | null;
  external?: boolean;
  newTab?: boolean;
}

export interface SocialItem {
  network: string;
  url: string;
  label: string | null;
  handle: string | null;
}

export interface SiteContext {
  settings: Record<string, string | number | boolean | null>;
  social: SocialItem[];
  nav: Record<string, NavItem[]>;
  ready: boolean;
  error?: string;
}

export interface ResumeInfo {
  available: boolean;
  url: string | null;
  label: string | null;
  version: string | null;
  publishedAt: string | null;
  filename: string | null;
  bytes: number | null;
}
