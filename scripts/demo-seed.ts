/**
 * Rich demo seed.
 *
 * Populates the empty placeholder areas (testimonials, experience, certifications,
 * photo gallery, extra projects, sample media assets, extra posts, settings, social
 * links) so every page renders with believable demo content. All inserted rows are
 * flagged is_sample = true / is_placeholder where applicable so the UI badges them
 * and they can be filtered out later by turning off "Show placeholder badges" or
 * deleting rows from the CMS.
 *
 * Idempotent: skips any table that already contains rows. Run with --force to
 * re-seed even when tables are non-empty (additive, does not delete).
 *
 * Usage:
 *   node --import tsx scripts/demo-seed.ts           # only fill empty tables
 *   node --import tsx scripts/demo-seed.ts --force   # add even if rows exist
 */
process.env.CM_SCRIPT = '1';

import { insertRow, getDb } from '../src/lib/db/index';
import { saveSetting } from '../src/lib/cms/settings';

interface Report {
  created: Record<string, number>;
  notes: string[];
}

async function count(table: string): Promise<number> {
  const db = await getDb();
  const rows = await db.select<{ n: number | string }>(`SELECT count(*)::int AS n FROM ${table}`);
  return Number(rows[0]?.n ?? 0);
}

function asset({
  id,
  url,
  kind = 'image',
  filename,
  title,
  alt,
  width = 1600,
  height = 1067,
  folder = 'demo',
}: {
  id: string;
  url: string;
  kind?: string;
  filename?: string;
  title?: string;
  alt?: string;
  width?: number;
  height?: number;
  folder?: string;
}) {
  return insertRow(
    'media_asset',
    {
      public_id: id,
      url,
      kind,
      mime_type: kind === 'image' ? 'image/jpeg' : 'image/png',
      filename: filename ?? `${id}.jpg`,
      title: title ?? alt ?? filename ?? id,
      alt: alt ?? title ?? null,
      caption: null,
      credit: null,
      folder,
      tags: ['demo', 'sample'],
      bytes: null,
      width,
      height,
      duration_s: null,
      checksum: null,
      storage: 'url',
      variants: {},
      blur_data: null,
      is_referenced: true,
      uploaded_by: null,
    },
    { id },
  );
}

async function main() {
  const force = process.argv.includes('--force');
  const report: Report = { created: {}, notes: [] };
  const add = (key: string, n = 1) => {
    report.created[key] = (report.created[key] ?? 0) + n;
  };
  const db = await getDb();

  // ── 1. media_asset (picsum.photos is whitelisted in next.config.mjs) ───────
  if (force || (await count('media_asset')) === 0) {
    const demoAssets: Array<{ id: string; seed: string; w?: number; h?: number; alt: string; folder?: string }> = [
      { id: 'ast_demo_portrait', seed: 'portrait17', w: 900, h: 1200, alt: 'Portrait — Covenant Nsikan (sample)', folder: 'identity' },
      { id: 'ast_demo_hero_media', seed: 'camera-stage', w: 1800, h: 1100, alt: 'Behind the scenes on a film set (sample)', folder: 'hero' },
      { id: 'ast_demo_hero_tech', seed: 'terminal-blue', w: 1800, h: 1100, alt: 'Code on a screen (sample)', folder: 'hero' },
      { id: 'ast_demo_conf', seed: 'conference-hall', w: 1600, h: 1067, alt: 'Conference hall with stage lighting (sample)' },
      { id: 'ast_demo_wed', seed: 'wedding-gold', w: 1600, h: 1067, alt: 'Wedding couple (sample)' },
      { id: 'ast_demo_brand', seed: 'studio-lights', w: 1600, h: 1067, alt: 'Studio product shoot (sample)' },
      { id: 'ast_demo_ops', seed: 'dashboard-maps', w: 1600, h: 1067, alt: 'Operations dashboard (sample)' },
      { id: 'ast_demo_audit', seed: 'lock-keypad', w: 1600, h: 1067, alt: 'Security lock keypad (sample)' },
      { id: 'ast_demo_system', seed: 'design-tokens', w: 1600, h: 1067, alt: 'Design system tokens (sample)' },
      { id: 'ast_demo_editing', seed: 'editing-suite', w: 1600, h: 1067, alt: 'Editing suite with monitor (sample)' },
      { id: 'ast_demo_street1', seed: 'street-lagos', w: 1200, h: 800, alt: 'Street photograph (sample)' },
      { id: 'ast_demo_street2', seed: 'city-lights', w: 1200, h: 800, alt: 'City lights (sample)' },
      { id: 'ast_demo_street3', seed: 'lens-cinema', w: 1200, h: 800, alt: 'Cinema lens close-up (sample)' },
      { id: 'ast_demo_street4', seed: 'drone-sky', w: 1200, h: 800, alt: 'Aerial sky shot (sample)' },
      { id: 'ast_demo_street5', seed: 'color-grade', w: 1200, h: 800, alt: 'Color grading still (sample)' },
      { id: 'ast_demo_street6', seed: 'set-monitor', w: 1200, h: 800, alt: 'On-set monitor (sample)' },
      { id: 'ast_demo_avatar1', seed: 'avatar-chi', w: 400, h: 400, alt: 'Client avatar (sample)' },
      { id: 'ast_demo_avatar2', seed: 'avatar-ama', w: 400, h: 400, alt: 'Client avatar (sample)' },
      { id: 'ast_demo_avatar3', seed: 'avatar-tunde', w: 400, h: 400, alt: 'Client avatar (sample)' },
    ];
    for (const a of demoAssets) {
      await asset({
        id: a.id,
        url: `https://picsum.photos/seed/${a.seed}/${a.w ?? 1600}/${a.h ?? 1067}`,
        width: a.w,
        height: a.h,
        alt: a.alt,
        filename: `${a.seed}.jpg`,
        folder: a.folder ?? 'demo',
      });
      add('media_asset');
    }
    report.notes.push('Demo images inserted as URL-referenced assets from picsum.photos (already whitelisted for remote images). No local files written.');
  } else {
    report.notes.push('media_asset already has rows — skipped.');
  }

  // ── 2. Site settings (populate brand/contact/identity defaults) ────────────
  const defaults: Record<string, string | boolean | number> = {
    'brand.name': 'Covenant Media',
    'brand.legal_name': 'Covenant Media Studio',
    'brand.tagline': 'Media and technology, under one roof.',
    'brand.media_tagline': 'WE CAPTURE · WE CREATE · WE INSPIRE',
    'brand.statement': 'A studio that makes films and builds software — each discipline sharpening the other.',
    'founder.name': 'Covenant Nsikan',
    'founder.title': 'Founder · Filmmaker & Software Engineer',
    'founder.portrait': 'ast_demo_portrait',
    'founder.bio_short': 'Covenant Nsikan is a Lagos-based filmmaker and software engineer. He runs Covenant Media, where cinematic production and serious engineering live on the same team.',
    'founder.availability': 'Booking Q3 / Q4 shoots and taking on one software engagement at a time.',
    'contact.email': 'hello@example.test',
    'contact.phone': '+234 800 000 0000',
    'contact.whatsapp': '2348000000000',
    'contact.whatsapp_label': 'Chat on WhatsApp',
    'contact.location': 'Lagos, Nigeria',
    'contact.service_areas': 'Lagos · Ibadan · Abeokuta · travelling available',
    'contact.response_time': 'Replies within one business day.',
    'contact.hours': 'Mon – Sat · 9:00 – 18:00 WAT',
    'forms.success_main': 'Thanks — your message is in the queue. Expect a reply within one business day.',
    'forms.success_media': 'Thanks — shoot details received. I am confirming availability now and will be in touch shortly.',
    'forms.success_tech': 'Thanks — brief received. You will get scoping notes and next steps soon.',
    'media.intro': 'Shoots, edits and story films for events, brands and creators — from brief to final delivery, with a clear process the whole way.',
    'media.cta_primary': 'View work',
    'media.cta_secondary': 'Hire Covenant',
    'media.delivery_promise': 'Highlight cut within 72 hours; long-form within 10–14 days.',
    'media.pricing_note': 'Every shoot is scoped. Packages below show shape; numbers appear here once confirmed.',
    'pricing.disclaimer': 'Travel outside Lagos, second shooters, drone work and same-day edits are quoted separately.',
    'tech.intro': 'I build and harden web platforms — TypeScript, Postgres, and a bias toward systems that stay operable after I walk away.',
    'tech.role': 'Full-stack engineer · Design systems · Cybersecurity',
    'tech.open_to': 'Currently taking on one product build or security review at a time. Send a brief and I will tell you what is realistic.',
    'tech.pricing_note': 'Scoped per engagement — request a quote.',
    'tech.experience_since': 2018,
    'seo.default_description': 'Covenant Media — cinematic media production and full-stack software, security and web engineering from one studio in Lagos.',
    'legal.summary': 'Covenant Media is a small studio, not a data platform. This site stores what you send us and nothing else: no advertising trackers, no third-party analytics, no tracking cookies.',
    'system.show_sample_badges': true,
    'system.maintenance': false,
  };
  for (const [key, value] of Object.entries(defaults)) {
    await saveSetting(key, value);
  }
  add('site_setting', Object.keys(defaults).length);
  report.notes.push('Site settings populated with demo brand/contact/identity copy. Edit in CMS → Site settings.');

  // ── 3. Social links (flip the seeded drafts to verified, with sample URLs) ─
  const socialFixups: Record<string, { url: string; handle: string; label: string; placements: string[] }> = {
    instagram: { url: 'https://instagram.com/covenantmedia.sample', handle: '@covenantmedia', label: 'Instagram', placements: ['media', 'main', 'footer', 'contact'] },
    youtube: { url: 'https://youtube.com/@covenantmedia.sample', handle: '@covenantmedia', label: 'YouTube', placements: ['media', 'main', 'footer'] },
    tiktok: { url: 'https://tiktok.com/@covenantmedia.sample', handle: '@covenantmedia', label: 'TikTok', placements: ['media', 'footer'] },
    x: { url: 'https://x.com/covenantmedia.sample', handle: '@covenantmedia', label: 'X', placements: ['main', 'footer'] },
    linkedin: { url: 'https://linkedin.com/in/covenant.sample', handle: 'covenant-nsikan', label: 'LinkedIn', placements: ['tech', 'main', 'footer'] },
    github: { url: 'https://github.com/covenantmedia.sample', handle: 'covenantmedia', label: 'GitHub', placements: ['tech', 'footer'] },
  };
  for (const [network, data] of Object.entries(socialFixups)) {
    await db.execute(
      `UPDATE social_link
         SET url = $1::text, handle = $2::text, label = $3::text,
             placements = $4::jsonb, is_verified = true, status = 'published'
       WHERE network = $5::text`,
      [data.url, data.handle, data.label, JSON.stringify(data.placements), network],
    );
  }
  // Email and WhatsApp "social" contact shortcuts
  const extraSocials = [
    { network: 'whatsapp', label: 'WhatsApp', url: 'https://wa.me/2348000000000', handle: '+234 800 000 0000', placements: ['contact', 'media'], order: 20 },
    { network: 'email', label: 'Email', url: 'mailto:hello@example.test', handle: 'hello@example.test', placements: ['contact', 'footer'], order: 21 },
  ];
  for (const s of extraSocials) {
    const exists = await db.select<{ id: string }>(`SELECT id FROM social_link WHERE network = $1::text`, [s.network]);
    if (exists.length === 0 || force) {
      if (exists.length === 0) {
        await insertRow('social_link', {
          network: s.network,
          label: s.label,
          url: s.url,
          handle: s.handle,
          icon: s.network,
          placements: s.placements,
          is_verified: true,
          status: 'published',
          sort_order: s.order,
        });
        add('social_link');
      }
    }
  }
  report.notes.push('Social links flipped to published + verified with sample URLs. Replace with real handles and set is_verified=false for anything not yet confirmed.');

  // ── 4. Testimonials (all flagged is_sample, with plausible quotes) ────────
  if (force || (await count('testimonial')) === 0) {
    const items: Array<Record<string, unknown>> = [
      {
        quote: '“The recap cut arrived two days after our conference and it already felt like the event — shots we had forgotten were there, audio that actually worked. The crew was quiet, the edit was not.”',
        author_name: 'Amaka O.',
        author_role: 'Events lead',
        author_org: 'Sample Org',
        location: 'Lagos',
        division: 'media',
        rating: 5,
        is_sample: true,
        is_featured: true,
        status: 'published',
        sort_order: 1,
        avatar_asset_id: 'ast_demo_avatar2',
        source_note: 'Sample quote — replace with a real client message before launch.',
        approved_at: null,
      },
      {
        quote: '“Covenant shot our wedding without making the day about the cameras. The teaser made my mother cry, which I am counting as a five-star review.”',
        author_name: 'Chidi & Tope',
        author_role: 'Couple',
        author_org: null,
        location: 'Ibadan',
        division: 'media',
        rating: 5,
        is_sample: true,
        status: 'published',
        sort_order: 2,
        avatar_asset_id: 'ast_demo_avatar3',
        source_note: 'Sample quote.',
      },
      {
        quote: '“Our product shipped with an auth model we actually understood, and a deploy pipeline that does not page us at 2am. Covenant wrote the boring parts properly.”',
        author_name: 'Tunde A.',
        author_role: 'CTO',
        author_org: 'Sample Startup',
        location: 'Lagos',
        division: 'tech',
        rating: 5,
        is_sample: true,
        is_featured: true,
        status: 'published',
        sort_order: 1,
        avatar_asset_id: 'ast_demo_avatar1',
        source_note: 'Sample quote.',
      },
      {
        quote: '“The security review was the first one we had that did not read like a generic checklist. Findings were ranked by what would actually hurt us, and fixes shipped the same week.”',
        author_name: 'Ngozi E.',
        author_role: 'Head of engineering',
        author_org: 'Sample Fintech',
        location: 'Remote',
        division: 'tech',
        rating: 5,
        is_sample: true,
        status: 'published',
        sort_order: 2,
        source_note: 'Sample quote.',
      },
    ];
    for (const it of items) {
      await insertRow('testimonial', it);
      add('testimonial');
    }
    report.notes.push('Sample testimonials added (is_sample=true, approved_at NULL). The UI badges them as placeholders until you add real, approved quotes.');
  } else {
    report.notes.push('testimonial already has rows — skipped.');
  }

  // ── 5. Experience items (sample timeline) ──────────────────────────────────
  if (force || (await count('experience_item')) === 0) {
    const items: Array<Record<string, unknown>> = [
      {
        role: 'Founder & Lead Engineer',
        organization: 'Covenant Media',
        location: 'Lagos, NG',
        summary: 'Founded the studio to deliver media production and software engineering from the same team. Lead engineer on every software engagement; director/DP on film work.',
        bullets: ['Product engineering for venture-backed and bootstrapped teams', 'Security reviews for fintech and health platforms', 'Media production: events, weddings, brand films'],
        technologies: ['TypeScript', 'Next.js', 'PostgreSQL', 'Go', 'DaVinci Resolve'],
        highlights: ['Shipped 15+ production systems', '25+ edited films delivered'],
        start_date: `${new Date().getFullYear() - 3}-01-15`,
        start_label: String(new Date().getFullYear() - 3),
        is_current: true,
        kind: 'work',
        is_sample: true,
        status: 'published',
        sort_order: 100,
      },
      {
        role: 'Senior Software Engineer',
        organization: 'Sample fintech (placeholder)',
        location: 'Remote',
        summary: 'Built payment reconciliation and internal tooling. Replace this entry with a real role.',
        bullets: ['Led reconciliation service rebuild', 'Designed audit and idempotency model', 'Mentored three engineers'],
        technologies: ['Node.js', 'PostgreSQL', 'Kafka', 'Kubernetes'],
        highlights: ['Cut reconciliation runtime 12h → 45m'],
        start_date: `${new Date().getFullYear() - 6}-06-01`,
        start_label: String(new Date().getFullYear() - 6),
        end_date: `${new Date().getFullYear() - 3}-12-31`,
        end_label: String(new Date().getFullYear() - 3),
        kind: 'work',
        is_sample: true,
        status: 'published',
        sort_order: 80,
      },
      {
        role: 'Freelance filmmaker & editor',
        organization: 'Independent',
        location: 'Lagos, NG',
        summary: 'Shot and edited weddings, church events and short-form social content while studying. Replace with real freelance history.',
        bullets: ['Second shooter on 30+ events', 'Colour grading for other editors'],
        start_date: `${new Date().getFullYear() - 8}-01-01`,
        start_label: String(new Date().getFullYear() - 8),
        end_date: `${new Date().getFullYear() - 6}-05-01`,
        end_label: String(new Date().getFullYear() - 6),
        kind: 'freelance',
        is_sample: true,
        status: 'published',
        sort_order: 60,
      },
      {
        role: 'B.Sc. Computer Science',
        organization: 'Sample University (placeholder)',
        location: 'Nigeria',
        summary: 'Replace this entry with your real education details.',
        kind: 'education',
        start_date: `${new Date().getFullYear() - 10}-09-01`,
        start_label: String(new Date().getFullYear() - 10),
        end_date: `${new Date().getFullYear() - 6}-06-01`,
        end_label: String(new Date().getFullYear() - 6),
        is_sample: true,
        status: 'published',
        sort_order: 20,
      },
    ];
    for (const it of items) {
      await insertRow('experience_item', it);
      add('experience_item');
    }
    report.notes.push('Sample experience timeline added. Edit dates, titles and companies in CMS → Experience.');
  } else {
    report.notes.push('experience_item already has rows — skipped.');
  }

  // ── 6. Certifications (in_progress / planned — labelled honestly) ─────────
  if (force || (await count('certification')) === 0) {
    const items: Array<Record<string, unknown>> = [
      {
        name: 'Offensive Security Certified Professional (placeholder)',
        issuer: 'Offensive Security',
        status: 'planned',
        completed: false,
        description: 'Sample row. Replace with certifications you actually hold and can verify.',
        division: 'tech',
        is_sample: true,
        sort_order: 10,
      },
      {
        name: 'AWS Certified Security – Specialty (placeholder)',
        issuer: 'Amazon Web Services',
        status: 'in_progress',
        completed: false,
        status_label_override: 'Studying',
        description: 'Sample row.',
        division: 'tech',
        is_sample: true,
        sort_order: 20,
      },
    ];
    for (const it of items) {
      await insertRow('certification', it);
      add('certification');
    }
    report.notes.push('Sample certifications added as planned/in-progress (not completed). Flip completed=true and set verify_url once earned.');
  } else {
    report.notes.push('certification already has rows — skipped.');
  }

  // ── 7. Attach cover images + richer data to the existing sample projects ─
  const projectFixups: Array<{ slug: string; cover: string; client: string; outcomes: string[]; metrics: Array<{ label: string; value: string; verified: boolean }>; gallery: string[]; accent?: string }> = [
    {
      slug: 'sample-conference-recap',
      cover: 'ast_demo_conf',
      client: 'Sample Conference',
      outcomes: ['90-second hero recap delivered within 48 hours', 'Six vertical cutdowns for social the same week'],
      metrics: [{ label: 'Attendees', value: '420', verified: false }],
      gallery: ['ast_demo_conf', 'ast_demo_street1', 'ast_demo_editing', 'ast_demo_street3'],
      accent: '#d8a24a',
    },
    {
      slug: 'sample-wedding-feature',
      cover: 'ast_demo_wed',
      client: 'Chidi & Tope (sample)',
      outcomes: ['7-minute feature + 60-second teaser', 'Full ceremony captured with two cameras'],
      metrics: [],
      gallery: ['ast_demo_wed', 'ast_demo_street4', 'ast_demo_street5'],
    },
    {
      slug: 'sample-brand-film',
      cover: 'ast_demo_brand',
      client: 'Sample Brand',
      outcomes: ['60s hero film + 15s and 6s cutdowns', 'Thumbnail frames for each platform'],
      metrics: [],
      gallery: ['ast_demo_brand', 'ast_demo_street2', 'ast_demo_set-monitor'],
    },
    {
      slug: 'sample-operations-platform',
      cover: 'ast_demo_ops',
      client: 'Sample Logistics Co.',
      outcomes: ['Replaced spreadsheet workflows with typed operations console', 'Cut manual routing time by an unverified amount (not shown publicly)'],
      metrics: [{ label: 'Users', value: '120+', verified: false }],
      gallery: ['ast_demo_ops', 'ast_demo_system', 'ast_demo_street6'],
      accent: '#7fa7ff',
    },
    {
      slug: 'sample-security-review',
      cover: 'ast_demo_audit',
      client: 'Sample Fintech',
      outcomes: ['17 findings ranked by exploitability, three critical fixed pre-launch', 'Auth/session model rewritten and re-tested'],
      metrics: [],
      gallery: ['ast_demo_audit'],
      accent: '#7fa7ff',
    },
    {
      slug: 'sample-design-system',
      cover: 'ast_demo_system',
      client: 'Sample Product Studio',
      outcomes: ['Token-based theming across three products', 'Accessibility baseline (WCAG 2.2 AA) achieved'],
      metrics: [],
      gallery: ['ast_demo_system', 'ast_demo_ops'],
      accent: '#7fa7ff',
    },
  ];
  for (const fix of projectFixups) {
    const ids = fix.gallery.map((assetId) => ({ asset_id: assetId, caption: null, alt: null }));
    await db.execute(
      `UPDATE project SET
         cover_asset_id = $1::text,
         client = $2::text,
         client_public = true,
         outcomes = $3::jsonb,
         metrics = $4::jsonb,
         gallery = $5::jsonb,
         accent = COALESCE(accent, $6::text)
       WHERE slug = $7::text AND is_sample = true`,
      [
        fix.cover,
        fix.client,
        JSON.stringify(fix.outcomes),
        JSON.stringify(fix.metrics),
        JSON.stringify(ids),
        fix.accent ?? null,
        fix.slug,
      ],
    );
  }

  // attach hero videos to first three media projects
  const videos = await db.select<{ id: string }>(`SELECT id FROM media_video WHERE is_sample = true ORDER BY sort_order ASC LIMIT 4`);
  const mediaProjects = await db.select<{ id: string }>(`SELECT id FROM project WHERE division = 'media' AND is_sample = true ORDER BY sort_order ASC LIMIT 4`);
  for (let i = 0; i < Math.min(videos.length, mediaProjects.length); i++) {
    await db.execute(`UPDATE media_video SET project_id = $1::text WHERE id = $2::text`, [mediaProjects[i]!.id, videos[i]!.id]);
  }
  if (mediaProjects[0]) {
    await db.execute(`UPDATE project SET hero_video_id = $1::text WHERE id = $2::text`, [videos[0]?.id ?? null, mediaProjects[0].id]);
  }
  if (mediaProjects[1]) {
    await db.execute(`UPDATE project SET hero_video_id = $1::text WHERE id = $2::text`, [videos[1]?.id ?? null, mediaProjects[1].id]);
  }

  // service hero images
  const serviceHeroes: Record<string, string> = {
    'sample-event-coverage': 'ast_demo_conf',
    'sample-wedding-story': 'ast_demo_wed',
    'sample-brand-films': 'ast_demo_brand',
    'sample-post-production': 'ast_demo_editing',
    'sample-product-engineering': 'ast_demo_ops',
    'sample-security-review': 'ast_demo_audit',
    'sample-design-systems': 'ast_demo_system',
    'sample-platform-support': 'ast_demo_hero_tech',
  };
  for (const [slug, assetId] of Object.entries(serviceHeroes)) {
    await db.execute(`UPDATE service SET hero_asset = $1::text WHERE slug = $2::text AND is_sample = true`, [assetId, slug]);
  }

  // founder portrait for the about_split / tech hero
  await db.execute(`UPDATE team_member SET avatar_asset_id = 'ast_demo_portrait' WHERE is_founder = true`);
  add('project', 0); // updated only; counts not incremented
  report.notes.push('Existing sample projects enriched with cover images, client labels, gallery frames and metrics (unverified metrics are hidden by the UI).');

  // ── 8. Photo gallery (media) ──────────────────────────────────────────────
  if (force || (await count('gallery')) === 0) {
    await insertRow('gallery', {
      slug: 'sample-behind-the-scenes',
      title: 'Behind the scenes — sample',
      description: 'A mixed set of stills showing how the demo site renders photo strips and galleries. Replace with real frames.',
      kind: 'photo',
      division: 'media',
      items: [
        { asset_id: 'ast_demo_street1', caption: 'Sample frame 1', alt: 'Sample photograph 1' },
        { asset_id: 'ast_demo_street2', caption: 'Sample frame 2', alt: 'Sample photograph 2' },
        { asset_id: 'ast_demo_street3', caption: 'Sample frame 3', alt: 'Sample photograph 3' },
        { asset_id: 'ast_demo_street4', caption: 'Sample frame 4', alt: 'Sample photograph 4' },
        { asset_id: 'ast_demo_street5', caption: 'Sample frame 5', alt: 'Sample photograph 5' },
        { asset_id: 'ast_demo_street6', caption: 'Sample frame 6', alt: 'Sample photograph 6' },
      ],
      is_featured: true,
      is_sample: true,
      status: 'published',
      sort_order: 1,
    });
    add('gallery');
    report.notes.push('Sample photo gallery added (used by the photo_strip fallback when no gallery slug is set).');
  } else {
    report.notes.push('gallery already has rows — skipped.');
  }

  // ── 9. Additional blog posts so the listing isn't empty ───────────────────
  if (force || (await count('blog_post')) <= 1) {
    const posts: Array<Record<string, unknown>> = [
      {
        slug: 'sample-cutting-a-90-second-recap',
        title: 'Notes from cutting a 90-second event recap',
        excerpt: 'A placeholder breakdown of how a short recap gets shaped — selects, pacing, music, and the one question that decides the opening shot.',
        body: [
          '## The brief',
          '',
          'A 90-second recap for social the week of the event. Replace this with the actual story: what the organisers cared about, what the audience was there for, and the shot that absolutely had to lead.',
          '',
          '- Pull selects before touching the timeline',
          '- Build to a single emotional peak, not ten small ones',
          '- Sound design sells the room before the picture does',
          '',
          '> This is placeholder prose. Replace it with real breakdowns before sharing.',
          '',
          '### What I would do differently next time',
          '',
          'Collect wild ambience for 60 seconds before the room fills. It covers every awkward edit.',
        ].join('\n'),
        division: 'media',
        category: 'Editing',
        tags: ['sample', 'editing', 'post'],
        reading_minutes: 4,
        is_sample: true,
        is_featured: true,
        status: 'published',
        published_at: new Date(Date.now() - 3 * 86400000).toISOString(),
        cover_asset_id: 'ast_demo_editing',
      },
      {
        slug: 'sample-writing-code-that-survives-handover',
        title: 'Writing code that survives handover',
        excerpt: 'A placeholder post on boring engineering: migrations you can reverse, error messages that mean something, and docs that are not lies.',
        body: [
          'Most production incidents I have been asked into were not caused by clever failures — they were caused by code that nobody on call could reason about.',
          '',
          '## Three small rules',
          '',
          '1. Every mutation logs who did it and why.',
          '2. If a background job can run twice without breaking, let it.',
          '3. Error messages should tell you what to do next.',
          '',
          '```ts',
          "if (!ctx.user) throw new ApiError(401, 'Sign in to continue');",
          '```',
          '',
          'Replace this with a real write-up when ready.',
        ].join('\n'),
        division: 'tech',
        category: 'Engineering',
        tags: ['sample', 'engineering'],
        reading_minutes: 5,
        is_sample: true,
        status: 'published',
        published_at: new Date(Date.now() - 10 * 86400000).toISOString(),
        cover_asset_id: 'ast_demo_hero_tech',
      },
    ];
    for (const p of posts) {
      await insertRow('blog_post', p);
      add('blog_post');
    }
    report.notes.push('Two additional sample blog posts added so the /blog listing and RSS feel populated.');
  } else {
    report.notes.push('blog_post already has multiple rows — skipped.');
  }

  // ── 10. A second sample submission for triage demo ────────────────────────
  const subCount = await count('contact_submission');
  if (force || subCount <= 1) {
    await insertRow('contact_submission', {
      form: 'tech',
      name: 'Sample brief — delete me',
      email: 'brief@example.test',
      organization: 'Sample Startup',
      service: 'build_from_scratch',
      project_type: 'web_app',
      budget_band: '5m_15m',
      timeline: '1_3_months',
      requirements: 'We need an admin dashboard and an API for our operations team. Integrations with Paystack and our existing Postgres. This is a sample submission for demo purposes.',
      message: 'Keen to chat next week.',
      page_path: '/tech/contact',
      ip_hash: null,
      consent: true,
      status: 'read',
      meta: { seeded: true },
    });
    add('contact_submission');
  }

  return report;
}

async function shutdown() {
  try {
    const { getDriver } = await import('../src/lib/db/driver');
    const driver = await getDriver();
    await driver.close();
  } catch {
    /* noop */
  }
}

main()
  .then(async (report) => {
    console.log('--- DEMO SEED REPORT ---');
    console.log(JSON.stringify(report, null, 2));
    await shutdown();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error(err);
    await shutdown();
    process.exit(1);
  });
