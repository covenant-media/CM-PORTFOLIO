/**
 * Development / first-run seed.
 *
 * Rules this file obeys (PRD §24 and the "never invent" constraint):
 *   • nothing here claims a client, a result, a certification or a testimonial —
 *     placeholder rows are written in a "replace me" voice and flagged
 *     `is_sample = TRUE` so the public UI labels them;
 *   • modules that must contain real facts only (testimonials, experience,
 *     certifications, resume, galleries) are intentionally left EMPTY so the
 *     published site shows its honest empty state instead of fiction;
 *   • every insert is idempotent: a table that already has rows is skipped
 *     unless `force` is passed.
 */
import { insertRow, getDb } from './index';
import { createUser } from '../auth/session';
import { SYSTEM_ROLES } from '../auth/permissions';

export interface SeedReport {
  created: Record<string, number>;
  skipped: string[];
  notes: string[];
}

async function count(table: string): Promise<number> {
  try {
    const db = await getDb();
    const rows = await db.select<{ n: number | string }>(`SELECT count(*)::int AS n FROM ${table}`);
    return Number(rows[0]?.n ?? 0);
  } catch {
    return 0;
  }
}

export async function seedDatabase({ force = false }: { force?: boolean } = {}): Promise<SeedReport> {
  const report: SeedReport = { created: {}, skipped: [], notes: [] };
  const add = (key: string, n = 1) => {
    report.created[key] = (report.created[key] ?? 0) + n;
  };

  // ── accounts ─────────────────────────────────────────────────────────────
  if (force || (await count('admin_user')) === 0) {
    for (const role of SYSTEM_ROLES) {
      const existing = await getDb().then((db) => db.select<{ id: string }>(`SELECT id FROM admin_role WHERE id = $1::text`, [`role_${role.key}`]));
      if (existing.length && !force) continue;
      await insertRow(
        'admin_role',
        {
          key: role.key,
          label: role.label,
          description: role.description,
          permissions: role.permissions,
          is_system: true,
        },
        { id: `role_${role.key}` },
      );
      add('admin_role');
    }

    const email = (process.env.ADMIN_EMAIL || 'covenant@example.test').toLowerCase();
    const password = process.env.ADMIN_PASSWORD || 'covenant-demo-2026';
    const created = await createUser({ email, name: 'Covenant Nsikan', password, role: 'owner', title: 'Owner' });
    if (created.ok) {
      add('admin_user');
      report.notes.push(`CMS sign-in seeded: ${email} — change the password immediately (ADMIN_EMAIL / ADMIN_PASSWORD override this).`);
    } else {
      report.skipped.push('admin_user (account already exists)');
    }
  } else {
    report.skipped.push('admin_user / admin_role');
  }

  // ── navigation ───────────────────────────────────────────────────────────
  if (force || (await count('navigation_item')) === 0) {
    const nav: { location: string; label: string; href: string; badge?: string; group?: string }[] = [
      { location: 'main_header', label: 'About', href: '/about' },
      { location: 'main_header', label: 'Services', href: '/services' },
      { location: 'main_header', label: 'Work', href: '/work' },
      { location: 'main_header', label: 'Writing', href: '/blog' },
      { location: 'main_header', label: 'Security', href: '/security' },
      { location: 'main_header', label: 'Contact', href: '/contact' },
      { location: 'main_footer', label: '— Studio', href: '/about' },
      { location: 'main_footer', label: 'Team', href: '/team' },
      { location: 'main_footer', label: 'Security & privacy', href: '/security' },
      { location: 'main_footer', label: '— Media portfolio', href: '/media' },
      { location: 'main_footer', label: 'Work', href: '/media/work' },
      { location: 'main_footer', label: 'Pricing', href: '/media/pricing' },
      { location: 'main_footer', label: '— Tech portfolio', href: '/tech' },
      { location: 'main_footer', label: 'Projects', href: '/tech/projects' },
      { location: 'main_footer', label: 'Résumé', href: '/tech/resume' },
      { location: 'media_header', label: 'Work', href: '/media/work' },
      { location: 'media_header', label: 'Services', href: '/media/services' },
      { location: 'media_header', label: 'About', href: '/media/about' },
      { location: 'media_header', label: 'Pricing', href: '/media/pricing' },
      { location: 'media_header', label: 'Contact', href: '/media/contact' },
      { location: 'media_footer', label: '— Portfolio', href: '/media/work' },
      { location: 'media_footer', label: 'Services', href: '/media/services' },
      { location: 'media_footer', label: 'Pricing', href: '/media/pricing' },
      { location: 'media_footer', label: '— Studio', href: '/media/about' },
      { location: 'media_footer', label: 'Contact', href: '/media/contact' },
      { location: 'tech_header', label: 'Projects', href: '/tech/projects' },
      { location: 'tech_header', label: 'Skills', href: '/tech/skills' },
      { location: 'tech_header', label: 'Services', href: '/tech/services' },
      { location: 'tech_header', label: 'Experience', href: '/tech/experience' },
      { location: 'tech_header', label: 'Résumé', href: '/tech/resume' },
      { location: 'tech_header', label: 'Contact', href: '/tech/contact' },
      { location: 'tech_footer', label: '— Work', href: '/tech/projects' },
      { location: 'tech_footer', label: 'Skills', href: '/tech/skills' },
      { location: 'tech_footer', label: 'Testimonials', href: '/tech/testimonials' },
      { location: 'tech_footer', label: '— Profile', href: '/tech/about' },
      { location: 'tech_footer', label: 'Experience', href: '/tech/experience' },
      { location: 'tech_footer', label: 'Résumé', href: '/tech/resume' },
    ];
    let order = 0;
    for (const item of nav) {
      order += 1;
      await insertRow('navigation_item', {
        location: item.location,
        label: item.label,
        href: item.href,
        is_external: false,
        open_new_tab: false,
        is_visible: true,
        badge: item.badge ?? null,
        sort_order: order,
      });
      add('navigation_item');
    }
    report.notes.push('Navigation seeded for all three experiences — reorder or rename in the CMS → Navigation.');
  } else {
    report.skipped.push('navigation_item');
  }

  // ── social links (unverified until the owner confirms them) ───────────────
  if (force || (await count('social_link')) === 0) {
    for (const [index, network] of ['instagram', 'youtube', 'x', 'linkedin', 'github', 'tiktok'].entries()) {
      await insertRow('social_link', {
        network,
        label: network === 'x' ? 'X' : network.charAt(0).toUpperCase() + network.slice(1),
        url: '#',
        handle: null,
        icon: network,
        placements: [network === 'github' || network === 'linkedin' ? 'tech' : 'media', 'main', 'footer'],
        is_verified: false,
        status: 'draft',
        sort_order: index + 1,
      });
      add('social_link');
    }
    report.notes.push('Social profiles added as unverified drafts — they stay hidden until each URL is confirmed in the CMS.');
  } else {
    report.skipped.push('social_link');
  }

  // ── services ─────────────────────────────────────────────────────────────
  if (force || (await count('service')) === 0) {
    const services: Record<string, unknown>[] = [
      {
        slug: 'sample-event-coverage',
        division: 'media',
        title: 'Event & conference coverage',
        summary: 'Two-camera coverage with audio, so nothing important is missed and nothing has to be re-shot.',
        description:
          'Placeholder service. Replace with what you actually deliver: crew size, camera package, audio plan, cut-down schedule and what happens on the day.\n\n- Planning call before the event\n- Two cameras + live audio capture\n- Backup cards on site, offloaded twice before leaving\n- Highlight cut plus full sessions delivered',
        icon: 'camera',
        bullets: ['Planning call before the date', 'Two cameras plus direct audio', 'Same-week social cut-down available'],
        deliverables: ['Highlight film', 'Full session recordings', 'Social verticals'],
        tools: ['Sony FX3', 'Wireless lav', 'Field recorder'],
        process: [
          { title: 'Brief', description: 'Run of show, must-have moments, deliverables.', duration: '1 call' },
          { title: 'Cover', description: 'On site, unobtrusive, backed up before leaving.', duration: 'Event day' },
          { title: 'Cut', description: 'Assembly, sound, colour, your notes.', duration: '5–10 days' },
          { title: 'Deliver', description: 'Masters plus platform-ready exports.', duration: '2 days' },
        ],
        price_note: 'Scoped per event — the date, hours and crew set the number.',
        cta_label: 'Ask about a date',
        cta_href: '/media/contact',
        is_featured: true,
        is_sample: true,
        status: 'published',
        sort_order: 1,
      },
      {
        slug: 'sample-wedding-story',
        division: 'media',
        title: 'Wedding story film',
        summary: 'The day told properly — real audio, honest pacing, no gimmicks.',
        description:
          'Placeholder service. Replace with your actual package: hours covered, second shooter, drone availability, teaser timing and the number of revision rounds.',
        icon: 'film',
        bullets: ['Full-day coverage', 'Ceremony audio via direct feed', 'Teaser within 72 hours'],
        deliverables: ['6–8 minute feature', '60-second teaser', 'Full ceremony and vows'],
        tools: ['Sony FX3', 'Gimbal', 'Drone (where permitted)'],
        price_note: 'Pricing appears here only once a package is confirmed.',
        cta_label: 'Check my date',
        cta_href: '/media/contact',
        is_sample: true,
        status: 'published',
        sort_order: 2,
      },
      {
        slug: 'sample-brand-films',
        division: 'media',
        title: 'Brand films & campaigns',
        summary: 'Script, shoot, edit, deliver — one person accountable for the whole thing.',
        description: 'Placeholder service. Replace with your process and what the client receives at each stage.',
        icon: 'video',
        bullets: ['Script and shot list before the shoot', 'Licensed music', 'Cutdowns for every platform'],
        deliverables: ['Hero film', '16:9, 1:1 and 9:16 cutdowns', 'Thumbnail frames'],
        is_sample: true,
        status: 'published',
        sort_order: 3,
      },
      {
        slug: 'sample-post-production',
        division: 'media',
        title: 'Editing, colour & motion',
        summary: 'You shot it. Send the drive and get a finished cut back.',
        description: 'Placeholder service. Replace with turnarounds, revision rounds and what you charge per minute.',
        icon: 'scissors',
        bullets: ['Edit in DaVinci Resolve', 'Colour pass included', 'Motion titles on request'],
        deliverables: ['Master export', 'Social versions', 'Project files on request'],
        is_sample: true,
        status: 'published',
        sort_order: 4,
      },
      {
        slug: 'sample-product-engineering',
        division: 'tech',
        title: 'Product engineering',
        summary: 'Web and API work end to end: schema, server, interface, deployment.',
        description:
          'Placeholder service. Replace with the stack you actually ship on, how you scope, and what a first sprint looks like.\n\nTypical shape of an engagement:\n\n- Discovery and a written scope\n- Vertical slices, demoed weekly\n- Handover with docs and a runbook',
        icon: 'code',
        bullets: ['Next.js / TypeScript front ends', 'Postgres + typed APIs', 'Deployment you can operate yourself'],
        deliverables: ['Working product', 'Repository with CI', 'Documentation and handover'],
        tools: ['TypeScript', 'Next.js', 'PostgreSQL', 'Docker'],
        price_note: 'Scoped per engagement — request a quote.',
        cta_label: 'Send the brief',
        cta_href: '/tech/contact',
        is_featured: true,
        is_sample: true,
        status: 'published',
        sort_order: 1,
      },
      {
        slug: 'sample-security-review',
        division: 'tech',
        title: 'Security review & hardening',
        summary: 'A read of your app against how it is actually attacked, then fixes that ship.',
        description:
          'Placeholder service. Replace with your real methodology, what is in scope, and what the report contains. Do not claim certifications you do not hold.',
        icon: 'shield',
        bullets: ['Authn/authz and session review', 'Dependency and supply-chain pass', 'Findings ranked by exploitability'],
        deliverables: ['Findings report', 'Prioritised fix list', 'Re-test after remediation'],
        price_note: 'Scoped per engagement.',
        cta_label: 'Book a review',
        cta_href: '/tech/contact',
        is_sample: true,
        status: 'published',
        sort_order: 2,
      },
      {
        slug: 'sample-design-systems',
        division: 'tech',
        title: 'Interfaces & design systems',
        summary: 'Component libraries that survive a team of five touching them.',
        description: 'Placeholder service. Replace with how you audit, tokenise and hand over a system.',
        icon: 'layers',
        bullets: ['Token-based theming', 'Accessible by default', 'Documented usage rules'],
        is_sample: true,
        status: 'published',
        sort_order: 3,
      },
      {
        slug: 'sample-platform-support',
        division: 'tech',
        title: 'Platform & ongoing support',
        summary: 'Someone accountable for uptime, backups and the boring maintenance.',
        description: 'Placeholder service. Replace with response times and what a retainer covers.',
        icon: 'gauge',
        bullets: ['Backups and restore drills', 'Dependency updates', 'Monthly health note'],
        is_sample: true,
        status: 'published',
        sort_order: 4,
      },
    ];
    for (const service of services) {
      await insertRow('service', service);
      add('service');
    }
    report.notes.push('Services seeded as flagged samples — rewrite them with your real scope and prices.');
  } else {
    report.skipped.push('service');
  }

  // ── videos (real public-domain test embeds, marked as samples) ─────────────
  if (force || (await count('media_video')) === 0) {
    const clips = [
      { id: 'aqz-KE-bpKQ', title: 'Sample reel — Big Buck Bunny', form: 'long_form', duration: 653 },
      { id: 'TLK3A0RELQ3g', title: 'Sample reel — Elephants Dream', form: 'long_form', duration: 653 },
      { id: 'eRsGyueVLvQ', title: 'Sample edit — Sintel', form: 'short_form', duration: 888 },
      { id: 'R6MlUcmOul8', title: 'Sample colour pass — Tears of Steel', form: 'short_form', duration: 734 },
    ];
    let order = 0;
    for (const clip of clips) {
      order += 1;
      const sourceUrl = `https://www.youtube.com/watch?v=${clip.id}`;
      await insertRow('media_video', {
        title: clip.title,
        description: 'Placeholder clip used to prove the paste-a-URL pipeline. Replace with your own work.',
        source: 'youtube',
        source_id: clip.id,
        source_url: sourceUrl,
        embed_url: `https://www.youtube-nocookie.com/embed/${clip.id}`,
        poster_url: `https://i.ytimg.com/vi/${clip.id}/hqdefault.jpg`,
        category: 'sample',
        form: clip.form,
        duration_s: clip.duration,
        tags: ['sample'],
        embed_config: { autoplay: false, mute: true, loop: false, controls: true },
        metadata_state: 'ready',
        metadata: { provider: 'youtube', note: 'Duration is indicative until the embed refreshes it.' },
        external_url: sourceUrl,
        is_featured: order <= 3,
        is_sample: true,
        status: 'published',
        published_at: new Date().toISOString(),
        sort_order: order,
      });
      add('media_video');
    }
    report.notes.push('Videos seeded from open Blender Foundation films so the player and paste-to-import flow can be tested. Delete them before launch.');
  } else {
    report.skipped.push('media_video');
  }

  // ── projects ─────────────────────────────────────────────────────────────
  if (force || (await count('project')) === 0) {
    const projects: Record<string, unknown>[] = [
      {
        slug: 'sample-conference-recap',
        division: 'media',
        title: 'Sample — conference recap',
        category: 'event_coverage',
        form: 'short_form',
        summary: 'A 90-second recap assembled from three days of sessions, used here to show the case-page layout.',
        role: 'Edit, colour, sound',
        problem: 'Replace this with the actual brief: what the client needed, in their words, and the constraint that mattered (time, access, no re-shoots).',
        solution: 'Replace this with how you solved it — crew, kit, schedule, and the editorial decision that made the cut work.',
        outcomes: [],
        technologies: [],
        services: ['sample-event-coverage'],
        tools: ['DaVinci Resolve', 'Premiere Pro'],
        deliverables: ['90s recap', 'Six vertical cutdowns'],
        location: 'Lagos',
        year: new Date().getFullYear(),
        duration_label: '1:30',
        external_links: [],
        gallery: [],
        credits: [],
        metrics: [],
        is_featured: true,
        is_sample: true,
        status: 'published',
        published_at: new Date().toISOString(),
        sort_order: 1,
      },
      {
        slug: 'sample-wedding-feature',
        division: 'media',
        title: 'Sample — wedding feature',
        category: 'wedding_coverage',
        form: 'long_form',
        summary: 'Placeholder feature film showing how a longer case page reads: brief, approach, stills, film.',
        role: 'Two-camera coverage, edit',
        problem: 'Replace with the couple’s actual ask and what made the daylogistically tricky.',
        solution: 'Replace with the plan you ran and why it worked.',
        outcomes: [],
        services: ['sample-wedding-story'],
        tools: ['Sony FX3', 'Gimbal'],
        deliverables: ['7 minute feature', '60 second teaser'],
        location: 'Ibadan',
        year: new Date().getFullYear() - 1,
        duration_label: '7:02',
        gallery: [],
        metrics: [],
        is_sample: true,
        status: 'published',
        published_at: new Date().toISOString(),
        sort_order: 2,
      },
      {
        slug: 'sample-brand-film',
        division: 'media',
        title: 'Sample — brand film',
        category: 'commercial_videos',
        form: 'long_form',
        summary: 'Placeholder commercial case: script to delivery, with the frames and credits in place.',
        role: 'Director / editor',
        problem: 'Replace with the brand problem in one sentence.',
        solution: 'Replace with the creative idea and the production reality.',
        services: ['sample-brand-films'],
        deliverables: ['60s hero', '15s and 6s cutdowns'],
        metrics: [],
        is_sample: true,
        status: 'published',
        published_at: new Date().toISOString(),
        sort_order: 3,
      },
      {
        slug: 'sample-operations-platform',
        division: 'tech',
        title: 'Sample — operations platform',
        category: 'web_app',
        form: null,
        summary: 'Placeholder software case showing problem → approach → stack → outcomes, with no invented metrics.',
        role: 'Lead engineer (design through deployment)',
        problem: 'Replace with the operational pain that justified building this.',
        solution: 'Replace with the architecture decision that mattered and why it was the right one.',
        outcomes: [],
        technologies: ['TypeScript', 'Next.js', 'PostgreSQL', 'Docker'],
        services: ['sample-product-engineering'],
        tools: ['Playwright', 'GitHub Actions'],
        deliverables: ['Web app', 'Typed API', 'CI pipeline'],
        year: new Date().getFullYear(),
        external_links: [],
        gallery: [],
        metrics: [],
        is_featured: true,
        is_sample: true,
        status: 'published',
        published_at: new Date().toISOString(),
        sort_order: 1,
      },
      {
        slug: 'sample-security-review',
        division: 'tech',
        title: 'Sample — authentication review',
        category: 'cybersecurity',
        form: null,
        summary: 'Placeholder review case: what was examined, how findings were ranked, what changed afterwards.',
        role: 'Reviewer',
        problem: 'Replace with the risk that triggered the review.',
        solution: 'Replace with the method you actually used and what you found.',
        outcomes: [],
        technologies: ['Node.js', 'OpenAPI'],
        services: ['sample-security-review'],
        deliverables: ['Findings report', 'Fix plan', 'Re-test'],
        metrics: [],
        is_sample: true,
        status: 'published',
        published_at: new Date().toISOString(),
        sort_order: 2,
      },
      {
        slug: 'sample-design-system',
        division: 'tech',
        title: 'Sample — design system',
        category: 'ui_ux',
        form: null,
        summary: 'Placeholder systems case: tokens, components, documentation, adoption.',
        role: 'Design engineer',
        problem: 'Replace with the inconsistency cost you were asked to fix.',
        solution: 'Replace with the token model and the adoption plan.',
        technologies: ['Tailwind CSS', 'React'],
        services: ['sample-design-systems'],
        metrics: [],
        is_sample: true,
        status: 'published',
        published_at: new Date().toISOString(),
        sort_order: 3,
      },
    ];
    for (const project of projects) {
      const row = await insertRow('project', project);
      add('project');
      // attach two sample clips to the first media case so the reel renders
      if (project.division === 'media' && Number(project.sort_order) <= 2) {
        const videos = await getDb().then((db) => db.select<{ id: string }>(`SELECT id FROM media_video ORDER BY sort_order ASC LIMIT 2`));
        for (const [index, video] of videos.entries()) {
          await getDb().then((db) => db.execute(`UPDATE media_video SET project_id = $1::text WHERE id = $2::text`, [String(row.id), video.id]));
          void index;
        }
      }
    }
    report.notes.push('Projects seeded as samples with no clients, metrics or outcomes filled in — those stay hidden until you add verified facts.');
  } else {
    report.skipped.push('project');
  }

  // ── skills ───────────────────────────────────────────────────────────────
  if (force || (await count('skill')) === 0) {
    const skills: [string, string, number][] = [
      ['TypeScript', 'frontend', 5],
      ['React / Next.js', 'frontend', 5],
      ['Tailwind CSS', 'frontend', 4],
      ['Node.js', 'backend', 5],
      ['PostgreSQL', 'backend', 4],
      ['Go', 'backend', 3],
      ['Docker & CI/CD', 'infrastructure', 4],
      ['Threat modelling', 'security', 4],
      ['Web app pentest review', 'security', 3],
      ['Design systems', 'design', 4],
      ['Accessibility (WCAG 2.2 AA)', 'design', 4],
      ['Python automation', 'data', 3],
    ];
    let order = 0;
    for (const [name, category, level] of skills) {
      order += 1;
      await insertRow('skill', {
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        category,
        level,
        confidence: 'practised',
        description: 'Placeholder entry — replace with the specific context you have used this in.',
        icon: null,
        division: 'tech',
        is_featured: level >= 5,
        is_sample: true,
        status: 'published',
        sort_order: order,
      });
      add('skill');
    }
    report.notes.push('Skills seeded as samples with no years or evidence claims. Add evidence (a project, a repo, a talk) or remove the row.');
  } else {
    report.skipped.push('skill');
  }

  // ── team: founder + one flagged open slot ────────────────────────────────
  if (force || (await count('team_member')) === 0) {
    await insertRow('team_member', {
      name: 'Covenant Nsikan',
      role: 'Founder — media & technology',
      bio: 'Runs Covenant Media: films and photography on one side, software and security on the other. Replace this bio in the CMS → Team.',
      is_founder: true,
      is_placeholder: false,
      division: 'main',
      focus: ['Direction', 'Edit', 'Architecture'],
      links: [],
      is_visible: true,
      sort_order: 1,
      status: 'published',
    });
    await insertRow('team_member', {
      name: 'Open slot',
      role: 'Second shooter / collaborator',
      bio: 'Placeholder row. Delete it, or turn it into a real collaborator when the crew grows.',
      is_founder: false,
      is_placeholder: true,
      division: 'media',
      focus: [],
      links: [],
      is_visible: true,
      sort_order: 2,
      status: 'published',
    });
    add('team_member', 2);
  } else {
    report.skipped.push('team_member');
  }

  // ── a single post, so the journal and prose styles can be checked ─────────
  if (force || (await count('blog_post')) === 0) {
    await insertRow('blog_post', {
      slug: 'sample-how-this-journal-works',
      title: 'How this journal will work',
      excerpt: 'A placeholder post that shows the layout: headline, prose, lists, a quote, code, and a link back to the work it belongs to.',
      body: [
        'This post exists so the reading view, the typographic scale and the RSS feed can be checked before real writing lands.',
        '',
        '## What will go here',
        '',
        '- Edit breakdowns: what was shot, what survived the cut, why.',
        '- Engineering notes: decisions that saved time, and ones that cost it.',
        '- Security write-ups that are safe to publish — no client names, no vulnerability details.',
        '',
        '> Delete this post once the first real one is ready.',
        '',
        '```ts',
        'const revalidate = 60; // seconds — CMS writes also bust the cache directly',
        '```',
        '',
        'Everything here is edited in the CMS → Blog; nothing is hardcoded in the page.',
      ].join('\n'),
      division: 'main',
      category: 'Notes',
      tags: ['sample'],
      reading_minutes: 2,
      is_sample: true,
      is_featured: false,
      status: 'published',
      published_at: new Date().toISOString(),
    });
    add('blog_post');
  } else {
    report.skipped.push('blog_post');
  }

  // ── pricing: quote-mode rows, no invented numbers ────────────────────────
  if (force || (await count('pricing_package')) === 0) {
    const packages: Record<string, unknown>[] = [
      {
        division: 'media',
        name: 'Half-day coverage',
        tagline: 'Up to five hours, one camera, one editor.',
        mode: 'quote',
        amount: null,
        currency: 'NGN',
        period: null,
        includes: ['Planning call', 'One camera + direct audio', 'One highlight cut', 'One revision round'],
        exclusions: ['Travel outside the city', 'Drone', 'Extra editors'],
        turnaround: 'Delivery in 7–10 days',
        notes: 'Add a number here only when the price is real.',
        is_featured: false,
        is_sample: true,
        status: 'published',
        sort_order: 1,
      },
      {
        division: 'media',
        name: 'Full event coverage',
        tagline: 'Two cameras, a second shooter, sessions kept in full.',
        mode: 'quote',
        amount: null,
        currency: 'NGN',
        period: null,
        includes: ['Full-day coverage', 'Two cameras + audio feed', 'Highlight film', 'Full sessions delivered', 'Two revision rounds'],
        exclusions: ['Same-day edit'],
        turnaround: 'Delivery in 10–14 days',
        is_featured: true,
        is_sample: true,
        status: 'published',
        sort_order: 2,
      },
      {
        division: 'media',
        name: 'Wedding story',
        tagline: 'The whole day, told properly.',
        mode: 'quote',
        amount: null,
        currency: 'NGN',
        period: null,
        includes: ['Prep to send-off', 'Two cameras + gimbal', 'Teaser in 72 hours', 'Feature film', 'Ceremony and vows in full'],
        exclusions: ['Album design', 'Raw footage handover'],
        is_sample: true,
        status: 'published',
        sort_order: 3,
      },
      {
        division: 'tech',
        name: 'Discovery & scope',
        tagline: 'A short paid engagement that ends with a plan you can hand to anyone.',
        mode: 'quote',
        amount: null,
        currency: 'NGN',
        includes: ['Interviews with the people who use the system', 'Written scope and estimate', 'Architecture recommendation'],
        exclusions: ['Implementation'],
        is_sample: true,
        status: 'published',
        sort_order: 1,
      },
      {
        division: 'tech',
        name: 'Build engagement',
        tagline: 'Design through deployment, demoed weekly.',
        mode: 'quote',
        amount: null,
        currency: 'NGN',
        includes: ['Vertical slices shipped weekly', 'Typed API and migrations', 'CI and deployment', 'Handover docs and runbook'],
        exclusions: ['Ongoing hosting', 'Third-party licence fees'],
        is_featured: true,
        is_sample: true,
        status: 'published',
        sort_order: 2,
      },
      {
        division: 'tech',
        name: 'Security review',
        tagline: 'Read-only assessment, then a ranked fix list.',
        mode: 'quote',
        amount: null,
        currency: 'NGN',
        includes: ['Authn/authz and session review', 'Dependency and supply-chain pass', 'Findings report', 'Re-test after fixes'],
        is_sample: true,
        status: 'published',
        sort_order: 3,
      },
    ];
    for (const pkg of packages) {
      await insertRow('pricing_package', pkg);
      add('pricing_package');
    }
    report.notes.push('Pricing rows carry no amounts on purpose — set mode and amount in the CMS when the numbers are real.');
  } else {
    report.skipped.push('pricing_package');
  }

  // ── pages + sections (so the CMS has something to edit on day one) ───────
  if (force || (await count('page')) === 0) {
    const pages: { slug: string; title: string; navLabel: string; surface: string; description: string; blocks: { type: string; name: string; props?: Record<string, unknown> }[] }[] = [
      {
        slug: 'home',
        title: 'Covenant Media',
        navLabel: 'Home',
        surface: 'main',
        description: 'Media production and software engineering under one roof.',
        blocks: [
          { type: 'hero_brand', name: 'Homepage hero' },
          { type: 'two_worlds', name: 'Two disciplines' },
          { type: 'stats_band', name: 'Counters', props: { autoCounts: true } },
          { type: 'project_grid', name: 'Selected work', props: { division: 'all', limit: 6, layout: 'mosaic', ctaLabel: 'See all work', ctaHref: '/work' } },
          { type: 'service_grid', name: 'Services' },
          { type: 'statement', name: 'Positioning', props: { variant: 'split' } },
          { type: 'video_wall', name: 'Reel strip', props: { layout: 'strip', limit: 6 } },
          { type: 'testimonial_wall', name: 'Client words', props: { division: 'all', limit: 3 } },
          { type: 'contact_block', name: 'Contact' },
        ],
      },
      {
        slug: 'about',
        title: 'About',
        navLabel: 'About',
        surface: 'main',
        description: 'Who is behind Covenant Media.',
        blocks: [
          { type: 'about_split', name: 'Founder intro' },
          { type: 'stats_band', name: 'Counters', props: { autoCounts: true } },
          { type: 'two_worlds', name: 'Two disciplines' },
          { type: 'team_grid', name: 'Team' },
          { type: 'contact_block', name: 'Contact' },
        ],
      },
      {
        slug: 'media',
        title: 'Media Portfolio',
        navLabel: 'Media',
        surface: 'media',
        description: 'Cinematic event, brand and story films.',
        blocks: [
          { type: 'hero_media', name: 'Media hero' },
          { type: 'video_wall', name: 'Reel', props: { limit: 6 } },
          { type: 'project_grid', name: 'Selected work', props: { division: 'media', limit: 6, layout: 'mosaic' } },
          { type: 'service_grid', name: 'Services', props: { division: 'media' } },
          { type: 'testimonial_wall', name: 'Client words', props: { division: 'media' } },
          { type: 'contact_block', name: 'Contact', props: { variant: 'media' } },
        ],
      },
      {
        slug: 'tech',
        title: 'Tech Portfolio',
        navLabel: 'Tech',
        surface: 'tech',
        description: 'Software engineering, design and cybersecurity.',
        blocks: [
          { type: 'hero_tech', name: 'Tech hero' },
          { type: 'skill_matrix', name: 'Skills', props: { layout: 'matrix' } },
          { type: 'project_grid', name: 'Projects', props: { division: 'tech', limit: 3, layout: 'wide' } },
          { type: 'service_grid', name: 'Services', props: { division: 'tech' } },
          { type: 'experience_timeline', name: 'Experience', props: { limit: 3 } },
          { type: 'certifications', name: 'Certifications' },
          { type: 'contact_block', name: 'Contact', props: { variant: 'tech' } },
        ],
      },
    ];

    for (const page of pages) {
      const row = await insertRow('page', {
        slug: page.slug,
        title: page.title,
        nav_label: page.navLabel,
        surface: page.surface,
        status: 'published',
        description: page.description,
        published_at: new Date().toISOString(),
      });
      add('page');
      let order = 0;
      for (const block of page.blocks) {
        order += 1;
        const blockRow = await insertRow('content_block', {
          block_type: block.type,
          name: block.name,
          headline: null,
          eyebrow: null,
          body: null,
          props: block.props ?? {},
          media: [],
          links: [],
          status: 'published',
          is_sample: false,
        });
        await insertRow('page_block', {
          page_id: String(row.id),
          block_id: String(blockRow.id),
          placement: 'default',
          variant: null,
          sort_order: order,
          is_visible: true,
          overrides: {},
        });
        add('content_block');
        add('page_block');
      }
    }
    report.notes.push('Four CMS pages created with their sections attached — reorder or detach them in the CMS → Homepage sections.');
  } else {
    report.skipped.push('page / content_block');
  }

  // ── one sample enquiry, so triage and export can be exercised ────────────
  if (force || (await count('contact_submission')) === 0) {
    await insertRow('contact_submission', {
      form: 'media',
      name: 'Sample enquiry — delete me',
      email: 'sample@example.test',
      phone: null,
      service: 'event_coverage',
      project_type: 'event',
      location: 'Lagos',
      budget_band: 'not_sure',
      timeline: '1_3_months',
      message: 'This row exists so the Submissions list, status changes and CSV export can be tested. Delete it.',
      page_path: '/media/contact',
      ip_hash: null,
      consent: false,
      status: 'new',
      meta: { seeded: true },
    });
    add('contact_submission');
  } else {
    report.skipped.push('contact_submission');
  }

  report.notes.push('Left empty on purpose: testimonials, experience, certifications, resume, galleries, photos, media library. Add real content in the CMS.');
  return report;
}
