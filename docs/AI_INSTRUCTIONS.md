# AI Instructions — Covenant Media Project

These are permanent instructions for any AI agent (or developer using AI assistance) working in this repository. Read this entire file before starting substantial work. Also read the rest of `/docs/` (`PROJECT_CONTEXT.md`, `ARCHITECTURE.md`, `DEVELOPMENT_STATUS.md`, `CHANGELOG.md`) before making changes.

## 1. Project posture

- This is an **existing, production-oriented project**, not a blank starter. Treat the current code as the result of deliberate engineering choices. Do not approach it as greenfield.
- The project already implements three public surfaces (main, media, tech) and a full CMS behind them. Your default stance is to **extend, fix, or refine** — not to replace or rewrite.
- The codebase has strong conventions (design tokens, module registry, block system, server actions, repository layer, permission model). Reuse them instead of introducing parallel systems.

## 2. Before writing code

1. **Inspect, don't assume.** Read the files relevant to the task before editing them. Use the codebase, not memory, to answer questions about APIs, props, and data shape.
2. **Read `/docs`.** Cross-reference what you read there against the actual code — documentation is a map, not the territory.
3. **Treat code as source of truth** when documentation and code diverge. If you find drift, fix both.
4. **Identify the extension points** the architecture already provides. Before building a new abstraction, look for an existing one:
   - New admin content type? Add to schema, tables, and the module registry — don't write bespoke admin pages.
   - New page section? Add a block renderer case and register the `block_type` option in the blocks module — don't hard-code it into a route.
   - New field behavior? Extend `lib/cms/fields.ts` and the `fields.tsx` renderer — don't add one-off inputs.
   - New visual treatment? Use or extend the design-token system in `globals.css` — don't hard-code hex colors inline.

## 3. Working style

- **Reuse existing components, services, utilities, and architecture** where appropriate. The codebase has `Button`, `Icon`, `Section`, `Media`, `Motion`, `Reveal`, `EmptyState`, block types, generic CRUD, field types, auth guards, storage helpers, etc.
- **Do not unnecessarily rewrite working systems.** Refactoring "just because" introduces risk. If refactoring is required to do the task safely, keep it minimal and explain why.
- **Do not remove existing functionality** unless explicitly instructed. If a feature must be removed, confirm with the user first and document the removal in `CHANGELOG.md` and `DEVELOPMENT_STATUS.md`.
- **Do not create duplicate implementations** of logic that already exists (e.g. don't write a second auth check, a second SQL access layer, a second image uploader, a second form validation).
- **Preserve existing business logic** unless the task requires changing it. In particular, respect these content-honesty rules:
  - `is_sample` / `is_placeholder` flags keep seeded/demo content from reading as a real claim. Do not silence or bypass them.
  - `is_verified` gates social links; `verified` gates metric display; `approved_at` gates testimonials; `completed` + `verify_url` gate certifications; active+published resume gates the download button; pricing defaults to quote. These are product rules, not bugs.
  - Bots on `/api/forms` must continue to get the same 200 response as legitimate users. Do not add differentiating responses.
  - IP addresses must remain hashed (daily salt). Do not log raw IPs.
- **Maintain existing naming conventions:**
  - Prefixed string IDs (`prj_`, `ast_`, `vid_`, etc.) generated via `newId(prefix)`.
  - Snake_case DB columns; camelCase TS/React props.
  - Server actions in `src/app/admin/actions.ts` for CMS writes.
  - Module keys are lowercase-with-underscores and appear in permissions, nav, and routes.
  - Design tokens via CSS variables (`var(--accent)` etc.), not inline hex values.
- **Maintain existing UI/UX patterns:**
  - Follow `.theme-{surface}` scoping and the `hairline`/`surface`/`eyebrow`/`display-*`/`lede` utility system.
  - Keep reduced-motion support working (use existing motion helpers, don't force animation).
  - Keep focus rings and skip links working.
  - **Overlays and modals are portalled to `document.body` and animate on transform, not opacity.** A `position: fixed` overlay rendered inside an animated or transformed ancestor is clipped to that ancestor instead of the viewport, and an opacity fade on a full-screen backdrop is a fade of the page behind it — both have already caused "the card is see-through / the page shows around it" defects. Modal bodies also wrap rather than overflow, and the scrolling middle of a panel is `min-h-0`.
  - **Brand, tool and product logos are the real artwork**, prepared once into `public/images/**` as transparent assets and served from there — never a hand-drawn approximation of a recognisable mark. Keep the accessible name on the tile, not on the image.
  - Admin UI should continue to derive navigation, labels, and actions from the module registry rather than hard-coding them.

## 4. Scope discipline

- **Keep changes scoped to the requested task.** If you discover unrelated issues, note them in the `DEVELOPMENT_STATUS.md` "Known Issues" section or mention them to the user — don't fix them in passing unless they block the task.
- **Avoid unrelated refactoring** (formatting churn, renaming untouched code, reorganizing directories).
- **Consider regressions** in related functionality:
  - Changes to generic layers (DB driver, field system, repository, auth guard, block renderer, design tokens, media pipeline) affect all three surfaces and the admin. Test all affected surfaces.
  - Adding/removing a column requires coordinated changes to `schema.sql`, `tables.ts`, and (if exposed to CMS) `modules.ts` field lists.
  - Changes to the form endpoint affect main, media, and tech contact flows.
  - Schema changes must remain compatible with both `pg` and `pglite` drivers and with existing data (use `IF NOT EXISTS`, additive migrations by default).

## 5. Testing & verification

After making changes:
- Run the relevant subset of the suite and, before finishing, run `npm run check` (typecheck + ESLint + tests) unless the user says otherwise.
- Test affected functionality manually where appropriate:
  - UI changes: render the route(s) affected; check both public and admin if both touch the change.
  - Data/module changes: list view, create, edit, delete, publish, reorder, duplicate, references.
  - Form/API changes: happy path plus validation errors, rate-limit/CSRF/auth paths where applicable.
  - Media changes: upload, replace, variant generation, broken-asset fallbacks.
- **Do not leave temporary/debug code** (console.log, commented-out blocks, TODO-only stubs without explanation, dead env vars).
- **Do not commit secrets**. Use `.env.local` (already git-ignored) and reference `.env.example` for new variables.

## 6. Requirements & scope

- **Do not invent requirements.** Implement what the user asked for. If something is underspecified, ask a clarifying question rather than guessing.
- Do not add third-party dependencies without checking they are necessary and appropriate. Prefer Node built-ins and libraries already in `package.json`.
- When adding new environment variables:
  - Add them to `.env.example` with a comment.
  - Keep them optional unless the feature requires them to boot.
  - Document them in `ARCHITECTURE.md` under External Integrations.

## 7. Documentation maintenance (mandatory)

Treat `/docs/` as this project's persistent knowledge base. Whenever you complete meaningful development work, update the documentation before handing off:

1. **`DEVELOPMENT_STATUS.md`** — reflect the new state:
   - Add newly completed features to "Completed".
   - Move items from "In Progress" to "Completed" when verified.
   - Add new "Known Issues" you find; note whether confirmed or needing investigation.
   - Update "Remaining / Potential Tasks" when work is done or new work becomes obvious.
   - Bump the "Last updated" date.
2. **`CHANGELOG.md`** — add a dated entry under `[Unreleased]` (or a new version section when appropriate) describing the work at a meaningful level. Note new env vars, new tables/columns, new modules, new blocks, and any breaking changes.
3. **`ARCHITECTURE.md`** — update whenever architecture changes:
   - New modules, tables, or blocks.
   - New APIs or changed data flows.
   - New external integrations.
   - Changed auth/permission behavior.
   - Changed design-token system.
4. **`PROJECT_CONTEXT.md`** — update when project capabilities, business context, terminology, or major features change.
5. **`AI_INSTRUCTIONS.md`** — only update when a new permanent rule, constraint, or workflow needs to be captured (i.e. rarely).
6. Keep all documentation **consistent with the actual code**. Documentation that lies is worse than no documentation.
7. **Never claim something is implemented if it is not.** Use "planned" or "not yet implemented" or "partial" where accurate.
8. **Never remove accurate historical information unnecessarily.** Old notes in the changelog and prior status items are part of the record. Add corrections instead of overwriting history.

Apply judgement: tiny tweaks (typo fixes, minor styling, small bug fixes) don't require changelog entries. Feature work, architectural changes, DB changes, security changes, and behavior changes do.

## 8. Conventions to keep in mind

- **Server actions in `src/app/admin/actions.ts`** are the only write path for the CMS. New mutations must be server actions (or API routes using `requireAdmin`/`assertCsrf`) — never write directly to the DB from client components.
- **The module registry is the source of truth for CMS behavior.** Add modules by extending `CMS_MODULES`, not by adding bespoke routes/components unless the editor variant genuinely needs a new UI paradigm.
- **Blocks are server components** and may do their own data loading via `lib/cms/content.ts`. Register new block types in both the blocks module's `block_type` select options *and* the switch in `src/components/blocks/index.tsx`.
- **All SQL must be parameterized.** Use `$n::type` placeholders; quote identifiers only through the `quote()` helper.
- **All admin mutations must audit** via `audit(ctx, {…})` and revalidate via `revalidateContent()`.
- **Design tokens** are Tailwind v4 `@theme` CSS variables, not Tailwind config extensions. Add new tokens there.
- **Three surfaces share components.** Any change to shared components (header, footer, buttons, blocks, media tiles) must be tested on main, media, and tech.
- **Uploads** are served from `/uploads/[...path]`, not directly from the `public/` directory's static handler.
- **Dual drivers**: SQL must run on both PGlite (dev) and real Postgres (prod); do not rely on extensions or features PGlite 0.5.8 doesn't support.
- **Server-external packages**: `pg` and `@electric-sql/pglite` are marked `serverExternalPackages` in Next config. Do not import them into client components.
- **`main` history may contain orphan commits.** Content uploaded through the GitHub web UI (e.g. `Add files via upload`) has previously landed on `main` as unrelated-history root commits, so `git merge origin/main` fails with "refusing to merge unrelated histories". To pull such assets into a work branch use `git checkout origin/main -- <path>` (verify the tree diff first: `git diff --stat HEAD origin/main`); do not rewrite or force-push `main` to "fix" it.

## 9. Handing off

When you finish a task:
- Summarize what changed and why.
- List files touched.
- Note any manual verification you performed and any areas that still need testing.
- Note any follow-up work you identified (add to `DEVELOPMENT_STATUS.md` / `CHANGELOG.md` as appropriate).
- Do not leave the repository in a broken state. If you must stop mid-task, leave a clear note on the current state and what's next.

## 10. When in doubt

Ask. It is always cheaper to ask one clarifying question than to build the wrong thing, remove a feature the owner depends on, or introduce a security regression.
