-- Migration 024: Phase 4 — Member Watch Experience Foundation
--
-- Two private Member tables:
--
--   member_saved_titles    — the Member's private "My List". One row per
--                            (member_email, title_id) pair. Saves are
--                            never exposed publicly, never aggregated into
--                            counts/popularity, never used for social proof.
--
--   member_title_progress  — last-watched / resume foundation. One row per
--                            (member_email, title_id). Tracks position in
--                            seconds. Not a watch-history feed; not a
--                            continue-watching home row.
--
-- Both tables are accessed only via /api/members/* routes that run with
-- the service role behind a Supabase auth + Member gate. RLS is enabled
-- but no public policies are added — same access pattern as
-- member_profiles (migration 022).
--
-- Run this in Supabase SQL Editor:
--   Dashboard → SQL Editor → New Query → paste this → Run

-- ── member_saved_titles ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS member_saved_titles (
  id              uuid          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Identity. Email is the canonical key (matches member_profiles).
  member_email    text          NOT NULL,
  member_user_id  uuid,

  title_id        uuid          NOT NULL REFERENCES titles(id) ON DELETE CASCADE,

  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT member_saved_titles_unique UNIQUE (member_email, title_id)
);

CREATE INDEX IF NOT EXISTS member_saved_titles_member_email_idx   ON member_saved_titles (member_email);
CREATE INDEX IF NOT EXISTS member_saved_titles_member_user_id_idx ON member_saved_titles (member_user_id);
CREATE INDEX IF NOT EXISTS member_saved_titles_title_id_idx       ON member_saved_titles (title_id);
CREATE INDEX IF NOT EXISTS member_saved_titles_created_at_idx     ON member_saved_titles (created_at DESC);

-- RLS: enabled, no public policies. Server routes use the service role.
ALTER TABLE member_saved_titles ENABLE ROW LEVEL SECURITY;

-- ── member_title_progress ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS member_title_progress (
  id                  uuid          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,

  member_email        text          NOT NULL,
  member_user_id      uuid,

  title_id            uuid          NOT NULL REFERENCES titles(id) ON DELETE CASCADE,

  -- Resume foundation. Position is stored in seconds.
  -- Negative values are clamped at the API layer; duration is optional
  -- because the player may not have surfaced it at the time of save.
  position_seconds    integer       NOT NULL DEFAULT 0
                      CHECK (position_seconds >= 0),
  duration_seconds    integer
                      CHECK (duration_seconds IS NULL OR duration_seconds >= 0),

  -- Marked true when position is near the end and duration is known.
  completed           boolean       NOT NULL DEFAULT false,

  last_watched_at     timestamptz   NOT NULL DEFAULT now(),
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT member_title_progress_unique UNIQUE (member_email, title_id)
);

CREATE INDEX IF NOT EXISTS member_title_progress_member_email_idx    ON member_title_progress (member_email);
CREATE INDEX IF NOT EXISTS member_title_progress_member_user_id_idx  ON member_title_progress (member_user_id);
CREATE INDEX IF NOT EXISTS member_title_progress_title_id_idx        ON member_title_progress (title_id);
CREATE INDEX IF NOT EXISTS member_title_progress_last_watched_at_idx ON member_title_progress (last_watched_at DESC);

ALTER TABLE member_title_progress ENABLE ROW LEVEL SECURITY;
