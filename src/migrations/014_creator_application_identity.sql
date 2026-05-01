-- Migration 014: Structured creator identity on creator_applications.
--
-- The application form previously collected:
--   - name   (single freeform field)  → easy to submit "Marlon"
--   - origin (single freeform field)  → easy to submit "USA"
--
-- New submissions split identity into structured columns. Old rows are NOT
-- modified; the legacy `name` and `origin` columns remain populated alongside
-- the new structured columns so downstream consumers (admin, license prefill,
-- profile hydration, public catalog) continue to work without conditional
-- joins against missing data.
--
-- Run this in your Supabase SQL Editor:
--   Dashboard → SQL Editor → New Query → paste this → Run

ALTER TABLE creator_applications
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name  text,
  ADD COLUMN IF NOT EXISTS city       text,
  ADD COLUMN IF NOT EXISTS region     text,
  ADD COLUMN IF NOT EXISTS country    text;
