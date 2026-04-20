import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ONBOARDING_TERMS_VERSION } from "@/lib/onboarding-terms";

// Service-role client — onboarding acceptance bypasses RLS by design.
// The token itself is the authorization proof.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  let body: { token?: string; version?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const token = (body.token || "").trim();
  if (!token) {
    return NextResponse.json({ error: "Missing token." }, { status: 400 });
  }

  // Look up the onboarding row by token
  const { data: row, error: fetchError } = await supabase
    .from("creator_onboarding")
    .select("id, application_id, email, token_expires_at, accepted_at")
    .eq("token", token)
    .maybeSingle();

  if (fetchError) {
    console.error("Onboarding token lookup failed", fetchError);
    return NextResponse.json({ error: "Could not verify onboarding link." }, { status: 500 });
  }

  if (!row) {
    return NextResponse.json(
      { error: "This onboarding link is not valid." },
      { status: 404 }
    );
  }

  if (row.accepted_at) {
    // Idempotent: already accepted. Do not replay the password invite.
    return NextResponse.json(
      { error: "This onboarding link has already been used." },
      { status: 409 }
    );
  }

  if (new Date(row.token_expires_at).getTime() < Date.now()) {
    return NextResponse.json(
      { error: "This onboarding link has expired. Contact the ShangoMaji team for a new link." },
      { status: 410 }
    );
  }

  // Record acceptance. We stamp the version the creator actually agreed to.
  const now = new Date().toISOString();
  const acceptedVersion = body.version || ONBOARDING_TERMS_VERSION;

  const { error: acceptError } = await supabase
    .from("creator_onboarding")
    .update({
      accepted_at:      now,
      accepted_version: acceptedVersion,
      updated_at:       now,
    })
    .eq("id", row.id)
    .is("accepted_at", null); // guard against race — only update if still unaccepted

  if (acceptError) {
    console.error("Onboarding acceptance update failed", acceptError);
    return NextResponse.json(
      { error: "Could not record acceptance. Please try again." },
      { status: 500 }
    );
  }

  // Trigger Supabase password-setup email. This happens AFTER acceptance,
  // so the password-set step is guaranteed to follow a real acceptance event.
  // If this step fails we DO NOT roll back the acceptance — acceptance is the
  // important legal event. We surface the partial failure truthfully via 207.
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://shangomaji.com";

  const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
    row.email,
    { redirectTo: `${siteUrl}/creators/update-password` }
  );

  if (inviteError) {
    console.error("Password setup invite failed after acceptance", {
      email: row.email,
      error: inviteError.message,
    });
    return NextResponse.json(
      {
        success: true,
        acceptedAt: now,
        email: row.email,
        passwordSetupWarning:
          "Your acceptance was recorded, but we couldn't send the password setup email. " +
          "Please use Forgot Password on the login page, or contact the ShangoMaji team.",
      },
      { status: 207 }
    );
  }

  return NextResponse.json({
    success: true,
    acceptedAt: now,
    email: row.email,
  });
}
