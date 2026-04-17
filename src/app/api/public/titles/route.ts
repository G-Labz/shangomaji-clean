import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const GENRE_MAP: Record<string, string> = {
  "Afrofuturism": "Afro Cyberpunk",
  "Mythic": "Mythology & Gods",
  "Folklore": "Folklore & the Ancient",
  "Sci-Fi": "Futures & Sci-Fi",
  "Drama": "Diaspora Stories",
  "Spiritual": "Spirits & the Unseen",
};

export async function GET() {
  // Fetch only active title records joined with their project data.
  // A title row is the authoritative gate for public visibility —
  // project.status = "live" alone is not sufficient.
  const { data: titleRows, error } = await supabase
    .from("titles")
    .select(`
      id,
      project_id,
      creator_email,
      status,
      exclusivity_type,
      monetization_enabled,
      distribution_start,
      distribution_end,
      activated_at,
      creator_projects (
        id,
        title,
        logline,
        description,
        genres,
        project_type,
        cover_image_url,
        banner_url,
        sample_url,
        trailer_url,
        created_at,
        updated_at
      )
    `)
    .eq("status", "active")
    .order("activated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Resolve creator names + handles from creator_applications
  const emails = Array.from(
    new Set((titleRows ?? []).map((t: any) => t.creator_email).filter(Boolean))
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

  const titles = (titleRows ?? []).map((t: any) => {
    const p = t.creator_projects;
    const creator = creatorMap.get((t.creator_email ?? "").trim().toLowerCase());

    return {
      id:          `cp-${t.project_id}`,
      slug:        `cp-${t.project_id}`,
      titleId:     t.id,
      title:       p?.title || "Untitled",
      tagline:     p?.logline || "",
      description: p?.description || p?.logline || "",
      year:        p ? new Date(p.created_at).getFullYear() : null,
      rating:      "NR",
      score:       0,
      runtime:     null,
      seasons:     null,
      genres:      (p?.genres || []).map((g: string) => GENRE_MAP[g] || g),
      type:        (p?.project_type || "").toLowerCase() === "series" ? "series" : "movie",
      backdropUrl: p?.banner_url || p?.cover_image_url || "/images/placeholder.png",
      posterUrl:   p?.cover_image_url || "/images/placeholder.png",
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
      isNew:                 true,
      isCreatorProject:      true,
    };
  });

  return NextResponse.json({ titles });
}
