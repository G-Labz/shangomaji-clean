-- Migration 027: Phase 10I.2 — World foundation + Follow Updates (private).
--
-- Introduces the smallest safe "world-ready" architecture:
--
--   worlds                — the durable creator-owned IP / audience container.
--                           A Title is a release object; a World is the
--                           container that audience follow attaches to. At
--                           launch the rule is one accepted title = one World
--                           by default (per-title / per-IP). A World can later
--                           absorb related titles (sequels, seasons, shorts)
--                           by editorial action — deferred, not built here.
--
--   titles.world_id       — nullable link from a release object to its World.
--                           Nullable so every existing titles row remains
--                           valid with no backfill.
--
--   member_world_follows  — the private "Follow Updates" relationship. One row
--                           per (member_email, world_id). Follows attach to the
--                           WORLD, never the Title. Never exposed publicly,
--                           never aggregated into public counts, rankings, or
--                           popularity. No social graph, no follower lists.
--
-- All three tables are accessed only via server routes running with the
-- service role behind a Supabase auth + Member gate. RLS is enabled but no
-- public policies are added — identical access pattern to member_profiles
-- (022) and member_saved_titles / member_title_progress (024).
--
-- Safe to run against production: additive only, idempotent (IF NOT EXISTS),
-- nullable new column, no destructive changes, no backfill.
--
-- Run this in Supabase SQL Editor:
--   Dashboard → SQL Editor → New Query → paste this → Run
-- After it finishes, click "Reload schema cache" in API settings.

-- ── worlds ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS worlds (
  id                uuid          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Creator attribution. Nullable because not every title carries a resolved
  -- creator_email; the World is still valid as an IP container.
  creator_email     text,

  name              text          NOT NULL,

  -- Reserved for a future public world page. NOT used at launch — no public
  -- World page is built in this phase.
  slug              text,

  description       text,

  -- The release object this World was created around. The partial unique
  -- index below guarantees one World per title and makes lazy creation
  -- race-safe under concurrent follows.
  primary_title_id  uuid          REFERENCES titles(id) ON DELETE SET NULL,

  -- active | archived | removed. Reserved for future lifecycle use.
  status            text          NOT NULL DEFAULT 'active',

  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS worlds_creator_email_idx ON worlds (creator_email);

-- One World per title. Partial unique index so multiple worlds with a NULL
-- primary_title_id remain allowed, but a given title can anchor at most one
-- World. ensureWorldForTitle() relies on this for idempotent creation.
CREATE UNIQUE INDEX IF NOT EXISTS worlds_primary_title_id_key
  ON worlds (primary_title_id)
  WHERE primary_title_id IS NOT NULL;

ALTER TABLE worlds ENABLE ROW LEVEL SECURITY;
-- RLS enabled, no public policies. Server routes use the service role.

-- ── titles.world_id ───────────────────────────────────────────────────────
ALTER TABLE titles
  ADD COLUMN IF NOT EXISTS world_id uuid REFERENCES worlds(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS titles_world_id_idx ON titles (world_id);

-- ── member_world_follows ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS member_world_follows (
  id              uuid          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Identity. Email is the canonical key (matches member_profiles).
  member_email    text          NOT NULL,
  member_user_id  uuid,

  -- Follow attaches to the WORLD, not the Title.
  world_id        uuid          NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,

  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT member_world_follows_unique UNIQUE (member_email, world_id)
);

CREATE INDEX IF NOT EXISTS member_world_follows_member_email_idx ON member_world_follows (member_email);
CREATE INDEX IF NOT EXISTS member_world_follows_world_id_idx     ON member_world_follows (world_id);
CREATE INDEX IF NOT EXISTS member_world_follows_created_at_idx   ON member_world_follows (created_at DESC);

ALTER TABLE member_world_follows ENABLE ROW LEVEL SECURITY;
-- RLS enabled, no public policies. Server routes use the service role.
