// Bunny Stream — minimal, replaceable provider helpers (Phase 1).
// We intentionally do NOT abstract across providers yet. Keep this small.

const EMBED_HOST = "iframe.mediadelivery.net";

export function buildBunnyEmbedUrl(videoId: string | null | undefined): string | null {
  if (!videoId) return null;
  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
  if (!libraryId) return null;
  return `https://${EMBED_HOST}/embed/${libraryId}/${encodeURIComponent(videoId)}`;
}

export function buildBunnyThumbnailUrl(videoId: string | null | undefined): string | null {
  if (!videoId) return null;
  const cdnHost = process.env.BUNNY_CDN_HOSTNAME;
  if (!cdnHost) return null;
  return `https://${cdnHost}/${encodeURIComponent(videoId)}/thumbnail.jpg`;
}
