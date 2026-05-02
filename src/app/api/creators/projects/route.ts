import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import {
  pickCreatorIntegrityColumns,
  validateCreatorIntegrity,
  type CreatorIntegrityInput,
} from "@/lib/submission-integrity";

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Phase 4.9 lifecycle — allowed creator transitions (target → [allowed sources])
// Creators may only submit: draft → pending
//
// NOTE: this route writes `status_changed_at`, `submitted_at`, `submission_count`,
// and reads `removal_requested`. Those columns are added by
// `src/migrations/006_phase_4_9_lifecycle.sql`. If a deployed Supabase
// instance has not run that migration, you will see errors like
//   "Could not find the 'status_changed_at' column of 'creator_projects'
//    in the schema cache"
// Fix: run migration 006 in the Supabase SQL editor and reload the
// PostgREST schema cache (Supabase Dashboard → API → "Reload schema cache",
// or wait ~60s after the migration runs). Do not paper this over with code.
const CREATOR_TRANSITIONS: Record<string, string[]> = {
  pending: ["draft"],
};

// Hard-blocked source states — 422 on any attempt
const HARD_BLOCKED_SOURCES = new Set([
  "live", "archived", "approved", "rejected", "pending", "in_review",
]);

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
    .from("creator_projects")
    .select("*")
    .eq("creator_email", email)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Enrich with executed-license state so the workspace can show
  // "License required" / "License executed" CTAs on approved projects.
  // Read with the service role to keep this side of the gate immune to
  // RLS configuration on creator_licenses.
  const projects = data ?? [];
  const ids = projects.map((p: any) => p.id);
  const licensesByProject = new Map<string, { id: string; status: string }>();

  if (ids.length) {
    const admin = svc();
    const { data: licenseRows } = await admin
      .from("creator_licenses")
      .select("id, project_id, status")
      .in("project_id", ids)
      .eq("status", "executed");
    for (const l of licenseRows ?? []) {
      licensesByProject.set(l.project_id, { id: l.id, status: l.status });
    }
  }

  const enriched = projects.map((p: any) => {
    const l = licensesByProject.get(p.id);
    return {
      ...p,
      license_status: l ? "executed" : "none",
      license_id:     l?.id ?? null,
    };
  });

  return NextResponse.json({ projects: enriched });
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

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  // Submission Integrity v1: when the creator chooses submitImmediately,
  // the draft → pending gate runs *before* anything is written to the DB.
  // No row is inserted with status pending unless integrity passes.
  if (body.submitImmediately) {
    const integrityErr = validateCreatorIntegrity(body as CreatorIntegrityInput);
    if (integrityErr) {
      return NextResponse.json(
        { error: integrityErr.message, field: integrityErr.field },
        { status: 422 }
      );
    }
  }

  const now = new Date().toISOString();

  const project: Record<string, unknown> = {
    creator_email: email,
    title: body.title.trim(),
    description: body.description ?? null,
    status: "draft",
    project_type: body.project_type ?? null,
    genres: body.genres ?? [],
    logline: body.logline ?? null,
    cover_image_url: body.cover_image_url ?? null,
    banner_url: body.banner_url ?? null,
    trailer_url: body.trailer_url ?? null,
    sample_url: body.sample_url ?? null,
    stills_urls: body.stills_urls ?? [],
    deliverables: body.deliverables ?? [],
    updated_at: now,
    status_changed_at: now,
    submission_count: 0,
    // Persist any integrity fields that were submitted alongside the draft.
    // Drafts are allowed to carry partial integrity fields; the validator
    // only runs on the submission gate.
    ...pickCreatorIntegrityColumns(body as CreatorIntegrityInput),
  };

  const { data, error } = await supabase
    .from("creator_projects")
    .insert(project)
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const projectId = data.id;

  // submitImmediately: attempt draft → pending after create
  if (body.submitImmediately) {
    const submitAt = new Date().toISOString();
    const { error: submitError } = await supabase
      .from("creator_projects")
      .update({
        status: "pending",
        submitted_at: submitAt,
        status_changed_at: submitAt,
        submission_count: 1,
        submission_integrity_completed_at: submitAt,
        updated_at: submitAt,
      })
      .eq("id", projectId)
      .eq("creator_email", email);

    if (submitError) {
      // Draft saved but submission failed — HTTP 207 Multi-Status
      return NextResponse.json(
        {
          success: true,
          id: projectId,
          submissionFailed: true,
          message: "Draft saved, but submission failed. You can retry.",
        },
        { status: 207 }
      );
    }

    return NextResponse.json({ success: true, id: projectId });
  }

  return NextResponse.json({ success: true, id: projectId });
}

export async function PATCH(req: NextRequest) {
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

  // Fetch project — ownership enforced. We read the full row (rather than a
  // dynamic projection string) because the Supabase typed-select parser
  // does not accept runtime-built column lists; reading the full row keeps
  // the integrity validator in sync with the schema without a second
  // round-trip.
  const { data: project, error: fetchError } = await supabase
    .from("creator_projects")
    .select("*")
    .eq("id", body.id)
    .eq("creator_email", email)
    .single();

  if (fetchError || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // ── Removal request (live projects only) ──────────────────────────────────
  if (body.action === "requestRemoval") {
    if (project.status !== "live") {
      return NextResponse.json(
        { error: "Removal requests are only allowed for live projects." },
        { status: 422 }
      );
    }
    if (project.removal_requested) {
      return NextResponse.json(
        { error: "A removal request has already been submitted for this project." },
        { status: 409 }
      );
    }
    if (!body.reason?.trim()) {
      return NextResponse.json(
        { error: "A reason is required for removal requests." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const { error: removalError } = await supabase
      .from("creator_projects")
      .update({
        removal_requested: true,
        removal_requested_at: now,
        removal_reason: body.reason.trim(),
        updated_at: now,
      })
      .eq("id", body.id)
      .eq("creator_email", email);

    if (removalError) {
      return NextResponse.json({ error: removalError.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  // ── Status transition ─────────────────────────────────────────────────────
  const targetStatus = body.status;

  if (!targetStatus) {
    return NextResponse.json({ error: "Status is required" }, { status: 400 });
  }

  // Only one creator transition is allowed: draft → pending
  if (!CREATOR_TRANSITIONS[targetStatus]) {
    return NextResponse.json(
      {
        error: `Transition to "${targetStatus}" is not permitted for creators. Only draft → pending is allowed.`,
      },
      { status: 422 }
    );
  }

  if (HARD_BLOCKED_SOURCES.has(project.status)) {
    return NextResponse.json(
      {
        error: `Projects in "${project.status}" state cannot be changed by creators.`,
      },
      { status: 422 }
    );
  }

  if (!CREATOR_TRANSITIONS[targetStatus].includes(project.status)) {
    return NextResponse.json(
      {
        error: `Cannot transition from "${project.status}" to "${targetStatus}".`,
      },
      { status: 422 }
    );
  }

  // Submission Integrity v1: draft → pending requires a fully-completed
  // creator integrity record on the persisted row. The body may also
  // include integrity field updates — they are merged in before validation
  // (one-shot save+submit from the edit form).
  if (targetStatus === "pending") {
    const merged: CreatorIntegrityInput = {
      ...(project as Record<string, unknown>),
      ...pickCreatorIntegrityColumns(body as CreatorIntegrityInput),
    };
    const integrityErr = validateCreatorIntegrity(merged);
    if (integrityErr) {
      return NextResponse.json(
        { error: integrityErr.message, field: integrityErr.field },
        { status: 422 }
      );
    }
  }

  const now = new Date().toISOString();
  const updates: Record<string, any> = {
    status: targetStatus,
    status_changed_at: now,
    updated_at: now,
    // Persist any integrity field updates supplied with the submit call.
    ...pickCreatorIntegrityColumns(body as CreatorIntegrityInput),
  };

  // Track submission metadata when entering pending
  if (targetStatus === "pending") {
    updates.submitted_at = now;
    updates.submission_count = (project.submission_count ?? 0) + 1;
    updates.submission_integrity_completed_at = now;
  }

  const { error: updateError } = await supabase
    .from("creator_projects")
    .update(updates)
    .eq("id", body.id)
    .eq("creator_email", email);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function PUT(req: NextRequest) {
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

  const { data: existing, error: fetchError } = await supabase
    .from("creator_projects")
    .select("id, status, creator_email")
    .eq("id", body.id)
    .eq("creator_email", email)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Authority-of-state: only drafts are editable by the creator. All other
  // states are owned by ShangoMaji's review/distribution lifecycle and the
  // creator must not be able to mutate field values once submitted.
  if (existing.status !== "draft") {
    const message =
      existing.status === "rejected"
        ? "Rejected works are locked and cannot be edited. Use Revise to create a new draft."
        : existing.status === "pending" || existing.status === "in_review"
        ? "This work has been submitted for review. Editing is locked."
        : existing.status === "approved"
        ? "This work has been approved. Editing is closed; the next step is license execution."
        : existing.status === "live"
        ? "This work is under active distribution. Editing is closed."
        : existing.status === "archived"
        ? "This work has been archived. Editing is closed."
        : "This work cannot be edited in its current state.";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  const allowedFields = [
    "title",
    "description",
    "project_type",
    "genres",
    "logline",
    "cover_image_url",
    "banner_url",
    "trailer_url",
    "sample_url",
    "stills_urls",
    "deliverables",
  ];

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  // Drafts may carry partial submission-integrity fields (creator works
  // through the form across sessions). Validation runs on the submit gate,
  // not the save gate.
  Object.assign(updates, pickCreatorIntegrityColumns(body as CreatorIntegrityInput));

  const { error: updateError } = await supabase
    .from("creator_projects")
    .update(updates)
    .eq("id", body.id)
    .eq("creator_email", email);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
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

  const { data: project, error: fetchError } = await supabase
    .from("creator_projects")
    .select("id, status, creator_email")
    .eq("id", body.id)
    .eq("creator_email", email)
    .single();

  if (fetchError || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Only draft and rejected may be deleted
  if (project.status !== "draft" && project.status !== "rejected") {
    const reason =
      project.status === "live"
        ? "Live projects cannot be deleted. Submit a removal request instead."
        : project.status === "pending" || project.status === "in_review"
        ? "Projects under review cannot be deleted."
        : project.status === "approved"
        ? "Approved projects cannot be deleted."
        : project.status === "archived"
        ? "Archived projects cannot be deleted."
        : "Only draft or rejected projects can be deleted.";

    return NextResponse.json({ error: reason }, { status: 422 });
  }

  const { error: deleteError } = await supabase
    .from("creator_projects")
    .delete()
    .eq("id", body.id)
    .eq("creator_email", email);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
