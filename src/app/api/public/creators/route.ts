import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Phase 1 — Public listing of reachable creator profiles.
//
// Reachability mirrors /api/public/creator: published, not quarantined, not
// force-unpublished, and tied to an accepted application. Listings ARE the
// trust surface — every row that appears here must pass the same gate the
// individual profile route uses, otherwise placeholders/demo rows could
// resurface here.
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (profileRows ?? []) as any[];

  // Verify each profile is still tied to an accepted application. Use a
  // single batched lookup to avoid N+1.
  const emails = rows.map((r) => (r.email ?? "").trim().toLowerCase()).filter(Boolean);
  const acceptedSet = new Set<string>();
  if (emails.length) {
    const { data: appRows } = await supabase
      .from("creator_applications")
      .select("email, status")
      .in("email", emails)
      .eq("status", "accepted");
    for (const a of appRows ?? []) {
      const e = ((a as any).email ?? "").trim().toLowerCase();
      if (e) acceptedSet.add(e);
    }
  }

  const creators = rows
    .filter((r) => acceptedSet.has((r.email ?? "").trim().toLowerCase()))
    .map((r) => {
      const origin = [r.city, r.country].filter(Boolean).join(", ");
      return {
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

  return NextResponse.json({ creators });
}
