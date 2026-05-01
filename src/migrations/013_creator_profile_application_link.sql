-- Migration 013: Link creator_profiles back to the application that
-- hydrated it.
--
-- We hydrate creator_profiles from creator_applications at onboarding-accept
-- time so a creator never has to re-enter identity data they already gave us.
-- Two columns make that traceable and idempotent:
--
--   application_id                → which application populated this profile
--                                   (nullable; older profiles created without
--                                   hydration stay valid)
--   hydrated_from_application_at  → stamp of when the fill occurred (used as
--                                   a soft "already hydrated, don't refill"
--                                   marker; not enforced server-side beyond
--                                   the existing fill-only-empty rule)
--
-- We do NOT add NOT NULL constraints — pre-existing profiles must remain valid.
-- We do NOT rename or drop any existing column.
--
-- Run this in your Supabase SQL Editor:
--   Dashboard → SQL Editor → New Query → paste this → Run

ALTER TABLE creator_profiles
  ADD COLUMN IF NOT EXISTS application_id uuid
    REFERENCES creator_applications(id) ON DELETE SET NULL;

ALTER TABLE creator_profiles
  ADD COLUMN IF NOT EXISTS hydrated_from_application_at timestamptz;

CREATE INDEX IF NOT EXISTS creator_profiles_application_id_idx
  ON creator_profiles (application_id);
