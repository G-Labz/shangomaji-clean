-- Migration 007: Create titles table
-- A first-class distribution record created when a project transitions approved → live.
-- Every publicly visible title must have a corresponding row here.

CREATE TABLE IF NOT EXISTS titles (
  id                    uuid          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id            uuid          NOT NULL REFERENCES creator_projects(id),
  creator_email         text          NOT NULL,

  -- Distribution lifecycle
  status                text          NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'suspended', 'removed')),

  -- Business terms
  exclusivity_type      text          NOT NULL DEFAULT 'non_exclusive'
                        CHECK (exclusivity_type IN ('exclusive', 'non_exclusive')),
  monetization_enabled  boolean       NOT NULL DEFAULT false,

  -- Distribution window (null = open-ended)
  distribution_start    timestamptz,
  distribution_end      timestamptz,

  -- Audit
  activated_at          timestamptz   NOT NULL DEFAULT now(),
  created_at            timestamptz   NOT NULL DEFAULT now(),
  updated_at            timestamptz   NOT NULL DEFAULT now()
);

-- Only one active distribution record per project at a time
CREATE UNIQUE INDEX IF NOT EXISTS titles_project_id_unique
  ON titles (project_id)
  WHERE status != 'removed';

-- Fast lookups by creator and status
CREATE INDEX IF NOT EXISTS titles_creator_email_idx ON titles (creator_email);
CREATE INDEX IF NOT EXISTS titles_status_idx        ON titles (status);
