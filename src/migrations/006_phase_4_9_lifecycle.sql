-- Phase 4.9: Lifecycle Foundation + Rejection Moment
-- Dashboard → SQL Editor → New Query → paste this → Run

-- Step 1: Add lifecycle tracking columns
ALTER TABLE creator_projects
  ADD COLUMN IF NOT EXISTS previous_status       text,
  ADD COLUMN IF NOT EXISTS submitted_at          timestamptz,
  ADD COLUMN IF NOT EXISTS status_changed_at     timestamptz,
  ADD COLUMN IF NOT EXISTS submission_count      integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rejection_reason      text,
  ADD COLUMN IF NOT EXISTS removal_requested     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS removal_requested_at  timestamptz,
  ADD COLUMN IF NOT EXISTS removal_reason        text;

-- Step 2: Migrate 'submitted' → 'pending'
UPDATE creator_projects SET status = 'pending' WHERE status = 'submitted';

-- Step 3: Replace status CHECK constraint with Phase 4.9 enum
--         Enum: draft | pending | in_review | approved | rejected | live | archived
ALTER TABLE creator_projects DROP CONSTRAINT IF EXISTS creator_projects_status_check;
ALTER TABLE creator_projects ADD CONSTRAINT creator_projects_status_check
  CHECK (status IN ('draft', 'pending', 'in_review', 'approved', 'rejected', 'live', 'archived'));
