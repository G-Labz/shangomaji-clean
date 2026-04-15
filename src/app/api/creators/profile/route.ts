import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const email = user.email.trim().toLowerCase();

  const { data, error } = await supabase
    .from("creator_profiles")
    .select(
      "display_name, handle, bio_short, bio_long, city, country, website, instagram, twitter, youtube, avatar_url, banner_url"
    )
    .eq("email", email)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const email = user.email.trim().toLowerCase();

  let body: Record<string, any>;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const profileData = {
    email,
    display_name: body.display_name ?? null,
    handle: body.handle ?? null,
    bio_short: body.bio_short ?? null,
    website: body.website ?? null,
    avatar_url: body.avatar_url ?? null,
    banner_url: body.banner_url ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from("creator_profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  let result;

  if (existing) {
    result = await supabase
      .from("creator_profiles")
      .update(profileData)
      .eq("email", email);
  } else {
    result = await supabase
      .from("creator_profiles")
      .insert(profileData);
  }

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
