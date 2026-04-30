-- Migration 011: Contract Execution Layer v1 — creator_licenses
--
-- A per-project Standard Distribution License (SDL v1) record.
-- A project may not transition approved → live unless an executed license
-- exists for it. The application enforces this server-side; this table
-- backs that enforcement and stores the signed acknowledgments.
--
-- Run this in your Supabase SQL Editor:
--   Dashboard → SQL Editor → New Query → paste this → Run

CREATE TABLE IF NOT EXISTS creator_licenses (
  id                          uuid          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,

  -- creator_id is reserved for future linkage to a creators/users table.
  -- The current schema keys creator identity off creator_projects.creator_email,
  -- so this column is nullable until that linkage exists.
  creator_id                  uuid,

  project_id                  uuid          NOT NULL REFERENCES creator_projects(id) ON DELETE CASCADE,

  -- SDL v1: term is one of {1, 2, 3, 5} years.
  term_years                  integer       NOT NULL
                              CHECK (term_years IN (1, 2, 3, 5)),

  -- Signing identity (captured at execution time).
  signer_legal_name           text          NOT NULL,
  signer_email                text          NOT NULL,
  signed_at                   timestamptz   NOT NULL DEFAULT now(),
  signed_ip                   text,
  signed_user_agent           text,

  -- Seven SDL v1 acknowledgments. All seven must be true for an executed row
  -- (enforced by executed_requires_all_acks below).
  ip_ownership_ack            boolean       NOT NULL DEFAULT false,
  distribution_grant_ack      boolean       NOT NULL DEFAULT false,
  no_unilateral_removal_ack   boolean       NOT NULL DEFAULT false,
  catalog_control_ack         boolean       NOT NULL DEFAULT false,
  rofn_ack                    boolean       NOT NULL DEFAULT false,
  downstream_ack              boolean       NOT NULL DEFAULT false,
  authority_ack               boolean       NOT NULL DEFAULT false,

  -- Receipt artifact. Null when generation is unavailable.
  pdf_url                     text,

  status                      text          NOT NULL DEFAULT 'executed'
                              CHECK (status IN ('executed', 'superseded', 'terminated', 'expired')),

  -- Term window. term_start is set when distribution is activated (approved → live),
  -- not at signing. term_end is computed at activation time as start + term_years.
  term_start                  timestamptz,
  term_end                    timestamptz,

  created_at                  timestamptz   NOT NULL DEFAULT now(),
  updated_at                  timestamptz   NOT NULL DEFAULT now(),

  -- An executed license must have all seven acknowledgments true.
  -- A non-executed status (superseded/terminated/expired) is allowed to
  -- carry the historical ack values regardless.
  CONSTRAINT executed_requires_all_acks CHECK (
    status <> 'executed' OR (
      ip_ownership_ack          = true AND
      distribution_grant_ack    = true AND
      no_unilateral_removal_ack = true AND
      catalog_control_ack       = true AND
      rofn_ack                  = true AND
      downstream_ack            = true AND
      authority_ack             = true
    )
  )
);

-- At most one executed license per project.
CREATE UNIQUE INDEX IF NOT EXISTS creator_licenses_one_executed_per_project
  ON creator_licenses (project_id)
  WHERE status = 'executed';

CREATE INDEX IF NOT EXISTS creator_licenses_project_id_idx   ON creator_licenses (project_id);
CREATE INDEX IF NOT EXISTS creator_licenses_signer_email_idx ON creator_licenses (signer_email);
