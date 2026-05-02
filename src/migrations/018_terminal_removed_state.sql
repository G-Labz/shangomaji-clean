-- Migration 018: Terminal "removed" state.
--
-- Lifecycle Control v1 originally routed approved removal requests to
-- "archived". That was the wrong terminal — archive is a reversible admin
-- action, not a removal outcome. This migration introduces a true terminal
-- state, "removed", and updates the status CHECK to allow it.
--
-- Server enforces: removed → ANYTHING is forbidden. There is no SQL trigger
-- — the lifecycle helper (src/lib/lifecycle.ts) is the only writer of the
-- status column and rejects any transition out of "removed".
--
-- Idempotent / safe to re-run.
--
-- Run this in Supabase SQL Editor:
--   Dashboard → SQL Editor → New Query → paste this → Run
-- After it finishes, click "Reload schema cache" in API settings.

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
    'removal_requested',
    'removed'
  ));
