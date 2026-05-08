// Phase 5 — Artwork normalization.
//
// Single source of truth for "is this artwork URL good enough to render?"
// Catches three failure modes that previously surfaced as a gray broken
// image (the "gray photographic crown" placeholder):
//   1. Empty / missing string.
//   2. The legacy `/images/placeholder.png` sentinel returned by older API
//      shapes (that file does not exist in `public/images/`).
//   3. Stock placeholder hosts (picsum.photos) that occasionally leak in
//      from demo/seed data.
//
// IMPORTANT — what is NOT blocked here, by design:
//   - Bunny CDN thumbnails (b-cdn.net hosts). These are valid cover art
//     for tester videos, including the gray crown thumbnail the founder
//     uses during pre-launch testing. They render normally.
//   - Creator-uploaded poster/banner URLs hosted anywhere except the
//     two sentinels above.
//
// When any of these conditions hits, callers render a black typographic
// fallback (M-mark + title) via <PosterArt> / <BackdropArt> instead of an
// <Image src=""> that would either 404 or throw. The data layer is patched
// in tandem so most rows now return null directly.

const PLACEHOLDER_HINTS: readonly string[] = [
  "/images/placeholder",
  "picsum.photos",
];

/**
 * Returns true when the URL is a real, non-placeholder artwork URL we can
 * safely hand to <Image>. Returns false for null/undefined/empty/legacy-
 * placeholder values.
 */
export function isUsableArtworkUrl(url: string | null | undefined): url is string {
  if (typeof url !== "string") return false;
  const u = url.trim();
  if (!u) return false;
  for (const hint of PLACEHOLDER_HINTS) {
    if (u.toLowerCase().includes(hint)) return false;
  }
  return true;
}

/**
 * Normalize: returns the URL when usable, otherwise null. Use at API/data
 * layer boundaries before sending to clients.
 */
export function normalizeArtworkUrl(
  url: string | null | undefined
): string | null {
  return isUsableArtworkUrl(url) ? url : null;
}
