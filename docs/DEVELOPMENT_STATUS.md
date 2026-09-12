# Development Status

_Last updated: 2026-09-12 (Database + access round: fixed the Windows path bug in `lib/db/driver.ts` that made CLI scripts open a second PGlite on the live data directory and corrupt it — the cause of `58P01 could not open file "base/5/…"` on sign-in — hardened socket detection with a TCP probe, rebuilt the database, re-created the two owner accounts, removed the credential hint from the sign-in page, fixed the `/icon` 404 and the Turbopack root warning. Tech Portfolio and the main brand site untouched.)_

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
- **Media portfolio** (`/media`): **one page**, rendered by `MediaPortfolioPage` instead of `CmsPage`, rebuilt for the complete implementation on 2026-09-11. Sections in scroll order, each with its own id for the sticky nav: `home` (hero), `work` (long-form), `shortform`, `photography`, `services` (8 cards), `process` (5 steps), `stories` (client stories rail), `about`, `contact`.
  - **Hero**: a two-column composition. The greeting side opens with a mono "HELLO, I'M" eyebrow, the name at display size with the given name in the brand gold and the surname in its white, the rolling role line, the concept-to-delivery intro, the two calls to action and the five social buttons; it keeps the slightly larger share of the width. There is no brand line above the greeting. The other side is `MediaHeroVideo`: a rolling reel. Each of the studio's vertical pieces plays five seconds inside a framed 9:16 card; the next piece waits one slide to the right, already mounted and already playing, with a narrow column of it visible past the card's right edge, and when the five seconds end the piece on screen rolls out through the left of the frame while the waiting piece rolls in. The old dimmed poster plates are gone, the two round controls sit just inside the rim, and the progress dots, title and running time stay beneath. A manual step holds the card for 14 seconds. Under both columns: the studio figures, then the capability list.
  - **Role line** (`MediaRoleLine`): a static "A" followed by a word that rolls upward through videographer, video editor, cinematographer, photographer and content creator. Three copies of the list with a silent one-copy rebase keep the travel upward forever — the previous wrap-around implementation made the last transition descend. It holds while the pointer is over it, stops off-screen, and under `prefers-reduced-motion` it is a plain readable list.
  - **Social row** (`MediaSocialButtons`): five circular icon buttons using the Tech portfolio's interaction (lift, accent border, brighter icon) with media styling, under the calls to action: TikTok, Facebook, Instagram, YouTube and WhatsApp. TikTok, YouTube and WhatsApp are the studio's published destinations; Facebook and Instagram point at the platforms themselves until the studio supplies its handles, which is one edit in `MEDIA_SOCIALS` or one CMS row. The footer uses the same list (CMS rows first when they are published and verified), so the row is never empty.
  - **Studio figures** (`MediaStats`): 8+ years, 60+ completed projects, 40+ happy clients, 98% satisfaction, counted up when the band reaches the screen. Media treatment (divided panel, brass suffixes), not the Tech band copied.
  - **Routes.** `/media/pricing` is the only standalone media page (`MediaPricingPage`: four package groups, quote factors, process recap, contact CTAs). `/media/work`, `/media/services`, `/media/about` and `/media/contact` are **308 redirects** to the matching in-page anchors (`next.config.mjs` -> `redirects()`), so old links and the CMS navigation keep working. `/media/work/[slug]` still renders the CMS project detail view.
  - **Format catalogs** (`/media/long-form`, `/media/short-form`, `/media/photography`) are part of the experience: each work section on the one-pager ends with a "View Catalog" button, and every catalog has a category filter bar derived from the items (with counts), a library count, the same cards and modal as the front page, links to the sibling catalogs, and the media enquiry form at the bottom posting to `/api/forms`. The short-form catalog adds a supporting line per piece; photography browses through the same ratio-true wall and opens the opaque viewer.
  - **Video rules.** A card is a poster until it can genuinely start muted (YouTube, Vimeo, direct files); the long-form rows preview muted after a 420 ms hover delay on fine pointers only. **Short-form never plays by itself** — not on view, not on hover — so the rail rolls on its own stills and mounts no players. Nothing ambient makes a sound, and nothing ambient loads a player it cannot use, which is also what keeps a rolling row from mounting a dozen iframes. Zero iframes ship in the initial HTML.
  - **Playback.** Selecting a card opens the details card, which starts the piece **immediately and with sound, in one click**: YouTube will not start a fresh frame unmuted, so the embed is mounted muted (the start every browser honours) and the sound is switched on a moment later over the player's own command channel (`enablejsapi` + `postMessage`, repeated as the frame comes up). The source is frozen once the player exists, so unmuting never reloads the embed, and the single mute/unmute icon drives the live player the same way. Where the browser or the platform still declines, the piece plays muted with the platform's own controls rather than showing a play button that needs a second click. There is no "Tap for sound" banner. TikTok/Facebook/Instagram expose no scriptable mute, so their embed only ever mounts after a click; a URL with no supported embed presents as an outbound link over its poster. Facebook embeds are given `autoplay=1`.
  - **Details card** (`MediaCards.MediaDetailsCard`): title, the facts about the piece (format, role, running time) and the player, which mounts **already playing** because the click that opened the card is the gesture that permits it. The card is **portalled to `document.body`** and animates on transform alone, so it covers the viewport from its own layer whatever the page underneath is doing, and the backdrop is painted opaque on its first frame. Titles wrap, the stage column scrolls rather than clipping the meta row, and the page behind never scrolls (`overflow-hidden`, `overscroll-none`). Wide work keeps a panel bounded by width and height; **vertical work is measured from its video** — one definition, exactly 9:16, bounded by the viewport in both directions — and the card is that stage plus its padding, so the inner border wraps the video exactly. The written description is never rendered.
  - **Photography**: a ratio-true masonry. Each frame is drawn at the intrinsic size recorded on the record, so portrait and landscape sit together without being cropped into uniform tiles, and the tiles carry no captions or labels at all. Selecting one opens the shared viewer in its media presentation: an opaque stage, the photograph framed at its own proportions (portrait comfortable, landscape wide), prev/next on every breakpoint, Escape and arrow keys, and no blurred copy of the picture behind the picture.
  - **About**: "About the Studio" → "The Person Behind the Brand" → the biography (the introduction and the full studio story as one piece of text) → the services card → "WE CAPTURE. WE CREATE. WE INSPIRE." → "Work with the Studio" and "See Works". On desktop the founder portrait sits in the right column beside the text, unchanged, with its name inside the frame in the brand's gold and "Founder / CEO, Covenant Media" directly beneath the picture and outside it. On mobile the portrait and its credit come before the biography. The availability badge that used to sit on the portrait is gone.
  - **Footer**: the media surface follows the tech footer's arrangement — brand wordmark, the studio paragraph under it (the CMS `brand.footer_note` when filled in, otherwise the studio in its own published words), the same five circular social buttons the header carries, a Services list with "All Services", and one "Stay in Touch" column holding the direct details (phone, email, location), the newsletter field and the call-to-action pill. Type in this footer is one step larger, and the bottom bar is the copyright line ("© {year} {brand} . All rights reserved. Designed & Built with precision.") beside the studio promise; Privacy, Terms and Security & privacy are not linked from this footer (the `/security` page stays reachable from the rest of the site). The oversized newsletter band is gone and the block is compact. The main and tech surfaces keep the original footer branch, which is unchanged.
  - **Tools I use** (`MediaTools`): a band between the process and the client stories with the heading centred over one static, wrapping row of tiles — seven tools (CapCut, DaVinci Resolve, OBS Studio, vMix, Adobe Lightroom, Adobe Photoshop, Adobe Premiere Pro), nothing moving. Every mark is the product's own artwork, prepared into `public/images/tools/` at 128px with a transparent background and served through `components/ui/ToolMark.tsx`: CapCut, Resolve, OBS and Photoshop from the owner's uploads with their backgrounds removed, Premiere Pro and Lightroom as Adobe's plates, vMix as its nine-square mark. No tool names are printed; each tile's name is its accessible label.
  - **Persistent controls**: `MediaBackToTop` is the only one, bottom-right, hidden until the reader has scrolled past the opening view (the shared `ui/BackToTop` targets the brand `#home`, which catalog sub-pages do not have). The floating WhatsApp / email / call rail and the mobile action band were removed on request; every contact route they offered still exists in the header CTA, the contact section and the footer.
  - **Content** (`lib/media/sample-portfolio.ts`): the owner's own published work read from the Covenant Media YouTube channel — seven long-form pieces with real titles and running times (including the FUTIA Students' Week session and the Baby Victory and Baby Moriah dedications) and five vertical edits, no repeats or near-duplicates in any rolling row; nine photography records, five of them the photographs the owner supplied under `public/uploads` with their intrinsic dimensions recorded, the rest stills from that same coverage; eight services; five process steps; six client stories attributed by relationship (no invented names, results or statistics); four pricing groups with no fee invented anywhere ("Quoted per project").
  - **Enquiry form**: the media variant of `PublicForm`, wrapped by `MediaInquiryForm`, on the one-pager and at the end of every catalog. After hydration the dropdowns (Service needed, Project type, Budget range, Delivery needed by) are rendered by `SelectMenu`, a portalled, design-matched `role="listbox"` with keyboard support, type-ahead, flip-up placement and a mobile sheet; before hydration, and with JavaScript off, the native control is still there and still works.
- **Tech portfolio** (`/tech-portfolio`, canonical; `/tech` kept for legacy links): single-page scroll experience with sticky anchor nav (Home → About → Skills → Services → Portfolio → Experience → Testimonials → Contact → Resume). The role line uses `RoleSweep` (clip-path reveal left→right → 2s hold → retract right→left, chained continuously); hero portrait `public/images/First_Image.png` (4:5, framed with a 1.2× zoom-crop anchored `49% 0%` so the shoulders nearly touch the edges and the bottom lands under the folded arms) caps at `lg:max-w-[400px]`, about portrait `public/images/2nd_Image.png` (7:10) at `max-w-[336px]` — frames match their subjects’ composition so nothing crops awkwardly; navbar sub-brand reads "TECH PORTFOLIO"; the About heading holds one line from `md` up (`md:whitespace-nowrap`, wrapping below). Production-curated content for Covenant Nsikan (Full Stack / GRC / UI-UX / Digital Consulting / Frontend / Backend / Cybersecurity), contact 09064095620 / covenantmedia0015@gmail.com / WhatsApp linked; 13 services including GRC; 4-item experience reordered (NAAKISS → PalKeeper → Covenant Media → Freelance) with no fabricated roles; 6 client testimonials including Alphex Digitalz; filled-accent contact tiles; outline-style CTA row; centered "Let my work do more of the talking" résumé block with a Download-Resume (PDF) button wired to a bundled placeholder that the CMS overrides when an active PDF is published; solid-accent back-to-top FAB with an up-arrow icon; role line animated by `RoleSweep` (see above), reduced-motion fallbacks on all animated primitives. **Portfolio section (2026-09-10):** the Featured Projects grid renders only non-sample projects (`projectResult.cards.filter((p) => !p.isSample)`), so seeded `is_sample` rows never read as real case studies — the built-in "Portfolio coming soon / Case studies are being prepared. Check GitHub for the latest code." panel shows until the owner publishes a real project, at which point the cards appear automatically (the CMS save already revalidates the `content` tag). `/work`, `/media/work` and `/tech/projects` intentionally keep listing samples behind their Placeholder badges.
- **Tech about/skills/services/projects/experience/testimonials/resume/contact**: all routes wired.
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
  - `tests/media-portfolio.test.ts` — Media Portfolio contract: per-format section rules, photography records carrying real images, poster fallback chain, per-platform mute handling, the ticker's wrap arithmetic, role wording, and the copy rules (no em dashes, no developer language, no invented fees or measurable results) (93 tests total)
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
- **Resume fallback PDF is untracked** — `/uploads/Covenant-Nsikan-Resume.pdf` is referenced by `TechPortfolioPage.tsx` but `public/uploads/*` is gitignored and the file was never force-added (verified 404 on a fresh checkout). Either commit the file (force-add), ship it under a non-ignored path, or hide the button until a CMS version is active.
- **`src/components/site/TechAnchorNav.tsx` is dead code** — not imported anywhere since `TechHeader` took over anchor highlighting (verified 2026-09-09). Remove or wire up on next tech-surface task.
- **Shared consent line in `PublicForm` contains an em dash** — confirmed 2026-09-11. "Nothing is shared, sold or used for advertising — how data is handled is covered in the privacy policy." renders on the media page (and on the main and tech contact forms, which share the component). It was deliberately left alone: the owner's scope for the media work forbids modifying shared code that could change the tech surface, and a punctuation edit there would change all three. One-line fix pending the owner's approval.
- **Four of the nine photography records are stills from the studio's video coverage** — updated 2026-09-12. Five records are the owner's own photographs (`public/uploads/21594dc0….jpg`, `cbbe699a….jpg`, `f99e9f1c….jpg`, `IMG_7150.jpeg`, `brijmf.jpeg`, restored from `origin/main` at 2026-09-12 review time); the remaining four are frames taken from the studio's published pieces and each states which coverage it came from, so the wall is honest about what it shows. Replacing them is a one-field change per record (`image`), or a CMS gallery once one is published; the ratio-true wall and viewer are already wired. Note that `public/uploads/*` is git-ignored but the referenced files are tracked in `origin/main`, so they are present in a clone of the default branch and after this branch merges.
- **The CMS project detail route is not linked from the media UI** — `/media/work/[slug]` renders the CMS project detail view and its URLs resolve, but nothing on the one-pager links to it; the site exposes the work through the three format catalogs instead. That is intentional, not broken: the detail view exists for CMS-published project pages, and the catalogs cover the published work. The three catalogs themselves are linked from their sections ("View Catalog") and listed in the sitemap, so they are reachable from the public UI.
- **Facebook and Instagram point at the platforms, not at studio profiles** — confirmed 2026-09-12. TikTok (`@covenant.media`), YouTube (`@Covenant_Media`) and WhatsApp are the studio's real destinations; the owner has not supplied Facebook or Instagram handles, so those two buttons open `facebook.com` / `instagram.com` until they do. Fixing it is one URL in `MEDIA_SOCIALS` (`src/lib/media/sample-portfolio.ts`) or one published `social_link` row — the CMS rows are still unverified drafts, so the header and footer rows currently fall back to the data file. No handle may be invented.
- **The media header and footer render their own social row, not the CMS-verified row** — `MediaSocialButtons` reads `MEDIA_SOCIALS` through the media data layer; because no `social_link` row is both published and `is_verified`, the fallback is what renders. Once the owner verifies the rows in CMS -> Social links, the CMS versions take precedence with no code change.
- **Favicon route `/icon` returns 404** — confirmed 2026-09-11 while crawling the media page's links. `src/app/layout.tsx` declares `icons: { icon: [{ url: '/icon' }], shortcut: ['/icon'] }` but the file route is `/icon.svg` (generated from `src/app/icon.svg`), so every surface ships a broken favicon reference. One-line fix in the shared layout, which is why it was left alone during the media work.
- **Image optimization in Next is enabled** (AVIF/WebP formats). Remote hosts whitelist is a narrow allowlist; adding new remote media hosts requires updating `next.config.mjs` `remotePatterns`.
- **Footer group-label nav rows drop their own link** — confirmed 2026-09-10. `SiteFooter`'s `chunkNav` treats any `navigation_item` row whose label starts with `"— "` as a column heading and `continue`s past it, so the row's `href` is never rendered. The seed gives those rows real destinations (`media_footer` "— Portfolio" → `/media/work`, "— Studio" → `/media/about`; same pattern in `main_footer` and `tech_footer`), so those links silently disappear from every footer that passes one of those menus. Affects all three surfaces equally and predates the media redesign; the media page therefore links `/media/work` and `/media/about` from its hero, work and about sections instead. Fix would be in the shared `SiteFooter` (render the heading row as a link, or stop putting hrefs on heading rows) — deliberately not touched by the media task, which is scoped to `/media` only.
- **The media library is real published work, not seed rows** — updated 2026-09-12. `src/lib/media/sample-portfolio.ts` now carries seven long-form pieces and five vertical edits from the studio's own YouTube channel, with real titles and running times, and every record is `isSample: false`. The seeded demo clips (`aqz-KE-bpKQ`, `R6MlUcmOul8`, `TLK3A0RELQ3g`, `eRsGyueVLvQ`) still exist as `media_video` rows and are still what a fresh `db:seed` produces, so a from-scratch installation shows the demo library until the owner publishes through the CMS — the data file is the fallback, not the source of truth.

- **`src/lib/media/platform-metadata.ts` has no call site** — confirmed 2026-09-12 during the delivery review. The module (platform metadata resolution plus the `wantsMetadata` / `enrichItem` / `enrichMedia` helpers) is complete, typed and documented in `ARCHITECTURE.md`, but nothing imports it yet: no screen currently asks a platform for extra metadata. It is a deliberate seam for the CMS-side enrichment work rather than dead scaffolding, so it was kept; remove it or wire it up when the media CMS publishes its first externally-sourced record.
- **The Contact section still carries the "Availability — Open for new projects" card** — visible on `/media#contact` as the fifth detail tile beside Location / Phone / Email / WhatsApp. It was part of the earlier brief and no later instruction removed it, so it stands; if the studio would rather not make an availability claim, the tile is a two-line removal in `MediaPortfolioPage.tsx`.
- **The CMS sign-in link is still visible in the media footer** — the bottom bar of the media footer includes the admin link, matching the other surfaces. Removing it from the public footer is a one-line change if the owner prefers the admin route to be reached only by URL (`/admin`).

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
