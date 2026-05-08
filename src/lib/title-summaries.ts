// Phase 4 — server-side helper that hydrates a list of title IDs into
// public-safe title summaries. Mirrors the catalog-standard fields
// returned by /api/public/titles, but resolves a specific ID set instead
// of the full catalog.
//
// Filters out titles that are no longer eligible for public catalog display
// (status != 'active' || !media_ready || !bunny_video_id || library not
// configured) so the My List page never surfaces a saved title that has
// since been pulled. Order is preserved from the input id array unless
// callers pass a sortBy override.

import { createClient as createServiceClient, type SupabaseClient } from "@supabase/supabase-js";
import { buildBunnyThumbnailUrl } from "@/lib/bunny";
import { normalizeArtworkUrl } from "@/lib/artwork";

const GENRE_MAP: Record<string, string> = {
  "Mythic":    "Mythology & Gods",
  "Sci-Fi":    "Futures & Sci-Fi",
  "Spiritual": "Spirits & the Unseen",
};

function svc(): SupabaseClient {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export type TitleSummary = {
  id:             string;
  slug:           string;
  titleId:        string;
  title:          string;
  tagline:        string;
  description:    string;
  year:           number;
  type:           "series" | "movie";
  genres:         string[];
  // Phase 5: null when no real artwork exists. Consumers render a
  // typographic fallback via <PosterArt> / <BackdropArt>.
  posterUrl:      string | null;
  backdropUrl:    string | null;
  creatorHandle:  string | null;
  creatorName:    string | null;
  studio:         string;
  playable:       boolean;
};

// Fetch a list of title summaries by titles.id, filtered to public-safe
// (catalog-eligible) rows. Order matches `orderedIds` when present, then
// activated_at desc.
export async function fetchTitleSummariesByIds(orderedIds: string[]): Promise<TitleSummary[]> {
  if (!orderedIds.length) return [];

  const admin = svc();
  const libraryConfigured = !!process.env.BUNNY_STREAM_LIBRARY_ID;
  if (!libraryConfigured) return [];

  const { data: titleRows } = await admin
    .from("titles")
    .select("id, project_id, creator_email, status, bunny_video_id, bunny_thumbnail_url, media_ready, activated_at")
    .in("id", orderedIds)
    .eq("status", "active")
    .eq("media_ready", true)
    .not("bunny_video_id", "is", null);

  if (!titleRows || titleRows.length === 0) return [];

  const projectIds = (titleRows as any[]).map((t) => t.project_id).filter(Boolean);
  const { data: projectRows } = projectIds.length
    ? await admin
        .from("creator_projects")
        .select("id, title, logline, description, genres, project_type, cover_image_url, banner_url, created_at")
        .in("id", projectIds)
    : { data: [] };
  const projectMap = new Map((projectRows ?? []).map((p: any) => [p.id, p]));

  // Attribution lookups (same pattern as /api/public/titles, smaller).
  const emailsLower = Array.from(
    new Set(
      (titleRows as any[])
        .map((t) => (t.creator_email ?? "").trim().toLowerCase())
        .filter((e: string) => e.length > 0)
    )
  );

  const appNameByEmail = new Map<string, string>();
  const reachableHandleByEmail = new Map<string, string>();
  const profileFallbackNameByEmail = new Map<string, string>();

  if (emailsLower.length) {
    const [{ data: appRows }, { data: profileRows }] = await Promise.all([
      admin.from("creator_applications").select("email, name, status"),
      admin
        .from("creator_profiles")
        .select("email, handle, display_name, is_published_publicly, force_unpublished, placeholder_quarantined"),
    ]);

    for (const a of (appRows ?? []) as any[]) {
      if (a.status !== "accepted") continue;
      const e = (a.email ?? "").trim().toLowerCase();
      if (!e || !emailsLower.includes(e)) continue;
      const name = typeof a.name === "string" ? a.name.trim() : "";
      if (name && !appNameByEmail.has(e)) appNameByEmail.set(e, name);
    }

    for (const p of (profileRows ?? []) as any[]) {
      const e = (p.email ?? "").trim().toLowerCase();
      if (!e || !emailsLower.includes(e)) continue;
      const reachable =
        p.is_published_publicly === true &&
        p.force_unpublished === false &&
        p.placeholder_quarantined === false;
      if (reachable && p.handle) reachableHandleByEmail.set(e, String(p.handle));
      if (!p.placeholder_quarantined) {
        const dn = typeof p.display_name === "string" ? p.display_name.trim() : "";
        if (dn && !profileFallbackNameByEmail.has(e)) profileFallbackNameByEmail.set(e, dn);
      }
    }
  }

  const byId = new Map<string, TitleSummary>();
  for (const t of titleRows as any[]) {
    const p = projectMap.get(t.project_id);
    const emailKey = (t.creator_email ?? "").trim().toLowerCase();
    const reachableHandle = reachableHandleByEmail.get(emailKey) ?? null;
    const creatorName =
      appNameByEmail.get(emailKey) ||
      profileFallbackNameByEmail.get(emailKey) ||
      null;
    const bunnyThumb = t.bunny_thumbnail_url || buildBunnyThumbnailUrl(t.bunny_video_id);

    byId.set(t.id, {
      id:           `cp-${t.project_id}`,
      slug:         `cp-${t.project_id}`,
      titleId:      t.id,
      title:        (p as any)?.title || "Untitled",
      tagline:      (p as any)?.logline || "",
      description:  (p as any)?.description || (p as any)?.logline || "",
      year:         p ? new Date((p as any).created_at).getFullYear() : new Date().getFullYear(),
      type:         ((p as any)?.project_type || "").toLowerCase() === "series" ? "series" : "movie",
      genres:       (((p as any)?.genres ?? []) as string[]).map((g) => GENRE_MAP[g] || g),
      // Phase 5 — null instead of legacy placeholder. Consumer renders fallback.
      posterUrl:    normalizeArtworkUrl((p as any)?.cover_image_url) || normalizeArtworkUrl(bunnyThumb),
      backdropUrl:  normalizeArtworkUrl((p as any)?.banner_url) || normalizeArtworkUrl((p as any)?.cover_image_url) || normalizeArtworkUrl(bunnyThumb),
      creatorHandle: reachableHandle,
      creatorName,
      studio:       "ShangoMaji",
      playable:     true,
    });
  }

  // Preserve caller-specified order.
  const out: TitleSummary[] = [];
  for (const id of orderedIds) {
    const s = byId.get(id);
    if (s) out.push(s);
  }
  return out;
}
