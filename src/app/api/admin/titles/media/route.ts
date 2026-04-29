import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function checkAuth(req: NextRequest) {
  const pw = req.headers.get("x-admin-password");
  return pw === process.env.ADMIN_PASSWORD;
}

// Phase 1 — Manual Bunny binding.
// Admin attaches a Bunny Stream video ID to the title row backing a live project,
// and toggles media_ready. Until media_ready=true AND bunny_video_id is set,
// the title does not surface in the public catalog.
export async function PATCH(req: NextRequest) {
  if (!checkAuth(req)) return unauthorized();

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { projectId, bunnyVideoId, bunnyThumbnailUrl, mediaReady } = body;

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  // Resolve the active title row backing this project. We don't update by
  // title.id directly — the admin UI works in terms of projects.
  const { data: titleRow, error: lookupError } = await supabase
    .from("titles")
    .select("id, status")
    .eq("project_id", projectId)
    .neq("status", "removed")
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json({ error: lookupError.message }, { status: 500 });
  }
  if (!titleRow) {
    return NextResponse.json(
      { error: "No active title exists for this project. Activate distribution first." },
      { status: 404 }
    );
  }

  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (bunnyVideoId !== undefined)      updates.bunny_video_id      = bunnyVideoId?.trim() || null;
  if (bunnyThumbnailUrl !== undefined) updates.bunny_thumbnail_url = bunnyThumbnailUrl?.trim() || null;
  if (mediaReady !== undefined)        updates.media_ready         = !!mediaReady;

  // Defensive guard — a title can't be marked media_ready without a video ID.
  // Use the incoming video ID if present, otherwise fall back to existing.
  if (updates.media_ready === true && !updates.bunny_video_id) {
    const { data: existing } = await supabase
      .from("titles")
      .select("bunny_video_id")
      .eq("id", titleRow.id)
      .single();
    if (!existing?.bunny_video_id) {
      return NextResponse.json(
        { error: "Cannot mark media_ready without a Bunny video ID." },
        { status: 422 }
      );
    }
  }

  const { error: updateError } = await supabase
    .from("titles")
    .update(updates)
    .eq("id", titleRow.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { data: refreshed } = await supabase
    .from("titles")
    .select("id, project_id, bunny_video_id, bunny_thumbnail_url, media_ready, status")
    .eq("id", titleRow.id)
    .single();

  return NextResponse.json({ success: true, title: refreshed ?? null });
}
