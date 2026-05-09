-- Phase 6 Tier 2 — Public Release Trust System
-- Persist the runtime field already collected by Creator Workspace.
--
-- Background: the New Project form has shipped a `runtime` text input
-- since Phase 4, but `runtime` was never in the POST/PUT allow-list nor
-- in the `creator_projects` schema. Submissions silently dropped it,
-- which is why the public title page has rendered runtime only for
-- mock-catalog rows.
--
-- This migration adds a single nullable `runtime` text column to
-- `creator_projects`. We deliberately keep it `text` (not interval)
-- because the field is human-authored ("2h 7m", "22 min", "6 x 22min")
-- and downstream rendering treats it as a label, not a duration.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS. Stills already live on
-- `creator_projects.stills_urls` (text[]) — no schema change is required
-- for the Tier 2 stills work.
--
-- Privacy: runtime is non-sensitive and may surface on the public
-- title API. sample_url remains private and is intentionally not
-- touched here.

ALTER TABLE creator_projects
  ADD COLUMN IF NOT EXISTS runtime text;

COMMENT ON COLUMN creator_projects.runtime IS
  'Human-authored runtime label (e.g. "2h 7m", "22 min", "6 x 22min"). '
  'Optional. Rendered only on public title page when present and real; '
  'placeholder/sentinel values are filtered at render time.';
