-- Migration 026: Public / credited name on creator_applications.
--
-- Phase 10K adds a Public / Credited Name field to the creator
-- application form. The legal name (first_name + last_name + composed
-- `name`) remains the official identity used for internal review,
-- rights verification, and licensing. This new column captures how the
-- creator wants to be publicly credited if accepted: creator name,
-- studio name, pen name, brand name, or legal name.
--
-- The column is NULLABLE so existing applications submitted before this
-- field existed do not need backfill and the migration is safe to run
-- against production data. New submissions are gated at the form +
-- API layer to require a credited_name value. Admin review displays
-- "Not provided" for any historical row that is still null.
--
-- This column does NOT change license terms, does NOT create automatic
-- public display rights, and does NOT replace legal name. It is a
-- creator-facing credit identity for review, admin, and future catalog
-- readiness.
--
-- Run this in your Supabase SQL Editor:
--   Dashboard → SQL Editor → New Query → paste this → Run
-- After it finishes, click "Reload schema cache" in API settings.

ALTER TABLE creator_applications
  ADD COLUMN IF NOT EXISTS credited_name text;
