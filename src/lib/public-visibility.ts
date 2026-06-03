// Phase 10J-H-A — single source of truth for whether a work is ACTUALLY
// visible in the public catalog. Encodes the exact gate enforced by
// /api/public/titles (title row active + media_ready + bunny_video_id, and the
// Bunny library configured server-side). Both the creator API and the admin
// public-visibility diagnostic consume this so the two surfaces can never
// disagree about what "live" means.
//
// Pure + dependency-free. Never mutates anything. Never claims visibility it
// cannot prove.

export type PublicReadiness =
  | { state: "public" }
  | {
      state: "finishing_setup";
      reason: "bunny_missing" | "media_not_ready" | "title_inactive";
    }
  | { state: "not_live" };

export function derivePublicReadiness(input: {
  status: string;
  titleStatus?: string | null;
  mediaReady?: boolean | null;
  bunnyVideoId?: string | null;
  // Server callers pass the real env check (!!process.env.BUNNY_STREAM_LIBRARY_ID).
  // Client callers that cannot read server env pass `true` to match their
  // existing documented behavior (they don't block on the library id).
  libraryConfigured: boolean;
}): PublicReadiness {
  const { status, titleStatus, mediaReady, bunnyVideoId, libraryConfigured } = input;

  // Only a live work can be public. Everything else is pre-activation or terminal.
  if (status !== "live") return { state: "not_live" };

  // Live works flow through the public-titles gate, checked in the SAME order
  // the admin diagnostic uses so the surfaced reasons line up exactly.
  if (titleStatus && titleStatus !== "active") {
    return { state: "finishing_setup", reason: "title_inactive" };
  }
  if (!bunnyVideoId) {
    return { state: "finishing_setup", reason: "bunny_missing" };
  }
  if (mediaReady !== true) {
    return { state: "finishing_setup", reason: "media_not_ready" };
  }
  // The library being unconfigured drops every row from the public catalog;
  // treat as finishing setup rather than claiming visibility.
  if (!libraryConfigured) {
    return { state: "finishing_setup", reason: "media_not_ready" };
  }
  return { state: "public" };
}
