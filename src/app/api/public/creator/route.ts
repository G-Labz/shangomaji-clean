import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildBunnyThumbnailUrl } from "@/lib/bunny";
import { normalizeArtworkUrl } from "@/lib/artwork";
import { filterSuppressedTaxonomy } from "@/lib/copy-guards";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Phase 1 — Public Creator Profile route.
//
// Reachability rule (every condition required):
//   1. profile.is_published_publicly = true
//   2. profile.force_unpublished     = false
//   3. profile.placeholder_quarantined = false
//   4. an `accepted` row exists in creator_applications for this email
//
// Failure on any condition returns 404 Not Found — never a 200 with empty data,
// never a partial response. Public-private boundary is fixed in this route:
// only the columns in PUBLIC_PROFILE_FIELDS are emitted to clients.
const PUBLIC_PROFILE_FIELDS =
  "email, handle, display_name, bio_short, bio_long, city, country, " +
  "website, instagram, twitter, youtube, avatar_url, banner_url, " +
  "external_links, identity_status, published_at, " +
  "is_published_publicly, force_unpublished, placeholder_quarantined";

const GENRE_MAP: Record<string, string> = {
  Mythic:    "Mythology & Gods",
  "Sci-Fi":  "Futures & Sci-Fi",
  Spiritual: "Spirits & the Unseen",
};

export async function GET(req: NextRequest) {
  const handle = req.nextUrl.searchParams.get("handle");
  if (!handle) {
    return NextResponse.json({ error: "handle is required" }, { status: 400 });
  }

  const { data: profileRow, error } = await supabase
    .from("creator_profiles")
    .select(PUBLIC_PROFILE_FIELDS)
    .ilike("handle", handle)
    .maybeSingle();

  if (error || !profileRow) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const row = profileRow as any;

  // Reachability gate. All four conditions must hold.
  if (
    row.is_published_publicly !== true ||
    row.force_unpublished      === true ||
    row.placeholder_quarantined === true
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const email = (row.email ?? "").trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Verify an accepted application exists for this email.
  const { data: app } = await supabase
    .from("creator_applications")
    .select("email, status")
    .ilike("email", email)
    .eq("status", "accepted")
    .maybeSingle();

  if (!app) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Pull live works for this creator (the public projection — same gate as
  // /api/public/titles uses, but scoped to this creator's email).
  const { data: titleRows } = await supabase
    .from("titles")
    .select("id, project_id, creator_email, status, bunny_video_id, bunny_thumbnail_url, media_ready, activated_at")
    .eq("creator_email", email)
    .eq("status", "active")
    .eq("media_ready", true)
    .not("bunny_video_id", "is", null)
    .order("activated_at", { ascending: false });

  const projectIds = (titleRows ?? []).map((t: any) => t.project_id).filter(Boolean);
  const projectMap = new Map<string, any>();
  if (projectIds.length) {
    const { data: projectRows } = await supabase
      .from("creator_projects")
      .select("id, title, logline, description, genres, project_type, cover_image_url, banner_url, created_at")
      .in("id", projectIds);
    for (const p of projectRows ?? []) {
      projectMap.set((p as any).id, p);
    }
  }

  // Phase 3: filter titles to those that are playback-eligible *server-side*
  // (library configured + bunny_video_id present). The actual signed URL is
  // never included here — Members must call /api/playback/session to play.
  const libraryConfigured = !!process.env.BUNNY_STREAM_LIBRARY_ID;
  const titles = (titleRows ?? [])
    .map((t: any) => {
      if (!libraryConfigured || !t.bunny_video_id) return null;
      const p = projectMap.get(t.project_id);
      const bunnyThumb = t.bunny_thumbnail_url || buildBunnyThumbnailUrl(t.bunny_video_id);
      return {
        id:          `cp-${t.project_id}`,
        slug:        `cp-${t.project_id}`,
        title:       p?.title || "Untitled",
        description: p?.description || p?.logline || "",
        year:        p ? new Date(p.created_at).getFullYear() : new Date().getFullYear(),
        type:        (p?.project_type || "").toLowerCase() === "series" ? "series" : "movie",
        // Phase 5 brand correction — strip retired taxonomy at the API boundary.
        genres:      filterSuppressedTaxonomy(
          ((p?.genres ?? []) as string[]).map((g) => GENRE_MAP[g] || g)
        ),
        // Phase 5 — emit null when no real artwork. Consumers render a
        // typographic fallback rather than a missing image.
        posterUrl:   normalizeArtworkUrl(p?.cover_image_url) || normalizeArtworkUrl(bunnyThumb),
        backdropUrl: normalizeArtworkUrl(p?.banner_url) || normalizeArtworkUrl(p?.cover_image_url) || normalizeArtworkUrl(bunnyThumb),
      };
    })
    .filter(Boolean);

  // Public-safe shape for the creator. Only the fields below are sent.
  // Verified badge is derived from identity_status; raw status is not exposed.
  const origin = [row.city, row.country].filter(Boolean).join(", ");
  const externalLinks = Array.isArray(row.external_links) ? row.external_links : [];

  // Map external_links into the legacy socialLinks shape consumed by the
  // existing /creators/[handle] page so we don't have to change the public
  // page's component contract in this build.
  const socialLinks: Record<string, string | undefined> = {
    website:   row.website   || undefined,
    instagram: row.instagram || undefined,
    twitter:   row.twitter   || undefined,
    youtube:   row.youtube   || undefined,
  };

  const creator = {
    id:        row.handle,
    handle:    row.handle,
    name:      row.display_name || row.handle,
    tagline:   "",
    bio:       row.bio_long || row.bio_short || "",
    origin,
    avatarUrl: row.avatar_url || "",
    bannerUrl: row.banner_url || "",
    genres:    [] as string[],
    influences: [] as string[],
    stats:      [] as { label: string; value: string }[],
    titles,
    socialLinks,
    externalLinks,
    isVerified: row.identity_status === "verified",
    // Phase 6 Tier 2 — Approved Creator indicator. Reaching this point
    // in the route means the four-condition reachability gate AND the
    // accepted-application check have both passed. Surfacing the bit
    // explicitly lets the public profile render a small institutional
    // line without re-deriving it client-side. Always `true` for any
    // creator returned by this endpoint; absent here would mean the
    // route already 404'd.
    isApprovedCreator: true,
    isFeatured: false,
    joinedYear: row.published_at
      ? new Date(row.published_at).getFullYear()
      : new Date().getFullYear(),
  };

  return NextResponse.json({ creator });
}
