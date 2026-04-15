import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate required fields
    if (!body.title || !body.type || !body.logline || !body.description) {
      return NextResponse.json({ error: "Missing required project fields" }, { status: 400 });
    }
    if (!body.thumbnailUrl || !body.bannerUrl) {
      return NextResponse.json({ error: "Missing required media URLs" }, { status: 400 });
    }
    if (!body.creatorName || !body.genre) {
      return NextResponse.json({ error: "Missing creator name or genre" }, { status: 400 });
    }

    const { error } = await supabase.from("projects").insert([
      {
        title: body.title,
        type: body.type,
        logline: body.logline,
        description: body.description,
        thumbnail_url: body.thumbnailUrl,
        banner_url: body.bannerUrl,
        trailer_url: body.trailerUrl || null,
        video_url: body.videoUrl || null,
        creator_name: body.creatorName,
        creator_bio: body.creatorBio || null,
        creator_email: body.creatorEmail || null,
        genre: body.genre,
        status: "pending_review",
        created_at: new Date().toISOString(),
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
