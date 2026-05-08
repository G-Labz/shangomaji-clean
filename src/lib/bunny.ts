// Bunny Stream — minimal, replaceable provider helpers.
// We intentionally do NOT abstract across providers yet. Keep this small.
//
// Phase 3 adds signed/expiring embed URL support. The unsigned `buildBunnyEmbedUrl`
// is preserved for thumbnail/metadata uses but MUST NOT be returned in any public
// response that grants playback. All Member playback flows must use
// `signBunnyEmbedUrl` server-side.

import { createHash } from "crypto";

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

export type SignedEmbed =
  | { ok: true; embedUrl: string; expiresAt: number /* unix seconds */ }
  | { ok: false; error: "library_not_configured" | "signing_key_not_configured" | "no_video_id" };

// Generate a signed, expiring Bunny Stream iframe embed URL.
//
// Bunny Stream supports "Token Authentication" on each library. When enabled
// in the Bunny dashboard (Stream Library → Security → Token Authentication),
// every embed request must include `?token=...&expires=...` where:
//
//   token   = sha256_hex(token_authentication_key + video_id + expires)
//   expires = unix-seconds expiration time
//
// IMPORTANT — the signing key is the Bunny library's
// "Token Authentication Key" (Stream Library → API → Token Authentication
// Key), not the regular API key. Read from BUNNY_STREAM_TOKEN_AUTH_KEY.
//
// This function NEVER logs the key or the token. The signed URL itself is
// not logged either — it must only flow through one /api/playback/session
// HTTP response and into the iframe `src` for the lifetime of one Member
// session.
//
// TTL guidance: 4 hours. Long enough for a feature-length watch, short
// enough that a leaked URL stops working before the night is over.
export function signBunnyEmbedUrl(
  videoId: string | null | undefined,
  ttlSeconds: number
): SignedEmbed {
  if (!videoId) return { ok: false, error: "no_video_id" };

  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
  if (!libraryId) return { ok: false, error: "library_not_configured" };

  const authKey = process.env.BUNNY_STREAM_TOKEN_AUTH_KEY;
  if (!authKey) return { ok: false, error: "signing_key_not_configured" };

  const expiresAt = Math.floor(Date.now() / 1000) + Math.max(60, Math.floor(ttlSeconds));

  const token = createHash("sha256")
    .update(authKey + videoId + String(expiresAt))
    .digest("hex");

  const embedUrl =
    `https://${EMBED_HOST}/embed/${libraryId}/${encodeURIComponent(videoId)}` +
    `?token=${token}` +
    `&expires=${expiresAt}`;

  return { ok: true, embedUrl, expiresAt };
}

// Default playback URL TTL. 4 hours per Phase 3 guidance.
export const PLAYBACK_TTL_SECONDS = 4 * 60 * 60;
