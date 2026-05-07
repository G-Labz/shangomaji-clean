import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import {
  ensureMemberProfile,
  normalizeEmail,
} from "@/lib/member-auth";
import { createClient as createServiceClient } from "@supabase/supabase-js";

// Phase 2 — Member profile API (private).
//
//   GET  → returns the calling member's profile row.
//   POST → creates the row if it doesn't exist (called immediately after
//          a successful supabase.auth.signUp so the audience side has a
//          membership marker the moment the auth.users row exists).
//   PUT  → updates the calling member's display_name / avatar_url.
//
// All three require an authenticated Supabase session. Service role is used
// for the underlying read/write to keep the path immune to RLS configuration.

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate" };
const PROFILE_FIELDS = "email, display_name, avatar_url, created_at, updated_at";

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401, headers: NO_STORE }
    );
  }

  const email = normalizeEmail(user.email);
  if (!email) {
    return NextResponse.json(
      { error: "Invalid session" },
      { status: 401, headers: NO_STORE }
    );
  }

  const admin = svc();
  const { data, error } = await admin
    .from("member_profiles")
    .select(PROFILE_FIELDS)
    .ilike("email", email)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: NO_STORE }
    );
  }

  return NextResponse.json({ profile: data ?? null }, { headers: NO_STORE });
}

export async function POST(req: NextRequest) {
  // Create the membership row for the currently authenticated user. Called
  // by the /signup page immediately after supabase.auth.signUp succeeds.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401, headers: NO_STORE }
    );
  }

  let body: Record<string, any> = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine for create
  }

  const displayName =
    typeof body.display_name === "string" ? body.display_name.trim().slice(0, 80) : "";

  const result = await ensureMemberProfile({
    email:       user.email,
    displayName: displayName || null,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: 500, headers: NO_STORE }
    );
  }

  return NextResponse.json({ success: true, created: result.created }, { headers: NO_STORE });
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401, headers: NO_STORE }
    );
  }

  const email = normalizeEmail(user.email);
  if (!email) {
    return NextResponse.json(
      { error: "Invalid session" },
      { status: 401, headers: NO_STORE }
    );
  }

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400, headers: NO_STORE }
    );
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.display_name !== undefined) {
    const dn = typeof body.display_name === "string" ? body.display_name.trim().slice(0, 80) : "";
    updates.display_name = dn || null;
  }
  if (body.avatar_url !== undefined) {
    const av = typeof body.avatar_url === "string" ? body.avatar_url.trim().slice(0, 500) : "";
    updates.avatar_url = av || null;
  }

  const admin = svc();
  const { error } = await admin
    .from("member_profiles")
    .update(updates)
    .ilike("email", email);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: NO_STORE }
    );
  }

  return NextResponse.json({ success: true }, { headers: NO_STORE });
}
