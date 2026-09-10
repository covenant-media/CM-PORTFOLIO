# Project Context — Covenant Media Unified Digital Platform

## What This Project Is

Covenant Media (repository `covenant-media/CM-PORTFOLIO`) is a **single Next.js application** that serves three distinct public web experiences and one shared content management system (CMS) from one codebase and one PostgreSQL schema.

The three public surfaces are:

1. **Covenant (main brand house)** — root routes (`/`, `/about`, `/services`, `/work`, `/team`, `/contact`, `/blog`, `/security`). Neutral, editorial design; brass accent. Represents the studio at large.
2. **Covenant Media** — `/media/**`. Cinematic, dark, video-first portfolio for film production and photography work.
3. **Covenant Tech (Covenant Nsikan)** — `/tech-portfolio` (canonical single-page route; the legacy `/tech` route and `/tech/**` deep links still serve the same experience and its section pages). Technical, lighter-accented (blue signal) portfolio for software engineering, design, and cybersecurity work.

The surfaces share data, components, and primitives but differ by theme tokens, navigation, and wordmark. There is never a second copy of content.

## Purpose & Goals

- Act as the **marketing + portfolio + lead-capture site** for a small multi-disciplinary studio operating out of Lagos, Nigeria (currency defaults to NGN; phone placeholders are `+234…`; budget bands are in ₦).
- Let the founder manage content across all three surfaces through **one CMS at `/admin`** without touching code.
- Ship with a strong default ("never renders a half-built page") by falling back to structural page plans when the CMS has no composed page yet, while **never inventing client claims** — placeholder/seeded data is explicitly tagged (`is_sample`, `is_placeholder`, `is_verified=false`) and hidden or labelled on the public site.
- Keep abuse surface small: no third-party analytics cookies, only one cookie (the CMS session), bots get a 200 on the contact form to learn nothing, IPs are hashed, DNT is honored.
- Run locally with **zero external dependencies** via an embedded PostgreSQL (PGlite) so a new developer can `npm install && npm run dev` and have a working app against a real Postgres dialect.

## Current Technology Stack

| Layer | Choice |
|-------|--------|
| Runtime | Node ≥ 20.11 |
| Framework | Next.js 15.5 (App Router, React Server Components) |
| UI | React 19 |
| Language | TypeScript (strict mode, `noImplicitReturns`) |
| Styling | Tailwind CSS v4 (`@tailwindcss/postcss`) + design tokens in `src/app/globals.css` |
| Fonts | Self-hosted via `@fontsource` — Fraunces (display), Inter (body), JetBrains Mono (mono) |
| Animation | Framer Motion; CSS keyframes; `prefers-reduced-motion` respected |
| Database | PostgreSQL 14+ (production via `pg`); embedded PGlite 0.5.8 for dev/demo |
| Auth | Custom session-cookie auth with scrypt hashes, CSRF double-submit, role-based permissions, login rate limiting |
| Media uploads | Local filesystem (`public/uploads`, served via `/uploads/[...path]` route) with S3/R2 driver interface; Sharp for image variants |
| Video | oEmbed detection for YouTube, TikTok, Facebook, Vimeo, Instagram; lazy poster → click-to-embed pattern |
| Markdown | `marked` + `sanitize-html` for blog/service copy |
| Icons | Inline SVG set in `src/components/ui/Icon.tsx` + `simple-icons` for brands (extracted at build) |
| Testing | Node built-in `node:test` runner (offline, no browser/network) |
| Linting | ESLint with `eslint-config-next` + correctness rules |
| Process supervisor (dev) | Custom `scripts/dev.ts` orchestrating PGlite socket + Next |

## Major Application Areas

1. **Public brand site** (`/`) — editorial hero, "two worlds" split, cross-discipline work grid, services, stats, testimonials, contact.
2. **Media portfolio** (`/media/**`) — cinematic hero with floating video previews, video wall, project catalog with filters (category/format), project detail pages, services, pricing, photo galleries, contact.
3. **Tech portfolio** (`/tech/**`) — hero with portrait + top skills, skill matrix, project grid (software/security), experience timeline, tools grid, certifications, resume download, contact.
4. **Shared surfaces** — `/blog` (posts scoped per division), `/team`, `/work` (all projects), `/about`, `/services`, `/contact` (main variant), `/security` (legal/privacy), `/media/contact` and `/tech/contact`.
5. **CMS** (`/admin/**`) — full back office.
6. **HTTP API** — forms (`/api/forms`), analytics events (`/api/events`), admin uploads/assets/export, OG image rendering (`/api/og`), RSS feed (`/feed.xml`), sitemap, robots.txt, upload serving (`/uploads/[...path]`).

## Major Implemented Features

- **Data model** — 28 SQL tables covering identity, roles, sessions, audit log, pages, reusable content blocks, navigation, social links, services, projects, media assets, videos, galleries, testimonials, team, blog posts, skills, experience, certifications, resume versions, pricing packages, contact submissions, newsletter subscribers, SEO records, and first-party events.
- **Generic CMS engine** — A module registry (`src/lib/cms/modules.ts`) drives list/search/filter/sort/pagination, create/edit forms, publishing, duplication, reorder, delete-with-reference-check, and permission checks for **25 admin modules** without writing per-module screens.
- **Block-based page composition** — A block registry (`src/components/blocks/index.tsx`) renders ~25 section types (hero variants, grids, video walls, testimonial walls, timelines, pricing tables, skill matrix, resume, contact CTA, rich text, etc.). Pages either use CMS-composed blocks or fall back to a structural plan in `src/lib/cms/page-plans.ts`.
- **Media library** — Upload with MIME sniffing, size limits, Sharp-generated variants, blur placeholders, checksum, in-place asset replacement that propagates everywhere the asset is used.
- **Video importer** — Paste a URL; source detection, oEmbed fetch (best-effort), poster/embed URL derivation; graceful fallback when platforms block metadata.
- **Public contact forms** — Three variants (main/media/tech) sharing one endpoint with honeypot, signed timing token, per-IP rate limiting, optional Turnstile, spam heuristic, consent flag, hashed IP storage, CSV export, optional email notification via Resend.
- **Auth & authorization** — Owner/editor/media_editor/viewer roles, httpOnly session cookie, CSRF cookie, per-mutation permission enforcement server-side, failed-login throttling table, audit log on every mutation.
- **SEO** — Per-scope SEO records, dynamic metadata, Open Graph images via `/api/og`, XML sitemap, RSS feed, robots.txt, JSON-LD (Organization, Website only — no invented ratings), canonicals.
- **First-party analytics** — Cookieless events (page_view, cta_click, project_click, video_play, outbound_click, form_submit, resume_download, etc.) with daily-rotating salted visitor IDs; DNT respected; no third-party scripts.
- **Three themed experiences** — Single design-token system in `globals.css` with `.theme-main|media|tech|admin` wrappers; components read CSS variables (`--accent`, `--surface-tone`, `--motion-tempo`).
- **Maintenance mode** — Site setting that short-circuits all public surfaces to a "Back shortly" page while leaving `/admin` reachable.
- **Resumable/portable dev** — `npm run dev` boots an embedded Postgres socket, waits for it to answer queries, then starts Next; `npm run setup` runs migrate + seed; `npm run db:*` family covers reset/status/reset-admin.

## Important Integrations

| Integration | Purpose | Configured via | Required? |
|-------------|---------|----------------|-----------|
| PostgreSQL (external) | Production database | `DATABASE_URL`, `DB_DRIVER=postgres` | Required in production |
| PGlite (embedded) | Local dev database | `DB_DRIVER=pglite` (default), `CM_DATA_DIR` | Default for dev/demo |
| S3/R2-compatible storage | Production uploads | `STORAGE_DRIVER=s3`, `S3_ENDPOINT`, `S3_BUCKET`, etc. | Optional (local driver default) |
| YouTube Data API v3 | Richer video metadata | `YOUTUBE_API_KEY` | Optional (oEmbed fallback) |
| GitHub API | Repo metadata on Tech projects | `GITHUB_TOKEN` | Optional |
| Resend | Email notifications for form submissions | `RESEND_API_KEY`, `NOTIFY_EMAIL` | Optional (submissions still stored in DB) |
| Cloudflare Turnstile | Bot mitigation on public forms | (env — referenced in security code) | Optional |
| CDN (for uploads) | Cache `/uploads/*` in production | External reverse proxy | Optional |

## Important Terminology

- **Surface / experience / division** — One of the three public sites (`main`, `media`, `tech`) plus the `admin` surface for the CMS. The word "division" is used in the DB to scope content (`service.division`, `project.division`, `testimonial.division`, etc.).
- **Module** — A CMS-managed content type registered in `CMS_MODULES` (e.g. `media_projects`, `videos`, `skills`, `pricing`). The module key is the unit of permissions, routing, and generic CRUD.
- **Block** — A reusable, CMS-composed page section (e.g. `hero_media`, `service_grid`, `video_wall`). Blocks live in `content_block` and are attached to pages via `page_block`.
- **Plan** — The structural fallback for a route (`src/lib/cms/page-plans.ts`) that is used when no CMS page exists. Plans carry no prose — they declare which blocks render, with which division/limit props.
- **Sample / placeholder content** — Rows seeded with `is_sample=true` or team members with `is_placeholder=true`. The public site labels or hides these so a seeded demo is never mistaken for a real client claim.
- **Asset** — An uploaded file tracked in `media_asset`, with variants, MIME, dimensions, checksum, and storage driver pointer.
- **Video** — A `media_video` row representing an embeddable video (from an external platform or an uploaded file asset).
- **Setting** — A typed key/value in `site_setting` (brand name, contact info, form behavior, legal copy, maintenance flag, etc.).
- **Field definition** — A schema entry (`FieldDef`) describing how a CMS field renders, validates, and maps to a column; used by both the admin form renderer and the server-side parser/validator.
- **Public ID prefix** — Every table uses prefixed string IDs (`prj_`, `ast_`, `vid_`, `usr_`, `set_`, `blk_`, `tst_`, `skl_`, `exp_`, `cert_`, `rsm_`, `pkg_`, `sub_`, `evt_`, `aud_`, `nav_`, `soc_`, `gal_`, `post_`, `seo_`, `ses_`, `role_`).

## Business / Product Context (as evidenced by the codebase)

- The studio founder is **Covenant Nsikan**. Tech surface wordmark uses the founder's personal name; the main/media surfaces use "Covenant Media".
- Based in **Lagos, Nigeria** — currency defaults to NGN, phone placeholder `+234 …`, budget bands in ₦.
- The studio offers both **media production** (event/wedding/commercial/music video/shorts, photography, editing, color grading, motion graphics, thumbnails) and **technology services** (web/mobile apps, backends, dashboards, UI/UX, cybersecurity, GRC, incident response, AI tooling, automation).
- The product philosophy visible in comments and guards is **"do not invent facts"**: testimonials require `approved_at`, metrics require `verified=true`, social links require `is_verified`, certifications require `completed=true` and a `verify_url`, resume requires an active published version, team placeholders are labelled, and pricing defaults to "quote" rather than a made-up number.
- The platform ships with demo seed content (open Blender Foundation films for videos, sample service copy, sample projects) that is flagged `is_sample`. Real clients, metrics, outcomes, testimonials, experience history, certifications, and the resume are **deliberately empty** in the seed and are expected to be filled in by the owner before launch.
- Default CMS credentials on a fresh seed are `covenant@example.test / covenant-demo-2026` (overridable via `ADMIN_EMAIL` / `ADMIN_PASSWORD`); the README explicitly instructs the operator to change them.
- There is a single deployed codebase serving all three surfaces; routing and scoped themes are how they are separated — not separate apps or separate databases.
