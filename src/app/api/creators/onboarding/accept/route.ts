import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ONBOARDING_TERMS_VERSION } from "@/lib/onboarding-terms";
import { sendPasswordSetupEmail } from "@/lib/email";
import { hydrateCreatorProfile } from "@/lib/hydrate-creator-profile";

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

  // Hydrate creator_profiles from the application immediately after the
  // legal acceptance event. Best-effort — failure here does NOT roll back
  // acceptance, since acceptance is the legal event and the profile fallback
  // path will retry on next workspace load.
  try {
    const hydration = await hydrateCreatorProfile(supabase, row.email);
    if (!hydration.ok) {
      console.error("Profile hydration failed at onboarding-accept", {
        email: row.email,
        error: hydration.error,
      });
    }
  } catch (err: any) {
    console.error("Profile hydration threw at onboarding-accept", {
      email: row.email,
      error: err?.message,
    });
  }

  // Trigger password setup email. This happens AFTER acceptance, so the
  // password-set step is guaranteed to follow a real acceptance event. If this
  // step fails we DO NOT roll back acceptance — acceptance is the legal event.
  // Partial failure is surfaced truthfully via 207.
  //
  // We deliberately do NOT use `supabase.auth.admin.inviteUserByEmail` because:
  //   1. It sends from Supabase's generic email service (breaks brand trust).
  //   2. Its link carries a PKCE `?code=` that requires a client-side verifier
  //      in the same browser context — which fails when the creator opens the
  //      email in a different browser or an in-app webview.
  //
  // Instead we use `admin.generateLink` (server-side hashed token) and deliver
  // the link ourselves via Resend. The resulting URL uses `token_hash` + `type`,
  // which is verified via `verifyOtp` with no local-storage dependency.
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://shangomaji.com";

  const setupWarning = (reason: string) =>
    NextResponse.json(
      {
        success: true,
        acceptedAt: now,
        email: row.email,
        passwordSetupWarning:
          "Your acceptance was recorded, but we couldn't send the password setup email. " +
          "Please use Forgot Password on the login page, or contact the ShangoMaji team.",
        debugReason: reason,
      },
      { status: 207 }
    );

  // Generate a hashed-token invite link. If the user already exists (e.g. a
  // prior incomplete run), fall back to a recovery link so the creator can
  // still set/update their password without creating a duplicate account.
  let hashedToken: string | null = null;
  let linkType: "invite" | "recovery" = "invite";

  const inviteGen = await supabase.auth.admin.generateLink({
    type: "invite",
    email: row.email,
    options: { redirectTo: `${siteUrl}/creators/update-password` },
  });

  if (!inviteGen.error && inviteGen.data?.properties?.hashed_token) {
    hashedToken = inviteGen.data.properties.hashed_token;
    linkType = "invite";
  } else {
    const msg = inviteGen.error?.message || "";
    const userExists = /already.*registered|already.*exists|duplicate/i.test(msg);

    if (userExists) {
      const recoveryGen = await supabase.auth.admin.generateLink({
        type: "recovery",
        email: row.email,
        options: { redirectTo: `${siteUrl}/creators/update-password` },
      });
      if (!recoveryGen.error && recoveryGen.data?.properties?.hashed_token) {
        hashedToken = recoveryGen.data.properties.hashed_token;
        linkType = "recovery";
      } else {
        console.error("Recovery link generation failed after existing-user fallback", {
          email: row.email,
          error: recoveryGen.error?.message,
        });
      }
    } else {
      console.error("Invite link generation failed", {
        email: row.email,
        error: msg,
      });
    }
  }

  if (!hashedToken) {
    return setupWarning("link_generation_failed");
  }

  const setupUrl =
    `${siteUrl}/creators/update-password` +
    `?token_hash=${encodeURIComponent(hashedToken)}` +
    `&type=${linkType}`;

  const mail = await sendPasswordSetupEmail({
    to:       row.email,
    setupUrl,
    kind:     linkType,
  });

  if (!mail.ok) {
    console.error("Password setup email send failed", {
      email: row.email,
      error: mail.error,
    });
    return setupWarning("email_send_failed");
  }

  return NextResponse.json({
    success: true,
    acceptedAt: now,
    email: row.email,
  });
}
