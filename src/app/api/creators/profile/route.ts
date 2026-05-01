import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { hydrateCreatorProfile } from "@/lib/hydrate-creator-profile";

const PROFILE_COLUMNS =
  "display_name, handle, bio_short, bio_long, city, country, website, instagram, twitter, youtube, avatar_url, banner_url";

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

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
    .select(PROFILE_COLUMNS)
    .eq("email", email)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fallback hydration. Covers older accepted creators whose profile row was
  // never populated (e.g. accepted before this hydration layer existed) and
  // any case where the onboarding-accept hydration failed silently. The
  // helper only fills empty fields, so creator-edited values are preserved.
  // Service role is used to bypass RLS and to read creator_applications.
  if (!data) {
    const admin = svc();
    try {
      const result = await hydrateCreatorProfile(admin, email);
      if (result.ok && (result.created || result.updatedFields.length > 0)) {
        const { data: rehydrated, error: rehydrateErr } = await admin
          .from("creator_profiles")
          .select(PROFILE_COLUMNS)
          .eq("email", email)
          .maybeSingle();
        if (!rehydrateErr && rehydrated) {
          return NextResponse.json({ profile: rehydrated });
        }
      } else if (!result.ok) {
        console.error("Profile fallback hydration failed", {
          email,
          error: result.error,
        });
      }
    } catch (err: any) {
      console.error("Profile fallback hydration threw", {
        email,
        error: err?.message,
      });
    }
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
