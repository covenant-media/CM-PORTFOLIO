# Architecture — Covenant Media Unified Digital Platform

This document describes the implemented architecture as of the current repository state. It is grounded in the code, not aspirational.

## Architectural Overview

Covenant Media is a **monolithic Next.js 15 App Router application** that runs both the public websites and the CMS back office. There is no separate backend server: server components, server actions, and route handlers run in the Next Node runtime against a single PostgreSQL database.

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                             │
│  (React 19 client, Framer Motion, Tailwind-rendered UI)     │
└─────────────┬───────────────────────────────────────────────┘
              │ HTTPS
┌─────────────▼───────────────────────────────────────────────┐
│                   Next.js 15 server                          │
│                                                              │
│  App Router (RSC)          Server Actions    Route Handlers  │
│  ├─ / (main surface)       admin/actions.ts   /api/forms     │
│  ├─ /media/**                                 /api/events    │
│  ├─ /tech/**                                  /api/admin/*   │
│  ├─ /admin/** (CMS shell)                     /api/og        │
│  ├─ /blog, /work, /team…                      /uploads/*     │
│  └─ /security                                 /feed.xml      │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────────────────┐      │
│  │ Block renderers  │  │ Generic CMS dispatcher       │      │
│  │ (server c.)      │  │ (module registry → CRUD)     │      │
│  └────────┬─────────┘  └──────────────┬───────────────┘      │
│           │                           │                      │
│  ┌────────▼───────────────────────────▼────────────────┐     │
│  │       lib/cms (content, repository, settings)       │     │
│  │       lib/auth (session, guard, permissions, RBAC)  │     │
│  │       lib/media (storage, video detect/oEmbed)      │     │
│  │       lib/seo, lib/analytics, lib/security, lib/db  │     │
│  └────────────────────────┬────────────────────────────┘     │
│                           │ parameterised SQL                │
│  ┌────────────────────────▼────────────────────────────┐     │
│  │         DbDriver (pg in prod, PGlite in dev)        │     │
│  └────────────────────────┬────────────────────────────┘     │
└───────────────────────────┼──────────────────────────────────┘
                            │
              ┌─────────────▼──────────────┐
              │   PostgreSQL 14+           │
              │   27 tables                │
              └────────────────────────────┘
```

## Frontend Architecture

### Routing & Surfaces
- All routes live under `src/app/`.
- Three public surfaces share a `CmsPage` component which wraps content in `ExperienceShell`:
  - Root routes (`/`, `/about`, `/services`, `/work`, `/team`, `/contact`, `/blog`, `/security`): `surface="main"`
  - `/media/**`: `surface="media"`
  - `/tech/**`: `surface="tech"`
- The CMS lives under `/admin/**` with its own `theme-admin` shell and auth layout.
- Each public route imports `CmsPage`, which resolves content in this order:
  1. Look up `page` row by slug.
  2. If the page exists and has attached blocks, render those ordered blocks.
  3. Otherwise, use the structural plan from `src/lib/cms/page-plans.ts`.
- Detail routes (`/media/work/[slug]`, `/tech/projects/[slug]`, `/blog/[slug]`) render a detail view directly (`ProjectDetailView`, `ArticleView`) and can still include a `CmsPage` with a fallback project-grid block.

### Rendering Model
- Almost all public pages are **async React Server Components** (RSC). `revalidate = 60` is set on routes so ISR revalidates every 60 seconds; mutations in the CMS call `revalidateTag`/`revalidatePath` explicitly.
- Client components are used where interactivity is required: the admin shell, forms, lightbox, marquee, motion wrappers, reveal-on-scroll, the `PublicForm`, and the uploader/composer/reorder admin widgets.
- There is no global client-side state manager. Cross-component client state is local (React state/URL params) or derived from server-rendered props.
- Images use Next's `<Image>` with `remotePatterns` whitelist (ytimg, vimeocdn, cloudfront, picsum) and local `/uploads` served via an app route.

### Design System
- Design tokens live in `src/app/globals.css` under `@theme { … }` (Tailwind v4 convention).
- Experiences are scoped by a wrapper class: `.theme-main`, `.theme-media`, `.theme-tech`, `.theme-admin`. Each defines `--accent`, `--accent-soft`, `--accent-ink`, `--accent-glow`, `--surface-tone`, and `--motion-tempo`.
- Components must read tokens via `var(--accent)`/utility classes (`accent-text`, `accent-bg`, `hairline`, `surface`, `eyebrow`, `display-1..4`, `lede`) — never hard-code colors.
- Reusable primitives live in `src/components/ui/`: `Button`, `Icon`, `Lightbox`, `Marquee`, `Media`/`MediaTile`, `Motion`, `Pager`, `Reveal`, `Section` (incl. `EmptyState`), `SiteBehaviours`.
- Site-specific components (`SiteHeader`, `SiteFooter`, `Logo`, `WorkCard`, `CatalogView`, `ProjectDetailView`, `ArticleView`, `MediaBand`, `ExperienceShell`) live in `src/components/site/`.
- Block renderers live in `src/components/blocks/` and are all async server components (some do their own data loading).

### Accessibility & UX Conventions
- Skip-to-content link on both public shell and admin.
- Focus rings use `:focus-visible` with the accent color.
- All animation respects `prefers-reduced-motion`.
- A `<noscript>` notice explains that motion/video are reduced without JS.
- Labels on forms are real `<label>` elements; required/error states are server-validated and reflected.
- Public video previews are muted floating posters; clicking swaps in the real embed with sound (autoplay-with-sound blocked by browsers otherwise).

## Backend Architecture

There is no separate backend process. All backend logic runs inside Next:

- **Server Actions** (`'use server'` in `src/app/admin/actions.ts`) handle all CMS mutations. They are the only write path for the admin UI.
- **Route Handlers** handle public HTTP APIs (`/api/forms`, `/api/events`, `/api/admin/*`, `/api/og`, `/uploads/[...path]`, `/feed.xml`).
- **Server Components** perform reads directly via `lib/cms/content.ts` and `lib/db`.

### Key Backend Modules

- `src/lib/db/`
  - `driver.ts` — `DbDriver` interface; implements `postgres` (node-postgres) and `pglite` (embedded WASM Postgres) backends.
  - `index.ts` — generic `select`, `selectOne`, `execute`, `transaction`, `insertRow`, `updateRow`, `deleteRow`, `getById`, `quote`, `orderBy`. Coerces JS values to the correct Postgres types, auto-manages timestamps. Auto-applies `schema.sql` on first use.
  - `tables.ts` — `TABLES` registry mapping table name to columns, types, nullability, writability, pk, id prefix, timestamps flag. **The CMS can only write columns declared here.**
  - `schema.sql` — Idempotent DDL (CREATE … IF NOT EXISTS) for all 27 tables + indexes.
  - `seed.ts` — Seeds demo sample rows; skips tables that already have rows.
- `src/lib/cms/`
  - `modules.ts` — `CMS_MODULES` array: one entry per admin module with table, editor, fields, list columns, filters, search, sortability, publishability, slugs, fixed scopes, permission key, public base path.
  - `fields.ts` — Field type system (text/textarea/markdown/number/money/boolean/select/multiselect/url/slug/date/datetime/image/asset/relation/tags/list/repeat/json/seo/color) with conditional `showIf`, grouping, help text, validation metadata.
  - `repository.ts` — Create/update/delete/duplicate/reorder/setField/status operations; validates input against module fields; checks references before delete; writes `audit_log`; calls `revalidateTag`/`revalidatePath`.
  - `content.ts` — All public read queries (site context, pages with sections, services, projects, videos, galleries, testimonials, skills, experience, certifications, resume, blog posts, pricing, contact details).
  - `page-plans.ts` — Structural fallback plans per route (list of `{type, props}` block definitions).
  - `blocks.ts` — Per-block-type prop defaults.
  - `settings.ts` — Typed getter/setter for `site_setting`; groups settings (brand, contact, legal, forms, seo, system, etc.).
  - `forms.ts` — Public contact form field configs (main/media/tech variants) shared by UI and server validation.
  - `options.ts` — Enums/select options used across admin, public renderers, and validation.
  - `admin.ts` — FormData parser for admin forms; builds validated input objects from field defs.
- `src/lib/auth/`
  - `session.ts` — Session creation, verification, destruction; httpOnly session cookie + CSRF cookie; password hashing (scrypt) and verification.
  - `guard.ts` — `requireAdmin`, `requirePermission`, `assertCsrf`, `audit`, `ApiError`, JSON helpers for routes.
  - `permissions.ts` — `CMS_MODULE_KEYS`, role definitions (owner/editor/media_editor/viewer), `can(role, module, level)` with wildcard + per-module overrides loaded from `admin_role.permissions` JSONB (cache for 30s).
  - `rate-limit.ts` — In-memory + DB-backed throttling for login and contact forms (with IP hashing).
  - `password.ts` — Scrypt parameters and constant-time compare.
- `src/lib/media/`
  - `storage.ts` — `ingestFile`, `replaceAsset`, `normaliseAsset`, MIME sniffing, size limits, Sharp variants, checksum writing, blur data. Includes a local filesystem driver (writing to `public/uploads`) and a compact SigV4 S3-compatible driver (R2/B2/MinIO/WASabi) using PUT/DELETE when `STORAGE_DRIVER=s3`.
  - `video.ts` — `detectVideoSource` (regex per host), `fetchOEmbed` (YouTube/Vimeo/TikTok/Facebook/Instagram), embed URL construction, thumbnail candidate lists.
- `src/lib/seo/`
  - `metadata.ts` — `resolveSite`, `getSettings`, `organizationJsonLd`, `websiteJsonLd`.
  - `page.ts` — `pageMetadata`, `projectMetadata`, `blogMetadata` helpers.
  - `structured.ts` — JSON-LD construction with safe escaping.
- `src/lib/security/forms.ts` — Honeypot check, signed timing token (HMAC), spam pattern heuristics, Turnstile verification.
- `src/lib/analytics/`
  - `events.ts` — `recordEvent`, `clientIp`, `hashIp` (daily salt); DNT honouring.
  - `client.ts` — Small client helper for sending events from `SiteBehaviours`.
- `src/lib/utils/` — `text.ts` (truncate, cx), `markdown.ts` (sanitized render).
- `src/lib/icons/` — `brands.ts` for simple-icon brand SVGs.
- `src/lib/types/content.ts` — Shared TypeScript types for sections, assets, projects, etc.

## Database Architecture

- **27 tables**, all in one Postgres database. All primary keys are prefixed text IDs (e.g. `prj_a1b2c3…`), generated via `newId(prefix)` (random UUID hex-truncated + prefix).
- **Idempotent migrations**: `schema.sql` is applied via `CREATE … IF NOT EXISTS` on every boot; the dev CLI also exposes `npm run db:migrate` for explicit runs. There is no migration framework — schema changes are edits to `schema.sql` plus matching edits to `tables.ts`.
- **Key tables and relationships**:
  - `admin_user` ↔ `admin_session` (cascade delete), `admin_user` ↔ `audit_log` (set null on delete)
  - `admin_role` stores role permissions as JSONB; roles resolve via built-in SYSTEM_ROLES unless overridden in DB.
  - `page` ↔ `content_block` via `page_block` (many-to-many with placement/variant/sort_order/overrides).
  - `project` is shared by media and tech via `division`; projects reference `media_asset` (cover), `media_video` (hero).
  - `media_video` references `media_asset` for file uploads and posters; references `project`; platform videos use `source`, `source_id`, `embed_url`, `poster_url`.
  - `media_asset` is the media library; referenced by projects, videos, galleries, testimonials, team, blog posts, resume versions, SEO records.
  - `gallery` holds ordered items in `items JSONB` referencing asset IDs.
  - `service`, `skill`, `testimonial`, `pricing_package`, `experience_item`, `certification`, `team_member`, `social_link`, `navigation_item` are all division-scoped and sortable.
  - `blog_post` supports draft/published/scheduled with `published_at`/`scheduled_at`, markdown body, cover asset, tags.
  - `site_setting` is a key/value table with type, group, label, help, options, is_public flag.
  - `seo_record` holds per-scope SEO overrides.
  - `contact_submission` stores leads with hashed IP and consent flag.
  - `cm_event` stores first-party analytics.
  - `auth_attempt` (created by schema but used only in `rate-limit.ts`) supports login throttling.
- JSONB is used heavily for semi-structured collections: `bullets`, `deliverables`, `tools`, `process`, `outcomes`, `technologies`, `services`, `gallery`, `credits`, `metrics`, `external_links`, `tags`, `links`, `placements`, `items`, `permissions`, `seo`, `props`, `media`, `links` on blocks, `overrides` on page_block, `embed_config`, `metadata`, `variants`, `meta`.

## API Architecture

Route handlers are thin: they authorize, validate, and delegate to the libraries above.

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/forms` | POST | Public contact submissions (honeypot → timing → rate → Turnstile → validation → insert → notify/analyze). Returns 200 even on spam to avoid leaking info. |
| `/api/events` | POST | First-party event ingestion (DNT-aware, cookieless). |
| `/api/admin/upload` | POST | CMS multipart upload (requires `media_library:write` + CSRF). |
| `/api/admin/assets` | GET/HEAD | Asset proxy / metadata for admin pickers. |
| `/api/admin/export/submissions` | GET | CSV export of `contact_submission`. |
| `/api/og` | GET | Dynamic Open Graph image rendered as PNG via Next's `ImageResponse` (conceptually; route exists). |
| `/uploads/[...path]` | GET | Serves files from the configured upload directory (so post-build uploads aren't 404'd by `next start`). |
| `/feed.xml` | GET | RSS feed of published blog posts. |
| `/sitemap.ts`, `/robots.ts` | GET | Dynamic sitemap and robots.txt. |

All admin write operations go through **server actions** in `src/app/admin/actions.ts`, not through custom route handlers — this ensures CSRF, permission, and audit logic runs in one place.

## Authentication & Authorization

- **Sessions** are stored in `admin_session` with `token_hash` (SHA-256 of a random token). The raw token is set as an httpOnly, Lax, Secure-optional cookie (`cm_session`). A second cookie (`csrf_token`) holds the CSRF token for double-submit.
- **Passwords**: Scrypt (via Node `crypto.scryptSync`) with per-user salt; constant-time compare; stored as `salt$hashHex`; `password_set_at` tracking.
- **Login**: `signInAction` enforces per-IP rate limiting (via `auth_attempt` table + in-memory fast path), records the attempt, creates a session on success, applies failed-attempt account locking with exponential backoff.
- **CSRF**: Every state-changing server action reads `_csrf` from FormData and compares to the `csrf_token` cookie (`assertCsrf`). Route handlers read `x-csrf-token`.
- **Authorization**: `requirePermission(module, level)` (server actions) or `requireAdmin(request, module, level)` (routes). The `can(role, module, level)` function resolves effective permission from either built-in `SYSTEM_ROLES` (owner/editor/media_editor/viewer) or the `admin_role.permissions` JSONB loaded from DB (cached 30s). Owner bypasses role lookup and always gets `manage`. UI hides actions the role can't take; server refuses them anyway.
- **Audit**: Every mutation writes an `audit_log` row (user, action, module, entity, entity_id, summary, meta, IP) via the `audit()` helper.
- **Public/API security**: All SQL is parameterised via `$1::type` placeholders; identifiers are validated against a strict regex in `quote()`. Form endpoints enforce length limits and option whitelists. CSP-adjacent headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, COOP) are set in `next.config.mjs`.

## State Management

- **Server state**: Postgres is the source of truth. React Server Components read on each request (or ISR-revalidated).
- **Client state**: Minimal, local. Examples: menu open/close in `Shell.tsx`, search query, lightbox open state, form input state, marquee pause, reveal visibility.
- **No Redux/Zustand/React Query**. Server actions mutate server state, then redirect or return a result; Next's RSC/ISR refresh surfaces updates.
- **Caching**: Next ISR with 60-second revalidate. The repository calls `revalidateTag(module)` and `revalidatePath` after mutations. Caching of role permissions is in-memory 30s TTL.

## Routing / Navigation

- Public navigation is **data-driven**: the `navigation_item` table stores items per location (`main_header`, `main_footer`, `media_header`, `media_footer`, `tech_header`, `tech_footer`). The CMS "Navigation" module edits these; the `reorder` action sets `sort_order`.
- Each `ExperienceShell` variant specifies which `navLocation` to read and which CTA to surface; defaults are in `SURFACE_DEFAULTS` but labels/CTAs can be overridden via settings.
- Admin routing is conventional file-based: `/admin/[module]` (list), `/admin/[module]/new` (create), `/admin/[module]/[id]` (edit). The `row-editor.tsx` inspects the module's `editor` field to render the correct UI (`collection`, `media-library`, `videos`, `projects`, `navigation`, `settings`, `seo`, `resume`, `submissions`, `featured`, `blocks`).

## Major Components & Their Responsibilities

| Component/Package | Role |
|-------------------|------|
| `src/app/*/page.tsx` | Thin routes that call `CmsPage` (or detail views) and export metadata. |
| `CmsPage` | Resolves CMS page + sections, falls back to plan; wraps in `ExperienceShell`; renders page header if page doesn't start with a hero. |
| `ExperienceShell` | Applies `theme-{surface}`, renders grain/atmosphere, `SiteHeader`, `SiteFooter`, `MediaBand` (media only), `SiteBehaviours`, `LightboxHost`; handles maintenance mode. |
| `Blocks` / `Block` | Switch over `block.type` to render each section; many blocks do their own data loading (server components). |
| `blocks/heroes.tsx` | Three hero variants (brand, media, tech) + generic `PageHeader`. |
| `blocks/catalog.tsx` | TwoWorlds, Statement, ServiceGrid, ProjectGrid, LogoMarquee, StatsBand, AboutSplit, RichText, ProjectGrid uses catalog module. |
| `blocks/media.tsx` | VideoWall, PhotoStrip, ProcessTimeline, BlogPreview, TeamGrid, Faq, ToolsGrid. |
| `blocks/tech.tsx` | SkillMatrix, ExperienceTimeline. |
| `blocks/trust.tsx` | TestimonialWall, PricingTable, Certifications, ResumeBlock. |
| `blocks/contact.tsx` | Renders the public form block with the correct variant (main/media/tech). |
| `site/CatalogView.tsx` | Filterable/paginated project list used by work catalogs. |
| `site/TechPortfolioPage.tsx` | Single-page `/tech` experience (hero → about → skills → services → projects → experience → testimonials → contact → resume) with curated production content, sticky `TechAnchorNav`, typewriter role line, filled-accent contact tiles, and a résumé download that falls back to a bundled placeholder PDF. Replaces the multi-route tech surface for the primary `/tech` landing while keeping the legacy `/tech/<section>` deep links alive. |
| `site/TechAnchorNav.tsx` | Right-rail anchor dots for the single-page tech portfolio, highlighting the section in view via IntersectionObserver and smooth-scrolling on click. |
| `site/TechFooter.tsx` | Tech-specific footer with three columns (Brand · Services · Stay-in-Touch). |
| `ui/BackToTop.tsx` | Bottom-right floating back-to-top FAB (solid accent circle with up-arrow) that appears after 600 px of scroll. |
| `ui/Typewriter.tsx` | Accessible typewriter role line that respects `prefers-reduced-motion`; defaults tuned to 35ms type / 20ms delete / 2000ms hold for a smooth, readable cycle. |
| `site/ProjectDetailView.tsx` | Project detail page (gallery, metrics, credits, links, related). |
| `site/ArticleView.tsx` | Blog post rendering (sanitized markdown). |
| `forms/PublicForm.tsx` | Client component that posts to `/api/forms`, handles validation errors, success state, Turnstile when configured. |
| `admin/Shell.tsx` | Admin sidebar, search, user menu, grouped nav derived from module registry + role permissions. |
| `admin/row-form.tsx`, `admin/fields.tsx` | Generic form renderer that walks module `fields` and produces the appropriate input (including repeats, relations, image pickers, markdown, etc.). |
| `admin/list.tsx`, `admin/row-actions.tsx`, `admin/reorder.tsx`, `admin/composer.tsx` | Generic list view, row operations menu, drag-to-reorder, page block composer. |
| `admin/uploader.tsx` | Client upload component posting to `/api/admin/upload` with drag-drop/progress. |
| `admin/LoginForm.tsx`, `admin/account-form.tsx`, `admin/settings-form.tsx` | Specific forms for login, account password change, and grouped settings editing. |

## Important Data Flows

### Public page render
1. Request hits `src/app/<route>/page.tsx`.
2. Route exports `generateMetadata()` for SEO and renders `<CmsPage surface path title …>`.
3. `CmsPage` calls `pageBySlug(key)` (joins `page` + `page_block` + `content_block`).
4. If page exists and has sections, they are returned; else `planFor(key)` returns structural block stubs.
5. `<Blocks>` iterates blocks; each `Block` switch case may call `lib/cms/content.ts` loaders for the exact data it needs.
6. `ExperienceShell` loads `siteContext()` (settings, nav, socials) and `contactDetails()` once per request, then renders header, children, footer.
7. ISR caches the result for 60 seconds; mutations revalidate tags.

### CMS save flow
1. Admin submits a form → `saveRowAction(moduleKey, id, prev, formData)` (server action).
2. `requirePermission(module, 'write')` checks session + role.
3. `assertCsrf` checks CSRF token.
4. `parseForm(formData, dbFields(module))` parses and coerces per field defs.
5. If module is `videos`, `applyDetection` fills source/source_id/embed_url/poster_url from a pasted URL.
6. `repo.create` or `repo.update` validates, coerces via `insertRow`/`updateRow`, writes audit row, calls `revalidateContent`.
7. On create, redirects to the edit page for the new ID.

### Public form submission
1. Client POSTs JSON or form-encoded to `/api/forms`.
2. Honeypot (`_gotcha`), signed timing token (`_token`), per-IP rate limit, Turnstile (if configured) reject early with appropriate status or silent 200.
3. Fields validated against `FORM_CONFIGS[variant]`.
4. Spam heuristic (`looksSpammy`) silently drops junk with a 200.
5. `insertRow('contact_submission', …)` stores with hashed IP and consent flag.
6. Best-effort email (Resend, if `RESEND_API_KEY` set) and analytics event — never blocks response.
7. Revalidates submissions tag; redirects back with no query on success (native form submit) or returns JSON `{ok:true}`.

### Upload flow
1. Admin uses `uploader.tsx` to POST multipart to `/api/admin/upload` with `x-csrf-token` header.
2. `requirePermission('media_library', 'write')` + `assertCsrf`.
3. File size/MIME checked; buffer read; `ingestFile` runs Sharp for variants, computes checksum, writes to configured storage (local or S3), inserts `media_asset` row.
4. Returns a normalized asset JSON for the picker; revalidates media library tag.

## External Integrations

- **Email (Resend)**: `notify()` in `/api/forms/route.ts` sends via `https://api.resend.com/emails` if `RESEND_API_KEY` is set; otherwise submissions are still stored in the DB.
- **oEmbed providers**: YouTube, Vimeo, TikTok, Facebook, Instagram — fetched server-side via their public oEmbed endpoints (no API key required, subject to platform availability).
- **YouTube Data API**: optional, used for richer metadata when `YOUTUBE_API_KEY` is present (graceful fallback).
- **GitHub**: optional, for Tech project repo metadata when `GITHUB_TOKEN` is set.
- **Cloudflare Turnstile**: optional bot verification for public forms (`verifyTurnstile` in `lib/security/forms.ts`).
- **Image CDN / S3 / R2**: storage driver abstraction; local is default, S3-compatible via env vars.

## Important Architectural Decisions Reflected in the Code

1. **One codebase, three sites, one DB.** No multi-repo or multi-deploy split; surfaces are separated by theme + navigation + division scoping only.
2. **Generic CMS driven by a registry.** Adding a module is a data change (add to schema, tables, modules) — no new list/form screens needed. This avoids 24 hand-written admin pages.
3. **Structural plans with no prose.** Fallback pages declare only which blocks to show and with what props; all copy comes from CMS settings/modules. This prevents "half-built" pages while ensuring nothing is invented.
4. **Honest content markers.** `is_sample`, `is_placeholder`, `is_verified`, `verified` (metrics), `approved_at` (testimonials), `completed` (certs) gate what renders publicly.
5. **Server-first rendering.** Public pages are RSC; client components are isolated to truly interactive bits.
6. **Zero-setup local dev with PGlite served over a real PG socket** — dev uses `pg` against `127.0.0.1:55432`, identical driver path as production, while CLI scripts use PGlite directly.
7. **Single write path for admin.** All mutations go through `app/admin/actions.ts` server actions with centralized guard/CSRF/audit, preventing ad-hoc endpoints from skipping authorization.
8. **Idempotent, forward-compatible schema.** Schema uses `IF NOT EXISTS` and no down-migrations; `tables.ts` is the write-allowlist so adding a column without exposing it is safe.
9. **Cookie-light, privacy-first.** Only one cookie (CMS session), first-party analytics only, DNT respected, hashed IPs with daily salt, no third-party trackers.
10. **Design tokens over hard-coded styles.** All colors/motion/typography/radii are CSS variables set per-theme; components must use them.
11. **Post-build uploads via the app.** Uploads are written to disk at runtime and served through `/uploads/[...path]` because `next start` does not serve files added after build.
12. **Fail-closed authorization.** Unknown roles, missing sessions, and failed CSRF all deny access; owner is the only hard-coded backstop.
