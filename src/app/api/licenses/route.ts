import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import {
  SDL_ACKS,
  isValidTermYears,
  isValidLegalName,
  LEGAL_NAME_ERROR,
} from "@/lib/standard-distribution-license";

// SDL v1 license execution endpoint.
//
// POST /api/licenses
//   Authenticated creator executes a Standard Distribution License v1
//   for one of their projects. Server validates ownership, project state,
//   acknowledgments, term, and typed-signature equality before insert.
//
// GET  /api/licenses?projectId=<uuid>
//   Returns the current executed license for the requesting creator's
//   project (or null), so the creator-facing page can render the
//   confirmation state.

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Acceptable project states at the moment of license execution.
// Per spec: only `approved` is required for fresh executions.
// `live` is allowed solely so an admin can backfill an existing pre-license
// live test row by walking the creator through execution after the fact.
const ALLOWED_PROJECT_STATES = new Set(["approved", "live"]);

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const projectId = new URL(req.url).searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  const email = user.email.trim().toLowerCase();
  const admin = svc();

  // Verify project ownership before disclosing license state.
  const { data: project, error: projErr } = await admin
    .from("creator_projects")
    .select("id, title, status, creator_email")
    .eq("id", projectId)
    .single();

  if (projErr || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if ((project.creator_email ?? "").trim().toLowerCase() !== email) {
    return NextResponse.json({ error: "Not authorized for this project" }, { status: 403 });
  }

  const { data: license, error: licErr } = await admin
    .from("creator_licenses")
    .select("*")
    .eq("project_id", projectId)
    .eq("status", "executed")
    .maybeSingle();

  if (licErr) {
    return NextResponse.json({ error: licErr.message }, { status: 500 });
  }

  // Suggested signer name for prefill on the license form. Prefer the
  // structured first+last (migration 014); fall back to legacy `name`. The
  // creator can still edit before signing — this is a UX nudge, not a bypass
  // of the license-form validators (full legal name + signature match +
  // certification checkbox are all still enforced).
  let suggestedSignerName: string | null = null;
  if (!license) {
    const { data: appRows } = await admin
      .from("creator_applications")
      .select("first_name, last_name, name, status, submitted_at")
      .ilike("email", email)
      .order("submitted_at", { ascending: false });
    const accepted = (appRows ?? []).find((a: any) => a.status === "accepted");
    const chosen   = accepted ?? (appRows ?? [])[0];
    if (chosen) {
      const first = (chosen.first_name ?? "").trim();
      const last  = (chosen.last_name  ?? "").trim();
      if (first && last) {
        suggestedSignerName = `${first} ${last}`;
      } else {
        const legacy = (chosen.name ?? "").trim();
        suggestedSignerName = legacy || null;
      }
    }
  }

  return NextResponse.json({
    project: {
      id:     project.id,
      title:  project.title,
      status: project.status,
    },
    license: license ?? null,
    suggestedSignerName,
  });
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

  const {
    projectId,
    termYears,
    signerLegalName,
    typedSignature,
    legalNameCertificationAck,
  } = body;

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  if (!isValidTermYears(termYears)) {
    return NextResponse.json(
      { error: "termYears must be one of 1, 2, 3, or 5." },
      { status: 422 }
    );
  }

  const legalName = typeof signerLegalName === "string" ? signerLegalName.trim() : "";
  const typed     = typeof typedSignature   === "string" ? typedSignature.trim()   : "";

  if (!isValidLegalName(legalName)) {
    return NextResponse.json(
      { error: LEGAL_NAME_ERROR },
      { status: 422 }
    );
  }

  if (typed !== legalName) {
    return NextResponse.json(
      { error: "Typed signature must match the signer legal name exactly." },
      { status: 422 }
    );
  }

  // Standalone legal-name truth attestation (separate from the seven SDL acks).
  if (legalNameCertificationAck !== true) {
    return NextResponse.json(
      {
        error:
          "You must certify that the legal name and typed signature are accurate and belong to you.",
      },
      { status: 422 }
    );
  }

  // All seven ack booleans must be present and exactly true.
  const ackValues: Record<string, boolean> = {};
  for (const ack of SDL_ACKS) {
    const v = body[ack.key];
    if (v !== true) {
      return NextResponse.json(
        { error: `Acknowledgment "${ack.key}" must be accepted.` },
        { status: 422 }
      );
    }
    ackValues[ack.key] = true;
  }

  const admin = svc();

  // Verify project + ownership + state.
  const { data: project, error: projErr } = await admin
    .from("creator_projects")
    .select("id, title, status, creator_email")
    .eq("id", projectId)
    .single();

  if (projErr || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if ((project.creator_email ?? "").trim().toLowerCase() !== email) {
    return NextResponse.json({ error: "Not authorized for this project" }, { status: 403 });
  }

  if (!ALLOWED_PROJECT_STATES.has(project.status)) {
    return NextResponse.json(
      {
        error:
          `License cannot be executed while the project is "${project.status}". ` +
          `Project must be approved (or already live for backfill).`,
      },
      { status: 422 }
    );
  }

  // Block duplicate executed license per project.
  const { data: existing, error: existErr } = await admin
    .from("creator_licenses")
    .select("id")
    .eq("project_id", projectId)
    .eq("status", "executed")
    .maybeSingle();

  if (existErr) {
    return NextResponse.json({ error: existErr.message }, { status: 500 });
  }

  if (existing) {
    return NextResponse.json(
      { error: "An executed license already exists for this project." },
      { status: 409 }
    );
  }

  // Capture request metadata for the signed record.
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  const signed_ip = (fwd.split(",")[0] ?? "").trim() || req.headers.get("x-real-ip") || null;
  const signed_user_agent = req.headers.get("user-agent");

  const insertRow = {
    project_id:        projectId,
    term_years:        termYears,
    signer_legal_name: legalName,
    signer_email:      email,
    signed_ip,
    signed_user_agent,
    ip_ownership_ack:             true,
    distribution_grant_ack:       true,
    no_unilateral_removal_ack:    true,
    catalog_control_ack:          true,
    rofn_ack:                     true,
    downstream_ack:               true,
    authority_ack:                true,
    legal_name_certification_ack: true,
    // Identity Enforcement v1: tag this row with the version of the
    // legal-name certification copy that was on screen at signing time.
    // The receipt renderer uses this to render the historically accurate
    // wording for each license (old rows render the previous, weaker copy;
    // 'v2' rows render the stronger government-ID-true wording).
    identity_certification_version: "v2",
    status: "executed" as const,
  };

  const { data: inserted, error: insErr } = await admin
    .from("creator_licenses")
    .insert(insertRow)
    .select("*")
    .single();

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  // Receipt: the durable view is /api/licenses/{id}/receipt (HTML). PDF
  // generation requires headless rendering and is intentionally not added
  // in this pass — pdf_url remains null. The HTML receipt is a permanent,
  // signer-only resource and contains the full executed terms.
  return NextResponse.json({
    license: inserted,
    receiptUrl: `/api/licenses/${inserted.id}/receipt`,
    pdfUrl: null,
    pdfFutureWork: true,
  });
}
