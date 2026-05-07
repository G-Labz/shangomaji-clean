import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkAdminPassword } from "@/lib/admin-auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function checkAuth(req: NextRequest) {
  return checkAdminPassword(req.headers.get("x-admin-password"));
}

// Admin Creator-Profile control surface (Phase 1).
//
// Two operations:
//
//   GET   ?email=...         — fetch the full profile row including
//                               admin-only audit columns. Used by the admin
//                               Works expanded panel to surface profile
//                               status (published / quarantined / force-
//                               unpublished).
//
//   PATCH { email, action,    — flip the force_unpublished flag. action is
//           reason }            "force_unpublish" or "restore".
//
// Force-unpublish is the trust/safety override. It does NOT delete data; it
// hides the public route and prevents the creator from re-publishing from the
// workspace until restored. `restore` clears the override but does NOT
// auto-republish; the creator chooses to publish again.
const ADMIN_FIELDS =
  "email, handle, display_name, bio_short, avatar_url, banner_url, " +
  "is_published_publicly, force_unpublished, force_unpublished_at, force_unpublished_by, force_unpublished_reason, " +
  "placeholder_quarantined, placeholder_quarantine_reason, placeholder_quarantined_at, " +
  "external_links, published_at, identity_status, " +
  "application_id, hydrated_from_application_at, updated_at";

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return unauthorized();

  const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase() ?? "";
  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("creator_profiles")
    .select(ADMIN_FIELDS)
    .ilike("email", email)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ profile: data ?? null });
}

export async function PATCH(req: NextRequest) {
  if (!checkAuth(req)) return unauthorized();

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email   = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const action  = typeof body.action === "string" ? body.action : "";
  const reason  = typeof body.reason === "string" ? body.reason.trim() : "";
  const reviewer =
    typeof body.reviewer === "string" && body.reviewer.trim() ? body.reviewer.trim() : "admin";

  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }
  if (action !== "force_unpublish" && action !== "restore") {
    return NextResponse.json(
      { error: 'action must be "force_unpublish" or "restore".' },
      { status: 400 }
    );
  }
  if (action === "force_unpublish" && !reason) {
    return NextResponse.json(
      { error: "A reason is required to force-unpublish a creator profile." },
      { status: 422 }
    );
  }

  const { data: existing } = await supabase
    .from("creator_profiles")
    .select("email, force_unpublished, placeholder_quarantined")
    .ilike("email", email)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { updated_at: now };

  if (action === "force_unpublish") {
    updates.force_unpublished        = true;
    updates.force_unpublished_at     = now;
    updates.force_unpublished_by     = reviewer;
    updates.force_unpublished_reason = reason;
    // Also flip the public flag off so the public route stops serving the
    // page immediately. Restoring does not auto-republish — the creator
    // chooses to publish again.
    updates.is_published_publicly    = false;
  } else {
    updates.force_unpublished        = false;
    updates.force_unpublished_at     = null;
    updates.force_unpublished_by     = null;
    updates.force_unpublished_reason = null;
  }

  const { error: updErr } = await supabase
    .from("creator_profiles")
    .update(updates)
    .ilike("email", email);

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, action });
}
