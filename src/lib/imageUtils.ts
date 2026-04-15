// ─────────────────────────────────────────────
//  ShangoMaji — Image Utilities
//  Shared helpers for consistent image loading behaviour
// ─────────────────────────────────────────────

/**
 * Dark cinematic blur placeholder shown while images load.
 * Prevents broken question-mark icons on slow/AI-generated images.
 * A 1×1 near-black JPEG encoded as base64.
 */
export const BLUR_PLACEHOLDER =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k=";
