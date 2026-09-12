# Development Status

_Last updated: 2026-09-10 (media portfolio redesign pass delivered: four new showcase blocks — featured work, short-form rail, photo gallery, thumbnail wall — plus media hero/process/tools/about homepage structure, `/media/work` filter fix, mobile hero previews fix; `npm run check` green, full route sweep 200)._

This document describes the current development state of the Covenant Media platform. It distinguishes what is implemented and working, what is in progress or partial, known issues, and remaining work visible from the repository.

## Completed

All items below appear fully implemented in code (routes, data layer, UI, and tests exist and are wired together).

### Core platform
- Next.js 15 App Router + React 19 + TypeScript strict setup with Tailwind v4.
- Dual database driver (`pg` production, PGlite embedded dev) with a single `DbDriver` interface and auto-migrating idempotent schema.
- Design token system (`.theme-main|media|tech|admin`) with shared primitives; self-hosted fonts; reduced-motion support; skip links; focus rings; noscript notice.
- Full 27-table PostgreSQL schema with indexes and prefixed string IDs.
- Dev orchestration: `scripts/dev.ts` boots PGlite socket → waits for ready → starts Next; CLI scripts for migrate/seed/reset/status/reset-admin.

### CMS (`/admin`)
- Session-cookie auth with CSRF, scrypt passwords, role-based permissions (owner/editor/media_editor/viewer), login rate limiting, account lockout, account password change, sign-out of other sessions.
- Generic admin dispatcher: list/search/filter/sort/pagination, create, edit, publish/draft/archive, duplicate (where enabled), delete with reference check, reorder (drag-and-drop), "feature" toggles, "verify social link" action, "activate resume" action.
- All 24 CMS modules implemented via the registry:
  - Structure: Pages, Homepage sections (blocks), Navigation
  - Brand: Site settings, Social links, Services
  - Media: Media projects, Videos, Photos, Galleries, Media library
  - Technology: Tech projects, Skills, Experience, Certifications, Resume
  - Trust: Team, Testimonials
  - Commerce: Pricing, Contact information (settings group)
  - Insight: Blog
  - System: SEO, Submissions, Featured content, Account
- Field type system covering: text, textarea, markdown, number, money, boolean, select, multiselect, url, slug, date, datetime, image, asset, video, relation (single+multi), tags, list, repeat (sub-forms), json, seo, color. Conditional `showIf`, groups, help text, max length, required.
- Block composer to attach/reorder/toggle/override blocks on pages.
- Navigation editor (drag-to-reorder across six locations).
- Settings editor grouped by category with custom key support.
- Media library with folder, tags, alt/caption/credit metadata, replace-asset flow that propagates everywhere.
- Video editor with paste-a-link detection, oEmbed fetch/detect, manual metadata override, embed config editing.
- Submissions inbox with triage statuses (new/read/replied/archived/spam) and CSV export.
- Resume version manager with one-active-version constraint.
- Audit log written on every mutation (create/update/delete/publish/login/upload).
- Responsive admin shell with keyboard-accessible skip link, role badges, read-only indicator, "jump to" search, sign-out, view public site link.

### Public surfaces
- **Main brand site** (`/`): hero, two worlds, auto stats, cross-discipline work grid, service grid, statement, video wall, testimonials, logo marquee, contact CTA.
- **About** (`/about`): about split, stats, two worlds, team, statement, contact.
- **Services** (`/services`): service grid, process timeline, statement, contact.
- **Work** (`/work`): filterable/paginated catalog of all projects.
- **Team** (`/team`): team grid, contact.
- **Contact** (`/contact`): main-variant contact form.
- **Blog** (`/blog`): post listing and individual post view with sanitized markdown.
- **Security/Privacy** (`/security`): rich-text blocks sourced from legal settings.
- **Media portfolio** (`/media`): cinematic hero with floating muted video posters (mobile gets a swipeable snap strip), tagline headline "WE CAPTURE. WE CREATE. WE INSPIRE." with settings-driven location/availability meta, then: featured work (lead film panel + secondary cards, featured-first with newest-work top-up), short-form rail (vertical TikTok/Reels/Shorts showcase on a snap rail with arrow controls), thumbnail wall (designed covers from `thumbnail_design` projects), photo gallery (editorial mosaic with captions + lightbox), services (editorial list), process (CMS-editable Discovery → Planning → Production → Edit → Delivery), about (portrait + socials), testimonials, contact.
- **Media work catalog** (`/media/work`): filterable by category/format with counts — fixed 2026-09-10 so filtered URLs show only matching projects (a duplicate unfiltered grid above the catalog was removed; the plan is now empty like `/blog` because the catalog is the content).
- **Media project detail** (`/media/work/[slug]`): hero video/cover, brief, client, outcomes, gallery, metrics, credits, related work.
- **Media services, about, pricing, contact**: all routes wired with appropriate blocks/forms.
- **Tech portfolio** (`/tech-portfolio`, canonical; `/tech` kept for legacy links): single-page scroll experience with sticky anchor nav (Home → About → Skills → Services → Portfolio → Experience → Testimonials → Contact → Resume). The role line uses `RoleSweep` (clip-path reveal left→right → 2s hold → retract right→left, chained continuously); hero portrait `public/images/First_Image.png` (4:5, framed with a 1.2× zoom-crop anchored `49% 0%` so the shoulders nearly touch the edges and the bottom lands under the folded arms) caps at `lg:max-w-[400px]`, about portrait `public/images/2nd_Image.png` (7:10) at `max-w-[336px]` — frames match their subjects’ composition so nothing crops awkwardly; navbar sub-brand reads "TECH PORTFOLIO"; the About heading holds one line from `md` up (`md:whitespace-nowrap`, wrapping below). Production-curated content for Covenant Nsikan (Full Stack / GRC / UI-UX / Digital Consulting / Frontend / Backend / Cybersecurity), contact 09064095620 / covenantmedia0015@gmail.com / WhatsApp linked; 13 services including GRC; 4-item experience reordered (NAAKISS → PalKeeper → Covenant Media → Freelance) with no fabricated roles; 6 client testimonials including Alphex Digitalz; filled-accent contact tiles; outline-style CTA row; centered "Let my work do more of the talking" résumé block with a Download-Resume (PDF) button wired to a bundled placeholder that the CMS overrides when an active PDF is published; solid-accent back-to-top FAB with an up-arrow icon; role line animated by `RoleSweep` (see above), reduced-motion fallbacks on all animated primitives.
- **Tech about/skills/services/projects/experience/testimonials/resume/contact**: all routes wired.
- **`tools_grid` block is source- and division-aware**: `manual` (default) / `services` / `projects` sources; on media pages with no manual list it aggregates `service.tools`, tech keeps skills-evidence aggregation. `/media/services` renders a tools grid seeded from services.
- **Project detail pages (media + tech)** show additive "Services" and "Toolkit" chip rows next to "Stack" when those fields are filled (hidden when empty).
- **Tech project detail** (`/tech/projects/[slug]`): problem/solution/outcomes, tech stack, metrics, repo/live/external links, screenshots, related projects.
- **Project detail views** hide empty fields so missing data renders as empty rather than placeholder claim.
- **Social links** only render when `is_verified` and `status='published'`.
- **Resume download** only appears when an active `resume_version` is published.
- **Pricing** renders quote-first message when no published packages exist; supports modes quote/starting_at/fixed/day_rate and per-project/per-day/etc periods.
- **Maintenance mode** site setting short-circuits public pages while leaving `/admin` reachable.

### Forms, security, SEO, analytics
- Three contact form variants (main/media/tech) with field configs shared between UI and server.
- Honeypot, signed timing token (HMAC), per-IP rate limit, optional Cloudflare Turnstile, spam pattern detection; bots receive the same 200 response; IPs stored only as salted daily-rotated hashes; consent flag.
- Optional Resend email notification for submissions; `notified_at` tracking.
- SEO: dynamic metadata per page, canonical URLs, Open Graph image route (`/api/og`), XML sitemap, robots.txt, RSS feed, JSON-LD for Organization + Website, per-entity SEO records.
- First-party, cookieless analytics events: page_view, cta_click, project_click, video_play, outbound_click, form_submit, form_error, resume_download, lightbox_open, nav_click, search. Salted daily visitor IDs, DNT respected.
- Security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, COOP), `/admin` noindex, immutable upload cache headers.
- Admin-only routes protected at the layout/action level.

### Media pipeline
- Upload endpoint: MIME sniff, size limits, Sharp variants (image processing), checksum, blur data, public ID, folder support.
- Replace-asset preserves the asset ID and propagates everywhere it's referenced.
- Video source detection for YouTube, Vimeo, TikTok, Facebook, Instagram (plus direct upload/external); oEmbed fetch with graceful fallback; thumbnail candidates; embed config.
- Local storage driver writes to `public/uploads`; uploads served via `/uploads/[...path]` route. S3/R2 driver interface exists (selected by `STORAGE_DRIVER=s3`).

### Tests and quality
- Offline `node:test` suites covering:
  - `tests/auth.test.ts` — auth/permission ladder
  - `tests/blocks-plans.test.ts` — block plan resolution
  - `tests/cms-fields.test.ts` — field registry/parsing
  - `tests/cms-parse-form.test.ts` — admin form parsing
  - `tests/cms-registry.test.ts` — registry ↔ schema ↔ tables consistency
  - `tests/media-video.test.ts` — video source detection
  - `tests/schema-drift.test.ts` — tables.ts ↔ schema.sql drift check
  - `tests/security-forms.test.ts` — form token/honeypot/spam checks
- `npm run check` runs typecheck + ESLint + tests.
- ESLint configured with Next + correctness rules.

## In Progress / Partially Implemented

These are areas that exist in code but appear partially built or stubbed. They are **not confirmed broken**; they simply warrant investigation when touched.

- **Blog scheduling**: `scheduled_at` exists and the editor exposes it; there is no visible cron/scheduler in the Next process that flips `scheduled` → `published` automatically. Posts with `status='scheduled'` will not publish until the status is changed manually or a scheduler is added.
- **Resume download**: the Download Resume button falls back to `/uploads/Covenant-Nsikan-Resume.pdf` while no active CMS résumé version is published; uploading a real PDF in CMS → Resume manager and marking it Active + Published swaps the href to the CMS URL automatically (no "request a copy" fallback). Hero, Résumé-section and other CTAs all point to the same PDF download when no CMS version is active. **Correction (2026-09-09):** the PDF is NOT tracked in Git (`public/uploads/*` is ignored) — earlier notes here and in the CHANGELOG said it was bundled; a fresh clone 404s that fallback until the file is placed in the uploads directory or served from the CMS.
- **S3 storage driver**: A compact SigV4 S3-compatible driver (PUT/DELETE) is implemented in `src/lib/media/storage.ts` for R2/B2/MinIO/WASabi; however, it has not been exercised as part of this documentation inspection and uploads/list/replace flows against a real S3-compatible bucket should be validated before production use (especially signed URL generation, variants, and cache invalidation).
- **GitHub enrichment**: `GITHUB_TOKEN` is referenced in env but usage for Tech project repo metadata is not extensive in the public read layer (repo_url/live_url render as links, but extra metadata fetch may not be wired).
- **YouTube Data API key**: env var exists; the video importer falls back to oEmbed. Metadata quality is best-effort and should be reviewed by an editor before publishing even when the key is set.
- **Email notifications**: Resend is the only integrated provider; the `SMTP_URL`/`SMTP_HOST` env vars mentioned in `.env.example` do not appear to drive any implemented SMTP transport — only Resend is used.
- **AI_INSTRUCTIONS mention**: No existing AI docs existed before this change; the team should adopt the conventions documented in `/docs/AI_INSTRUCTIONS.md`.
- **`/work/gallery/` and `/media/work/gallery/` public routes**: Galleries exist as a CMS module and are queryable; the public routes for individual gallery slugs are not defined as standalone pages in `src/app/` (galleries are surfaced via `photo_strip` blocks and project detail pages instead). This appears intentional but should be confirmed.
- **`blog_preview` block supports `props.allHref` defaulting to `/blog`**, which exists, but per-division blog index filtering beyond the listing page query should be verified if multi-division blogging is used.

## Known Issues

Classified by confidence.

### Confirmed / code-verified
- **Single commit in Git history** — only one commit (`738c87a feat(scripts): add db:reset-admin…`) exists in the repository, so historical changelog reconstruction is limited. There is no tag, no prior release history visible.
- **Auth rate-limit table `auth_attempt`** exists in schema and is written by `recordAuthAttempt`, used by `enforceLoginRate`; ensure this table is created on all environments (it is part of `schema.sql`, so it will be).
- **No SMTP email transport**: despite `SMTP_URL` appearing in `.env.example`, the code only sends email via Resend. If SMTP is required, it is not implemented.
- **`next dev` binds to 0.0.0.0 via scripts (`-H 0.0.0.0`)** so previews/proxies work; CSP is not set in `next.config.mjs` headers (comment says "intentionally scoped to not block inline styles used by animation tooling"). This is a deliberate choice, not a bug, but be aware there is no strict CSP.
- **The project assumes Node ≥ 20.11** (engines field); PGlite WASM loading uses the Node module loader workaround described in `driver.ts`; keep this in mind when moving between runtimes.
- **`/admin/(shell)/layout.tsx` and `(auth)/layout.tsx` group routes** are in place; any new admin route must respect the grouping (auth routes don't require a session, shell routes do).
- **Sample seed data is deliberately present**; running `npm run db:seed` on a production database will add placeholder rows if tables are empty. Use only on first setup.
- **The public `/api/forms` GET method returns 405** (by design, to prevent enumeration). Do not add a GET handler that lists submissions.
- **The `/tech-portfolio` (and `/tech`) single-page contact form cannot submit** — confirmed 2026-09-09. The custom native `<form>` inside `TechPortfolioPage.tsx` posts to `/api/forms` without the required `_token` timing token and without the tech variant's required fields (`project_type`, `requirements`), so every submission fails validation (422 / redirect `?error=1`) and no lead is stored. The shared `contact_block` + `PublicForm` wiring is correct — the single-page form just isn't using it. Out of scope for the 2026-09-09 polish task; fix by rendering the shared `PublicForm` (with a server-issued token) or by adding hidden token/config fields to the custom form.
- **Resume fallback PDF — RESOLVED 2026-09-10 (`ab831d2`)**: the fallback is now `/My%20Resume.pdf`, served from `public/My Resume.pdf` which **is** tracked in Git. The old untracked `/uploads/Covenant-Nsikan-Resume.pdf` reference is gone.
- **`src/components/site/TechAnchorNav.tsx` is dead code** — not imported anywhere since `TechHeader` took over anchor highlighting (verified 2026-09-09). Remove or wire up on next tech-surface task.
- **Image optimization in Next is enabled** (AVIF/WebP formats). Remote hosts whitelist is a narrow allowlist; adding new remote media hosts requires updating `next.config.mjs` `remotePatterns`.

- **`npm run db:fill` aborts at the expanded-tech-skills section** (pre-existing, confirmed 2026-09-10): the script inserts a skill named `GO` whose generated slug `go` collides with the base seed's `Go` skill (`skill_slug_key` unique constraint). Sections 1–9 (all media content, pages, navs, tech services) complete first, so the media demo is unaffected, but sections 11–13 (expanded tech experience, the 5 reference tech testimonials, founder/contact settings updates) never run on a fresh `npm run setup`. Fix when touching the tech seed: match by slug, or name the skill `Go`.
- **Direct script writes bypass CMS revalidation** (behaviour note): `db:seed` / `db:demo` / `db:fill` write straight to the database without `revalidateTag`, so a running dev server keeps serving the previous `unstable_cache`/ISR data until the tags expire (up to 300 s) or the server restarts. Workflow: run `npm run setup` before starting `npm run dev`, or restart the dev server (and clear `.next/cache`) after re-seeding while it runs. Production is unaffected — CMS writes revalidate properly.

### Needs further investigation
- **End-to-end coverage**: the existing test suite is offline/unit-level. There are no browser/integration tests, so visual regressions and client-interaction regressions (upload progress, drag-reorder, lightbox, form validation feedback) are not automatically exercised.
- **Resend "from" address** defaults to `onboarding@resend.dev` (Resend's sandbox) if `NOTIFY_FROM` is unset — production requires a verified sender domain.
- **CSRF cookie flags**: cookie settings (Secure/SameSite) should be verified on production deployment with `COOKIE_SECURE=true`.
- **`NEXT_OUTPUT=standalone`** support exists in config but hasn't been validated as part of this inspection; ensure static assets (uploads, fonts) work when deployed standalone.
- **Turnstile site key / secret key wiring**: the server-side `verifyTurnstile` exists, but client-side rendering of the Turnstile widget should be confirmed when keys are set.
- **Analytics retention**: `cm_event` grows without retention/archival. A production deployment should plan periodic pruning/aggregation.
- **RSS/content exclusions**: review whether `is_sample` posts are correctly excluded from the feed; they should be (status filter) but worth a test.
- **Sitemap priority/change freq**: the sitemap is dynamic; confirm it includes all published projects/posts/pages and excludes drafts/samples.

## Remaining / Potential Tasks (from README and code hints)

These are items explicitly called out as pre-launch follow-ups in the README or visible as obvious next steps, not invented requirements:

1. Replace seeded sample rows with real content (projects, services, testimonials, team).
2. Confirm and "verify" social profile URLs (social links are hidden until `is_verified=true`).
3. Decide and publish pricing (fill in `pricing_package` rows; until then, quote-only message shows).
4. Read legal/privacy copy (`legal.*` settings) with a lawyer; the Security & Privacy page states only what the code does and claims no certification.
5. Add real client/testimonial data with `approved_at` and `source_note`.
6. Fill in the founder's experience history (`experience_item`) without fabricated entries.
7. Upload and activate a real resume PDF (resume download only appears when a version is active and published).
8. Add verifiable certifications (only those with `completed=true` and a reachable `verify_url` render as "Earned").
9. Change default admin credentials (`ADMIN_EMAIL`/`ADMIN_PASSWORD`) and set a strong `AUTH_SECRET` (64+ random bytes).
10. Provision production database and set `DB_DRIVER=postgres`, `DATABASE_URL`, `COOKIE_SECURE=true`.
11. Set up storage for production (S3/R2/local volume) with a CDN in front of `/uploads`.
12. Configure a verified sender in Resend and set `NOTIFY_FROM`.
13. Optionally configure Turnstile, YouTube Data API key, GitHub token.
14. Consider adding a scheduled-publish worker for blog posts if scheduled posts are desired.
15. Add end-to-end / visual regression testing if the team needs additional safety.
16. Add analytics retention/aggregation policy before production traffic scales.
17. Consider tightening CSP (the headers config comments note the current choice is lenient for animation/inline styles).

## How to Update This File

When completing meaningful work:
- Move items from "In Progress" to "Completed" once verified.
- Add new issues under "Known Issues" as they are discovered; note whether they are confirmed or need investigation.
- Remove items from "Remaining / Potential Tasks" when they are done (or mark them done with the date/PR).
- Keep the "Last updated" date current.
