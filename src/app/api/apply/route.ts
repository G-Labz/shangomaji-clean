import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { error } = await supabase.from("creator_applications").insert([
      {
        name: body.name,
        handle: body.handle,
        email: body.email,
        origin: body.origin,
        project_title: body.projectTitle,
        project_type: body.projectType,
        genres: body.genres,
        logline: body.logline,
        sample_url: body.sampleUrl,
        influences: body.influences,
        why_shangomaji: body.whyShangoMaji,
        what_you_need: body.whatYouNeed,
        instagram: body.instagram,
        twitter: body.twitter,
        youtube: body.youtube,
        website: body.website,
        status: "pending",
        submitted_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
