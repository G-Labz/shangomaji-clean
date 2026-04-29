import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildBunnyEmbedUrl, buildBunnyThumbnailUrl } from "@/lib/bunny";

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
    .select("id, title, logline, description, genres, project_type, cover_image_url, banner_url, sample_url, trailer_url, created_at, updated_at")
    .in("id", projectIds);

  if (projectsError) {
    return NextResponse.json({ error: projectsError.message }, { status: 500 });
  }

  const projectMap = new Map(
    (projectRows ?? []).map((p: any) => [p.id, p])
  );

  // Step 3 — Resolve creator names + handles from creator_applications.
  const emails = Array.from(
    new Set(titleRows.map((t: any) => t.creator_email).filter(Boolean))
  );

  const { data: creatorRows } = emails.length
    ? await supabase
        .from("creator_applications")
        .select("email, name, handle")
        .in("email", emails)
        .eq("status", "accepted")
    : { data: [] };

  const creatorMap = new Map(
    (creatorRows ?? []).map((c: any) => [c.email.trim().toLowerCase(), c])
  );

  // Step 4 — Shape the response.
  // Server-side construction of the Bunny embed URL keeps the iframe src
  // assembly out of the client and lets us drop any title where the runtime
  // env vars aren't configured.
  const titles = titleRows
    .map((t: any) => {
      const p = projectMap.get(t.project_id);
      const creator = creatorMap.get((t.creator_email ?? "").trim().toLowerCase());

      const playbackEmbedUrl = buildBunnyEmbedUrl(t.bunny_video_id);
      if (!playbackEmbedUrl) return null;

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
        genres:      (p?.genres || []).map((g: string) => GENRE_MAP[g] || g),
        type:        (p?.project_type || "").toLowerCase() === "series" ? "series" : "movie",
        backdropUrl: p?.banner_url || p?.cover_image_url || bunnyThumb || "/images/placeholder.png",
        posterUrl:   p?.cover_image_url || bunnyThumb || "/images/placeholder.png",
        cast:        [],
        studio:      "ShangoMaji Creators",
        creatorEmail:          t.creator_email,
        creatorName:           creator?.name || null,
        creatorHandle:         creator?.handle || null,
        sampleUrl:             p?.sample_url || null,
        trailerUrl:            p?.trailer_url || null,
        exclusivityType:       t.exclusivity_type,
        monetizationEnabled:   t.monetization_enabled,
        distributionStart:     t.distribution_start,
        distributionEnd:       t.distribution_end,
        activatedAt:           t.activated_at,
        playable:              true,
        playbackEmbedUrl,
        isNew:                 true,
        isCreatorProject:      true,
      };
    })
    .filter(Boolean);

  return NextResponse.json({ titles });
}
