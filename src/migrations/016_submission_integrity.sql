-- Migration 016: Submission Integrity System v1.
--
-- Adds creator-side submission integrity fields and admin-side review record
-- fields to creator_projects. Both are nullable (existing draft/pending/
-- approved/live/archived rows are not invalidated).
--
-- Server-side enforcement:
--   - Creator submission gate (draft → pending) requires a complete creator
--     submission integrity record. See src/lib/submission-integrity.ts.
--   - Admin approval gate (pending|in_review → approved) requires both a
--     complete creator integrity record AND a complete admin review record
--     with a passing posture/result. See src/app/api/admin/projects/route.ts.
--
-- We use CHECK constraints on the controlled-vocabulary text columns.
-- Idempotent / safe to re-run.
--
-- Run this in Supabase SQL Editor:
--   Dashboard → SQL Editor → New Query → paste this → Run
-- After it finishes, click "Reload schema cache" in API settings.

ALTER TABLE creator_projects
  -- ── Creator submission integrity ──────────────────────────────────────
  ADD COLUMN IF NOT EXISTS thesis_path                          text,
  ADD COLUMN IF NOT EXISTS thesis_explanation                   text,
  ADD COLUMN IF NOT EXISTS rights_ownership_ack                 boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rights_collaborators_disclosed_ack   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rights_no_conflicts_ack              boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rights_no_unlicensed_assets_ack      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS collaborators                        text,
  ADD COLUMN IF NOT EXISTS no_collaborators_ack                 boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_usage                             text,
  ADD COLUMN IF NOT EXISTS ai_usage_description                 text,
  ADD COLUMN IF NOT EXISTS prior_distribution                   text,
  ADD COLUMN IF NOT EXISTS prior_distribution_details           text,
  ADD COLUMN IF NOT EXISTS license_awareness_ack                boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS submission_integrity_completed_at    timestamptz,

  -- ── Admin review record ───────────────────────────────────────────────
  ADD COLUMN IF NOT EXISTS review_thesis_confirmed              boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS review_meaningful_presence_rationale text,
  ADD COLUMN IF NOT EXISTS review_rights_posture                text,
  ADD COLUMN IF NOT EXISTS review_craft_result                  text,
  ADD COLUMN IF NOT EXISTS review_catalog_fit                   text,
  ADD COLUMN IF NOT EXISTS review_decision_record               text,
  ADD COLUMN IF NOT EXISTS review_risk_notes                    text,
  ADD COLUMN IF NOT EXISTS reviewed_at                          timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by                          text;

-- ── Controlled vocabulary CHECK constraints ─────────────────────────────
-- Each guarded by a NOT EXISTS lookup so the migration is re-runnable.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'creator_projects_thesis_path_check') THEN
    ALTER TABLE creator_projects
      ADD CONSTRAINT creator_projects_thesis_path_check
      CHECK (thesis_path IS NULL OR thesis_path IN (
        'black_creator', 'meaningful_black_characters', 'both', 'edge_case'
      ));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'creator_projects_ai_usage_check') THEN
    ALTER TABLE creator_projects
      ADD CONSTRAINT creator_projects_ai_usage_check
      CHECK (ai_usage IS NULL OR ai_usage IN (
        'none', 'assisted', 'generated'
      ));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'creator_projects_prior_distribution_check') THEN
    ALTER TABLE creator_projects
      ADD CONSTRAINT creator_projects_prior_distribution_check
      CHECK (prior_distribution IS NULL OR prior_distribution IN (
        'never_published', 'published'
      ));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'creator_projects_review_rights_posture_check') THEN
    ALTER TABLE creator_projects
      ADD CONSTRAINT creator_projects_review_rights_posture_check
      CHECK (review_rights_posture IS NULL OR review_rights_posture IN (
        'clear', 'co_owned_clear', 'encumbered', 'disqualified'
      ));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'creator_projects_review_craft_result_check') THEN
    ALTER TABLE creator_projects
      ADD CONSTRAINT creator_projects_review_craft_result_check
      CHECK (review_craft_result IS NULL OR review_craft_result IN (
        'pass', 'fail', 'revision'
      ));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'creator_projects_review_catalog_fit_check') THEN
    ALTER TABLE creator_projects
      ADD CONSTRAINT creator_projects_review_catalog_fit_check
      CHECK (review_catalog_fit IS NULL OR review_catalog_fit IN (
        'distinct', 'redundant', 'timing_issue', 'strategic_fit'
      ));
  END IF;
END $$;
