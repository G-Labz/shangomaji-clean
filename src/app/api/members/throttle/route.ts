import { NextRequest, NextResponse } from "next/server";
import {
  consumeRateLimit,
  clientIpFromRequest,
  RATE_POLICY,
  type RateLimitAction,
} from "@/lib/rate-limit";

// Phase 2 — Member auth pre-flight rate limiter.
//
// Client pages call this BEFORE invoking supabase.auth.signUp /
// signInWithPassword / resetPasswordForEmail. If the IP is over budget for
// the action, the API returns 429 and the client surfaces a "try again
// soon" error. Supabase's own rate limits run independently behind this.
//
// The throttle stores its bucket in process memory — see src/lib/rate-limit.ts.
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = String(body?.action || "") as RateLimitAction;
  if (!(action in RATE_POLICY)) {
    return NextResponse.json(
      { error: "Unknown action." },
      { status: 400 }
    );
  }

  const ip = clientIpFromRequest(req);
  const policy = RATE_POLICY[action];
  const result = consumeRateLimit({
    key: `${action}:${ip}`,
    limit: policy.limit,
    windowMs: policy.windowMs,
  });

  if (!result.allowed) {
    return NextResponse.json(
      {
        error:       "Too many attempts. Please try again later.",
        retryAfter:  result.retryAfter,
      },
      {
        status: 429,
        headers: { "Retry-After": String(result.retryAfter) },
      }
    );
  }

  return NextResponse.json({ ok: true, remaining: result.remaining });
}
