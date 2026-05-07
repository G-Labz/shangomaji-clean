import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Phase 1 patch — Public roster of reachable creator profiles.
//
// Reachability MUST mirror /api/public/creator. If the singular profile route
// would render the page, the listing must include the row. Earlier
// implementation used a case-sensitive `.in("email", emails).eq("status",
// "accepted")` filter against creator_applications, while the singular route
// uses case-insensitive `.ilike()`. Profiles whose stored email differed in
// case from their application row would render at /creators/{handle} but be
// dropped from /creators — the bug that was fixed in the prior patch.
//
// Caching posture (this patch — publish/unpublish consistency):
//   - `force-dynamic` ensures Next.js does not statically cache the route
//     output between deploys.
//   - Explicit `Cache-Control: no-store` header on every response prevents
//     CDN/edge/browser caches from serving a stale roster after a creator
//     unpublishes. Without this header an unpublished profile could persist
//     on /creators while /creators/{handle} already returns 404.
//
// Implementation choices:
//   - Match accepted-application by lowercased key in JS, not at the SQL
//     `.in()` layer. Same approach used in /api/public/titles.
export const dynamic   = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
} as const;

const PUBLIC_CARD_FIELDS =
  "email, handle, display_name, bio_short, city, country, avatar_url, banner_url, identity_status, published_at";

export async function GET() {
  const { data: profileRows, error } = await supabase
    .from("creator_profiles")
    .select(PUBLIC_CARD_FIELDS)
    .eq("is_published_publicly", true)
    .eq("force_unpublished", false)
    .eq("placeholder_quarantined", false)
    .order("published_at", { ascending: false, nullsFirst: false });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }

  const rows = (profileRows ?? []) as any[];

  if (rows.length === 0) {
    return NextResponse.json({ creators: [] }, { headers: NO_STORE_HEADERS });
  }

  // Verify each profile is still tied to an accepted application using a
  // case-insensitive match. We fetch all accepted application emails (small
  // table at Phase 1 scale) and match on lowercased keys in JS, mirroring
  // /api/public/creator's `.ilike()` behavior.
  const profileEmails = new Set(
    rows
      .map((r) => (r.email ?? "").trim().toLowerCase())
      .filter((e: string) => e.length > 0)
  );

  const acceptedSet = new Set<string>();
  if (profileEmails.size > 0) {
    const { data: appRows } = await supabase
      .from("creator_applications")
      .select("email, status")
      .eq("status", "accepted");
    for (const a of (appRows ?? []) as any[]) {
      const e = (a.email ?? "").trim().toLowerCase();
      if (e && profileEmails.has(e)) acceptedSet.add(e);
    }
  }

  const creators = rows
    .filter((r) => acceptedSet.has((r.email ?? "").trim().toLowerCase()))
    .map((r) => {
      const origin = [r.city, r.country].filter(Boolean).join(", ");
      return {
        // Public-safe shape only. Email, identity_status raw, application
        // answers, removal history, etc. are intentionally not surfaced.
        id:         r.handle,
        handle:     r.handle,
        name:       r.display_name || r.handle,
        bio:        r.bio_short || "",
        origin,
        avatarUrl:  r.avatar_url || "",
        bannerUrl:  r.banner_url || "",
        isVerified: r.identity_status === "verified",
      };
    });

  return NextResponse.json({ creators }, { headers: NO_STORE_HEADERS });
}
