-- Migration 009: Phase 1 — Minimum Watchable Title (Bunny Stream binding)
-- Adds the minimum media fields needed to attach a Bunny Stream video to a title
-- and gate it from public visibility until it is playable.
--
-- Run this in your Supabase SQL Editor:
--   Dashboard → SQL Editor → New Query → paste this → Run

ALTER TABLE titles
  ADD COLUMN IF NOT EXISTS bunny_video_id       text,
  ADD COLUMN IF NOT EXISTS bunny_thumbnail_url  text,
  ADD COLUMN IF NOT EXISTS media_ready          boolean NOT NULL DEFAULT false;

-- Fast lookup for the public catalog gate: only active + media_ready titles surface
CREATE INDEX IF NOT EXISTS titles_media_ready_idx
  ON titles (media_ready)
  WHERE status = 'active';
