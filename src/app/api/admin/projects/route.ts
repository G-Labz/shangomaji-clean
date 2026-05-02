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

  const { data: projects, error } = await supabase
    .from("creator_projects")
    .select("*")
    .in("status", ["pending", "in_review", "approved", "rejected", "live", "archived"])
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Attach each project's title media fields (Phase 1 — Bunny binding).
  // Only "live" projects have a title row, but a separate query is cheaper
  // than a per-row join and avoids PostgREST FK resolution.
  const liveIds = (projects ?? [])
    .filter((p: any) => p.status === "live")
    .map((p: any) => p.id);

  const titlesByProject = new Map<string, any>();
  if (liveIds.length) {
    const { data: titleRows } = await supabase
      .from("titles")
      .select("id, project_id, bunny_video_id, bunny_thumbnail_url, media_ready, status")
      .in("project_id", liveIds)
      .neq("status", "removed");
    for (const t of titleRows ?? []) {
      titlesByProject.set(t.project_id, t);
    }
  }

  // Attach each project's executed license, if any. Used by admin UI to:
  //   1. show a License panel ("Executed" / "Not signed")
  //   2. surface activation gating ("approved without license → blocked")
  //   3. display term start/end after activation.
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

  // Identity Enforcement v1: attach the creator profile's identity_status by
  // matching creator_email. Admin-only context — the column is never returned
  // from public-facing routes. If migration 015 has not been run on this DB,
  // the select column simply returns nothing and identity_status falls back
  // to null in the UI (we render that as "Self-certified" by default since
  // that is the migration's NOT NULL DEFAULT once run).
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
      title_id:                t?.id              ?? null,
      bunny_video_id:          t?.bunny_video_id  ?? null,
      bunny_thumbnail_url:     t?.bunny_thumbnail_url ?? null,
      media_ready:             t?.media_ready     ?? false,
      title_status:            t?.status          ?? null,
      license:                 l ?? null,
      identity_status:         idStatus,
    };
  });

  return NextResponse.json({ projects: enriched });
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
  // Allowed any time before terminal states; the goal is to let an admin
  // record the review record incrementally during evaluation. Approval is
  // a separate call (status: "approved") that re-validates the persisted
  // record server-side.
  if (action === "saveReview") {
    const { data: cur, error: curErr } = await supabase
      .from("creator_projects")
      .select("status")
      .eq("id", id)
      .single();
    if (curErr || !cur) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    const blocked = new Set(["live", "archived", "rejected"]);
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

  // STEP 1 — Fetch current project before making any changes. Read the full
  // row so the approval gate has access to integrity + review columns
  // without a runtime-built column list (the Supabase typed select parser
  // doesn't accept dynamic projections).
  const { data: existingProject, error: fetchError } = await supabase
    .from("creator_projects")
    .select("*")
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

  // ── Approval gate (Submission Integrity v1) ──────────────────────────
  // pending|in_review → approved is the institutional firewall. Both the
  // creator's submission integrity record AND a passing admin review
  // record must be on file before approval is granted. This validates
  // the persisted columns plus any review fields in the body (which are
  // also persisted as part of this call so the approval and the review
  // record commit together).
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

  // Distribution activation requires an executed Standard Distribution
  // License v1 for this project. Server-side check; the admin UI also
  // disables the button, but curl/scripts must hit the same gate.
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

  // Archive is a deliberate catalog action: must come from live AND require
  // a typed-title confirmation that matches the project's current title.
  // The UI also enforces this, but we re-check server-side so curl/scripts
  // can't bypass it.
  if (status === "archived") {
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

  // STEP 3 — Run the update
  const now = new Date().toISOString();
  const updates: Record<string, any> = {
    status,
    updated_at: now,
  };

  if (status === "rejected") {
    updates.rejection_reason = rejectionReason.trim();
  }

  // Persist any admin review fields supplied with the call. On approval we
  // also stamp reviewed_at / reviewed_by so the review record is durable.
  Object.assign(updates, pickAdminReviewColumns(body as AdminReviewInput));
  if (status === "approved") {
    updates.reviewed_at = now;
    updates.reviewed_by =
      typeof body.reviewer === "string" && body.reviewer.trim()
        ? body.reviewer.trim()
        : "admin";
  }

  const { error: updateError } = await supabase
    .from("creator_projects")
    .update(updates)
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // STEP 4a — On archive, also gate the public catalog by flipping the
  // matching title row(s) out of "active". The public titles API filters on
  // titles.status === "active", so this ensures archived works disappear
  // from /api/public/titles immediately.
  // (Audit logging: not yet built — future migration. See README/migrations
  // for tracking. Do not add an ad-hoc audit table in this pass.)
  if (status === "archived") {
    const { error: titleArchiveError } = await supabase
      .from("titles")
      .update({ status: "removed" })
      .eq("project_id", id)
      .neq("status", "removed");

    if (titleArchiveError) {
      console.error("Title archive cascade failed", { id, error: titleArchiveError.message });
      return NextResponse.json(
        {
          success: true,
          distributionWarning:
            `Project archived, but the catalog title row could not be flipped out of "active". ` +
            `Error: ${titleArchiveError.message}. The title may still be visible publicly until this is resolved.`,
        },
        { status: 207 }
      );
    }
  }

  // STEP 4b — On transition into `approved`, drive the creator to license
  // execution. The workspace UI also surfaces the CTA, but a direct email
  // makes the next step explicit and out-of-band durable.
  // Failure is reported as a warning (207); approval itself is not rolled
  // back because email delivery failed. We do NOT pretend the email went
  // out — admin is told truthfully when delivery fails.
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

    // STEP 5 — Stamp the executed license with term_start / term_end.
    // term_start is set only if currently null (do not overwrite existing).
    // term_end = term_start + term_years, calculated in JS to keep the
    // migration free of date arithmetic dependencies.
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
