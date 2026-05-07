-- Migration 020: Phase 1 — Creator Public Profile System.
--
-- Adds the public-control surface to creator_profiles so a creator can publish
-- a controlled public page and an admin can force-unpublish for trust/safety.
-- Also adds a quarantine flag so demo/placeholder profiles can be hidden from
-- production routes without deleting data.
--
-- Schema-only and idempotent. Companion migration 021 contains the one-time
-- audit + quarantine logic and is intentionally separate so it can be run
-- with explicit founder/admin sign-off and a database backup in place.
--
-- New columns on creator_profiles:
--   is_published_publicly        boolean  default false  -- creator publish gate
--   force_unpublished            boolean  default false  -- admin override
--   force_unpublished_at         timestamptz             -- admin audit stamp
--   force_unpublished_by         text                    -- admin label
--   force_unpublished_reason     text                    -- admin audit reason
--   placeholder_quarantined      boolean  default false  -- demo-row hide
--   placeholder_quarantine_reason text                   -- audit reason
--   placeholder_quarantined_at   timestamptz             -- audit stamp
--   external_links               jsonb    default '[]'   -- array of { label, url }
--   published_at                 timestamptz             -- first publish stamp
--
-- Public reachability rule (enforced in /api/public/creator):
--   reachable iff
--     is_published_publicly = true
--     AND force_unpublished = false
--     AND placeholder_quarantined = false
--     AND a creator_applications row exists for this email with status='accepted'
--
-- Run this in Supabase SQL Editor:
--   Dashboard → SQL Editor → New Query → paste this → Run
-- After it finishes, click "Reload schema cache" in API settings.

ALTER TABLE creator_profiles
  ADD COLUMN IF NOT EXISTS is_published_publicly         boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS force_unpublished             boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS force_unpublished_at          timestamptz,
  ADD COLUMN IF NOT EXISTS force_unpublished_by          text,
  ADD COLUMN IF NOT EXISTS force_unpublished_reason      text,
  ADD COLUMN IF NOT EXISTS placeholder_quarantined       boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS placeholder_quarantine_reason text,
  ADD COLUMN IF NOT EXISTS placeholder_quarantined_at    timestamptz,
  ADD COLUMN IF NOT EXISTS external_links               jsonb       NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS published_at                 timestamptz;

-- Case-insensitive uniqueness on handle, scoped to non-quarantined rows so
-- quarantining a demo profile does not block a legitimate creator from
-- claiming the same handle later. Quarantined rows can collide on handle with
-- live rows; only one live row may hold a given handle at a time.
CREATE UNIQUE INDEX IF NOT EXISTS creator_profiles_handle_lower_unique
  ON creator_profiles (LOWER(handle))
  WHERE handle IS NOT NULL
    AND placeholder_quarantined = false;

-- Composite read index for public lookups by handle.
CREATE INDEX IF NOT EXISTS creator_profiles_public_lookup_idx
  ON creator_profiles (LOWER(handle))
  WHERE is_published_publicly = true
    AND force_unpublished = false
    AND placeholder_quarantined = false;
