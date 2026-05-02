-- Migration 015: Identity Enforcement v1.
--
-- Two columns added; both safe to re-run.
--
-- 1. creator_profiles.identity_status
--    Records the strength of the identity assertion ShangoMaji holds for this
--    creator. Defaults to 'self_certified' — the current floor for any creator
--    who has executed a license under SDL v1 with the strong legal-name
--    certification copy. Higher tiers (verified, verification_requested) are
--    set by ShangoMaji ops if/when the verification path is built. 'flagged'
--    is reserved for trust-and-safety review.
--
--    Activation is NOT gated on this column. It is informational at this
--    stage — admin-visible context, not an enforcement axis.
--
-- 2. creator_licenses.identity_certification_version
--    Records WHICH version of the legal-name certification copy was in force
--    at the moment of execution. Old rows remain NULL — the receipt renderer
--    shows the historic, weaker wording for those, and only renders the new
--    stronger copy for rows tagged 'v2'. This is the smallest safe way to
--    upgrade receipts without retroactively rewriting what past signers
--    actually agreed to.
--
-- Run this in your Supabase SQL Editor:
--   Dashboard → SQL Editor → New Query → paste this → Run
-- After it finishes, click "Reload schema cache" in API settings.

-- ---- creator_profiles.identity_status ----------------------------------

ALTER TABLE creator_profiles
  ADD COLUMN IF NOT EXISTS identity_status text NOT NULL DEFAULT 'self_certified';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_constraint
    WHERE  conname = 'creator_profiles_identity_status_check'
  ) THEN
    ALTER TABLE creator_profiles
      ADD CONSTRAINT creator_profiles_identity_status_check
      CHECK (identity_status IN (
        'self_certified',
        'verification_requested',
        'verified',
        'flagged'
      ));
  END IF;
END $$;

-- ---- creator_licenses.identity_certification_version -------------------

ALTER TABLE creator_licenses
  ADD COLUMN IF NOT EXISTS identity_certification_version text;
