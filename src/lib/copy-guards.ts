// Phase 5 fix pass — runtime guards for placeholder copy.
//
// Source-code literal scrubbing (Phase 5) caught hard-coded sentinels but
// missed values typed directly into the database during testing. This
// helper rejects those at render time so a creator typing "WORKING" into
// a description field cannot leak placeholder copy to the public UI.
//
// Sentinel detection rules:
//   - null / undefined / non-string → not real
//   - empty after trim → not real
//   - exact case-insensitive match against a small known-sentinel list →
//     not real
//   - starts with "lorem ipsum" → not real
//
// Notes:
//   - We deliberately match on the WHOLE trimmed string, not on substring.
//     "We test every release" is real; "test" alone is not.
//   - The list is conservative on purpose. Adding broad heuristics would
//     risk hiding real copy (e.g. a director's note that begins with the
//     word "Working").

const SENTINELS = new Set<string>([
  "working",
  "test",
  "tests",
  "testing",
  "lorem",
  "lorem ipsum",
  "todo",
  "tbd",
  "fixme",
  "xxx",
  "placeholder",
  "n/a",
  "na",
  ".",
  "-",
  "—",
]);

export type IsRealTextOptions = {
  /** Optional minimum trimmed length. Falls below → not real. */
  minLength?: number;
};

export function isRealText(
  value: unknown,
  opts: IsRealTextOptions = {}
): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  if (opts.minLength && trimmed.length < opts.minLength) return false;
  const lower = trimmed.toLowerCase();
  if (SENTINELS.has(lower)) return false;
  if (/^lorem\s+ipsum/i.test(trimmed)) return false;
  return true;
}

/** Convenience: returns the trimmed string if it is real, otherwise null. */
export function realTextOrNull(
  value: unknown,
  opts: IsRealTextOptions = {}
): string | null {
  return isRealText(value, opts) ? value.trim() : null;
}

// ── Retired taxonomy ─────────────────────────────────────────────────────
//
// Genre / category labels that are no longer current ShangoMaji language.
// Filtered at the data layer (public API + title-summaries) so they never
// reach the client and never render on cards, chips, hero, or My List.
//
// Founder direction (Phase 5 brand correction): "Afrofuturism" is retired
// pre-launch language; it must not surface on the tester title or anywhere
// else. We do NOT mutate the underlying database row — the DB column may
// still carry the value for historical reference. The filter is render-time
// only.
//
// Match is case-insensitive, whole-string. "Afrofuturism" is dropped;
// "Afrofuturist Mythology" (a hypothetical compound genre) is preserved
// because it is not the same label.
const SUPPRESSED_TAXONOMY = new Set<string>([
  "afrofuturism",
]);

export function isSuppressedTaxonomy(label: unknown): boolean {
  if (typeof label !== "string") return false;
  return SUPPRESSED_TAXONOMY.has(label.trim().toLowerCase());
}

/**
 * Drop retired taxonomy labels from a genres/categories array. Returns a
 * fresh array containing only the still-current values. If every input
 * label is retired, returns `[]`. Callers downstream of an empty result
 * must hide their chip/divider/wrapper entirely (no orphaned UI).
 */
export function filterSuppressedTaxonomy(
  labels: ReadonlyArray<string> | null | undefined
): string[] {
  if (!Array.isArray(labels)) return [];
  return labels.filter(
    (l): l is string => typeof l === "string" && !isSuppressedTaxonomy(l)
  );
}
