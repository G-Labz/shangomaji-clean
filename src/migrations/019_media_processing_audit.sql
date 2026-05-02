-- Migration 019: Admin Media Processing Lock v1 — audit columns.
--
-- Adds processing audit columns to titles so media submission can be locked
-- once submitted and only reset deliberately, with a recorded reason.
--
-- Reset is the only path back to media_ready = false. The PATCH endpoint
-- (src/app/api/admin/titles/media/route.ts) enforces this: a "submit" sets
-- media_ready=true and stamps media_processing_submitted_at; a "reset"
-- requires a non-empty reason and stamps media_processing_reset_reason +
-- media_processing_reset_at. Every action appends an entry to
-- media_processing_history.
--
-- Idempotent / safe to re-run.
--
-- Run this in Supabase SQL Editor:
--   Dashboard → SQL Editor → New Query → paste this → Run
-- After it finishes, click "Reload schema cache" in API settings.

ALTER TABLE titles
  ADD COLUMN IF NOT EXISTS media_processing_history       jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS media_processing_reset_reason  text,
  ADD COLUMN IF NOT EXISTS media_processing_reset_at      timestamptz,
  ADD COLUMN IF NOT EXISTS media_processing_submitted_at  timestamptz;
