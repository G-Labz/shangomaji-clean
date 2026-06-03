-- Migration 028: SDL versioning + terms snapshot on creator_licenses.
--
-- Phase 10J-F — receipt integrity foundation.
--
-- Before this, the executed-license receipt rendered the SDL body from the
-- live code constants (SDL_SECTIONS / SDL_VERSION). A later edit to those
-- constants would silently rewrite every historical receipt. These two
-- columns let each row record what was actually signed, so receipts render
-- the terms in force at signing rather than the current constants.
--
-- 1. creator_licenses.sdl_version
--    The SDL version tag in force at execution (e.g. 'SDL-v1'). New rows are
--    stamped with CURRENT_SDL_VERSION by the application. The receipt renderer
--    resolves this through a frozen version registry for any row that has no
--    stored snapshot.
--
-- 2. creator_licenses.sdl_terms_snapshot
--    An immutable JSON snapshot of the exact terms shown at signing
--    ({ version, title, sections, acks }). New rows store this; the receipt
--    renderer prefers it (byte-exact reproduction). Legacy rows remain NULL
--    and fall back to the frozen SDL-v1 registry entry.
--
-- Backfill note: the one-time UPDATE below stamps existing rows with
-- 'SDL-v1'. This is approved on the basis that current creator_licenses rows
-- are test/internal only (confirmed by Marlon). Once real creator licenses
-- exist, historical rows must NOT be casually rewritten — future SDL changes
-- create a new version entry instead.
--
-- Both columns are nullable and additive; the statements are idempotent and
-- safe to re-run.
--
-- Run this in your Supabase SQL Editor:
--   Dashboard → SQL Editor → New Query → paste this → Run
-- After it finishes, click "Reload schema cache" in API settings.

ALTER TABLE creator_licenses
  ADD COLUMN IF NOT EXISTS sdl_version text;

ALTER TABLE creator_licenses
  ADD COLUMN IF NOT EXISTS sdl_terms_snapshot jsonb;

-- One-time backfill of the version tag on pre-migration rows. Provably
-- equivalent today (the current SDL-v1 constants are what those rows signed).
-- Idempotent: after the first run no rows have a NULL sdl_version, so re-runs
-- match nothing. Legacy snapshots are intentionally left NULL.
UPDATE creator_licenses
   SET sdl_version = 'SDL-v1'
 WHERE sdl_version IS NULL;
