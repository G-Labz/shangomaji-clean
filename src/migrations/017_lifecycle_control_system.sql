-- Migration 017: Lifecycle Control System v1.
--
-- Replaces the prior "archived/rejected are dead-end" model with a controlled,
-- reversible, auditable state machine.
--
-- Adds:
--   - previous_status_before_archive   (text, nullable)
--   - state_history                    (jsonb, NOT NULL DEFAULT '[]')
--   - removal_request_reason           (text, nullable)  -- canonical reason on request
--   - removal_resolved_at              (timestamptz, nullable)
--   - removal_resolution               (text, nullable)  -- 'approved' | 'denied'
--   - removal_resolution_reason        (text, nullable)
--
-- Reuses existing columns:
--   - removal_requested_at             (added by migration 006)
--   - removal_reason                   (added by migration 006; kept for backcompat;
--                                       new writes also populate removal_request_reason)
--   - previous_status                  (added by migration 006; UNCHANGED — its
--                                       semantics are different from
--                                       previous_status_before_archive, which is
--                                       only set on archive and cleared on restore)
--
-- Adds 'removal_requested' to the status CHECK constraint so the state machine
-- can model the live → removal_requested transition.
--
-- Idempotent / safe to re-run.
--
-- Run this in Supabase SQL Editor:
--   Dashboard → SQL Editor → New Query → paste this → Run
-- After it finishes, click "Reload schema cache" in API settings.

ALTER TABLE creator_projects
  ADD COLUMN IF NOT EXISTS previous_status_before_archive text,
  ADD COLUMN IF NOT EXISTS state_history                  jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS removal_request_reason         text,
  ADD COLUMN IF NOT EXISTS removal_resolved_at            timestamptz,
  ADD COLUMN IF NOT EXISTS removal_resolution             text,
  ADD COLUMN IF NOT EXISTS removal_resolution_reason      text;

-- Replace status CHECK to include 'removal_requested'.
ALTER TABLE creator_projects DROP CONSTRAINT IF EXISTS creator_projects_status_check;
ALTER TABLE creator_projects ADD CONSTRAINT creator_projects_status_check
  CHECK (status IN (
    'draft',
    'pending',
    'in_review',
    'approved',
    'rejected',
    'live',
    'archived',
    'removal_requested'
  ));

-- Controlled-vocabulary check for removal_resolution.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'creator_projects_removal_resolution_check'
  ) THEN
    ALTER TABLE creator_projects
      ADD CONSTRAINT creator_projects_removal_resolution_check
      CHECK (
        removal_resolution IS NULL
        OR removal_resolution IN ('approved', 'denied')
      );
  END IF;
END $$;
