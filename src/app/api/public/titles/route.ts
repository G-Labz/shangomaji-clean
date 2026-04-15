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
  const { data, error } = await supabase
    .from("creator_projects")
    .select("*")
    .eq("status", "approved")
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Resolve creator names + handles from creator_applications
  const emails = Array.from(new Set((data ?? []).map((p: any) => p.creator_email).filter(Boolean)));
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

  const titles = (data ?? []).map((p) => {
    const creator = creatorMap.get((p.creator_email ?? "").trim().toLowerCase());
    return {
      id: `cp-${p.id}`,
      slug: `cp-${p.id}`,
      title: p.title || "Untitled",
      tagline: p.logline || "",
      description: p.description || p.logline || "",
      year: new Date(p.created_at).getFullYear(),
      rating: "NR",
      score: 0,
      runtime: null,
      seasons: null,
      genres: (p.genres || []).map((g: string) => GENRE_MAP[g] || g),
      type: (p.project_type || "").toLowerCase() === "series" ? "series" : "movie",
      backdropUrl: p.banner_url || p.cover_image_url || "/images/placeholder.png",
      posterUrl: p.cover_image_url || "/images/placeholder.png",
      cast: [],
      studio: "ShangoMaji Creators",
      creatorEmail: p.creator_email,
      creatorName: creator?.name || null,
      creatorHandle: creator?.handle || null,
      sampleUrl: p.sample_url || null,
      trailerUrl: p.trailer_url || null,
      isNew: true,
      isCreatorProject: true,
    };
  });

  return NextResponse.json({ titles });
}
