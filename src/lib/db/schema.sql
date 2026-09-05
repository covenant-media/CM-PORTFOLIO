-- ============================================================================
-- Covenant Media — Unified Digital Platform
-- PostgreSQL schema (single source of truth for the shared CMS data model)
--
-- Idempotent: safe to run on every boot (CREATE ... IF NOT EXISTS).
-- Target: PostgreSQL 14+ (also runs on embedded PostgreSQL for local dev).
-- All timestamps are timestamptz (UTC). updated_at is maintained by the app
-- data layer so the same SQL works across drivers.
-- ============================================================================

-- ── Identity & access ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS admin_user (
  id              TEXT PRIMARY KEY,
  email           TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  title           TEXT,
  password_hash   TEXT NOT NULL,          -- scrypt, never plaintext
  role            TEXT NOT NULL DEFAULT 'owner',
  status          TEXT NOT NULL DEFAULT 'active',   -- active | disabled
  email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  last_login_at   TIMESTAMPTZ,
  password_set_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Role → module permissions. The platform ships with one administrator, but the
-- authorization layer resolves through this table so editors can be added later
-- without a schema change or rewrite.
CREATE TABLE IF NOT EXISTS admin_role (
  id          TEXT PRIMARY KEY,
  key         TEXT NOT NULL UNIQUE,        -- owner | editor | media_editor | viewer ...
  label       TEXT NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,  -- { "<module>": "read|write|manage" }
  is_system   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_session (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES admin_user(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,       -- sha256 of the cookie token
  ip          TEXT,
  user_agent  TEXT,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_session_user ON admin_session(user_id);

-- Login throttling that survives restarts / multiple instances (in-memory is
-- only a fast path in front of this).
CREATE TABLE IF NOT EXISTS auth_attempt (
  id         TEXT PRIMARY KEY,
  key        TEXT NOT NULL,               -- normalised email + ip
  success    BOOLEAN NOT NULL DEFAULT FALSE,
  ip         TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_auth_attempt_key_time ON auth_attempt(key, created_at);

-- Audit-friendly content changes (PRD §9).
CREATE TABLE IF NOT EXISTS audit_log (
  id         TEXT PRIMARY KEY,
  user_id    TEXT REFERENCES admin_user(id) ON DELETE SET NULL,
  action     TEXT NOT NULL,              -- create | update | delete | publish | login | upload ...
  module     TEXT,
  entity     TEXT,
  entity_id  TEXT,
  summary    TEXT,
  meta       JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip         TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity, entity_id);

-- ── Global settings, navigation, social ────────────────────────────────────

CREATE TABLE IF NOT EXISTS site_setting (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  type       TEXT NOT NULL DEFAULT 'text',  -- text | textarea | number | boolean | select | json | color | image
  "group"    TEXT NOT NULL DEFAULT 'general',
  label      TEXT,
  help       TEXT,
  options    JSONB,
  is_public  BOOLEAN NOT NULL DEFAULT TRUE,   -- exposed to public pages (else admin-only)
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS social_link (
  id           TEXT PRIMARY KEY,
  network      TEXT NOT NULL,
  label        TEXT,
  url          TEXT NOT NULL,
  handle       TEXT,
  icon         TEXT,
  placements   JSONB NOT NULL DEFAULT '["main"]'::jsonb, -- main|media|tech|footer|hero
  is_verified  BOOLEAN NOT NULL DEFAULT FALSE,           -- PRD §20: verify before launch
  status       TEXT NOT NULL DEFAULT 'published',        -- published | draft (draft = hidden publicly)
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS navigation_item (
  id           TEXT PRIMARY KEY,
  location     TEXT NOT NULL,             -- main_header | main_footer | media_header | media_footer | tech_header | tech_footer | admin
  label        TEXT NOT NULL,
  href         TEXT NOT NULL,
  parent_id    TEXT REFERENCES navigation_item(id) ON DELETE SET NULL,
  description  TEXT,
  is_external  BOOLEAN NOT NULL DEFAULT FALSE,
  open_new_tab BOOLEAN NOT NULL DEFAULT FALSE,
  is_visible   BOOLEAN NOT NULL DEFAULT TRUE,
  badge        TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_nav_location ON navigation_item(location, sort_order);

-- ── Pages & CMS-driven sections ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS page (
  id           TEXT PRIMARY KEY,
  slug         TEXT NOT NULL UNIQUE,       -- "" (home) | about | media | media/work ...
  title        TEXT NOT NULL,
  nav_label    TEXT,
  surface      TEXT NOT NULL DEFAULT 'main', -- main | media | tech
  status       TEXT NOT NULL DEFAULT 'published',
  description  TEXT,
  seo          JSONB NOT NULL DEFAULT '{}'::jsonb,
  published_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reusable content blocks ("Homepage sections" + every other editable area).
CREATE TABLE IF NOT EXISTS content_block (
  id         TEXT PRIMARY KEY,
  block_type TEXT NOT NULL,               -- hero | two_worlds | case_study_grid | marquee ...
  name       TEXT NOT NULL,               -- admin-facing label
  headline   TEXT,
  eyebrow    TEXT,
  body       TEXT,
  props      JSONB NOT NULL DEFAULT '{}'::jsonb,
  media      JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{ assetId|videoId, role, caption, alt }]
  links      JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{ label, href, variant }]
  status     TEXT NOT NULL DEFAULT 'published',    -- published | draft
  is_sample  BOOLEAN NOT NULL DEFAULT FALSE,       -- placeholder content marker
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_block_type ON content_block(block_type);

CREATE TABLE IF NOT EXISTS page_block (
  page_id    TEXT NOT NULL REFERENCES page(id) ON DELETE CASCADE,
  block_id   TEXT NOT NULL REFERENCES content_block(id) ON DELETE CASCADE,
  placement  TEXT NOT NULL DEFAULT 'body',   -- hero | body | cta | footer-note
  variant    TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  overrides  JSONB NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (page_id, block_id)
);

-- ── Catalogue: services, projects, media ───────────────────────────────────

CREATE TABLE IF NOT EXISTS service (
  id           TEXT PRIMARY KEY,
  slug         TEXT NOT NULL UNIQUE,
  division     TEXT NOT NULL DEFAULT 'main',   -- main | media | tech
  title        TEXT NOT NULL,
  summary      TEXT,
  description  TEXT,
  icon         TEXT,
  bullets      JSONB NOT NULL DEFAULT '[]'::jsonb,
  deliverables JSONB NOT NULL DEFAULT '[]'::jsonb,
  tools        JSONB NOT NULL DEFAULT '[]'::jsonb,
  process      JSONB NOT NULL DEFAULT '[]'::jsonb,
  price_note   TEXT,                            -- never invented pricing; free-text/CMS
  cta_label    TEXT,
  cta_href     TEXT,
  hero_asset   TEXT,
  is_featured  BOOLEAN NOT NULL DEFAULT FALSE,
  is_sample    BOOLEAN NOT NULL DEFAULT FALSE,
  status       TEXT NOT NULL DEFAULT 'published',
  sort_order   INTEGER NOT NULL DEFAULT 0,
  seo          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_service_division ON service(division, sort_order);

CREATE TABLE IF NOT EXISTS project (
  id             TEXT PRIMARY KEY,
  slug           TEXT NOT NULL UNIQUE,
  division       TEXT NOT NULL,                -- media | tech
  title          TEXT NOT NULL,
  category       TEXT,                         -- short_form | wedding | web_app | security ...
  form           TEXT,                         -- media: short_form | long_form | photo | other
  summary        TEXT,
  client         TEXT,
  client_public  BOOLEAN NOT NULL DEFAULT TRUE,
  role           TEXT,
  problem        TEXT,
  solution       TEXT,
  outcomes       JSONB NOT NULL DEFAULT '[]'::jsonb,   -- only verified facts, else empty
  technologies   JSONB NOT NULL DEFAULT '[]'::jsonb,
  services       JSONB NOT NULL DEFAULT '[]'::jsonb,
  tools          JSONB NOT NULL DEFAULT '[]'::jsonb,
  deliverables   JSONB NOT NULL DEFAULT '[]'::jsonb,
  location       TEXT,
  event_date     DATE,
  year           INTEGER,
  duration_label TEXT,
  budget_band    TEXT,                         -- free text band, never invented numbers
  repo_url       TEXT,
  live_url      TEXT,
  case_study_url TEXT,
  external_links JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{ label, url, kind }]
  gallery        JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{ assetId, caption, alt }]
  cover_asset_id TEXT,
  hero_video_id  TEXT,
  accent         TEXT,                          -- optional per-project token override
  credits        JSONB NOT NULL DEFAULT '[]'::jsonb,
  metrics        JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{ label, value, verified }]
  is_featured    BOOLEAN NOT NULL DEFAULT FALSE,
  is_sample      BOOLEAN NOT NULL DEFAULT FALSE,       -- clearly labelled placeholder
  status         TEXT NOT NULL DEFAULT 'draft',        -- draft | published
  published_at   TIMESTAMPTZ,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  seo            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_project_division ON project(division, status, sort_order);
CREATE INDEX IF NOT EXISTS idx_project_featured ON project(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_project_category ON project(division, category);

-- Media Library (PRD §9): every uploaded/referenced asset lives here.
CREATE TABLE IF NOT EXISTS media_asset (
  id           TEXT PRIMARY KEY,
  public_id    TEXT,                       -- storage key / object path
  url          TEXT,                       -- resolved URL (local path or CDN)
  kind         TEXT NOT NULL DEFAULT 'image',  -- image | video | document | audio
  mime_type    TEXT,
  filename     TEXT,
  title        TEXT,
  alt          TEXT,                        -- accessibility
  caption      TEXT,
  credit       TEXT,
  folder       TEXT,
  tags         JSONB NOT NULL DEFAULT '[]'::jsonb,
  bytes        BIGINT,
  width        INTEGER,
  height       INTEGER,
  duration_s   NUMERIC,
  checksum     TEXT,
  storage      TEXT NOT NULL DEFAULT 'local',  -- local | s3 | url
  variants     JSONB NOT NULL DEFAULT '{}'::jsonb, -- { thumb: {url,width,height}, ... }
  blur_data    TEXT,
  is_referenced BOOLEAN NOT NULL DEFAULT TRUE,
  uploaded_by  TEXT REFERENCES admin_user(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_asset_kind ON media_asset(kind, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_asset_folder ON media_asset(folder);

-- Videos: paste a supported URL or attach a direct upload. Metadata is derived
-- where the platform permits it and always editable.
CREATE TABLE IF NOT EXISTS media_video (
  id             TEXT PRIMARY KEY,
  title          TEXT NOT NULL,
  description    TEXT,
  source         TEXT NOT NULL,              -- youtube | tiktok | facebook | vimeo | upload | other
  source_id      TEXT,
  source_url     TEXT,
  embed_url      TEXT,
  file_asset_id  TEXT REFERENCES media_asset(id) ON DELETE SET NULL,
  poster_asset_id TEXT REFERENCES media_asset(id) ON DELETE SET NULL,
  poster_url     TEXT,                        -- derived (e.g. YouTube thumb) without an upload
  project_id     TEXT REFERENCES project(id) ON DELETE SET NULL,
  category       TEXT,
  form           TEXT,                        -- short_form | long_form | other
  client         TEXT,
  shot_on        DATE,
  duration_s     INTEGER,
  services       JSONB NOT NULL DEFAULT '[]'::jsonb,
  tools          JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags           JSONB NOT NULL DEFAULT '[]'::jsonb,
  embed_config   JSONB NOT NULL DEFAULT '{}'::jsonb,   -- { autoplay, muted, loop, params... }
  metadata_state TEXT NOT NULL DEFAULT 'derived',      -- derived | manual | partial | failed
  metadata       JSONB NOT NULL DEFAULT '{}'::jsonb,   -- raw fetched payload (auditable)
  external_url  TEXT,
  is_featured    BOOLEAN NOT NULL DEFAULT FALSE,
  is_sample      BOOLEAN NOT NULL DEFAULT FALSE,
  status         TEXT NOT NULL DEFAULT 'draft',
  published_at   TIMESTAMPTZ,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  seo            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_video_project ON media_video(project_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_video_status ON media_video(status, is_featured);
CREATE INDEX IF NOT EXISTS idx_video_form ON media_video(form);

CREATE TABLE IF NOT EXISTS gallery (
  id          TEXT PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  description TEXT,
  kind        TEXT NOT NULL DEFAULT 'photo',   -- photo | video | mixed
  division    TEXT NOT NULL DEFAULT 'media',
  project_id  TEXT REFERENCES project(id) ON DELETE SET NULL,
  items       JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{ assetId, caption, alt }]
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_sample   BOOLEAN NOT NULL DEFAULT FALSE,
  status      TEXT NOT NULL DEFAULT 'draft',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Trust content ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS testimonial (
  id           TEXT PRIMARY KEY,
  quote        TEXT NOT NULL,
  author_name  TEXT,
  author_role  TEXT,
  author_org   TEXT,
  location     TEXT,
  avatar_asset_id TEXT REFERENCES media_asset(id) ON DELETE SET NULL,
  division     TEXT NOT NULL DEFAULT 'main',    -- main | media | tech
  project_id   TEXT REFERENCES project(id) ON DELETE SET NULL,
  rating       INTEGER,
  is_sample    BOOLEAN NOT NULL DEFAULT TRUE,   -- seeded placeholders are marked; real quotes flipped by admin
  source_note  TEXT,                             -- where/how it was received (audit trail)
  approved_at  TIMESTAMPTZ,                       -- when Covenant confirmed it is genuine
  is_featured  BOOLEAN NOT NULL DEFAULT FALSE,
  status       TEXT NOT NULL DEFAULT 'draft',
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_testimonial_division ON testimonial(division, status, sort_order);

CREATE TABLE IF NOT EXISTS team_member (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  role          TEXT,
  bio           TEXT,
  is_founder    BOOLEAN NOT NULL DEFAULT FALSE,
  is_placeholder BOOLEAN NOT NULL DEFAULT FALSE,  -- PRD §6: team placeholder, not invented people
  division      TEXT NOT NULL DEFAULT 'main',
  focus         JSONB NOT NULL DEFAULT '[]'::jsonb,
  avatar_asset_id TEXT REFERENCES media_asset(id) ON DELETE SET NULL,
  links         JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_visible    BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'published',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Blog ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS blog_post (
  id             TEXT PRIMARY KEY,
  slug           TEXT NOT NULL UNIQUE,
  title          TEXT NOT NULL,
  excerpt        TEXT,
  body           TEXT,                        -- markdown → sanitized HTML on render
  body_html      TEXT,                        -- cached sanitized output
  cover_asset_id TEXT REFERENCES media_asset(id) ON DELETE SET NULL,
  author_user_id TEXT REFERENCES admin_user(id) ON DELETE SET NULL,
  author_name    TEXT,
  division       TEXT NOT NULL DEFAULT 'main', -- main | media | tech
  category       TEXT,
  tags           JSONB NOT NULL DEFAULT '[]'::jsonb,
  related_project_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  reading_minutes INTEGER,
  is_sample      BOOLEAN NOT NULL DEFAULT FALSE,
  is_featured    BOOLEAN NOT NULL DEFAULT FALSE,
  status         TEXT NOT NULL DEFAULT 'draft', -- draft | published | scheduled
  published_at   TIMESTAMPTZ,
  scheduled_at   TIMESTAMPTZ,
  seo            JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_post_status ON blog_post(status, published_at DESC);

-- ── Tech portfolio specifics ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS skill (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  category    TEXT NOT NULL DEFAULT 'engineering', -- frontend|backend|mobile|design|infrastructure|security|tools
  level       INTEGER NOT NULL DEFAULT 3,           -- 1..5 self-described depth, not a claim
  confidence  INTEGER,                              -- 1..5 optional
  description TEXT,
  years_start INTEGER,
  evidence    TEXT,                                  -- what backs the claim; keeps it honest
  icon        TEXT,
  division    TEXT NOT NULL DEFAULT 'tech',
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_sample   BOOLEAN NOT NULL DEFAULT FALSE,
  status      TEXT NOT NULL DEFAULT 'published',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_skill_category ON skill(category, sort_order);

CREATE TABLE IF NOT EXISTS experience_item (
  id          TEXT PRIMARY KEY,
  role        TEXT NOT NULL,
  organization TEXT,
  location    TEXT,
  summary     TEXT,
  bullets     JSONB NOT NULL DEFAULT '[]'::jsonb,
  technologies JSONB NOT NULL DEFAULT '[]'::jsonb,
  highlights  JSONB NOT NULL DEFAULT '[]'::jsonb,
  start_date  DATE,
  start_label TEXT,
  end_date    DATE,
  end_label   TEXT,
  is_current  BOOLEAN NOT NULL DEFAULT FALSE,
  kind        TEXT NOT NULL DEFAULT 'work',   -- work | education | freelance | training
  project_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_sample   BOOLEAN NOT NULL DEFAULT FALSE,
  status      TEXT NOT NULL DEFAULT 'published',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_experience_order ON experience_item(sort_order DESC, start_date DESC);

CREATE TABLE IF NOT EXISTS certification (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  issuer         TEXT,
  credential_id  TEXT,
  verify_url     TEXT,
  status         TEXT NOT NULL DEFAULT 'in_progress', -- in_progress | planned | completed
  completed      BOOLEAN NOT NULL DEFAULT FALSE,      -- TRUE only if actually earned
  issued_on      DATE,
  expires_on     DATE,
  description    TEXT,
  division       TEXT NOT NULL DEFAULT 'tech',
  is_sample      BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  status_label_override TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS resume_version (
  id            TEXT PRIMARY KEY,
  label         TEXT NOT NULL,
  version       TEXT,
  asset_id      TEXT REFERENCES media_asset(id) ON DELETE SET NULL,
  filename      TEXT,
  bytes         BIGINT,
  is_active     BOOLEAN NOT NULL DEFAULT FALSE,
  published_at  TIMESTAMPTZ,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_resume_active ON resume_version(is_active);

CREATE TABLE IF NOT EXISTS pricing_package (
  id          TEXT PRIMARY KEY,
  division    TEXT NOT NULL DEFAULT 'media',   -- media | tech
  name        TEXT NOT NULL,
  tagline     TEXT,
  mode        TEXT NOT NULL DEFAULT 'quote',   -- fixed | starting_at | quote
  amount      NUMERIC(12,2),
  currency    TEXT NOT NULL DEFAULT 'NGN',
  period      TEXT,                            -- per_project | per_day | per_video | monthly
  includes    JSONB NOT NULL DEFAULT '[]'::jsonb,
  exclusions  JSONB NOT NULL DEFAULT '[]'::jsonb,
  turnaround  TEXT,
  notes       TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_sample   BOOLEAN NOT NULL DEFAULT FALSE,
  status      TEXT NOT NULL DEFAULT 'draft',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pricing_division ON pricing_package(division, status, sort_order);

-- ── Leads & SEO ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS contact_submission (
  id            TEXT PRIMARY KEY,
  form          TEXT NOT NULL,                 -- main | media | tech
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  phone         TEXT,
  organization  TEXT,
  service       TEXT,
  project_type  TEXT,
  event_date    DATE,
  location      TEXT,
  budget_band   TEXT,
  timeline      TEXT,
  requirements  TEXT,
  message       TEXT,
  page_path     TEXT,
  user_agent    TEXT,
  ip_hash       TEXT,                           -- salted, for abuse control only
  consent       BOOLEAN NOT NULL DEFAULT FALSE,
  status        TEXT NOT NULL DEFAULT 'new',    -- new | read | replied | archived | spam
  notified_at   TIMESTAMPTZ,
  meta          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_submission_created ON contact_submission(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submission_status ON contact_submission(status, form);

CREATE TABLE IF NOT EXISTS seo_record (
  id              TEXT PRIMARY KEY,
  scope           TEXT NOT NULL UNIQUE,      -- "/" | "/media" | "/tech" | entity keys
  title           TEXT,
  title_template  TEXT,
  description     TEXT,
  keywords        JSONB NOT NULL DEFAULT '[]'::jsonb,
  canonical       TEXT,
  og_asset_id     TEXT REFERENCES media_asset(id) ON DELETE SET NULL,
  og_title        TEXT,
  og_description  TEXT,
  twitter_card    TEXT NOT NULL DEFAULT 'summary_large_image',
  robots          TEXT NOT NULL DEFAULT 'index,follow',
  no_index        BOOLEAN NOT NULL DEFAULT FALSE,
  structured_type TEXT,                       -- Organization | Person | WebSite | BlogPosting ...
  extra           JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- First-party, cookieless engagement events (PRD §22). Retention-managed.
CREATE TABLE IF NOT EXISTS cm_event (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,               -- page_view | cta_click | project_click | video_play | outbound_click | form_submit
  path       TEXT,
  target     TEXT,
  division   TEXT,
  visitor_id TEXT,                        -- anonymised, first-party only
  meta       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_event_created ON cm_event(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_name ON cm_event(name, created_at DESC);
