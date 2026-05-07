-- Migration 021: One-time placeholder/fake creator profile audit + quarantine.
--
-- This migration is INTENTIONALLY separate from 020 and INTENTIONALLY does
-- not auto-delete any data. It runs three operations in order:
--
--   A. AUDIT — produces a result set of suspect profiles for founder review.
--   B. QUARANTINE — flips placeholder_quarantined=true on the suspect set.
--   C. SAFETY CHECK — re-reports the post-quarantine state.
--
-- ──────────────────────────────────────────────────────────────────────────
-- BEFORE RUNNING THIS MIGRATION
-- ──────────────────────────────────────────────────────────────────────────
--   1. Take a Supabase backup (Project Settings → Database → Backups → Backup now).
--   2. Run section A only first. Inspect the result set in the SQL editor.
--   3. If any flagged row should NOT be quarantined, exit, edit this file
--      (or hand-correct the WHERE clause in section B), and try again.
--   4. Only then run section B. Section C re-reports.
--
-- ──────────────────────────────────────────────────────────────────────────
-- QUARANTINE CRITERIA
-- ──────────────────────────────────────────────────────────────────────────
-- A creator_profiles row is suspect if ANY of:
--
--   1. Its email does NOT match an `accepted` row in creator_applications.
--      (Strongest signal — a real creator has an accepted application.)
--
--   2. Its avatar_url or banner_url contains 'picsum.photos'.
--      (Stock placeholder host used by demo data and the legacy mock dataset.)
--
--   3. Its handle is one of the known demo handles seeded by the legacy
--      src/data/creatorData.ts mock module.
--
-- The migration writes to:
--   placeholder_quarantined        = true
--   placeholder_quarantine_reason  = a short text reason
--   placeholder_quarantined_at     = now()
--
-- Quarantined profiles are hidden from /api/public/creator and from any
-- workspace publish action. They are NOT deleted. Founder/admin must review
-- the audit report and run an explicit DELETE in a follow-up SQL query if
-- a quarantined row is confirmed unwanted.
--
-- ──────────────────────────────────────────────────────────────────────────
-- A. AUDIT — read-only, run this first
-- ──────────────────────────────────────────────────────────────────────────
-- Comment out section B before the first run. Inspect the result.

-- SELECT
--   p.id,
--   p.email,
--   p.handle,
--   p.display_name,
--   p.avatar_url,
--   p.banner_url,
--   p.is_published_publicly,
--   CASE
--     WHEN a.email IS NULL                                THEN 'no accepted application'
--     WHEN p.avatar_url ILIKE '%picsum.photos%'           THEN 'placeholder avatar host'
--     WHEN p.banner_url ILIKE '%picsum.photos%'           THEN 'placeholder banner host'
--     WHEN LOWER(p.handle) IN (
--       'kofi-asante', 'amara-johnson', 'jabari-clarke', 'nadia-osei'
--     )                                                   THEN 'known demo handle'
--     ELSE 'other'
--   END AS suspect_reason
-- FROM creator_profiles p
-- LEFT JOIN creator_applications a
--   ON LOWER(a.email) = LOWER(p.email)
--  AND a.status = 'accepted'
-- WHERE
--   a.email IS NULL
--   OR p.avatar_url ILIKE '%picsum.photos%'
--   OR p.banner_url ILIKE '%picsum.photos%'
--   OR LOWER(p.handle) IN ('kofi-asante', 'amara-johnson', 'jabari-clarke', 'nadia-osei');

-- ──────────────────────────────────────────────────────────────────────────
-- B. QUARANTINE — only run after reviewing section A
-- ──────────────────────────────────────────────────────────────────────────

UPDATE creator_profiles AS p
SET
  placeholder_quarantined        = true,
  placeholder_quarantined_at     = now(),
  placeholder_quarantine_reason  = CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM creator_applications a
      WHERE LOWER(a.email) = LOWER(p.email)
        AND a.status = 'accepted'
    )                                          THEN 'no accepted application'
    WHEN p.avatar_url ILIKE '%picsum.photos%'  THEN 'placeholder avatar host'
    WHEN p.banner_url ILIKE '%picsum.photos%'  THEN 'placeholder banner host'
    WHEN LOWER(p.handle) IN (
      'kofi-asante', 'amara-johnson', 'jabari-clarke', 'nadia-osei'
    )                                          THEN 'known demo handle'
    ELSE 'unspecified'
  END,
  -- Pulling a profile out of public view is part of quarantine. We do not
  -- toggle force_unpublished — that flag is reserved for trust/safety review
  -- on real creators; this is a separate "this row was never a real creator"
  -- finding.
  is_published_publicly          = false,
  updated_at                     = now()
WHERE
  p.placeholder_quarantined = false
  AND (
    NOT EXISTS (
      SELECT 1 FROM creator_applications a
      WHERE LOWER(a.email) = LOWER(p.email)
        AND a.status = 'accepted'
    )
    OR p.avatar_url ILIKE '%picsum.photos%'
    OR p.banner_url ILIKE '%picsum.photos%'
    OR LOWER(p.handle) IN ('kofi-asante', 'amara-johnson', 'jabari-clarke', 'nadia-osei')
  );

-- ──────────────────────────────────────────────────────────────────────────
-- C. POST-QUARANTINE REPORT — read-only, confirms the result
-- ──────────────────────────────────────────────────────────────────────────

-- SELECT
--   placeholder_quarantine_reason,
--   COUNT(*) AS rows
-- FROM creator_profiles
-- WHERE placeholder_quarantined = true
-- GROUP BY placeholder_quarantine_reason
-- ORDER BY rows DESC;
