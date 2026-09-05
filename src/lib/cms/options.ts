/**
 * Shared option sets for the CMS. Centralised so labels never drift between
 * the admin, the public renderers and validation.
 */

export const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
] as const;

export const PUBLISH_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'scheduled', label: 'Scheduled' },
] as const;

export const DIVISION_OPTIONS = [
  { value: 'main', label: 'Covenant Media (brand site)' },
  { value: 'media', label: 'Media Portfolio' },
  { value: 'tech', label: 'Tech Portfolio' },
] as const;

export const PORTFOLIO_DIVISION_OPTIONS = [
  { value: 'media', label: 'Media' },
  { value: 'tech', label: 'Technology' },
] as const;

/** PRD §7 — media work categories. */
export const MEDIA_CATEGORIES = [
  { value: 'short_form_editing', label: 'Short-form editing' },
  { value: 'long_form_editing', label: 'Long-form editing' },
  { value: 'videography', label: 'Videography' },
  { value: 'photography', label: 'Photography' },
  { value: 'event_coverage', label: 'Event coverage' },
  { value: 'wedding_coverage', label: 'Wedding coverage' },
  { value: 'burial_funeral_coverage', label: 'Burial / funeral coverage' },
  { value: 'church_convention_coverage', label: 'Church / convention coverage' },
  { value: 'government_event_coverage', label: 'Government / event coverage' },
  { value: 'commercial_videos', label: 'Commercial videos' },
  { value: 'social_media_ads', label: 'Social media ads' },
  { value: 'content_creation', label: 'Content creation' },
  { value: 'color_grading', label: 'Color grading' },
  { value: 'motion_graphics', label: 'Motion graphics' },
  { value: 'thumbnail_design', label: 'Thumbnail design' },
  { value: 'music_videos', label: 'Music videos' },
  { value: 'product_videos', label: 'Product videos' },
  { value: 'corporate_videos', label: 'Corporate videos' },
] as const;

export const VIDEO_FORM_OPTIONS = [
  { value: 'short_form', label: 'Short-form (vertical / under 3 min)' },
  { value: 'long_form', label: 'Long-form' },
  { value: 'photo', label: 'Photo / stills' },
  { value: 'other', label: 'Other' },
] as const;

/** PRD §8 — technology project categories. */
export const TECH_CATEGORIES = [
  { value: 'web_app', label: 'Web application' },
  { value: 'mobile_app', label: 'Mobile application' },
  { value: 'admin_dashboard', label: 'Admin dashboard' },
  { value: 'api_backend', label: 'API / backend' },
  { value: 'ui_ux', label: 'UI / UX design' },
  { value: 'cybersecurity', label: 'Cybersecurity' },
  { value: 'ai_tooling', label: 'AI tooling' },
  { value: 'data_automation', label: 'Data / automation' },
  { value: 'brand_site', label: 'Brand / marketing site' },
  { value: 'internal_tool', label: 'Internal tool' },
  { value: 'other', label: 'Other' },
] as const;

export const SKILL_CATEGORIES = [
  { value: 'frontend', label: 'Frontend' },
  { value: 'backend', label: 'Backend' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'design', label: 'UI / UX & design' },
  { value: 'infrastructure', label: 'Infrastructure & DevOps' },
  { value: 'security', label: 'Cybersecurity' },
  { value: 'data', label: 'Data & AI' },
  { value: 'tools', label: 'Tools & workflow' },
] as const;

export const SERVICE_DIVISION_OPTIONS = [...DIVISION_OPTIONS] as const;

export const NAV_LOCATIONS = [
  { value: 'main_header', label: 'Main site — header' },
  { value: 'main_footer', label: 'Main site — footer' },
  { value: 'media_header', label: 'Media — header' },
  { value: 'media_footer', label: 'Media — footer' },
  { value: 'tech_header', label: 'Tech — header' },
  { value: 'tech_footer', label: 'Tech — footer' },
] as const;

export const SOCIAL_NETWORKS = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'x', label: 'X (Twitter)' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'github', label: 'GitHub' },
  { value: 'vimeo', label: 'Vimeo' },
  { value: 'behance', label: 'Behance' },
  { value: 'dribbble', label: 'Dribbble' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'other', label: 'Other' },
] as const;

export const SOCIAL_PLACEMENTS = [
  { value: 'main', label: 'Main site' },
  { value: 'media', label: 'Media portfolio' },
  { value: 'tech', label: 'Tech portfolio' },
  { value: 'footer', label: 'Footers' },
  { value: 'contact', label: 'Contact pages' },
] as const;

export const PRICING_MODES = [
  { value: 'quote', label: 'Quote-based (no price shown)' },
  { value: 'starting_at', label: 'Starting at' },
  { value: 'fixed', label: 'Fixed price' },
  { value: 'day_rate', label: 'Day rate' },
] as const;

export const CURRENCY_OPTIONS = [
  { value: 'NGN', label: 'NGN — Nigerian Naira' },
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'GBP', label: 'GBP — Pound Sterling' },
  { value: 'EUR', label: 'EUR — Euro' },
] as const;

export const PRICING_PERIODS = [
  { value: 'per_project', label: 'per project' },
  { value: 'per_day', label: 'per day' },
  { value: 'per_video', label: 'per video' },
  { value: 'per_event', label: 'per event' },
  { value: 'per_set', label: 'per set (e.g. 10 videos)' },
  { value: 'monthly', label: 'per month' },
] as const;

export const EXPERIENCE_KINDS = [
  { value: 'work', label: 'Employment' },
  { value: 'freelance', label: 'Freelance / client work' },
  { value: 'education', label: 'Education' },
  { value: 'training', label: 'Training / self-directed' },
  { value: 'award', label: 'Award / recognition' },
] as const;

export const CERTIFICATION_STATUSES = [
  { value: 'completed', label: 'Completed & verifiable' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'planned', label: 'Planned' },
  { value: 'expired', label: 'Expired' },
] as const;

export const BUDGET_BANDS = [
  { value: 'under_250k', label: 'Under ₦250,000' },
  { value: '250k_500k', label: '₦250,000 – ₦500,000' },
  { value: '500k_1m', label: '₦500,000 – ₦1,000,000' },
  { value: '1m_2_5m', label: '₦1m – ₦2.5m' },
  { value: '2_5m_5m', label: '₦2.5m – ₦5m' },
  { value: 'above_5m', label: 'Above ₦5m' },
  { value: 'not_sure', label: 'Not sure yet' },
] as const;

export const TECH_BUDGET_BANDS = [
  { value: 'under_500k', label: 'Under ₦500,000' },
  { value: '500k_1_5m', label: '₦500,000 – ₦1.5m' },
  { value: '1_5m_5m', label: '₦1.5m – ₦5m' },
  { value: '5m_15m', label: '₦5m – ₦15m' },
  { value: 'above_15m', label: 'Above ₦15m' },
  { value: 'usd_project', label: 'USD / international scope' },
  { value: 'not_sure', label: 'Not sure yet' },
] as const;

export const TIMELINE_OPTIONS = [
  { value: 'asap', label: 'ASAP (within 2 weeks)' },
  { value: '1_month', label: 'Within 1 month' },
  { value: '1_3_months', label: '1–3 months' },
  { value: '3_6_months', label: '3–6 months' },
  { value: 'exploring', label: 'Exploring / no fixed date' },
] as const;

export const MEDIA_SERVICE_OPTIONS = [
  { value: 'short_form_editing', label: 'Short-form editing' },
  { value: 'long_form_editing', label: 'Long-form editing' },
  { value: 'videography', label: 'Videography' },
  { value: 'photography', label: 'Photography' },
  { value: 'event_coverage', label: 'Event coverage' },
  { value: 'wedding_coverage', label: 'Wedding coverage' },
  { value: 'commercial_video', label: 'Commercial video' },
  { value: 'motion_graphics', label: 'Motion graphics' },
  { value: 'color_grading', label: 'Color grading' },
  { value: 'thumbnail_design', label: 'Thumbnail design' },
  { value: 'content_creation', label: 'Content creation' },
] as const;

export const TECH_PROJECT_TYPE_OPTIONS = [
  { value: 'web_app', label: 'Web application' },
  { value: 'mobile_app', label: 'Mobile app' },
  { value: 'backend_api', label: 'Backend / API' },
  { value: 'ui_ux', label: 'UI/UX design' },
  { value: 'security_review', label: 'Security assessment / audit' },
  { value: 'incident_response', label: 'Incident response / forensics' },
  { value: 'grc', label: 'GRC / policy & compliance work' },
  { value: 'internal_tool', label: 'Internal tool / automation' },
  { value: 'maintenance', label: 'Ongoing maintenance / retainer' },
  { value: 'other', label: 'Something else' },
] as const;

export const EMBED_SOURCES = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'vimeo', label: 'Vimeo' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'upload', label: 'Direct upload' },
  { value: 'external', label: 'External / other' },
] as const;
