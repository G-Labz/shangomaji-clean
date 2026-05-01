-- Migration 012: Legal-name certification ack on creator_licenses.
--
-- Adds a separate, explicit certification that the typed legal name and
-- typed signature are accurate and belong to the signer. This is *not* one
-- of the seven SDL v1 acknowledgments — it is a standalone identity-truth
-- attestation captured at execution time.
--
-- The application enforces "must be true on insert when status='executed'".
-- We do NOT add a hard CHECK constraint to avoid invalidating any rows that
-- were executed before this column existed; those rows get the default
-- (false) and remain valid historical records of pre-certification signings.
--
-- Run this in your Supabase SQL Editor:
--   Dashboard → SQL Editor → New Query → paste this → Run

ALTER TABLE creator_licenses
  ADD COLUMN IF NOT EXISTS legal_name_certification_ack boolean NOT NULL DEFAULT false;
