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
