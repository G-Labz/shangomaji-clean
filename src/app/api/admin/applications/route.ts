import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";
import { sendOnboardingEmail } from "@/lib/email";

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

// Onboarding token TTL — creators have 14 days to accept terms
const ONBOARDING_TOKEN_TTL_DAYS = 14;

function mintOnboardingToken(): string {
  return randomBytes(32).toString("base64url");
}

function onboardingUrlFor(token: string): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://shangomaji.com";
  return `${base}/creators/onboarding?token=${encodeURIComponent(token)}`;
}

// GET — fetch all applications
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return unauthorized();

  const { data, error } = await supabase
    .from("creator_applications")
    .select("*")
    .order("submitted_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ applications: data });
}

// PATCH — update status + trigger REAL onboarding when accepting
export async function PATCH(req: NextRequest) {
  if (!checkAuth(req)) return unauthorized();

  const { id: submissionId, status } = await req.json();

  if (!submissionId || !["pending", "accepted", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Fetch the full application record — we need email + name for the onboarding email
  const { data: application, error: fetchError } = await supabase
    .from("creator_applications")
    .select("id, email, name, status")
    .eq("id", submissionId)
    .single();

  if (fetchError || !application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  // Update application status in DB
  const approved_creator = status === "accepted";

  const { data: updated, error: updateError } = await supabase
    .from("creator_applications")
    .update({ status, approved_creator })
    .eq("id", submissionId)
    .select("id, status, approved_creator, email, name")
    .single();

  if (updateError) {
    console.error("Admin status update failed", { submissionId, status, updateError });
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // ── Real onboarding trigger ──────────────────────────────────────────────
  // Fires only on transition INTO accepted. Does three things:
  //   1. Mint a cryptographically random onboarding token
  //   2. Upsert a creator_onboarding row with the token + 14-day expiry
  //   3. Send a real onboarding email via Resend
  //
  // The creator is NOT considered onboarded yet — they must click the link,
  // read the platform terms, and explicitly accept. The gate in
  // checkCreatorApproval enforces this.
  if (status === "accepted" && application.status !== "accepted") {
    const token = mintOnboardingToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ONBOARDING_TOKEN_TTL_DAYS * 24 * 3600 * 1000);

    // Upsert onboarding record (one row per application)
    const { error: onboardingError } = await supabase
      .from("creator_onboarding")
      .upsert(
        {
          application_id:   application.id,
          email:            application.email,
          token,
          token_expires_at: expiresAt.toISOString(),
          // Clear any stale acceptance/send_error if this is a re-accept
          sent_at:     null,
          send_error:  null,
          accepted_at: null,
          accepted_version: null,
          updated_at: now.toISOString(),
        },
        { onConflict: "application_id" }
      );

    if (onboardingError) {
      console.error("Onboarding record upsert failed", {
        applicationId: application.id,
        error: onboardingError.message,
      });
      // DB status is committed. Surface this truthfully to admin.
      return NextResponse.json(
        {
          success: true,
          application: updated,
          onboardingWarning:
            `Application marked accepted, but the onboarding record could not be created: ${onboardingError.message}. ` +
            `The creator will NOT receive an onboarding email. Fix the database issue and retry this approval.`,
        },
        { status: 207 }
      );
    }

    // Attempt real email delivery
    const sendResult = await sendOnboardingEmail({
      to: application.email,
      name: application.name || "",
      onboardingUrl: onboardingUrlFor(token),
    });

    if (!sendResult.ok) {
      // Email did NOT go out. Record the failure in the onboarding row
      // and tell admin truthfully.
      await supabase
        .from("creator_onboarding")
        .update({
          send_error: sendResult.error,
          updated_at: new Date().toISOString(),
        })
        .eq("application_id", application.id);

      console.error("Onboarding email send failed", {
        email: application.email,
        error: sendResult.error,
      });

      return NextResponse.json(
        {
          success: true,
          application: updated,
          onboardingWarning:
            `Application marked accepted, but the onboarding email did NOT go out to ${application.email}. ` +
            `Error: ${sendResult.error} ` +
            `The creator will not be able to complete onboarding until this is resolved. ` +
            `Fix the email configuration and click Accept again to resend.`,
        },
        { status: 207 }
      );
    }

    // Email sent — stamp sent_at, clear any prior send_error
    await supabase
      .from("creator_onboarding")
      .update({
        sent_at:    new Date().toISOString(),
        send_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("application_id", application.id);
  }

  return NextResponse.json({ success: true, application: updated });
}

// DELETE — remove application
export async function DELETE(req: NextRequest) {
  if (!checkAuth(req)) return unauthorized();

  const { id } = await req.json();

  if (!id) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // ON DELETE CASCADE on creator_onboarding.application_id ensures the
  // onboarding row is removed with the application.
  const { error } = await supabase
    .from("creator_applications")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
