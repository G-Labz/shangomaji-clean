import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildBunnyThumbnailUrl } from "@/lib/bunny";
import { normalizeArtworkUrl } from "@/lib/artwork";
import { isWithinNewWindow } from "@/lib/new-badge";
import { filterSuppressedTaxonomy } from "@/lib/copy-guards";

// Phase 3 — public title metadata is freely browsable, but the playback
// embed URL is NEVER returned here. Members must obtain a signed/expiring
// playback URL via /api/playback/session, which enforces auth, Member
// status, license term, and distribution window before signing.

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const GENRE_MAP: Record<string, string> = {
  "Mythic":    "Mythology & Gods",
  "Sci-Fi":    "Futures & Sci-Fi",
  "Spiritual": "Spirits & the Unseen",
};

export async function GET() {
  // Step 1 — Fetch active title records.
  // Two separate queries instead of a FK join to avoid PostgREST schema-cache
  // stale-state issues after the titles table migration.
  const { data: titleRows, error: titlesError } = await supabase
    .from("titles")
    .select("id, project_id, creator_email, status, exclusivity_type, monetization_enabled, distribution_start, distribution_end, activated_at, bunny_video_id, bunny_thumbnail_url, media_ready")
    .eq("status", "active")
    .eq("media_ready", true)
    .not("bunny_video_id", "is", null)
    .order("activated_at", { ascending: false });

  if (titlesError) {
    return NextResponse.json({ error: titlesError.message }, { status: 500 });
  }

  if (!titleRows || titleRows.length === 0) {
    return NextResponse.json({ titles: [] });
  }

  // Step 2 — Fetch the corresponding project records.
  const projectIds = titleRows.map((t: any) => t.project_id).filter(Boolean);

  const { data: projectRows, error: projectsError } = await supabase
    .from("creator_projects")
    // Phase 6 Tier 1 — sample_url is intentionally NOT selected.
    // Screener URLs are private creator/admin material and must never
    // reach a public surface. trailer_url is fine: it is creator-supplied
    // promotional content rendered as a plain outbound link on the title
    // page (no embedded player).
    .select("id, title, logline, description, genres, project_type, cover_image_url, banner_url, trailer_url, created_at, updated_at")
    .in("id", projectIds);

  if (projectsError) {
    return NextResponse.json({ error: projectsError.message }, { status: 500 });
  }

  const projectMap = new Map(
    (projectRows ?? []).map((p: any) => [p.id, p])
  );

  // Step 3 — Resolve creator names + handles.
  //
  // Attribution priority for the public title page:
  //   1. accepted creator_applications.name      (always safe — institutional)
  //   2. creator_profiles.display_name            (only if NOT quarantined)
  //   3. null  → title page falls back to "Published by ShangoMaji"
  //
  // Lookups are normalized to lowercase on both sides because emails in
  // creator_applications and creator_profiles are not guaranteed to share the
  // same casing as titles.creator_email. We do not use `.in()` here because
  // PostgREST's `in` is case-sensitive at the SQL level; instead we fetch the
  // accepted/all candidate rows and match on lowercased keys in JS.
  //
  // The handle used to LINK to a public profile must come from a profile row
  // that is reachable (published + not quarantined + not force-unpublished).
  // When the profile is not reachable, `creatorHandle` is null so the title
  // page renders the name as plain text instead of a broken link.
  const emailsLower = Array.from(
    new Set(
      titleRows
        .map((t: any) => (t.creator_email ?? "").trim().toLowerCase())
        .filter((e: string) => e.length > 0)
    )
  );

  const appNameByEmail = new Map<string, string>();
  if (emailsLower.length) {
    const { data: appRows } = await supabase
      .from("creator_applications")
      .select("email, name, status");
    for (const a of (appRows ?? []) as any[]) {
      if (a.status !== "accepted") continue;
      const e = (a.email ?? "").trim().toLowerCase();
      if (!e || !emailsLower.includes(e)) continue;
      const name = typeof a.name === "string" ? a.name.trim() : "";
      if (name && !appNameByEmail.has(e)) appNameByEmail.set(e, name);
    }
  }

  const profileFallbackNameByEmail = new Map<string, string>();
  const reachableHandleByEmail     = new Map<string, string>();
  if (emailsLower.length) {
    const { data: profileRows } = await supabase
      .from("creator_profiles")
      .select("email, handle, display_name, is_published_publicly, force_unpublished, placeholder_quarantined");
    for (const p of (profileRows ?? []) as any[]) {
      const e = (p.email ?? "").trim().toLowerCase();
      if (!e || !emailsLower.includes(e)) continue;
      const reachable =
        p.is_published_publicly === true &&
        p.force_unpublished     === false &&
        p.placeholder_quarantined === false;
      if (reachable && p.handle) {
        reachableHandleByEmail.set(e, String(p.handle));
      }
      // Quarantined profiles are presumed fake and never contribute a name.
      // Force-unpublished or unpublished-but-non-quarantined rows still
      // contribute a creator-chosen display name as a safe non-linked
      // attribution fallback.
      if (!p.placeholder_quarantined) {
        const dn = typeof p.display_name === "string" ? p.display_name.trim() : "";
        if (dn && !profileFallbackNameByEmail.has(e)) profileFallbackNameByEmail.set(e, dn);
      }
    }
  }

  // Step 4 — Shape the response.
  // Server-side construction of the Bunny embed URL keeps the iframe src
  // assembly out of the client and lets us drop any title where the runtime
  // env vars aren't configured.
  const titles = titleRows
    .map((t: any) => {
      const p = projectMap.get(t.project_id);
      const emailKey = (t.creator_email ?? "").trim().toLowerCase();
      const reachableHandle = reachableHandleByEmail.get(emailKey) ?? null;
      // Attribution: applications.name → profiles.display_name (non-quarantined)
      // → null. Last-resort generic copy lives on the title page.
      const creatorName =
        appNameByEmail.get(emailKey) ||
        profileFallbackNameByEmail.get(emailKey) ||
        null;

      // Phase 3: a title is "playable" iff media_ready, has a bunny_video_id,
      // and the Bunny library is configured server-side. We do NOT return the
      // embed URL itself — the client must call /api/playback/session to
      // receive a signed/expiring URL. We still surface the thumbnail because
      // it is a low-value image asset, not a playback grant.
      const libraryConfigured = !!process.env.BUNNY_STREAM_LIBRARY_ID;
      if (!libraryConfigured) return null;

      const bunnyThumb = t.bunny_thumbnail_url || buildBunnyThumbnailUrl(t.bunny_video_id);

      return {
        id:          `cp-${t.project_id}`,
        slug:        `cp-${t.project_id}`,
        titleId:     t.id,
        title:       p?.title || "Untitled",
        tagline:     p?.logline || "",
        description: p?.description || p?.logline || "",
        year:        p ? new Date(p.created_at).getFullYear() : new Date().getFullYear(),
        rating:      "NR",
        score:       0,
        runtime:     null,
        seasons:     null,
        // Phase 5 brand correction — retired taxonomy ("Afrofuturism") is
        // filtered out at the API boundary so it never reaches any client
        // surface. GENRE_MAP rewrites legacy short codes to current labels.
        genres:      filterSuppressedTaxonomy(
          (p?.genres || []).map((g: string) => GENRE_MAP[g] || g)
        ),
        type:        (p?.project_type || "").toLowerCase() === "series" ? "series" : "movie",
        // Phase 5: emit null when no real artwork exists. Consumers render a
        // black typographic fallback (M-mark + title) instead of a broken
        // /images/placeholder.png that no longer exists in /public.
        backdropUrl: normalizeArtworkUrl(p?.banner_url) || normalizeArtworkUrl(p?.cover_image_url) || normalizeArtworkUrl(bunnyThumb),
        posterUrl:   normalizeArtworkUrl(p?.cover_image_url) || normalizeArtworkUrl(bunnyThumb),
        cast:        [],
        // Last-resort generic attribution. The title page only uses this when
        // creatorName is null; per the institutional copy standard we do not
        // append "Creators" to the studio name.
        studio:      "ShangoMaji",
        creatorEmail:          t.creator_email,
        creatorName,
        // Only surface a handle that resolves to a reachable public profile.
        // Otherwise the title page renders the name as static text with no
        // link, instead of a broken link to a nonexistent /creators/{handle}.
        creatorHandle:         reachableHandle,
        // Phase 6 Tier 1 — sampleUrl removed from the public response.
        // Screener URL is private; do not surface it to any client.
        trailerUrl:            p?.trailer_url || null,
        exclusivityType:       t.exclusivity_type,
        monetizationEnabled:   t.monetization_enabled,
        distributionStart:     t.distribution_start,
        distributionEnd:       t.distribution_end,
        activatedAt:           t.activated_at,
        // Phase 3: `playable` continues to drive the title-page Play CTA, but
        // there is no `playbackEmbedUrl` field here. /api/playback/session
        // is the only path that yields a signed playback URL.
        playable:              true,
        // Phase 5: NEW reflects real activation freshness, not a hand-flag.
        // Falsy `activated_at` rows simply do not get the badge.
        isNew:                 isWithinNewWindow(t.activated_at),
        isCreatorProject:      true,
      };
    })
    .filter(Boolean);

  return NextResponse.json({ titles });
}
