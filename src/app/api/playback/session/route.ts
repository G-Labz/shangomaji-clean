import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import {
  resolvePlaybackAccess,
  logPlaybackAccess,
  recordWatchSession,
  type PlaybackReason,
  type PlaybackTitleSummary,
} from "@/lib/playback-access";
import {
  consumeRateLimit,
  clientIpFromRequest,
  RATE_POLICY,
} from "@/lib/rate-limit";

// Phase 3 — Member playback session issuance.
//
// POST /api/playback/session
//   Body: { titleId?: string; slug?: string }
//
//   On success returns a signed/expiring Bunny embed URL the iframe player
//   will load. On any denial, returns a structured `reason` the client maps
//   to an approved UX state — never raw technical text.
//
//   The signed URL is short-lived (4h). The client refreshes ~60s before
//   expiry by calling this endpoint again with the same { titleId } payload.
//   No tokens are logged. No URLs are logged. No signing key reaches the
//   client.
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

// HTTP status mapping for each reason category. Keep these stable — the
// client conditionally renders states by status + reason.
function statusForReason(reason: PlaybackReason): number {
  switch (reason) {
    case "allowed":                  return 200;
    case "not_authenticated":        return 401;
    case "not_member":               return 403;
    case "title_not_found":          return 404;
    case "rate_limited":             return 429;
    case "media_not_ready":          return 422;
    case "license_out_of_term":      return 422;
    case "title_unavailable":        return 422;
    case "playback_not_configured":  return 503;
  }
}

function denial(opts: {
  reason: Exclude<PlaybackReason, "allowed">;
  title?: PlaybackTitleSummary | null;
}) {
  return NextResponse.json(
    { ok: false, reason: opts.reason, title: opts.title ?? null },
    { status: statusForReason(opts.reason), headers: NO_STORE }
  );
}

export async function POST(req: NextRequest) {
  let body: { titleId?: string; slug?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, reason: "title_not_found" },
      { status: 400, headers: NO_STORE }
    );
  }

  const titleId = typeof body.titleId === "string" && body.titleId.trim() ? body.titleId.trim() : null;
  const slug    = typeof body.slug    === "string" && body.slug.trim()    ? body.slug.trim()    : null;
  if (!titleId && !slug) {
    return NextResponse.json(
      { ok: false, reason: "title_not_found" },
      { status: 400, headers: NO_STORE }
    );
  }

  const requestIp = clientIpFromRequest(req);

  // Auth probe. We need the user's identity before we can rate-limit per
  // (member + IP), and the resolver needs the email to run the Member gate.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const authenticated      = !!user?.email;
  const authenticatedEmail = user?.email ?? null;
  const memberUserId       = user?.id ?? null;

  // Rate limit per (member email or IP) + IP. Unauthenticated requests are
  // limited per IP only.
  const rateKey = authenticatedEmail
    ? `playback:${authenticatedEmail.toLowerCase()}:${requestIp}`
    : `playback:anon:${requestIp}`;
  const rate = consumeRateLimit({
    key:      rateKey,
    limit:    RATE_POLICY.playback.limit,
    windowMs: RATE_POLICY.playback.windowMs,
  });
  if (!rate.allowed) {
    await logPlaybackAccess({
      reason:        "rate_limited",
      memberEmail:   authenticatedEmail,
      memberUserId:  memberUserId,
      titleId:       titleId,
      requestedSlug: slug,
      requestIp:     requestIp,
    });
    return NextResponse.json(
      { ok: false, reason: "rate_limited" },
      {
        status: 429,
        headers: { ...NO_STORE, "Retry-After": String(rate.retryAfter) },
      }
    );
  }

  const resolution = await resolvePlaybackAccess({
    authenticated,
    authenticatedEmail,
    titleId,
    slug,
  });

  // Log the decision (success or denial) for audit / abuse review.
  await logPlaybackAccess({
    reason:        resolution.reason,
    memberEmail:   authenticatedEmail,
    memberUserId:  memberUserId,
    titleId:       resolution.ok ? resolution.title.id : (resolution.title?.id ?? titleId),
    requestedSlug: slug,
    requestIp:     requestIp,
  });

  if (!resolution.ok) {
    return denial({ reason: resolution.reason, title: resolution.title });
  }

  // Successful issuance — record the session row (best-effort).
  if (authenticatedEmail) {
    await recordWatchSession({
      memberEmail:  authenticatedEmail,
      memberUserId: memberUserId,
      titleId:      resolution.title.id,
      expiresAt:    resolution.expiresAt,
    });
  }

  return NextResponse.json(
    {
      ok:          true,
      playbackUrl: resolution.playbackUrl,
      expiresAt:   resolution.expiresAt,
      title:       resolution.title,
    },
    { status: 200, headers: NO_STORE }
  );
}
