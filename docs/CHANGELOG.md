# Changelog

All notable changes to the Covenant Media Unified Digital Platform are documented in this file.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Dates are UTC. The repository's Git history is the authoritative record; this changelog summarizes meaningful milestones.

> Note: the repository contains a single squashed/initial commit at the time this changelog was initialized, so earlier history (pre-`738c87a`) is not reconstructible from git alone. Pre-history entries below summarize features that clearly exist in the codebase at initialization rather than fabricating individual commits.

---

## [Unreleased]

### Added
- Initialized the persistent `/docs` knowledge base (`PROJECT_CONTEXT.md`, `ARCHITECTURE.md`, `DEVELOPMENT_STATUS.md`, `CHANGELOG.md`, `AI_INSTRUCTIONS.md`) to give future developers and AI agents an accurate, code-grounded map of the project.
- Added `scripts/demo-seed.ts` (and the `npm run db:demo` / extended `npm run setup` commands) to populate every CMS area with believable demo content so the full site can be clicked through before real content is entered:
  - 19 URL-referenced image assets from `picsum.photos` (already in `remotePatterns`) for hero, project covers, gallery frames and portraits — no local files written.
  - Full brand / identity / contact / forms / media / tech / SEO / legal / system settings populated with demo copy.
  - Social links flipped to published + verified with sample URLs (Instagram, YouTube, TikTok, X, LinkedIn, GitHub, WhatsApp, email).
  - 4 sample testimonials (media + tech), all `is_sample=true`, `approved_at=null` so the "Placeholder" badge renders.
  - 4 sample experience items (current role, prior role, freelance, education).
  - 2 sample certifications in `planned` / `in_progress` state (not completed — renders honestly).
  - Existing 6 sample projects enriched with cover images, client labels, gallery frames, accent colors; first two media projects attached to hero videos.
  - Sample service hero images assigned.
  - Founder portrait attached.
  - A photo gallery with 6 frames so `photo_strip` blocks render imagery.
  - 2 additional sample blog posts (one media, one tech) with cover images so the blog listing and RSS show multiple entries.
  - A second sample contact submission (tech brief, status=read) to demonstrate triage states.
- All demo content is flagged `is_sample = true` (or placeholder/incomplete status where appropriate) so the UI renders a clear "Placeholder" badge, and every entry can be edited or deleted from the CMS. Sample badges can be hidden globally via CMS → System → "Show placeholder badges".
- Added `scripts/fill-content.ts` (and `npm run db:fill`, also chained into `npm run setup`) to put realistic simulated copy on every previously-empty placeholder block across all three surfaces so the full design is visible before the user enters real content:
  - Populates a 5–6 step production/support process on every service (`event`, `wedding`, `brand`, `post-production`, `product-engineering`, `security-review`, `design-systems`, `platform-support`) — credible industry-standard workflows for a film+tech studio, all in the `service.process` JSONB so editors can reorder/rewrite them.
  - Fills the "About" `about_split` and `statement` blocks on `/about`, `/media/about`, and `/tech/about` with founder positioning and per-division philosophy copy (portrait + bullets + socials wired up).
  - Adds 3 additional placeholder crew rows (second shooter, sound recordist, editor collaborator) to `team_member` so `/team` no longer shows the "Just Covenant for now" empty state and the crew grid feels populated.
  - Adds 4 more testimonials (2 media, 2 tech) so media `/media` and tech `/tech/testimonials` show a real wall instead of a single quote.
  - Creates CMS-published pages (instead of relying on plan fallbacks) for `/services`, `/work`, `/team`, `/contact`, `/media/about`, `/media/services`, `/media/pricing`, `/media/contact`, `/media/work`, `/tech/about`, `/tech/services`, `/tech/projects`, `/tech/skills`, `/tech/experience`, `/tech/testimonials`, `/tech/resume`, `/tech/contact` — all with `process_timeline`, `pricing_table`, `skill_matrix`, `experience_timeline`, `contact_block`, `testimonial_wall`, `photo_strip` and `resume_block` sections composed in sensible shapes.
- All fill-content rows are flagged `is_sample = true`; every route now returns 200 with zero empty-state panels.

### Changed
- **Tech portfolio is now a single-page experience** (`/tech`), modelled on the structure of a modern developer portfolio: sticky right-rail anchor nav, smooth scroll, and every section (Home/Hero, About, Skills, Services, Projects, Experience, Testimonials, Contact, Résumé) on one scrollable page rather than split across sub-routes.
  - Built as `src/components/site/TechPortfolioPage.tsx`. Content is curated for production (Covenant Nsikan — Full Stack Developer / GRC Analyst / UI-UX Designer / Digital Technology Consultant / Frontend / Backend / Cybersecurity Analyst): brand, contact (09064095620, covenantmedia0015@gmail.com, WhatsApp linked), Lagos/Akwa Ibom location; hero portrait is smaller and less dominant on both mobile and desktop; mobile layout places the portrait on top and centers the greeting/name/role/intro/CTAs/socials, desktop layout places the portrait in a narrower right column (4/12) with the text left-aligned; the greeting "Hello, I'm Covenant Nsikan" and the role line sit close together with the role line bigger/bolder; the typewriter cycles all seven roles **fast** (28ms type / 16ms delete / 650ms hold).
  - Experience re-ordered per request: (1) NAAKISS Worldwide — Web Developer & IT Consultant, (2) PalKeeper — Backend Developer, (3) Covenant Media — Senior Full Stack Developer, (4) Freelance Developer (2018–2021). JG Oilfield, Heal the Globe, GLUSIC and the old Alphex Digitalz role removed. Testimonials include 6 cards (Uko Uko/PalKeeper, Okon Favour/Opulent Media, Sylvester Iwong/TechInnovate, Isaac James/Glee, Joseph Etim/Maby's, **Abraham James/CEO Alphex Digitalz**).
  - 13 service cards including **GRC Analysis** (Governance, Risk & Compliance); Brand Identity and Graphic Design cards removed; all other services present (Full Stack, Frontend, Backend, Website Design, UI/UX, REST APIs, Database Design, Cloud Deployment, Cybersecurity, IT Support, Networking, Digital Consulting). Footer services column links to the full set.
  - About section portrait is placed in the left column on desktop with text + capabilities grid vertically **centered** beside it (matching the reference layout). Contact section form is vertically aligned with the contact info tiles; Résumé CTA block is centered with both buttons below the copy.
  - Premium motion work: typewriter role line (`Typewriter`, default 35ms type / 20ms delete / 2000ms hold for a smooth readable flow), `MaskReveal` display name, `CountUp` stat counters, `FadeIn` on every card, `SpotlightCard` cursor-reactive borders, `Tilt` hero portrait, marquee stack chip strip, parallax experience timeline, filled-star ratings, and a floating **Back-to-Top** button (`BackToTop.tsx`) that appears after 600px of scroll as a solid accent circle with an up-arrow icon.
  - Mobile-first hero: on small screens the portrait sits on top (centered) with the greeting, display name, typed role, intro, CTAs and social icons stacked below it, sized to fit one phone screen (matching the reference site's mobile layout). The "Available for new projects" / location pills were removed from the top of the hero per request; CTAs center themselves on mobile and left-align on desktop.
  - Clicking an anchor link in the mobile hamburger drawer now automatically closes the drawer after scroll (added in `SiteHeader.tsx`).
  - Dedicated **tech footer** (`TechFooter.tsx`) with three columns (Brand · Services · Stay-in-Touch) — "Quick Links" column removed per request; subscribe button aligned; CTA pill; "Designed & Built with precision" copyright.
  - Two grayscale portraits expected at `public/uploads/portraits/portrait-1.png` (hero) and `portrait-2.png` (about). They can be swapped any time from the CMS (set `founder.portrait_asset` to an uploaded asset ID) or by replacing the files — no code change needed. A placeholder résumé PDF ships at `public/uploads/Covenant-Nsikan-Resume.pdf` so the download button works before a CMS upload.
  - Résumé block always shows a Download Resume (PDF) button — when no CMS PDF is active it falls back to the bundled placeholder PDF rather than a "Request a copy" mailto.
  - **No placeholder/sample badges appear anywhere on the tech page.** All copy is production-ready; demo placeholders from other surfaces remain hidden by the curated content here.
  - Side dots (`TechAnchorNav`) highlight the currently-in-view section via IntersectionObserver and smooth-scroll on click.
  - `scroll-padding-top: 80px` + `scroll-behavior: smooth` added globally to `html` so hash anchors land under the sticky header.
  - Content seeded via `scripts/fill-content.ts`: founder/contact settings updated to Covenant Nsikan / 09064095620 / covenantmedia0015@gmail.com; tech services rebuilt (13 cards including GRC, no Brand Identity or Graphic Design); 19 skills across Frontend/Backend/Databases/UI-UX/GRC groups (no graphics group); 4 experience entries matching the requested timeline; 5 client testimonials; tech_header nav uses anchor links; tech_footer nav shows Quick Links (Home/About/Skills/Portfolio/Contact/Resume) and Services (Full Stack, UI/UX, GRC, Cloud & DevOps).
  - Added `--accent-rgb` token to all four theme scopes for coloured shadows; added `databases` and `grc` categories to `SKILL_CATEGORIES`; fixed the `starFilled` icon path in `Icon.tsx`.
  - Added `src/components/ui/Typewriter.tsx` and `src/components/ui/BackToTop.tsx` client primitives (both honour `prefers-reduced-motion`).
  - The existing sub-routes (`/tech/about`, `/tech/skills`, `/tech/services`, `/tech/projects`, `/tech/experience`, `/tech/testimonials`, `/tech/resume`, `/tech/contact`) still return 200 for deep links/bookmarks, and `/tech/projects/[slug]` case studies render in full.
- `npm run setup` now runs `migrate → seed → demo-seed → fill-content` so a fresh clone boots into a fully-populated, no-empty-states demo. Use `npm run db:seed` alone for the strictly-honest seed.

### Fixed
- **Admin 404 UX.** When an editor hit a mistyped/renamed URL inside `/admin/*` (e.g. an old bookmark after a section was renamed), Next fell through to the public-site "404 — lost the reel" page and dropped them out of the CMS frame entirely. Fixed three ways:
  - Added a top-level `/admin` route layout that applies the CMS theme (`theme-admin`) so admin routes render inside the admin frame even when no child layout matches.
  - Added `src/app/admin/(shell)/not-found.tsx` — an in-shell admin 404 (section-not-found copy + "Back to dashboard" / "Site structure" / "View public site" links) that renders inside the sidebar so signed-in editors stay in the CMS.
  - Added a tiny `src/middleware.ts` that only matches `/admin/:path*` and 302-redirects clearly malformed URLs (extra path segments, ids that don't match the id regex, unknown module keys in the third segment) back to `/admin`, which either shows the dashboard (signed in) or redirects to `/admin/login` (signed out).
  - All 24 valid admin module routes still return 200; `/admin/login` is untouched; public 404s still show the "lost the reel" page.

---

## [1.0.0] — 2026-09-06 (initial commit: `738c87a`)

This is the repository's recorded starting state. It already contains a fully-implemented platform; the single commit adds the `db:reset-admin` script on top of that baseline.

### Added (baseline platform, present at initial commit)

#### Core platform
- Next.js 15 App Router + React 19 + TypeScript strict configuration with Tailwind v4 (`@tailwindcss/postcss`).
- Idempotent PostgreSQL schema (`src/lib/db/schema.sql`) with 27 tables covering identity, content, media, trust, tech, commerce, SEO, submissions, analytics.
- Dual database driver: `pg` (production/external Postgres) and `@electric-sql/pglite` (embedded WASM Postgres for local dev and CLI scripts), behind a single `DbDriver` interface.
- Auto-migration on first DB access (`ensureSchema()`); generic CRUD helpers with type coercion, null-handling, auto timestamps, and prefixed string IDs.
- Table registry (`src/lib/db/tables.ts`) — the write-allowlist for CMS-accessible columns.
- Dev orchestration (`scripts/dev.ts`): boots an embedded PGlite socket on `127.0.0.1:55432`, waits for Postgres readiness, then launches Next. Same driver path in dev and production.
- CLI scripts: `db:migrate`, `db:seed`, `db:reset`, `db:status`, `db:reset-admin`; `npm run setup` for one-command bootstrap.
- Design token system in `src/app/globals.css` with per-surface themes (`.theme-main`, `.theme-media`, `.theme-tech`, `.theme-admin`) exposing `--accent`, `--surface-tone`, `--motion-tempo` etc.; self-hosted fonts (Fraunces, Inter, JetBrains Mono); hairline/surface/eyebrow/display/lede utilities; cinematic grain and tech-grid backgrounds.
- Accessibility: skip-to-content links, focus-visible rings, `prefers-reduced-motion` globally honored, `<noscript>` notice, ARIA labels on interactive controls.
- Security headers via `next.config.mjs` (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, Cross-Origin-Opener-Policy); admin routes set to `noindex, nofollow`; immutable cache headers for `/uploads/*`.

#### CMS (`/admin`)
- Full CMS back office with grouped navigation, search ("Jump to…"), role badges, responsive drawer, account page, sign-out, and "View site" link.
- Session-cookie authentication (httpOnly `cm_session` + double-submit CSRF cookie), scrypt password hashing, per-IP login throttling via `auth_attempt` table, account lockout after repeated failures, password change, "sign out other sessions".
- Role-based access control with four system roles (`owner`, `editor`, `media_editor`, `viewer`) supporting per-module permissions and DB-overridable role maps cached for 30 seconds. Every mutation enforces permissions server-side; UI hides disallowed actions.
- Audit logging (`audit_log` table) on every mutation (create/update/delete/publish/upload/login) with user, module, entity, summary, IP, timestamp.
- Generic module registry (`src/lib/cms/modules.ts`) driving all 24 admin modules without per-module screens: list, search, filters (category/division/form), sort, pagination, create, edit, publish/draft/archive, duplicate (where enabled), delete with reference check, reorder (drag-and-drop), "feature" toggles, "verify social link", "activate resume" (enforces exactly one active version).
- Rich field type system (`src/lib/cms/fields.ts`): text, textarea, markdown, number, money, boolean, select, multiselect, url, slug, date, datetime, image, asset, video, relation (single and multi), tags, list, repeat (sub-forms), json, seo, color; with conditional `showIf`, field groups, help text, required, max length.
- Specialized editors: media library grid, video editor (paste-a-link source detection, oEmbed fetch, metadata override, poster preview), navigation tree editor, page block composer (attach/detach/reorder/toggle sections with per-block overrides), settings editor grouped by category with custom settings, SEO record editor, resume manager, submissions inbox with triage statuses (new/read/replied/archived/spam), featured content picker.
- Asset upload endpoint with MIME sniffing, size limits (configurable via `STORAGE_MAX_UPLOAD_MB`), Sharp image variants (thumbnails), checksum, blur placeholders, folder tagging, alt/caption/credit metadata; replace-asset flow that preserves the asset ID everywhere it is referenced.
- CSV export for contact submissions (`/api/admin/export/submissions`).

#### Public surfaces (three experiences, one codebase)
- **Main brand surface** (`/`): brand hero, "two worlds" split, auto-stats band, cross-discipline work mosaic, services, statement, video wall, testimonials, logo marquee, contact CTA.
- **Media portfolio** (`/media/**`): cinematic hero with floating muted video previews (click swaps to real embed with sound), video wall, project mosaic with filters, services, photo strip, pricing (quote-first when empty), testimonials, contact, floating media CTA band.
- **Tech portfolio** (`/tech/**`): portrait hero with top skills and auto-derived stats, skill matrix (matrix/bars variants), project grid (wide cards), services, experience timeline, tools grid, certifications (only verifiable completed ones render as Earned), resume download (only when an active PDF is published), contact.
- Shared routes: About, Services, Work (all divisions), Team, Blog (markdown sanitized with `sanitize-html`), Security/Privacy (legal copy from settings), three Contact variants (main/media/tech).
- Project detail views for media and tech that hide empty fields, gate unverified metrics/incomplete entries, and render galleries, credits, external links, and related work.
- Catalog views with URL-query category/format filters and counts.
- Block registry (`src/components/blocks/index.tsx`) covering hero_brand, hero_media, hero_tech, two_worlds, statement, service_grid, project_grid, video_wall, photo_strip, process_timeline, skill_matrix, experience_timeline, testimonial_wall, pricing_table, logo_marquee, stats_band, about_split, team_grid, blog_preview, contact_block, rich_text, certifications, tools_grid, resume_block, faq, page_header.
- Pages resolve CMS-composed content first and fall back to structural plans (`src/lib/cms/page-plans.ts`) when a page has not been authored yet, ensuring pages never render half-built.
- **Honest content guards**: seeded rows are flagged `is_sample`/`is_placeholder` and publicly labelled or hidden; social links require `is_verified`; metrics require `verified`; testimonials require `approved_at`; certifications require `completed=true` and a verification URL; resume download only appears when a version is active+published; pricing defaults to quote mode.
- Maintenance mode (`system.maintenance` setting) short-circuits public surfaces while keeping `/admin` reachable.

#### Forms, security, SEO, analytics
- Public contact endpoint `/api/forms` supporting three variants (main/media/tech) with shared field config, honeypot, HMAC-signed timing token, per-IP rate limiting, optional Cloudflare Turnstile, spam-pattern heuristic, consent flag, salted daily-rotated IP hash (no raw IPs persisted), identical 200 responses for spam vs success, best-effort Resend email notification, and CSV export.
- SEO: dynamic metadata per route, canonical URLs, per-scope SEO records, Open Graph image rendering (`/api/og`), XML sitemap, robots.txt, RSS feed (`/feed.xml`), JSON-LD (Organization + Website only — no invented ratings).
- First-party, cookieless analytics to `cm_event` (page_view, cta_click, project_click, video_play, outbound_click, form_submit, form_error, resume_download, lightbox_open, nav_click, search) with daily-salted anonymous visitor IDs and Do-Not-Track honoring. Only cookie in the app is the CMS session.
- Safe upload serving via `/uploads/[...path]` (so post-build uploads are not 404'd by `next start`'s static file handling).
- Strict SQL: all queries parameterised; identifiers validated against a whitelist regex.

#### Media pipeline
- Video source detection for YouTube, TikTok, Facebook, Vimeo, Instagram, plus direct upload and external video; oEmbed fetch with graceful fallback when platforms block metadata.
- Local storage driver writing to `public/uploads`; S3/R2-compatible storage driver interface (enabled with `STORAGE_DRIVER=s3`).

#### Tests & quality
- `node:test`-based offline test suite covering: permissions ladder, block plan resolution, CMS field parsing, CMS form parsing, CMS registry ↔ schema consistency, video source detection, schema ↔ tables drift, form security (honeypot/timing/spam).
- `npm run check` running TypeScript typecheck, ESLint (Next config + correctness rules), and the test suite.

#### Documentation
- README.md covering architecture, setup, scripts, uploads in production, sample content markers, and pre-launch checklist.
- `.env.example` documenting every environment variable.

### Added (in the recorded commit)
- `scripts/reset-admin.ts` and the `npm run db:reset-admin` script to create or repair the CMS owner account using `ADMIN_EMAIL`/`ADMIN_PASSWORD` (with safe defaults), including re-seeding system roles if they are missing.

---

## Template for new entries

When adding entries, follow this shape:

```
## [version] — YYYY-MM-DD

### Added / Changed / Fixed / Removed / Security
- Brief description, referencing modules/files touched.
- Note any DB schema changes or new env vars.
```

### Documentation-maintenance rule
After completing meaningful development work:
1. Add an entry here describing the change at the right level (not every tiny commit — meaningful milestones, new features, notable fixes, breaking changes, security fixes).
2. Update `DEVELOPMENT_STATUS.md` (Completed / In Progress / Known Issues / Remaining Tasks).
3. Update `ARCHITECTURE.md` if architecture changed (new modules, new services, new tables, new APIs, new auth flows).
4. Update `PROJECT_CONTEXT.md` if project capabilities, terminology, integrations, or business context changed.
5. Update `AI_INSTRUCTIONS.md` only when a new permanent rule or constraint needs to be captured.
