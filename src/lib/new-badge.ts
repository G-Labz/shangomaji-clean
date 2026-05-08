// Phase 5 — NEW badge eligibility.
//
// Single source of truth for whether a title may render the "New" badge.
// A title is NEW only when its publish date exists, parses, and falls
// within the cutoff window (default 30 days).
//
// We intentionally do NOT use the legacy `isNew` boolean from mock data or
// the `/api/public/titles` flag — those were either hand-flagged or always
// `true`, neither of which is honest at launch. The badge is now always a
// time-based decision.

export const NEW_BADGE_DAYS = 30;

/**
 * Returns true if the supplied date is non-null, parses to a real date, and
 * is within `withinDays` days of now (default 30). Future-dated values are
 * also treated as NEW; out-of-range and unparseable values return false.
 */
export function isWithinNewWindow(
  date: string | number | Date | null | undefined,
  withinDays: number = NEW_BADGE_DAYS
): boolean {
  if (date == null) return false;
  const t = new Date(date).getTime();
  if (!Number.isFinite(t)) return false;
  const now = Date.now();
  const window = withinDays * 24 * 60 * 60 * 1000;
  // |delta| <= window covers titles activated up to `withinDays` ago and
  // titles scheduled within the same future window. Negative deltas (future)
  // are uncommon at our current scale but are explicitly allowed so the
  // badge can drive any future "Coming this week" presentation.
  return Math.abs(now - t) <= window;
}
