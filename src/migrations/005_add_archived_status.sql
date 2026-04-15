-- Run this in your Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → paste this → Run
--
-- Adds 'archived' to the allowed status values for creator_projects.
-- Required for Phase 4.8 — Unified Workspace Control Layer.

-- Drop existing constraint
ALTER TABLE creator_projects DROP CONSTRAINT IF EXISTS creator_projects_status_check;

-- Re-create with 'archived' included
ALTER TABLE creator_projects ADD CONSTRAINT creator_projects_status_check
  CHECK (status IN ('draft', 'submitted', 'in_review', 'approved', 'rejected', 'archived'));
