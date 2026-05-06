import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendLicenseRequestEmail } from "@/lib/email";
import {
  validateCreatorIntegrity,
  isReviewPassing,
  pickAdminReviewColumns,
  type CreatorIntegrityInput,
  type AdminReviewInput,
} from "@/lib/submission-integrity";
import {
  planTransition,
  planRestore,
  type LifecycleRow,
  type ProjectStatus,
} from "@/lib/lifecycle";
import { checkAdminPassword } from "@/lib/admin-auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function checkAuth(req: NextRequest) {
  // Timing-safe comparison via shared helper. See src/lib/admin-auth.ts.
  return checkAdminPassword(req.headers.get("x-admin-password"));
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return unauthorized();

  const { data: projects, error } = await supabase
    .from("creator_projects")
    .select("*")
    .in("status", [
      "pending",
      "in_review",
      "approved",
      "rejected",
      "live",
      "archived",
      "removal_requested",
      "removed",
    ])
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Attach each project's title media fields (Phase 1 — Bunny binding).
  const liveIds = (projects ?? [])
    .filter((p: any) => p.status === "live" || p.status === "removal_requested")
    .map((p: any) => p.id);

  const titlesByProject = new Map<string, any>();
  if (liveIds.length) {
    const { data: titleRows } = await supabase
      .from("titles")
      .select("id, project_id, bunny_video_id, bunny_thumbnail_url, media_ready, status, media_processing_submitted_at, media_processing_reset_at, media_processing_reset_reason, media_processing_history")
      .in("project_id", liveIds)
      .neq("status", "removed");
    for (const t of titleRows ?? []) {
      titlesByProject.set((t as any).project_id, t);
    }
  }

  const allIds = (projects ?? []).map((p: any) => p.id);
  const licensesByProject = new Map<string, any>();
  if (allIds.length) {
    const { data: licenseRows } = await supabase
      .from("creator_licenses")
      .select("id, project_id, status, term_years, signer_legal_name, signer_email, signed_at, term_start, term_end, pdf_url, identity_certification_version")
      .in("project_id", allIds)
      .eq("status", "executed");
    for (const l of licenseRows ?? []) {
      licensesByProject.set(l.project_id, l);
    }
  }

  // Identity Enforcement v1
  const emails = Array.from(
    new Set(
      (projects ?? [])
        .map((p: any) => (p.creator_email ?? "").trim().toLowerCase())
        .filter((e: string) => e.length > 0)
    )
  );

  const identityByEmail = new Map<string, string>();
  if (emails.length) {
    const { data: profileRows } = await supabase
      .from("creator_profiles")
      .select("email, identity_status")
      .in("email", emails);
    for (const pr of profileRows ?? []) {
      const e = (pr as any).email?.trim().toLowerCase();
      if (e) identityByEmail.set(e, (pr as any).identity_status ?? null);
    }
  }

  const enriched = (projects ?? []).map((p: any) => {
    const t = titlesByProject.get(p.id);
    const l = licensesByProject.get(p.id);
    const idStatus =
      identityByEmail.get((p.creator_email ?? "").trim().toLowerCase()) ?? null;
    return {
      ...p,
      title_id:                       t?.id              ?? null,
      bunny_video_id:                 t?.bunny_video_id  ?? null,
      bunny_thumbnail_url:            t?.bunny_thumbnail_url ?? null,
      media_ready:                    t?.media_ready     ?? false,
      title_status:                   t?.status          ?? null,
      media_processing_submitted_at:  t?.media_processing_submitted_at  ?? null,
      media_processing_reset_at:      t?.media_processing_reset_at      ?? null,
      media_processing_reset_reason:  t?.media_processing_reset_reason  ?? null,
      media_processing_history:       t?.media_processing_history       ?? [],
      license:                        l ?? null,
      identity_status:                idStatus,
    };
  });

  return NextResponse.json({ projects: enriched });
}

// Side-effect: when entering "archived" or "removal_requested" from a state
// that has a public title row, flip the title out of "active" so it stops
// appearing in /api/public/titles.
async function cascadeTitleRemoval(projectId: string) {
  const { error } = await supabase
    .from("titles")
    .update({ status: "removed" })
    .eq("project_id", projectId)
    .neq("status", "removed");
  return error;
}

// Side-effect: when restoring back to "live" from removal_requested (denied),
// reactivate the title row if one exists. New title rows are only created on
// the approved → live transition, so this only flips an existing title back
// from "removed" to "active".
async function cascadeTitleRestore(projectId: string) {
  const { error } = await supabase
    .from("titles")
    .update({ status: "active" })
    .eq("project_id", projectId)
    .eq("status", "removed");
  return error;
}

export async function PATCH(req: NextRequest) {
  if (!checkAuth(req)) return unauthorized();

  let body: Record<string, any>;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { id, status, rejectionReason, confirmTitle, action } = body;

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  // ── Save review notes without transitioning status ────────────────────
  if (action === "saveReview") {
    const { data: cur, error: curErr } = await supabase
      .from("creator_projects")
      .select("status")
      .eq("id", id)
      .single();
    if (curErr || !cur) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    const blocked = new Set(["live", "archived", "rejected", "removal_requested", "removed"]);
    if (blocked.has(cur.status)) {
      return NextResponse.json(
        { error: `Review notes cannot be edited in "${cur.status}" state.` },
        { status: 422 }
      );
    }
    const nowSave = new Date().toISOString();
    const reviewer =
      typeof body.reviewer === "string" && body.reviewer.trim()
        ? body.reviewer.trim()
        : "admin";
    const updates = {
      ...pickAdminReviewColumns(body as AdminReviewInput),
      reviewed_at: nowSave,
      reviewed_by: reviewer,
      updated_at:  nowSave,
    };
    const { error: saveErr } = await supabase
      .from("creator_projects")
      .update(updates)
      .eq("id", id);
    if (saveErr) {
      return NextResponse.json({ error: saveErr.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, reviewSaved: true });
  }

  // STEP 1 — Fetch current row (used by every action below).
  const { data: existingProject, error: fetchError } = await supabase
    .from("creator_projects")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !existingProject) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const reviewer =
    typeof body.reviewer === "string" && body.reviewer.trim()
      ? body.reviewer.trim()
      : "admin";

  // ── Lifecycle Control: archive / restore / reopen / resolveRemoval ────
  if (action === "archive") {
    const allowed = new Set(["pending", "in_review", "approved", "rejected", "live"]);
    if (!allowed.has(existingProject.status)) {
      return NextResponse.json(
        { error: `Archive is not valid from "${existingProject.status}".` },
        { status: 422 }
      );
    }
    // Live archives keep the institutional typed-title confirmation gate.
    if (existingProject.status === "live") {
      const expected = (existingProject.title ?? "").trim();
      const provided = typeof confirmTitle === "string" ? confirmTitle.trim() : "";
      if (!expected || provided !== expected) {
        return NextResponse.json(
          {
            error:
              "Archive requires the exact project title as confirmation. " +
              "This action removes the work from the public catalog and must be deliberate.",
          },
          { status: 422 }
        );
      }
    }

    const planned = planTransition({
      row: existingProject as LifecycleRow,
      to: "archived",
      by: "admin",
      reason: typeof body.reason === "string" ? body.reason : null,
    });
    if (!planned.ok) {
      return NextResponse.json({ error: planned.error }, { status: planned.status });
    }

    const { error: updErr } = await supabase
      .from("creator_projects")
      .update(planned.updates)
      .eq("id", id);
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    // Title cascade — only relevant when archiving from a state that had a
    // public title row (live or removal_requested previously archived from
    // live). Safe to run unconditionally; it filters by status="active".
    const cascadeErr = await cascadeTitleRemoval(id);
    if (cascadeErr) {
      return NextResponse.json(
        {
          success: true,
          distributionWarning:
            `Project archived, but the catalog title row could not be flipped out of "active". ` +
            `Error: ${cascadeErr.message}.`,
        },
        { status: 207 }
      );
    }
    return NextResponse.json({ success: true });
  }

  if (action === "restore") {
    const planned = planRestore({
      row: existingProject as LifecycleRow,
      by: "admin",
      reason: typeof body.reason === "string" ? body.reason : null,
    });
    if (!planned.ok) {
      return NextResponse.json({ error: planned.error }, { status: planned.status });
    }

    const { error: updErr } = await supabase
      .from("creator_projects")
      .update(planned.updates)
      .eq("id", id);
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    // If the restore lands back on "live", bring the public title back online
    // (only flips existing "removed" rows; never creates new ones).
    if (planned.to === "live") {
      const cascadeErr = await cascadeTitleRestore(id);
      if (cascadeErr) {
        return NextResponse.json(
          {
            success: true,
            restoredTo: planned.to,
            distributionWarning:
              `Project restored to "live", but the catalog title row could not be reactivated. ` +
              `Error: ${cascadeErr.message}.`,
          },
          { status: 207 }
        );
      }
    }
    return NextResponse.json({ success: true, restoredTo: planned.to });
  }

  if (action === "reopen") {
    if (existingProject.status !== "rejected") {
      return NextResponse.json(
        { error: `Reopen is only valid from "rejected".` },
        { status: 422 }
      );
    }
    const planned = planTransition({
      row: existingProject as LifecycleRow,
      to: "in_review",
      by: "admin",
      reason: typeof body.reason === "string" ? body.reason : null,
    });
    if (!planned.ok) {
      return NextResponse.json({ error: planned.error }, { status: planned.status });
    }
    const { error: updErr } = await supabase
      .from("creator_projects")
      .update(planned.updates)
      .eq("id", id);
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  if (action === "resolveRemoval") {
    if (existingProject.status !== "removal_requested") {
      return NextResponse.json(
        { error: `Resolve is only valid from "removal_requested".` },
        { status: 422 }
      );
    }
    const decision = typeof body.decision === "string" ? body.decision : "";
    if (decision !== "approve" && decision !== "deny") {
      return NextResponse.json(
        { error: 'decision must be "approve" or "deny".' },
        { status: 400 }
      );
    }
    // Removal outcome is the terminal "removed" state, not "archived".
    // Archive is a separate, reversible admin action and is not a removal
    // resolution under Lifecycle Control v2 (migration 018).
    const target: ProjectStatus = decision === "approve" ? "removed" : "live";
    const reason = typeof body.reason === "string" && body.reason.trim()
      ? body.reason.trim()
      : null;

    const planned = planTransition({
      row: existingProject as LifecycleRow,
      to: target,
      by: "admin",
      reason,
    });
    if (!planned.ok) {
      return NextResponse.json({ error: planned.error }, { status: planned.status });
    }

    const now = new Date().toISOString();
    planned.updates.removal_resolved_at       = now;
    planned.updates.removal_resolution        = decision === "approve" ? "approved" : "denied";
    planned.updates.removal_resolution_reason = reason;
    // On denial the work returns to "live" — clear the legacy boolean so the
    // creator can request again later if circumstances change.
    if (decision === "deny") {
      planned.updates.removal_requested = false;
    }

    const { error: updErr } = await supabase
      .from("creator_projects")
      .update(planned.updates)
      .eq("id", id);
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    // Side-effects: approved removal → terminate distribution by flipping the
    // title row to "removed"; denied removal → return to active.
    if (decision === "approve") {
      const cascadeErr = await cascadeTitleRemoval(id);
      if (cascadeErr) {
        return NextResponse.json(
          {
            success: true,
            distributionWarning:
              `Removal approved (work removed), but the catalog title row could not be flipped out of "active". ` +
              `Error: ${cascadeErr.message}.`,
          },
          { status: 207 }
        );
      }
    } else {
      const cascadeErr = await cascadeTitleRestore(id);
      if (cascadeErr) {
        return NextResponse.json(
          {
            success: true,
            distributionWarning:
              `Removal denied (live), but the catalog title row could not be reactivated. ` +
              `Error: ${cascadeErr.message}.`,
          },
          { status: 207 }
        );
      }
    }

    return NextResponse.json({ success: true, decision });
  }

  // ── Status-based transitions (pre-existing approve/reject/activate) ───
  if (!status) {
    return NextResponse.json({ error: "Status is required" }, { status: 400 });
  }

  // Rejection requires a reason
  if (status === "rejected" && !rejectionReason?.trim()) {
    return NextResponse.json(
      { error: "A rejection reason is required." },
      { status: 400 }
    );
  }

  // Archive via status= is intentionally rejected; callers must use action=archive
  if (status === "archived") {
    return NextResponse.json(
      { error: "Use action=archive to archive a work." },
      { status: 400 }
    );
  }

  const previousStatus = existingProject.status;

  // Plan the transition through the shared helper. This validates the source
  // state and produces the state_history entry.
  const planned = planTransition({
    row: existingProject as LifecycleRow,
    to: status as ProjectStatus,
    by: "admin",
    reason:
      status === "rejected"
        ? rejectionReason.trim()
        : typeof body.reason === "string"
        ? body.reason
        : null,
  });
  if (!planned.ok) {
    return NextResponse.json({ error: planned.error }, { status: planned.status });
  }

  // ── Approval gate (Submission Integrity v1) ──────────────────────────
  if (status === "approved") {
    const integrityErr = validateCreatorIntegrity(
      existingProject as unknown as CreatorIntegrityInput
    );
    if (integrityErr) {
      return NextResponse.json(
        {
          error:
            "Approval requires completed submission integrity and review record. " +
            `Creator integrity: ${integrityErr.message}`,
          field: integrityErr.field,
          phase: "creator_integrity",
        },
        { status: 422 }
      );
    }

    const mergedReview: AdminReviewInput = {
      ...(existingProject as unknown as AdminReviewInput),
      ...pickAdminReviewColumns(body as AdminReviewInput),
    };
    const reviewErr = isReviewPassing(mergedReview);
    if (reviewErr) {
      return NextResponse.json(
        {
          error:
            "Approval requires completed submission integrity and review record. " +
            reviewErr.message,
          field: reviewErr.field,
          phase: "admin_review",
        },
        { status: 422 }
      );
    }
  }

  // Distribution activation requires an executed Standard Distribution License
  if (previousStatus === "approved" && status === "live") {
    const { data: license, error: licErr } = await supabase
      .from("creator_licenses")
      .select("id")
      .eq("project_id", id)
      .eq("status", "executed")
      .maybeSingle();

    if (licErr) {
      return NextResponse.json({ error: licErr.message }, { status: 500 });
    }

    if (!license) {
      return NextResponse.json(
        { error: "Distribution activation requires an executed license." },
        { status: 422 }
      );
    }
  }

  // Build the final updates payload from the plan + status-specific fields.
  const now = (planned.updates.updated_at as string) ?? new Date().toISOString();
  const updates: Record<string, any> = { ...planned.updates };

  if (status === "rejected") {
    updates.rejection_reason = rejectionReason.trim();
  }

  Object.assign(updates, pickAdminReviewColumns(body as AdminReviewInput));
  if (status === "approved") {
    updates.reviewed_at = now;
    updates.reviewed_by = reviewer;
  }

  const { error: updateError } = await supabase
    .from("creator_projects")
    .update(updates)
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // STEP 4b — On transition into `approved`, drive the creator to license
  let licenseEmailWarning: string | null = null;
  if (status === "approved" && previousStatus !== "approved") {
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    const host  = req.headers.get("host");
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ?? (host ? `${proto}://${host}` : "");
    const licenseUrl = `${origin}/license/${id}`;

    const result = await sendLicenseRequestEmail({
      to:           existingProject.creator_email,
      projectTitle: existingProject.title ?? "your project",
      licenseUrl,
    });

    if (!result.ok) {
      licenseEmailWarning =
        `Approval saved, but the license-required email could not be sent. ` +
        `Reason: ${result.error}. ` +
        `Hand the creator the URL directly: ${licenseUrl}`;
    }
  }

  // STEP 4 — approved → live: create title record + stamp license term.
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

    const { data: licenseRow, error: licenseFetchErr } = await supabase
      .from("creator_licenses")
      .select("id, term_years, term_start")
      .eq("project_id", id)
      .eq("status", "executed")
      .maybeSingle();

    if (!licenseFetchErr && licenseRow && !licenseRow.term_start) {
      const start = new Date(now);
      const end   = new Date(start);
      end.setUTCFullYear(end.getUTCFullYear() + Number(licenseRow.term_years));

      const { error: termErr } = await supabase
        .from("creator_licenses")
        .update({
          term_start: start.toISOString(),
          term_end:   end.toISOString(),
          updated_at: now,
        })
        .eq("id", licenseRow.id);

      if (termErr) {
        console.error("License term stamping failed after activation", { id, error: termErr.message });
        return NextResponse.json(
          {
            success: true,
            distributionWarning:
              `Project is now live, but the license term window could not be recorded. ` +
              `Error: ${termErr.message}. The license is still executed; an admin should retry the term stamp.`,
          },
          { status: 207 }
        );
      }
    }
  }

  if (licenseEmailWarning) {
    return NextResponse.json(
      { success: true, licenseEmailWarning },
      { status: 207 }
    );
  }

  return NextResponse.json({ success: true });
}
