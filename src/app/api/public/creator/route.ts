import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const handle = req.nextUrl.searchParams.get("handle");
  if (!handle) {
    return NextResponse.json({ error: "handle is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("creator_profiles")
    .select(
      "email, handle, display_name, bio_short, bio_long, city, country, " +
      "website, instagram, twitter, youtube, avatar_url, banner_url"
    )
    .ilike("handle", handle)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const row = data as any;

  const origin = [row.city, row.country].filter(Boolean).join(", ");
  const FALLBACK_AVATAR = `https://picsum.photos/seed/${handle}-av/400/400`;

  const creator = {
    id: row.handle,
    handle: row.handle,
    name: row.display_name || row.handle,
    tagline: "",
    bio: row.bio_long || row.bio_short || "",
    origin,
    avatarUrl: row.avatar_url || FALLBACK_AVATAR,
    bannerUrl: row.banner_url || null,
    genres: [] as string[],
    influences: [] as string[],
    stats: [] as { label: string; value: string }[],
    titles: [] as any[],
    socialLinks: {
      website: row.website || undefined,
      instagram: row.instagram || undefined,
      twitter: row.twitter || undefined,
      youtube: row.youtube || undefined,
    },
    isVerified: false,
    isFeatured: false,
    joinedYear: new Date().getFullYear(),
  };

  return NextResponse.json({ creator });
}
