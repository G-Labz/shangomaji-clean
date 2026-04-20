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

// Phase 4.9 admin transitions (target → [allowed sources])
const ADMIN_TRANSITIONS: Record<string, string[]> = {
  in_review: ["pending"],
  approved:  ["pending", "in_review"],
  rejected:  ["pending", "in_review"],
  live:      ["approved"],
  archived:  ["live"],
};

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return unauthorized();

  const { data, error } = await supabase
    .from("creator_projects")
    .select("*")
    .in("status", ["pending", "in_review", "approved", "rejected", "live"])
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ projects: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  if (!checkAuth(req)) return unauthorized();

  let body: Record<string, any>;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { id, status, rejectionReason } = body;

  if (!id || !status) {
    return NextResponse.json({ error: "ID and status are required" }, { status: 400 });
  }

  // Rejection requires a reason
  if (status === "rejected" && !rejectionReason?.trim()) {
    return NextResponse.json(
      { error: "A rejection reason is required." },
      { status: 400 }
    );
  }

  // STEP 1 — Fetch current project status before making any changes
  const { data: existingProject, error: fetchError } = await supabase
    .from("creator_projects")
    .select("status, creator_email")
    .eq("id", id)
    .single();

  if (fetchError || !existingProject) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // STEP 2 — Store previous status in memory (not a DB column)
  const previousStatus = existingProject.status;

  const allowedSources = ADMIN_TRANSITIONS[status];

  if (!allowedSources) {
    return NextResponse.json(
      { error: `"${status}" is not a valid admin transition target.` },
      { status: 422 }
    );
  }

  if (!allowedSources.includes(previousStatus)) {
    return NextResponse.json(
      { error: `Cannot transition from "${previousStatus}" to "${status}".` },
      { status: 422 }
    );
  }

  // STEP 3 — Run the update
  const now = new Date().toISOString();
  const updates: Record<string, any> = {
    status,
    updated_at: now,
  };

  if (status === "rejected") {
    updates.rejection_reason = rejectionReason.trim();
  }

  const { error: updateError } = await supabase
    .from("creator_projects")
    .update(updates)
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // STEP 4 — Detect approved → live transition and create title record
  if (previousStatus === "approved" && status === "live") {
    const { error: titleError } = await supabase
      .from("titles")
      .insert({
        project_id:           id,
        creator_email:        existingProject.creator_email,
        status:               "active",
        exclusivity_type:     "non_exclusive",
        monetization_enabled: false,
        distribution_start:   now,
        created_at:           now,
      });

    // STEP 6 — Title insert failure: don't rollback, return 207
    if (titleError) {
      console.error("Title creation failed after activation", { id, error: titleError.message });
      return NextResponse.json(
        {
          success: true,
          distributionWarning:
            `Project is now live, but the distribution title record failed to create. ` +
            `Error: ${titleError.message}. The title will not appear publicly until this is resolved.`,
        },
        { status: 207 }
      );
    }
  }

  return NextResponse.json({ success: true });
}
