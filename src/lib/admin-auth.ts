import { timingSafeEqual } from "crypto";

// Timing-safe comparison for the x-admin-password header.
//
// Replaces the previous plain `provided === process.env.ADMIN_PASSWORD`
// equality, which was vulnerable to timing-based side-channel attacks
// (string === in V8 short-circuits at the first differing byte).
//
// `crypto.timingSafeEqual` requires equal-length buffers, so we early-out
// on length mismatch. Length disclosure is a much smaller leak than
// per-byte comparison time and is acceptable at this scope. Rate
// limiting was intentionally not added in this pass — see route comments.
export function checkAdminPassword(provided: string | null | undefined): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || !provided) return false;

  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}
