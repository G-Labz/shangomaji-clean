// Minimal in-memory IP rate limiter.
//
// Phase 2 — Member Account System.
//
// Scope: deliberate, low-overhead abuse throttling for sign-up, sign-in,
// and password-reset endpoints. Uses an in-process Map keyed by
// `${action}:${ip}` with a sliding window.
//
// Limitations (acknowledged):
//   - Per-instance memory. Two replicas keep two counters. At Phase 2 scale
//     (single-instance Vercel deploy, very low traffic) this is acceptable.
//   - Lost on cold-start. Worst case: a brief window where prior counts
//     reset on deploy or scale-out.
//   - Not a substitute for Supabase's own auth rate limits, which run
//     independently and are unaffected by this layer.
//
// When and how to upgrade: replace the `bucket` Map with a Redis-backed
// counter (e.g. Upstash) using the same `consume()` interface. Callers do
// not change. Out of scope for Phase 2.

type Bucket = {
  // ms timestamps of allowed hits in the current window
  hits: number[];
};

const bucket = new Map<string, Bucket>();

export type RateLimitResult = {
  allowed:    boolean;
  remaining:  number;
  retryAfter: number; // seconds
};

export function consumeRateLimit(opts: {
  key:       string;
  limit:     number;
  windowMs:  number;
}): RateLimitResult {
  const now = Date.now();
  const cutoff = now - opts.windowMs;

  let b = bucket.get(opts.key);
  if (!b) {
    b = { hits: [] };
    bucket.set(opts.key, b);
  }

  // Drop hits outside the sliding window.
  while (b.hits.length && b.hits[0] < cutoff) {
    b.hits.shift();
  }

  if (b.hits.length >= opts.limit) {
    const earliest = b.hits[0] ?? now;
    const retryMs = Math.max(0, opts.windowMs - (now - earliest));
    return {
      allowed:    false,
      remaining:  0,
      retryAfter: Math.ceil(retryMs / 1000),
    };
  }

  b.hits.push(now);
  return {
    allowed:    true,
    remaining:  opts.limit - b.hits.length,
    retryAfter: 0,
  };
}

// Best-effort client IP extraction. Vercel sets `x-forwarded-for`; everything
// else falls back to a fixed string so we still throttle some abuse vector
// when the deployment platform doesn't surface an IP.
export function clientIpFromRequest(req: Request): string {
  const xff = req.headers.get("x-forwarded-for") || "";
  const first = xff.split(",")[0]?.trim();
  if (first) return first;
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

// Default policy table. Tuned for Phase 2/3 scale. Tighten if abuse is observed.
export const RATE_POLICY = {
  signup:   { limit: 5,  windowMs: 60 * 60 * 1000 }, // 5 / hour / IP
  signin:   { limit: 10, windowMs: 5  * 60 * 1000 }, // 10 / 5min / IP
  reset:    { limit: 5,  windowMs: 60 * 60 * 1000 }, // 5 / hour / IP
  // Phase 3 — Member playback access. Signed-URL issuance is rate-limited
  // per (member email + IP) to bound scraping/automation. Tuned to allow
  // legitimate refresh-near-expiry plus reasonable channel-flipping while
  // capping a runaway loop.
  playback: { limit: 30, windowMs: 5  * 60 * 1000 }, // 30 / 5min / member+IP
} as const;

export type RateLimitAction = keyof typeof RATE_POLICY;
