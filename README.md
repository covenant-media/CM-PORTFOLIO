# Covenant Media — Unified Digital Platform

One codebase, three public experiences and one CMS behind them:

| Surface | Path | Look |
| --- | --- | --- |
| Covenant (brand house) | `/` and the root routes | neutral, editorial |
| Covenant Media (film + photography) | `/media/**` | cinematic, dark, video-first |
| Covenant Tech (systems + consulting) | `/tech/**` | technical, light, mono accents |
| CMS | `/admin/**` | single shared back office |

All three read the same Postgres schema and the same content models. Only the theme tokens and
the navigation change per surface — never a second copy of the data.

## Run it

```bash
npm install
npm run dev          # → http://localhost:3000
```

`npm run dev` is one command and two processes: it boots an embedded PGlite database against
`.cm-data/pgdata`, serves it over a local PostgreSQL socket on `127.0.0.1:55432`, waits until the
database actually answers a query, then starts Next against it with `node-postgres`. There is
nothing to install and the driver path is identical to production.

| Script | Purpose |
| --- | --- |
| `npm run dev` | database + app (dev) |
| `npm run db:serve` | the local Postgres socket on its own |
| `npm run db:migrate` | apply `src/lib/db/schema.sql` (idempotent) |
| `npm run db:seed` | sample content, safe to re-run — it skips tables that already have rows |
| `npm run db:reset` | drop, migrate, seed |
| `npm run db:status` | row counts per table |
| `npm run db:reset-admin` | create/repair the CMS owner account — `ADMIN_EMAIL` / `ADMIN_PASSWORD` (defaults `covenant@example.test` / `covenant-demo-2026`), re-seeds system roles if missing |
| `npm run lint` | ESLint (Next config, correctness rules only) |
| `npm run test` | the `tests/` suite — no browser, no network |
| `npm run test:watch` | same, on file changes |
| `npm run check` | typecheck + lint + tests |
| `npm run build` / `npm start` | production build and serve |

Point the app at a real database instead of the embedded one by setting
`DATABASE_URL` (with `DB_DRIVER=postgres`), or set `CM_DB_EXTERNAL=1` to make `npm run dev`
skip the socket entirely. Credentials and feature flags live in `.env` — see `.env.example`.

## What is here

**Content layer.** 27 tables in `src/lib/db/schema.sql` covering projects, videos, assets,
galleries, services, pricing, skills, experience, certifications, resume versions, team,
testimonials, blog posts, pages, reusable content blocks, navigation, social links, site settings,
SEO records, submissions, users/roles/sessions and analytics events. Writable column lists are
declared once in `src/lib/db/tables.ts`, and the CMS can only touch columns that file allows.

**Pages.** Every route resolves its sections from the CMS first and falls back to a structural
plan (`src/lib/cms/page-plans.ts`) when a page has not been composed yet — so a page never renders
half-built and no copy is hardcoded in a component. Detail views hide any field the owner has not
filled in, which is what keeps placeholder data from reading as a claim.

**Video workflow.** Paste a YouTube, TikTok, Facebook or Vimeo URL and the importer detects the
source, derives what the platform permits, and produces an editable preview/embed record. Public
surfaces show a floating muted preview; clicking it swaps in the real player with sound. Embeds and
poster images load lazily.

**Forms.** Both contact surfaces post to `/api/forms` with a honeypot, a signed timing token,
per-IP rate limiting, optional Turnstile, a consent record and hashed-only IP storage. Bots get
the same 200 as humans. Submissions land in the CMS.

**SEO + analytics.** Dynamic metadata, canonicals, Open Graph tags rendered through `/api/og`,
XML sitemap, robots, RSS, and JSON-LD limited to the types the content actually supports
(no invented ratings). Analytics is first-party: events go to `cm_event` and `Do Not Track` is
honoured; analytics sets no cookie of its own — the only cookie in the app is the CMS session.

**CMS (`/admin`).** One dispatcher drives all 24 registry modules instead of 24 hand-written
screens: list with search/filter/sort/pagination, create/edit through the same field definitions
the validator uses, publish/unpublish, reorder, duplicate, delete with a reference check, media
upload and replace, video import, submissions with CSV export, settings by group, the block
composer for page layouts, navigation editing and an account page. Auth is session-cookie based
with an http-only cookie and Argon-style scrypt hashes; every mutation re-checks the role
permission server-side and compares the `_csrf` field against the CSRF cookie, then writes an
`audit_log` row and revalidates the public caches. The UI hides what a role cannot do; the server
refuses it anyway.

**Design tokens.** Colour, type, spacing and motion tempo are declared once in
`src/app/globals.css` and re-scoped per surface (`.theme-main|media|tech|admin`). Components read
`var(--accent)`, never a literal. Fonts are self-hosted (`@fontsource`) and swapped at one place.
All animation respects `prefers-reduced-motion`.

## Sample content, clearly marked

`npm run db:seed` loads a demo set so the platform can be clicked through: flagged `is_sample`
rows, open Blender Foundation films for the player, quote-only pricing, and social profiles saved
as unverified drafts so they stay hidden until each URL is confirmed. Clients, metrics, outcomes,
testimonials, experience history, certifications and the resume are deliberately **empty** — those
are facts only the owner can supply, and empty states render as empty states.

CMS sign-in for the seeded database is `covenant@example.test` / `covenant-demo-2026`. Change it
immediately; `ADMIN_EMAIL` / `ADMIN_PASSWORD` override the seed.

## Uploads in production

The local storage driver writes to `public/uploads` and the app serves those bytes itself through
`/uploads/[...path]`, because `next start` only serves files that were present when the build ran —
relying on the static directory alone would 404 anything uploaded after a deploy. Point
`CM_UPLOAD_DIR` at a mounted volume (or set `STORAGE_DRIVER=s3` for an S3-compatible bucket) and
put a CDN in front of `/uploads` when traffic justifies it; no CMS change is needed either way.

## Status

Implemented and verified: the three public experiences, the database and content models, the media
pipeline (upload, variants, replace, video import), public forms with their abuse controls, SEO,
first-party analytics, and the full `/admin` CMS — auth, roles, all 24 modules, publishing,
reordering, the block composer, submissions, settings and the audit trail. `npm run check` covers
typecheck, lint and an offline test suite that guards the registry against schema drift, the
permission ladder, the form wire contract and the video importer.

Still to do before launch, none of it architectural: replace the seeded sample rows with real
content, confirm the social profile URLs (currently stored as unverified drafts so they stay
hidden), decide pricing, and read the legal/privacy copy with a lawyer — the Security & Privacy
page states only what this codebase actually does and claims no certification.

## Layout

```
src/app/**            routes for the three surfaces, API handlers, error + not-found pages
src/components/ui     primitives (buttons, fields, modal, lightbox, pager, motion)
src/components/site   headers, footers, cards, detail views, catalog views
src/components/blocks CMS-rendered section renderers, keyed by block_type
src/lib/cms           loaders, block registry, field specs, module registry, settings, repository
src/lib/db            driver, schema, table specs, seed
src/lib/auth          users, sessions, roles, permissions, rate limiting, CSRF guard
src/lib/media         video source detection, storage rules
src/lib/seo           metadata, JSON-LD, per-page metadata helpers
scripts/              dev orchestration, migrate/seed/reset/status CLI, admin save replay
tests/                node:test suites over the registry, permissions, forms, media
