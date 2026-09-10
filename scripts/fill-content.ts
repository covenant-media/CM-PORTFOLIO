/**
 * Fill placeholders across main / media / tech surfaces with simulated but
 * realistic demo copy. Idempotent — safe to run multiple times.
 *
 *   node --import tsx scripts/fill-content.ts
 */
process.env.CM_SCRIPT = '1';

import { getDb, insertRow } from '../src/lib/db/index';

async function main() {
  const db = await getDb();
  const notes: string[] = [];
  const counts: Record<string, number> = {};
  const add = (k: string, n = 1) => (counts[k] = (counts[k] ?? 0) + n);

  // ── 1. Ensure every existing service has a realistic process array ─────
  const serviceProcess: Record<string, { title: string; description: string; duration: string }[]> = {
    'sample-event-coverage': [
      { title: 'Brief & run-of-show', description: 'A 30-minute call to lock the date, venue, attendees, must-have moments and turnaround. You get a short written brief back.', duration: '1 call · 2 days before' },
      { title: 'Recce & kit prep', description: 'Venue walkthrough where possible, batteries charged, cards formatted, audio kit tested the night before.', duration: 'Day before' },
      { title: 'On-site coverage', description: 'Two cameras, lav audio on all key speakers, backup recorder. Cards are offloaded and verified before leaving the venue.', duration: 'Event day' },
      { title: 'Assembly cut', description: 'Selects pulled against the brief, narrative structure built, sound cleaned, music chosen from licensed library.', duration: 'Days 1–3' },
      { title: 'Colour & polish', description: 'Colour grade, audio mix, motion titles, two rounds of notes from you against the cut.', duration: 'Days 4–9' },
      { title: 'Master & cutdowns', description: 'Hero master delivered as ProRes + H.264 plus vertical cutdowns sized for Instagram, TikTok and WhatsApp.', duration: 'Day 10' },
    ],
    'sample-wedding-story': [
      { title: 'Couple call', description: 'An hour getting to know you, how you met, which parts of the day actually matter, and anything you definitely do not want filmed.', duration: '4–6 weeks before' },
      { title: 'Shot list & timeline', description: 'Shared doc with locations, family groups, key moments and the reception run-of-show so nothing gets missed.', duration: '1 week before' },
      { title: 'Coverage', description: 'Two cameras from prep through send-off, direct ceremony audio, ambient recorded all day. Unobtrusive — the day is yours.', duration: 'Wedding day' },
      { title: 'Teaser cut', description: '60-second teaser turned around in 72 hours so you have something to share while the full edit lands.', duration: '72 hours' },
      { title: 'Feature edit', description: '6–8 minute story cut to sound, not to a song. Vows and speeches carried at their real length.', duration: '3–4 weeks' },
      { title: 'Deliverables', description: 'Feature film, ceremony full, speeches full, social verticals, downloadable gallery with all usable stills.', duration: 'On approval' },
    ],
    'sample-brand-films': [
      { title: 'Discovery', description: 'Understand the audience, the one thing they should remember, and where the film will live (web, social, pitch deck).', duration: '1 call' },
      { title: 'Script & shot list', description: 'Treatment, script, two-column shot list, talent/location/prop plan agreed before a frame is shot.', duration: '5–10 days' },
      { title: 'Pre-production', description: 'Crew, kit, schedule, releases. Everything booked in writing with backup dates.', duration: 'Varies' },
      { title: 'Shoot', description: 'Small crew, directed to feel natural for on-camera contributors. Wild sound recorded everywhere.', duration: '1–2 shoot days' },
      { title: 'Edit, sound, grade', description: 'Assembly within a week, two rounds of notes on the cut, licensed music, mix and colour.', duration: '10–14 days' },
      { title: 'Delivery & cutdowns', description: 'Hero film plus 16:9, 1:1 and 9:16 exports, thumbnail frames, closed captions on request.', duration: 'On sign-off' },
    ],
    'sample-post-production': [
      { title: 'Handshake', description: 'Confirm deliverable length, aspect ratios, turnaround, reference edits and how footage will arrive.', duration: 'Same day' },
      { title: 'Drive receive', description: 'Footage is backed up two places before the first clip drops. Proxy generation if needed.', duration: 'Day 0' },
      { title: 'Assembly', description: 'Radio cut first, then picture cut against it. You see a rough cut with timecode burn-in for notes.', duration: 'First half' },
      { title: 'Notes rounds', description: 'Two rounds of structured notes, one on rough and one on fine cut. Additional rounds scoped separately.', duration: 'Per round' },
      { title: 'Grade, sound, titles', description: 'Colour pass in Resolve, dialogue clean-up, loudness to platform spec, motion graphics and lower thirds.', duration: 'Final week' },
      { title: 'Master delivery', description: 'Master ProRes/H.265, platform-specific exports, XML/EDL handover on request.', duration: 'Final day' },
    ],
    'sample-product-engineering': [
      { title: 'Discovery & scope', description: 'Two conversations: one with the person paying, one with the people who will use the system. Output is a written scope with what is explicitly out.', duration: '1 week' },
      { title: 'Architecture spike', description: 'Schema, API surface, deploys and failure modes drawn on one page before code. Risky integrations get a throwaway spike.', duration: 'Week 2' },
      { title: 'Vertical slices', description: 'Working end-to-end slices demoed every week: one path through the system, deployable to staging, with tests.', duration: 'Sprints 1–N' },
      { title: 'Hardening', description: 'Auth, audit logs, idempotency, migrations that can be rolled back, error messages that tell an on-call engineer what to do.', duration: 'Last sprint' },
      { title: 'Load & security pass', description: 'Authentication and authorization walk-through, basic load test against the slowest path, secrets rotated.', duration: '1 week' },
      { title: 'Launch & handover', description: 'Production deploy, runbook, on-call sheet, CI pipeline you can operate without me. 30 days of light support included.', duration: 'Launch + 30 days' },
    ],
    'sample-security-review': [
      { title: 'Scoping', description: 'Define what is in/out of scope, where the code runs, who can talk me through auth and data flows. Signed NDA on file.', duration: '3 days' },
      { title: 'Read-only access', description: 'Codebase access on a read-only account, a staging environment with sanitised data, and a short walkthrough with the team.', duration: 'Week 1' },
      { title: 'Threat model', description: 'Map the system: assets, trust boundaries, likely attackers, and where you would actually get hurt. Findings start here.', duration: 'Days 1–3' },
      { title: 'Technical testing', description: 'Authz matrix checks, session handling, input validation, dependency review, supply-chain and CI checks. No destructive testing on production.', duration: 'Days 4–10' },
      { title: 'Report & review', description: 'Findings ranked by exploitability + business impact with clear reproduction steps, not CVSS theatre. Walkthrough call with your engineers.', duration: 'Days 11–14' },
      { title: 'Re-test', description: 'After you ship fixes, a second pass confirms what was fixed and what remains accepted risk.', duration: 'On your schedule' },
    ],
    'sample-design-systems': [
      { title: 'Audit', description: 'Inventory every button, input, card and colour currently in the product. Name the inconsistencies and cost.', duration: '1 week' },
      { title: 'Tokens', description: 'Define type, space, colour, motion and elevation tokens in code, not Figma only. One source of truth.', duration: 'Week 2' },
      { title: 'Primitives', description: 'Build the smallest presentational components first: Button, Input, Text, Stack, Card. With accessibility baked in.', duration: 'Weeks 3–4' },
      { title: 'Patterns', description: 'Compose primitives into the recurring patterns teams grab for every day (form, empty state, list, modal, navigation).', duration: 'Weeks 5–6' },
      { title: 'Docs & adoption', description: 'Usage guidelines, do/don\u2019t examples, codemods where possible, and paired migration time with the team.', duration: 'Weeks 7–8' },
      { title: 'Ownership handover', description: 'Leave a lightweight governance model: how to add or change a token, how to propose a new component, who approves.', duration: 'Final week' },
    ],
    'sample-platform-support': [
      { title: 'Handshake', description: 'Document the stack, deploy pipeline, and what "up" actually means. Agree response times per severity.', duration: '1 week' },
      { title: 'Baseline', description: 'Backups verified with a real restore drill. Monitoring and alerts wired to paging that actually wakes someone.', duration: 'Week 1' },
      { title: 'Dependency hygiene', description: 'Weekly update pass, security patches applied in a window, changelog summarised in one email.', duration: 'Ongoing' },
      { title: 'On-call', description: 'Incident response during agreed hours, postmortem within 48 hours of any paging event, action items tracked.', duration: 'Ongoing' },
      { title: 'Monthly review', description: 'One short note: uptime, cost, incidents, debt paid down, and one thing to improve next month.', duration: 'Monthly' },
    ],
  };

  for (const [slug, steps] of Object.entries(serviceProcess)) {
    const res = await db.execute(`UPDATE service SET process = $1::jsonb WHERE slug = $2::text`, [JSON.stringify(steps), slug]);
    if (res.affectedRows > 0) add('service', 1);
    notes.push(`Service "${slug}": ${steps.length} process steps populated.`);
  }

  // ── 2. Add 3 more team members (media crew placeholders) ──────────────────
  const extraTeam = [
    { name: 'Second shooter (open slot)', role: 'Second camera / B-cam', bio: 'Placeholder collaborator. Add your regular second shooter here — or leave this as an open slot and the site labels it honestly.', is_founder: false, is_placeholder: true, division: 'media', focus: ['B-cam', 'BTS'], links: [], is_visible: true, sort_order: 10, status: 'published' },
    { name: 'Sound recordist (open slot)', role: 'Production audio', bio: 'Placeholder for a sound recordist you bring on for commercial shoots and weddings where direct audio matters.', is_founder: false, is_placeholder: true, division: 'media', focus: ['Location audio', 'Lavs'], links: [], is_visible: true, sort_order: 11, status: 'published' },
    { name: 'Editing collaborator (open slot)', role: 'Editor / colour', bio: 'Placeholder for the editor you hand work to during heavy months. Delete the row if you work solo.', is_founder: false, is_placeholder: true, division: 'media', focus: ['Assembly', 'Colour'], links: [], is_visible: true, sort_order: 12, status: 'published' },
  ];
  for (const tm of extraTeam) {
    const existing = await db.select<{ id: string }>(`SELECT id FROM team_member WHERE name = $1::text AND is_placeholder = true`, [tm.name]);
    if (existing.length === 0) {
      await insertRow('team_member', tm);
      add('team_member');
    }
  }

  // ── 3. Add more testimonials (media + tech) ────────────────────────────────
  const newTestimonials: Array<Record<string, unknown>> = [
    { quote: '“We booked three weeks out and still got a thoughtful shoot plan, not a panicked yes. The vertical cutdowns were in our WhatsAapp before the hangover.”', author_name: 'Funmi K.', author_role: 'Bride', author_org: null, location: 'Lagos', division: 'media', rating: 5, is_sample: true, is_featured: false, status: 'published', sort_order: 10, source_note: 'Sample quote — replace.' },
    { quote: '“Our launch film beat every previous ad on click-through. The cutdowns for Reels and TikTok felt like they were made for those platforms, not squeezed from a 16:9 master.”', author_name: 'Daniel A.', author_role: 'Marketing lead', author_org: 'Sample Brand', location: 'Lagos', division: 'media', rating: 5, is_sample: true, status: 'published', sort_order: 11, source_note: 'Sample quote.' },
    { quote: '“Covenant is the first reviewer we\u2019ve worked with who wrote fixes that our team actually wanted to ship. No low-severity filler, no theatre. Just what would actually hurt us.”', author_name: 'Ifeoma O.', author_role: 'VP Engineering', author_org: 'Sample Fintech', location: 'Remote', division: 'tech', rating: 5, is_sample: true, status: 'published', sort_order: 10, source_note: 'Sample quote.' },
    { quote: '“We needed a dashboard in a month for operations staff who are scared of computers. The v1 shipped in five weeks, training took an afternoon, and nobody prints spreadsheets anymore.”', author_name: 'Chuka N.', author_role: 'Operations lead', author_org: 'Sample Logistics', location: 'Lagos', division: 'tech', rating: 5, is_sample: true, is_featured: true, status: 'published', sort_order: 11, source_note: 'Sample quote.' },
  ];
  for (const t of newTestimonials) {
    const exists = await db.select<{ id: string }>(`SELECT id FROM testimonial WHERE quote = $1::text AND is_sample = true`, [t.quote]);
    if (exists.length === 0) {
      await insertRow('testimonial', t);
      add('testimonial');
    }
  }

  // ── 4. Fill the about / about_split / statement blocks on existing pages
  type Block = { block_id: string; block_type: string; name: string; page_slug: string; sort: number };
  const existingBlocks = await db.select<Block>(
    `SELECT pb.block_id, cb.block_type, cb.name, p.slug AS page_slug, pb.sort_order AS sort
       FROM page_block pb
       JOIN content_block cb ON cb.id = pb.block_id
       JOIN page p ON p.id = pb.page_id
      ORDER BY p.slug, pb.sort_order`,
    [],
  );

  // Helper: upsert content onto a block (updates by id)
  async function setBlock(id: string, patch: Record<string, unknown>) {
    const sets: string[] = [];
    const params: unknown[] = [];
    for (const [k, v] of Object.entries(patch)) {
      params.push(v);
      sets.push(`${k} = $${params.length}::${k === 'props' || k === 'media' || k === 'links' ? 'jsonb' : 'text'}`);
    }
    params.push(id);
    await db.execute(`UPDATE content_block SET ${sets.join(', ')} WHERE id = $${params.length}::text`, params);
    add('content_block');
  }

  function pageBlocks(slug: string, type: string | null = null) {
    return existingBlocks.filter((b) => b.page_slug === slug && (!type || b.block_type === type));
  }

  // -- /about --
  {
    const aboutHero = pageBlocks('about', 'about_split')[0];
    if (aboutHero) {
      await setBlock(aboutHero.block_id, {
        eyebrow: 'About the studio',
        headline: 'One person who can point a camera and also write the migration.',
        body: [
          'Covenant Media is a small studio in Lagos run by **Covenant Nsikan** — filmmaker on one side, software engineer on the other.',
          '',
          'The work is deliberately simple: a few films at a time, a few engagements at a time, finished properly instead of fast and loud. Media shoots get the same engineering discipline you would want in production software (backups, checklists, a plan). Software engagements get a filmmaker\u2019s sense of pacing and what a user will actually sit through.',
          '',
          'The result is a studio that can produce a brand campaign on Tuesday and harden an authentication flow on Wednesday, without pretending to be two separate companies.',
        ].join('\n\n'),
        props: JSON.stringify({ showSocial: true, align: 'default' }),
      });
    }
    const aboutStatement = pageBlocks('about', 'statement')[0];
    if (aboutStatement) {
      await setBlock(aboutStatement.block_id, {
        eyebrow: 'Working principles',
        headline: 'Only ship work I would be proud to show someone I respect.',
        body: 'That rule decides what gets taken on, how shoots are run, how many open pull requests a project can carry, and when an email gets answered at midnight instead of the next morning.',
        props: JSON.stringify({ variant: 'default', showRule: true }),
      });
    }
  }

  // -- / (home) statement --
  {
    const homeStatement = pageBlocks('home', 'statement')[0];
    if (homeStatement) {
      await setBlock(homeStatement.block_id, {
        eyebrow: 'Why one studio',
        headline: 'Films made by someone who understands the stack they play on. Software built by someone who knows how a scene lands.',
        body: 'Two disciplines under one roof keeps the work honest: a launch film does not ship with a QR code that goes to a broken page, and an admin dashboard does not ship with the visual grace of a tax form.',
        props: JSON.stringify({ variant: 'split', emphasis: 'Craft on both sides of the lens and both sides of the screen.' }),
      });
    }
  }

  // -- /media hero media --
  {
    const mediaHero = pageBlocks('media', 'hero_media')[0];
    if (mediaHero) {
      await setBlock(mediaHero.block_id, {
        eyebrow: 'Covenant Media — portfolio',
        headline: 'WE CAPTURE.\nWE CREATE.\nWE INSPIRE.',
        body: 'Event coverage, weddings and brand films. Quiet cameras, solid audio, edits cut to real moments not a trend reel.',
      });
    }
    const featured = pageBlocks('media', 'featured_work')[0];
    if (featured) {
      await setBlock(featured.block_id, {
        eyebrow: 'Featured work',
        headline: 'Films that lead with a moment.',
        body: 'A few projects that show the range — full coverage days, brand films and edits, each cut to what the day actually felt like.',
      });
    }
    const shortForm = pageBlocks('media', 'short_form_rail')[0];
    if (shortForm) {
      await setBlock(shortForm.block_id, {
        eyebrow: 'Short-form',
        headline: 'Made for the feed.',
        body: 'Vertical cutdowns and social edits built for TikTok, Reels and Shorts — fast, captioned, and cut to hold the first three seconds.',
      });
    }
    const thumbnailWall = pageBlocks('media', 'thumbnail_wall')[0];
    if (thumbnailWall) {
      await setBlock(thumbnailWall.block_id, {
        eyebrow: 'Graphic work',
        headline: 'Covers that earn the click.',
        body: 'Thumbnail and cover design for channels, sermons and campaigns — built to read at phone size and stay on-brand across every crop.',
      });
    }
    const photoGallery = pageBlocks('media', 'photo_gallery')[0];
    if (photoGallery) {
      await setBlock(photoGallery.block_id, {
        eyebrow: 'Photography',
        headline: 'Stills that hold still.',
        body: 'Event, portrait and product photography from the same shoots — framed, backed up and delivered alongside the films.',
      });
    }
    const mediaProcess = pageBlocks('media', 'process_timeline')[0];
    if (mediaProcess) {
      await setBlock(mediaProcess.block_id, {
        eyebrow: 'Process',
        headline: 'Brief to delivery, without mystery.',
        body: 'The same five steps whether it is a wedding, a convention or a product launch — edited per project in the CMS.',
        props: JSON.stringify({
          layout: 'numbered',
          steps: [
            { title: 'Discovery', description: 'A short call or chat: what is happening, where, who it is for, and what “done” looks like.', duration: '1–2 days' },
            { title: 'Planning', description: 'Shot list, gear, crew and a timeline that leaves room for the moments nobody can script.', duration: '2–5 days' },
            { title: 'Production', description: 'Coverage day(s): multiple cameras, clean audio, backups running before the first frame.', duration: 'Event day' },
            { title: 'Edit', description: 'Assembly, colour, sound and captions — you review a cut and it is revised until it is right.', duration: '3–10 days' },
            { title: 'Delivery', description: 'Masters, cutdowns for social, and stills — handed over in organised folders, not a zip of chaos.', duration: '1 day' },
          ],
        }),
      });
    }
    const mediaAbout = pageBlocks('media', 'about_split')[0];
    if (mediaAbout) {
      await setBlock(mediaAbout.block_id, {
        eyebrow: 'About',
        headline: 'The person behind the camera.',
        body: [
          'Covenant Media is run by **Covenant Nsikan** — a filmmaker and editor who also builds software, which is why the process feels unusually organised for a creative service.',
          '',
          'The media side is about storytelling: event films, brand work and photography with an editor’s eye for pacing and colour. The technology side is why deadlines, backups and delivery folders are treated like production systems.',
        ].join('\n\n'),
        props: JSON.stringify({ align: 'default', showSocial: true }),
        media: JSON.stringify([{ asset_id: 'ast_demo_portrait', role: 'primary', caption: null, alt: 'Portrait — Covenant Nsikan (sample)' }]),
      });
    }
    const mediaStatement = pageBlocks('media', 'two_worlds')[0];
    if (mediaStatement) {
      // two_worlds is already bound to /media/tech cards; leave it alone but add eyebrow/headline
      await setBlock(mediaStatement.block_id, {
        eyebrow: 'Approach',
        headline: 'Coverage first, flash second.',
        body: 'Two cameras, reliable audio, backup cards, then whatever the brief calls for on top. I would rather come home with every important moment than with one beautiful slider shot and miss the vows.',
      });
    }
  }

  // -- /tech hero --
  {
    const techHero = pageBlocks('tech', 'hero_tech')[0];
    if (techHero) {
      await setBlock(techHero.block_id, {
        eyebrow: 'Covenant Nsikan',
        headline: 'I build systems that keep running after the demo.',
        body: 'Full-stack engineering, design systems and security work for teams that would rather ship than perform shipping.',
      });
    }
  }

  // ── 5. Create CMS pages for the routes that only had fallback plans ─────
  // Pages to create (slug, title, navLabel, surface, description, blocks)
  const newPages: Array<{
    slug: string; title: string; navLabel: string; surface: string; description: string;
    blocks: Array<{ type: string; name: string; eyebrow?: string; headline?: string; body?: string; props?: Record<string, unknown>; media?: Array<Record<string, unknown>>; links?: Array<{ label: string; href: string; variant: string }> }>;
  }> = [
    // /media/about
    {
      slug: 'media/about', title: 'About — Media', navLabel: 'About', surface: 'media',
      description: 'How Covenant Media approaches shoots and edits.',
      blocks: [
        { type: 'about_split', name: 'Media about', eyebrow: 'About the media side', headline: 'Quiet on set. Solid on audio. Honest on the edit.', body: [
          'Covenant has been shooting events, weddings and brand work since 2018. The priority on every job is the same: the real moment gets captured cleanly before anything cinematic happens on top of it.',
          '',
          'Crew is kept deliberately small. Two cameras and an audio kit cover most days; a second shooter and a sound recordist are brought in when the brief actually needs them, not because it looks impressive on a quote.',
          '',
          'Edits are cut in DaVinci Resolve, colour is finished by hand, and nothing leaves the edit suite with a stock music bed that drowned out the room.',
        ].join('\n\n'), props: { align: 'default' }, media: [{ asset_id: 'ast_demo_portrait', role: 'primary', caption: null, alt: 'Portrait — Covenant Nsikan (sample)' }] },
        { type: 'statement', name: 'Media philosophy', eyebrow: 'What you get', headline: 'A crew that blends in, footage that is backed up before we leave, and a cut that remembers the people in it.', body: 'If that sounds boring, good. Weddings and events are boring to shoot correctly until they are not — and the job is to be ready for that moment.', props: { variant: 'split' } },
        { type: 'photo_strip', name: 'BTS frames', props: { gallerySlug: 'sample-behind-the-scenes', layout: 'grid' } },
        { type: 'contact_block', name: 'Media contact', props: { variant: 'media' } },
      ],
    },
    // /media/services
    {
      slug: 'media/services', title: 'Media Services', navLabel: 'Services', surface: 'media',
      description: 'Event, wedding and brand film services.',
      blocks: [
        { type: 'page_header', name: 'Media services header', eyebrow: 'Services', headline: 'Media production, end to end.', body: 'Shoots, edits, colour and delivery. Pick a shape, we will scope it honestly.' },
        { type: 'service_grid', name: 'Media services grid', props: { division: 'media', limit: 12, layout: 'grid' }, eyebrow: 'Capabilities' },
        { type: 'process_timeline', name: 'Media process steps', eyebrow: 'How we work', headline: 'How a shoot moves from brief to delivery.', body: 'Every engagement goes through the same six stages. Numbers below are for a typical event coverage — brand films and weddings scale up and down but the shape stays the same.', props: { serviceSlug: 'sample-event-coverage', layout: 'numbered' } },
        { type: 'tools_grid', name: 'Media tools', props: { layout: 'grid', source: 'services' }, eyebrow: 'Toolkit', headline: 'The kit and the software.', body: 'Cameras, audio and the post pipeline the work runs on. The manual list in the CMS overrides this automatically.' },
        { type: 'contact_block', name: 'Media contact', props: { variant: 'media' } },
      ],
    },
    // /media/pricing already has no plan issues because plan exists; create a CMS page too with more tailored copy
    {
      slug: 'media/pricing', title: 'Media Pricing', navLabel: 'Pricing', surface: 'media',
      description: 'Starting prices and package shapes for media work.',
      blocks: [
        { type: 'page_header', name: 'Pricing header', eyebrow: 'Pricing', headline: 'Numbers only appear here when they are real.', body: 'Every shoot is scoped, but the shapes below show how pricing is typically structured. Numbers go live once they are confirmed.' },
        { type: 'pricing_table', name: 'Media pricing table', props: { division: 'media' } },
        { type: 'statement', name: 'Pricing note', eyebrow: 'Fine print', headline: 'Travel outside Lagos, second shooters, drone and same-day edits are quoted separately.', body: 'You will always get a written number before dates are booked. Nothing changes mid-job without a conversation.' },
        { type: 'contact_block', name: 'Media contact', props: { variant: 'media' } },
      ],
    },
    // /media/contact — plan already has contact_block; add CMS page with headline
    {
      slug: 'media/contact', title: 'Contact — Media', navLabel: 'Contact', surface: 'media',
      description: 'Hire Covenant for a shoot.',
      blocks: [
        { type: 'contact_block', name: 'Media contact block', eyebrow: 'Start a project', headline: 'Tell me about the shoot.', body: 'Date, location, what you need back, and when you need it by. A rough budget range helps me come back with a real shape instead of a vague reply.', props: { variant: 'media' } },
      ],
    },
    // /media/work - list
    {
      slug: 'media/work', title: 'Selected Media Work', navLabel: 'Work', surface: 'media',
      description: 'Filterable catalog of media projects.',
      blocks: [
        // The route itself renders the filterable, paginated ProjectCatalog below the
        // page header — a project_grid here would duplicate it (and ignore the filters).
        { type: 'page_header', name: 'Work header', eyebrow: 'Work', headline: 'The reel, end to end.', body: 'Films, edits, coverage, photography and cover design — filter by category or format, or search.' },
      ],
    },
    // /tech/about
    {
      slug: 'tech/about', title: 'About — Tech', navLabel: 'About', surface: 'tech',
      description: 'Engineering background and approach.',
      blocks: [
        { type: 'about_split', name: 'Tech about', eyebrow: 'About the tech side', headline: 'I write software the way I shoot events: boring first, clever only when it earns its place.', body: [
          'Covenant has been shipping production software since 2018, across early-stage startups, fintechs and internal tools for companies that cannot afford downtime.',
          '',
          'The work tends to cluster around three areas: product engineering (TypeScript / Postgres / Next.js), design systems that survive more than one designer, and application security reviews that produce fixes, not doorstop reports.',
          '',
          'Engagements are run as weekly vertical slices with demos, not six-month spec marathons. The boring parts — migrations, audit logs, error messages, backups — get done early because they are never easier than they are in week one.',
        ].join('\n\n'), props: { align: 'default' } },
        { type: 'statement', name: 'Tech philosophy', eyebrow: 'How I work', headline: 'The best system is one your team can operate, debug, and change after I leave.', body: 'That means documented decisions, small commits, runbooks, and a handover that does not depend on my phone being on.', props: { variant: 'split' } },
        { type: 'experience_timeline', name: 'Experience timeline', props: { limit: 12 } },
        { type: 'certifications', name: 'Certifications' },
        { type: 'contact_block', name: 'Tech contact', props: { variant: 'tech' } },
      ],
    },
    // /tech/services
    {
      slug: 'tech/services', title: 'Tech Services', navLabel: 'Services', surface: 'tech',
      description: 'Engineering, design systems, and security services.',
      blocks: [
        { type: 'page_header', name: 'Tech services header', eyebrow: 'Services', headline: 'Engineering, design systems and security.', body: 'Three broad shapes. Most engagements blend all three a little.' },
        { type: 'service_grid', name: 'Tech services grid', props: { division: 'tech', limit: 12 } },
        { type: 'process_timeline', name: 'Tech process steps', eyebrow: 'How an engagement runs', headline: 'From brief to handover, in six steps.', body: 'This is the shape for a build engagement. Reviews and retainers follow the same discovery → scoped work → handover rhythm.', props: { serviceSlug: 'sample-product-engineering', layout: 'numbered' } },
        { type: 'statement', name: 'Tech note', eyebrow: 'A note', headline: 'I will tell you when you do not need me.', body: 'If the problem can be solved with a spreadsheet, an off-the-shelf tool, or a weekend by one of your engineers, I will say so. Selling work that should not exist costs more than the fee.' },
        { type: 'contact_block', name: 'Tech contact', props: { variant: 'tech' } },
      ],
    },
    // /tech/projects
    {
      slug: 'tech/projects', title: 'Selected Tech Projects', navLabel: 'Projects', surface: 'tech',
      description: 'Software, design, and security case studies.',
      blocks: [
        { type: 'project_grid', name: 'Tech projects grid', props: { division: 'tech', limit: 12, layout: 'grid' } },
      ],
    },
    // /tech/skills
    {
      slug: 'tech/skills', title: 'Skills', navLabel: 'Skills', surface: 'tech',
      description: 'Capability matrix across engineering, design and security.',
      blocks: [
        { type: 'page_header', name: 'Skills header', eyebrow: 'Skills', headline: 'What I build with, and how deep.', body: 'Levels are self-described depth, not certifications. Anything marked 5 has real shipped work behind it.' },
        { type: 'skill_matrix', name: 'Skill bars', props: { layout: 'bars', limit: 40, showEvidence: true } },
        { type: 'tools_grid', name: 'Tools grid', props: { layout: 'grid' } },
        { type: 'certifications', name: 'Certifications' },
        { type: 'contact_block', name: 'Tech contact', props: { variant: 'tech' } },
      ],
    },
    // /tech/experience
    {
      slug: 'tech/experience', title: 'Experience', navLabel: 'Experience', surface: 'tech',
      description: 'Work and education timeline.',
      blocks: [
        { type: 'page_header', name: 'Experience header', eyebrow: 'Experience', headline: 'Where I have built, broken, and learned.' },
        { type: 'experience_timeline', name: 'Timeline', props: { limit: 24 } },
        { type: 'contact_block', name: 'Tech contact', props: { variant: 'tech' } },
      ],
    },
    // /tech/testimonials
    {
      slug: 'tech/testimonials', title: 'What clients say', navLabel: 'Testimonials', surface: 'tech',
      description: 'Client words on engineering and security work.',
      blocks: [
        { type: 'page_header', name: 'Testimonials header', eyebrow: 'Clients', headline: 'What clients say.' },
        { type: 'testimonial_wall', name: 'Tech testimonials', props: { division: 'tech', limit: 12 } },
        { type: 'contact_block', name: 'Tech contact', props: { variant: 'tech' } },
      ],
    },
    // /tech/resume
    {
      slug: 'tech/resume', title: 'Resume', navLabel: 'Resume', surface: 'tech',
      description: 'Downloadable resume.',
      blocks: [{ type: 'resume_block', name: 'Resume download' }],
    },
    // /tech/contact
    {
      slug: 'tech/contact', title: 'Contact — Tech', navLabel: 'Contact', surface: 'tech',
      description: 'Send a brief for engineering or security work.',
      blocks: [
        { type: 'contact_block', name: 'Tech contact block', eyebrow: 'Send the brief', headline: 'Tell me what needs building (or breaking).', body: 'A paragraph on the problem, any hard deadlines, and whether you already have a team. A rough budget helps but is not required.', props: { variant: 'tech' } },
      ],
    },
    // /services (main)
    {
      slug: 'services', title: 'Services', navLabel: 'Services', surface: 'main',
      description: 'Services across media and technology.',
      blocks: [
        { type: 'service_grid', name: 'Main services grid', props: { division: 'main', limit: 12 } },
        { type: 'process_timeline', name: 'Shared process steps', eyebrow: 'How engagements run', headline: 'A shared rhythm, whether the brief is a shoot or a system.', body: 'The same six-step shape is used for both disciplines so expectations stay consistent.', props: { layout: 'numbered', steps: [
          { title: 'Discovery & brief', description: 'One call to understand what you are actually trying to make, who it is for, and what success looks like. You get a written brief back.', duration: '3–5 days' },
          { title: 'Scope & plan', description: 'A clear written scope, what is explicitly out, a schedule, and a number. Dates are booked when the deposit lands.', duration: 'On sign-off' },
          { title: 'Pre-production', description: 'For shoots: crew, kit, recce. For software: architecture spike, schema, CI, and a staging environment.', duration: 'Week before' },
          { title: 'Production / build', description: 'The work itself: small-crew coverage for shoots, weekly demoed vertical slices for software. You see progress every week.', duration: 'Core engagement' },
          { title: 'Refine', description: 'Two structured rounds of notes on edits or builds. Feedback cycles stay bounded so nothing drifts.', duration: 'Final stretch' },
          { title: 'Deliver & handover', description: 'Finished masters, platform-specific exports, runbooks and source files. 30 days of light support included.', duration: 'Launch + 30 days' },
        ] } },
        { type: 'statement', name: 'Cross-discipline note', eyebrow: 'Combined briefs', headline: 'If the project needs both disciplines, say so up front.', body: 'Launch films with interactive companion pages, branded content with a working booking flow, or a security review paired with a rebuild — one team, one brief, one point of contact.' },
        { type: 'contact_block', name: 'Main contact', props: { variant: 'main' } },
      ],
    },
    // /work
    {
      slug: 'work', title: 'Selected Work', navLabel: 'Work', surface: 'main',
      description: 'Cross-discipline work across media and tech.',
      blocks: [{ type: 'project_grid', name: 'All work grid', props: { division: 'all', limit: 24, layout: 'mosaic' } }],
    },
    // /team
    {
      slug: 'team', title: 'Team', navLabel: 'Team', surface: 'main',
      description: 'The people behind Covenant Media.',
      blocks: [
        { type: 'team_grid', name: 'Team grid', props: { division: 'all' } },
        { type: 'contact_block', name: 'Main contact', props: { variant: 'main' } },
      ],
    },
    // /contact
    {
      slug: 'contact', title: 'Contact', navLabel: 'Contact', surface: 'main',
      description: 'Start a conversation.',
      blocks: [
        { type: 'contact_block', name: 'Main contact block', eyebrow: 'Start a conversation', headline: 'Tell me what you are making.', body: 'One form for media, technology or something that needs both.' },
      ],
    },
  ];

  for (const page of newPages) {
    const existing = await db.select<{ id: string }>(`SELECT id FROM page WHERE slug = $1::text`, [page.slug]);
    let pageId: string;
    if (existing.length) {
      pageId = existing[0]!.id;
      // update title/description
      await db.execute(
        `UPDATE page SET title = $1::text, description = $2::text, surface = $3::text, nav_label = COALESCE(nav_label, $4::text) WHERE id = $5::text`,
        [page.title, page.description, page.surface, page.navLabel, pageId],
      );
      // clear existing page_block for this page so we can re-compose
      await db.execute(`DELETE FROM page_block WHERE page_id = $1::text`, [pageId]);
    } else {
      const res = await insertRow('page', {
        slug: page.slug, title: page.title, nav_label: page.navLabel, surface: page.surface,
        status: 'published', description: page.description,
        published_at: new Date().toISOString(),
      });
      pageId = String(res.id);
      add('page');
    }
    let sort = 0;
    for (const b of page.blocks) {
      sort += 1;
      const blockRes = await insertRow('content_block', {
        block_type: b.type,
        name: b.name,
        eyebrow: b.eyebrow ?? null,
        headline: b.headline ?? null,
        body: b.body ?? null,
        props: b.props ?? {},
        media: b.media ?? [],
        links: b.links ?? [],
        status: 'published',
        is_sample: true,
      });
      await insertRow('page_block', {
        page_id: pageId,
        block_id: String(blockRes.id),
        placement: 'default',
        variant: null,
        sort_order: sort,
        is_visible: true,
        overrides: {},
      });
      add('content_block');
      add('page_block');
    }
  }

  // ── 7. Update tech header nav to anchor links (single-page portfolio) ──
  const techAnchors = [
    { label: 'Home', href: '/tech#home' },
    { label: 'About', href: '/tech#about' },
    { label: 'Skills', href: '/tech#skills' },
    { label: 'Services', href: '/tech#services' },
    { label: 'Portfolio', href: '/tech#projects' },
    { label: 'Experience', href: '/tech#experience' },
    { label: 'Contact', href: '/tech#contact' },
    { label: 'Resume', href: '/tech#resume' },
  ];
  await db.execute(`DELETE FROM navigation_item WHERE location = 'tech_header'`);
  let so = 0;
  for (const item of techAnchors) {
    so += 1;
    await insertRow('navigation_item', {
      location: 'tech_header',
      parent_id: null,
      label: item.label,
      href: item.href,
      is_visible: true,
      is_external: false,
      new_tab: false,
      sort_order: so,
    });
    add('navigation_item');
  }

  // ── 8. Seed tech footer nav (services list only — no "Quick links" column per user request) ──
  await db.execute(`DELETE FROM navigation_item WHERE location = 'tech_footer'`);
  const techFooter = [
    { label: 'Full Stack Development', href: '/tech#services' },
    { label: 'Frontend Development', href: '/tech#services' },
    { label: 'Backend Development', href: '/tech#services' },
    { label: 'Website Design', href: '/tech#services' },
    { label: 'UI/UX Design', href: '/tech#services' },
    { label: 'REST API Development', href: '/tech#services' },
    { label: 'Database Design', href: '/tech#services' },
    { label: 'Cloud Deployment', href: '/tech#services' },
    { label: 'Cybersecurity', href: '/tech#services' },
    { label: 'GRC Analysis', href: '/tech#services' },
    { label: 'IT Support', href: '/tech#services' },
    { label: 'Networking', href: '/tech#services' },
    { label: 'Digital Consulting', href: '/tech#services' },
  ];
  let fso = 0;
  for (const item of techFooter) {
    fso += 1;
    await insertRow('navigation_item', {
      location: 'tech_footer',
      parent_id: null,
      label: item.label,
      href: (item as { href?: string }).href ?? '#',
      is_visible: true,
      is_external: false,
      new_tab: false,
      sort_order: fso,
    });
    add('navigation_item');
  }

  // ── 9. Seed expanded tech services (14 cards to match modern dev portfolio) ──
  const techServices: Array<{ slug: string; title: string; summary: string; description: string; icon_key: string }> = [
    { slug: 'tech-fullstack', title: 'Full Stack Development', summary: 'End-to-end web applications with modern frameworks and battle-tested practices.', description: 'From database schema to pixel-perfect UI — full-lifecycle web application development using TypeScript, Next.js, Node, and Postgres. Authentication, payments, deployments, monitoring, and handover all included.', icon_key: 'code' },
    { slug: 'tech-frontend', title: 'Frontend Development', summary: 'Pixel-perfect, responsive interfaces with smooth animations and exceptional UX.', description: 'Interfaces built in React/Next with strict attention to accessibility, performance budgets, and motion. Every screen is tested on real devices, keyboard-navigable, and ships with a design token system your team can extend.', icon_key: 'layout' },
    { slug: 'tech-backend', title: 'Backend Development', summary: 'Scalable, secure server-side architecture with robust API design.', description: 'REST APIs, worker queues, idempotent endpoints, audit logs, and sensible error models. I pick boring technology that your team can debug at 3am without me.', icon_key: 'server' },
    { slug: 'tech-webdesign', title: 'Website Design', summary: 'Stunning visual designs that captivate audiences and elevate brand identity.', description: 'Marketing sites, landing pages, and portfolios designed to convert — built in the same codebase they ship in so the Figma and the live site actually match.', icon_key: 'palette' },
    { slug: 'tech-uiux', title: 'UI/UX Design', summary: 'User-centered design from wireframes through prototyping and usability testing.', description: 'Low-fi wireframes, interactive prototypes, accessibility audits, and usability testing with real users. Delivered as Figma files plus a tokenized implementation guide.', icon_key: 'grid' },
    { slug: 'tech-api', title: 'REST API Development', summary: 'Well-documented, efficient RESTful APIs that integrate cleanly.', description: 'APIs designed around your domain with OpenAPI docs, versioning strategy, auth, rate limits, idempotency keys, and SDKs for the platforms your clients actually use.', icon_key: 'link' },
    { slug: 'tech-database', title: 'Database Design', summary: 'Optimized database architectures for performance and data integrity.', description: 'Schema design, indexing, migrations, backup/restore drills, and query optimisation. I use Postgres for 90% of work and reach for Mongo/Firebase only when the data model genuinely calls for it.', icon_key: 'database' },
    { slug: 'tech-cloud', title: 'Cloud Deployment', summary: 'Reliable cloud infrastructure on AWS with monitoring and autoscaling.', description: 'Infrastructure-as-code (Terraform), CI/CD pipelines, blue/green deploys, monitoring dashboards, paging that actually wakes someone, and cost alarms before bill shock.', icon_key: 'rocket' },
    { slug: 'tech-security', title: 'Cybersecurity', summary: 'Security audits, vulnerability assessments, and protection strategies.', description: 'Threat modelling, authz matrix checks, dependency and supply-chain review, phishing simulations for staff, and a written report prioritised by what would actually hurt you.', icon_key: 'shield' },
    { slug: 'tech-grc', title: 'GRC Analysis', summary: 'Governance, Risk & Compliance — policy frameworks, risk registers, control mapping, audit support.', description: 'End-to-end GRC programs: governance structures, risk registers, control design & testing, SOX / ISO 27001 / NDPR readiness, audit liaison, and board-ready reporting that leadership can actually act on.', icon_key: 'layers' },
    { slug: 'tech-support', title: 'IT Support', summary: 'Professional technical support and IT consulting for businesses.', description: 'Ongoing IT support retainers for small businesses: workstations, email, SaaS procurement, security posture, and a phone number that gets answered during business hours.', icon_key: 'settings' },
    { slug: 'tech-networking', title: 'Networking', summary: 'Secure network configuration, troubleshooting, and optimization.', description: 'Office and small-campus network setup: VLANs, firewalls, Wi-Fi, VPNs for remote staff, and documentation your next IT person can follow.', icon_key: 'shield' },
    { slug: 'tech-consulting', title: 'Digital Consulting', summary: 'Strategic technology consulting to drive digital transformation.', description: 'Technology roadmaps, build-vs-buy analysis, vendor evaluation, hiring plans for engineering teams, and a second opinion on the architecture decisions that lock you in for years.', icon_key: 'book' },
  ];
  for (const svc of techServices) {
    const exists = await db.select<{ id: string }>(`SELECT id FROM service WHERE slug = $1::text`, [svc.slug]);
    if (exists.length === 0) {
      await insertRow('service', {
        slug: svc.slug,
        division: 'tech',
        title: svc.title,
        summary: svc.summary,
        description: svc.description,
        bullets: [],
        deliverables: [],
        tools: [],
        process: [],
        is_featured: false,
        is_sample: true,
        status: 'published',
        sort_order: 20,
        hero_asset: null,
      });
      add('service');
    }
  }

  // ── 10. Seed expanded tech skills (Frontend / Backend / Databases / UI-UX / Graphic) ──
  const techSkills: Array<{ name: string; category: string; level: number; evidence: string | null }> = [
    { name: 'HTML5', category: 'frontend', level: 5, evidence: 'Semantic, accessible markup across dozens of shipped pages' },
    { name: 'CSS3', category: 'frontend', level: 5, evidence: 'Custom design systems, animations, responsive layouts' },
    { name: 'JavaScript', category: 'frontend', level: 5, evidence: 'ES2023+ in production since 2018' },
    { name: 'TypeScript', category: 'frontend', level: 5, evidence: 'Strict-mode TS across every production codebase' },
    { name: 'React', category: 'frontend', level: 5, evidence: 'Primary UI framework since 2019' },
    { name: 'Next.js', category: 'frontend', level: 5, evidence: 'App Router, RSC, ISR, middleware on production apps' },
    { name: 'TailwindCSS', category: 'frontend', level: 5, evidence: 'Custom tokens & plugins on multiple client projects' },
    { name: 'BootStrap', category: 'frontend', level: 4, evidence: 'Legacy client migrations to modern stacks' },
    { name: 'Node.js', category: 'backend', level: 5, evidence: 'API servers, workers, CLI tooling since 2018' },
    { name: 'Express', category: 'backend', level: 5, evidence: 'REST APIs serving thousands of daily requests' },
    { name: 'Go', category: 'backend', level: 3, evidence: 'High-throughput worker services and CLI tools' },
    { name: 'Python', category: 'backend', level: 4, evidence: 'Data pipelines, automation scripts, FastAPI services' },
    { name: 'Java', category: 'backend', level: 3, evidence: 'Enterprise backend integrations' },
    { name: 'MongoDB', category: 'databases', level: 4, evidence: 'Document modelling and aggregation pipelines' },
    { name: 'MySQL', category: 'databases', level: 4, evidence: 'Relational design on client deployments' },
    { name: 'PostgreSQL', category: 'databases', level: 5, evidence: 'Default DB — schemas, indexes, RLS, migrations' },
    { name: 'Firebase', category: 'databases', level: 4, evidence: 'Realtime sync for mobile-first MVPs' },
    { name: 'Figma', category: 'design', level: 5, evidence: 'Wireframes, prototypes, design systems in Figma' },
    { name: 'GRC Analysis', category: 'grc', level: 5, evidence: 'Governance, Risk & Compliance programs, audit support' },
    { name: 'Risk Assessment', category: 'grc', level: 5, evidence: 'Risk registers, likelihood/impact scoring, treatment plans' },
    { name: 'Compliance Frameworks', category: 'grc', level: 4, evidence: 'SOX, ISO 27001, NDPR readiness and control mapping' },
  ];
  const catLabel: Record<string, string> = { frontend: 'Frontend', backend: 'Backend', databases: 'Databases', design: 'UI/UX', grc: 'GRC & Security' };
  for (const sk of techSkills) {
    const slug = sk.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const exists = await db.select<{ id: string }>(`SELECT id FROM skill WHERE slug = $1::text`, [slug]);
    if (exists.length === 0) {
      await insertRow('skill', {
        slug,
        name: sk.name,
        category: sk.category,
        category_label: catLabel[sk.category],
        level: sk.level,
        evidence: sk.evidence,
        division: 'tech',
        is_sample: true,
        years_start: null,
        is_featured: false,
        status: 'published',
        sort_order: 10,
      });
      add('skill');
    }
  }

  // ── 11. Seed expanded experience timeline ──────────────────────────────
  const techExperience: Array<{ range_label: string; role: string; organization: string; location: string | null; summary: string; start_date: string; end_date: string | null; technologies: string[] }> = [
    { range_label: '2021 — Present', role: 'Senior Full Stack Developer', organization: 'Covenant Media', location: null, summary: 'Lead engineer and founder — full-stack product development, security reviews, design systems and cloud deployments for client engagements across fintech, logistics and media.', start_date: '2021-01-01', end_date: null, technologies: ['TypeScript', 'Next.js', 'Node', 'Postgres', 'AWS', 'Security'] },
    { range_label: 'Present', role: 'Web Developer & IT Consultant', organization: 'NAAKISS Worldwide', location: null, summary: 'Building and maintaining the organisation\u2019s web presence, internal tooling, IT operations and digital transformation roadmap.', start_date: '2024-01-01', end_date: null, technologies: ['Web', 'Consulting', 'Support', 'Cloud'] },
    { range_label: 'Jan 2025 — Present', role: 'Backend Developer', organization: 'PalKeeper', location: null, summary: 'Backend developer for the PalKeeper application — API design, database schema, auth, payments and cloud deployment.', start_date: '2025-01-01', end_date: null, technologies: ['Node', 'Postgres', 'REST', 'AWS'] },
    { range_label: '2018 — 2021', role: 'Freelance Developer', organization: 'Independent', location: null, summary: 'Freelance web development for local businesses — websites, small internal tools, and IT support.', start_date: '2018-01-01', end_date: '2021-01-01', technologies: ['Development', 'Web', 'Client work'] },
  ];
  for (const ex of techExperience) {
    const exists = await db.select<{ id: string }>(`SELECT id FROM experience_item WHERE organization = $1::text AND role = $2::text`, [ex.organization, ex.role]);
    if (exists.length === 0) {
      await insertRow('experience_item', {
        role: ex.role,
        organization: ex.organization,
        location: ex.location,
        summary: ex.summary,
        bullets: [],
        technologies: ex.technologies,
        highlights: [],
        start_date: ex.start_date,
        end_date: ex.end_date,
        is_current: ex.end_date === null,
        start_label: ex.range_label.split('—')[0]?.trim() ?? ex.range_label,
        end_label: ex.end_date === null ? 'Present' : (ex.range_label.split('—')[1]?.trim() ?? ''),
        kind: 'work',
        is_sample: true,
        status: 'published',
        sort_order: 10,
      });
      add('experience');
    }
  }

  // ── 12. Seed the 5 reference testimonials for tech ────────────────────
  const refTestimonials = [
    { quote: 'Covenant is one of the most technically solid developers I have worked with. Clean code, clear communication, and he ships when he says he will.', author_name: 'Uko Uko', author_role: 'CEO', author_org: 'PalKeeper', rating: 5 },
    { quote: 'From concept to launch, Covenant guided us perfectly — no scope creep, no surprises, just a working system that our staff actually enjoy using.', author_name: 'Okon Favour', author_role: 'CEO', author_org: 'Opulent Media', rating: 5 },
    { quote: 'Exceptional problem-solving skills. Robust code every time, and he leaves the codebase cleaner than he found it.', author_name: 'Sylvester Iwong', author_role: 'CTO', author_org: 'TechInnovate', rating: 5 },
    { quote: 'Covenant delivered an exceptional platform that transformed our business operations. Worth every day of the engagement.', author_name: 'Isaac James', author_role: 'CEO', author_org: 'Glee Industrial Solutionz', rating: 5 },
    { quote: 'Design sensibility that is genuinely world-class. He made our product feel premium long before we had a brand team.', author_name: 'Joseph Etim', author_role: 'CEO', author_org: "Maby's Mega Business", rating: 5 },
  ];
  for (const t of refTestimonials) {
    const exists = await db.select<{ id: string }>(`SELECT id FROM testimonial WHERE author_name = $1::text AND author_org = $2::text AND division = 'tech'`, [t.author_name, t.author_org]);
    if (exists.length === 0) {
      await insertRow('testimonial', {
        quote: `\u201C${t.quote}\u201D`,
        author_name: t.author_name,
        author_role: t.author_role,
        author_org: t.author_org,
        location: null,
        division: 'tech',
        rating: t.rating,
        is_sample: true,
        is_featured: false,
        status: 'published',
        approved_at: new Date().toISOString(),
        sort_order: 20,
        source_note: 'Client reference (sample)',
      });
      add('testimonial');
    }
  }

  // ── 13. Update founder/contact settings so the tech page is populated ──
  await db.execute(
    `INSERT INTO site_setting (key, value) VALUES
        ('founder.name', $1::jsonb),
        ('founder.title', $2::jsonb),
        ('tech.role', $3::jsonb),
        ('tech.intro', $4::jsonb),
        ('tech.experience_since', $5::jsonb),
        ('contact.location', $6::jsonb),
        ('contact.phone', $7::jsonb),
        ('contact.email', $8::jsonb),
        ('contact.whatsapp', $9::jsonb),
        ('contact.response_time', $10::jsonb),
        ('founder.availability', $11::jsonb)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [
      JSON.stringify('Covenant Nsikan'),
      JSON.stringify('Full Stack Developer, GRC Analyst & Digital Technology Consultant'),
      JSON.stringify('Full Stack Developer | GRC Analyst | Digital Technology Consultant'),
      JSON.stringify('A versatile Full Stack Developer, GRC Analyst, and Digital Technology Consultant crafting exceptional digital experiences — web platforms, UI/UX, cloud, security, and governance.'),
      JSON.stringify('2018'),
      JSON.stringify('Lagos / Akwa Ibom, Nigeria'),
      JSON.stringify('09064095620'),
      JSON.stringify('covenantmedia0015@gmail.com'),
      JSON.stringify('+234 9064095620'),
      JSON.stringify('Available 24/7 — replies within hours'),
      JSON.stringify('Available: 24/7'),
    ],
  );
  add('setting', 11);

  console.log(JSON.stringify({ created: counts, notes }, null, 2));
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
  .then(async () => {
    await shutdown();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error(err);
    await shutdown();
    process.exit(1);
  });
