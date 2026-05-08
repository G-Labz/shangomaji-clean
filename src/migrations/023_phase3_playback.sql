-- Migration 023: Phase 3 — Playback Access Control
--
-- Two new tables to back signed/expiring Bunny playback for Members:
--
--   watch_sessions
--     One row per Member playback intent. Updated when a fresh signed URL
--     is issued so the platform can see who is actively watching what.
--     Intentionally NOT a watch-history UI feed — no progress, no resume
--     points, no analytics surface. Ops visibility only.
--
--   playback_access_logs
--     One row per playback access attempt. Records reason category for
--     denials and successes so the founder can audit abuse / misconfig
--     without inspecting Vercel logs. No tokens are ever stored here.
--
-- Run this in Supabase SQL Editor:
--   Dashboard → SQL Editor → New Query → paste this → Run

-- ── watch_sessions ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS watch_sessions (
  id                    uuid          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Member identity. We key on email (matches member_profiles convention)
  -- and capture user_id for cross-reference with auth.users.
  member_email          text          NOT NULL,
  member_user_id        uuid,

  -- Title under playback. Null only if the title disappears mid-session
  -- (we still keep the row for forensics).
  title_id              uuid          REFERENCES titles(id) ON DELETE SET NULL,

  -- Lifecycle.
  started_at            timestamptz   NOT NULL DEFAULT now(),
  last_token_issued_at  timestamptz   NOT NULL DEFAULT now(),
  expires_at            timestamptz,

  -- Number of signed URLs issued under this session. Helps spot a
  -- renewal-loop / scraping pattern at the ops layer.
  token_issue_count     integer       NOT NULL DEFAULT 1,

  created_at            timestamptz   NOT NULL DEFAULT now(),
  updated_at            timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS watch_sessions_member_email_idx ON watch_sessions (member_email);
CREATE INDEX IF NOT EXISTS watch_sessions_title_id_idx     ON watch_sessions (title_id);
CREATE INDEX IF NOT EXISTS watch_sessions_started_at_idx   ON watch_sessions (started_at DESC);

-- ── playback_access_logs ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS playback_access_logs (
  id              uuid          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Internal reason category for the access decision.
  -- Successful issuance is logged with reason='allowed'.
  -- Denials use one of the documented reason buckets.
  reason          text          NOT NULL
                  CHECK (reason IN (
                    'allowed',
                    'not_authenticated',
                    'not_member',
                    'title_not_found',
                    'title_unavailable',
                    'media_not_ready',
                    'license_out_of_term',
                    'rate_limited',
                    'playback_not_configured'
                  )),

  -- Best-effort identity. Email may be null when the request was not
  -- authenticated. user_id is captured when available.
  member_email    text,
  member_user_id  uuid,

  -- Title under request. May be null when slug/id resolution failed.
  title_id        uuid          REFERENCES titles(id) ON DELETE SET NULL,
  requested_slug  text,

  -- Best-effort request IP. Same extraction pattern as the rate limiter.
  request_ip      text,

  created_at      timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS playback_access_logs_reason_idx     ON playback_access_logs (reason);
CREATE INDEX IF NOT EXISTS playback_access_logs_member_idx     ON playback_access_logs (member_email);
CREATE INDEX IF NOT EXISTS playback_access_logs_created_at_idx ON playback_access_logs (created_at DESC);

-- We never store playback URLs, tokens, signing keys, or expiry tokens
-- in either table. The signed URL exists only for the lifetime of one HTTP
-- response and the iframe that consumes it.
