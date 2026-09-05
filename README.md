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
| `npm run check` | typecheck + tests |
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

## Status

Implemented and verified: the full public platform above, the database and content models, the
media import pipeline, forms, SEO and analytics.

In progress: `/admin` — the CMS screens (auth, module editors, publish/revalidate flow) build on
the content layer above and are the remaining piece of the v1 scope.

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
scripts/              dev orchestration, migrate/seed/reset/status CLI
```
