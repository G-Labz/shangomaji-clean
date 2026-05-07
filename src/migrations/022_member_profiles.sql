-- Migration 022: Phase 2 — Member Account System.
--
-- Adds the audience-side `member_profiles` table. Members are the canonical
-- audience identity (NOT Fan, Subscriber, Patron, Witness). Patron and
-- Witness are reserved for later — do not add columns for them in this
-- migration.
--
-- Role separation:
--   - auth.users is shared across Members, Creators, and Admins.
--   - A Creator is identified by an `accepted` row in creator_applications.
--   - A Member is identified by a row in member_profiles.
--   - The two are independent: a creator does NOT automatically become a
--     member, and a member does NOT automatically gain workspace access.
--   - Workspace access is gated by checkCreatorApproval() (existing).
--   - /account access is gated by membership in member_profiles (this build).
--
-- Schema posture:
--   - email is the primary join key, lowercased on write.
--   - display_name is the only public-friendly field, but it is private at
--     MVP — there is no public Member profile route in Phase 2.
--   - avatar_url is optional, kept private.
--   - This table never holds passwords, payment data, or auth tokens.
--   - RLS enabled with service-role bypass; no public SELECT policy. All
--     reads/writes go through server routes.
--
-- Idempotent / safe to re-run.
--
-- Run this in Supabase SQL Editor:
--   Dashboard → SQL Editor → New Query → paste this → Run
-- After it finishes, click "Reload schema cache" in API settings.

CREATE TABLE IF NOT EXISTS member_profiles (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  email           text          UNIQUE NOT NULL,
  display_name    text,
  avatar_url      text,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now()
);

-- Lowercase-unique constraint so case-variants of the same email cannot
-- create two member rows. Stored email is expected lowercased; this index
-- is defense in depth.
CREATE UNIQUE INDEX IF NOT EXISTS member_profiles_email_lower_unique
  ON member_profiles (LOWER(email));

ALTER TABLE member_profiles ENABLE ROW LEVEL SECURITY;

-- No anon SELECT/INSERT/UPDATE policies are added. All read/write go through
-- server routes using the service role. If a public Member profile is built
-- later, a deliberate, reviewed policy can be added at that time.
