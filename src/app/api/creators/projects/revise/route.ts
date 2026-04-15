import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

// POST /api/creators/projects/revise
// Clone a rejected project as a new draft.
// Original rejected project remains unchanged.
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

  if (!body.id) {
    return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
  }

  // Fetch original — must be rejected and owned by this creator
  const { data: original, error: fetchError } = await supabase
    .from("creator_projects")
    .select("*")
    .eq("id", body.id)
    .eq("creator_email", email)
    .single();

  if (fetchError || !original) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (original.status !== "rejected") {
    return NextResponse.json(
      { error: "Only rejected projects can be revised." },
      { status: 422 }
    );
  }

  const now = new Date().toISOString();

  const newProject = {
    creator_email: email,
    title: original.title,
    description: original.description ?? null,
    status: "draft",
    project_type: original.project_type ?? null,
    genres: original.genres ?? [],
    logline: original.logline ?? null,
    cover_image_url: original.cover_image_url ?? null,
    banner_url: original.banner_url ?? null,
    trailer_url: original.trailer_url ?? null,
    sample_url: original.sample_url ?? null,
    stills_urls: original.stills_urls ?? [],
    deliverables: original.deliverables ?? [],
    updated_at: now,
    status_changed_at: now,
    submission_count: 0,
  };

  const { data: created, error: createError } = await supabase
    .from("creator_projects")
    .insert(newProject)
    .select("id")
    .single();

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, id: created.id });
}
