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

// PATCH — update status + trigger onboarding when accepting
export async function PATCH(req: NextRequest) {
  if (!checkAuth(req)) return unauthorized();

  const { id: submissionId, status } = await req.json();

  if (!submissionId || !["pending", "accepted", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Fetch the full application record first — we need email for the invite
  const { data: application, error: fetchError } = await supabase
    .from("creator_applications")
    .select("id, email, status")
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
    .select("id, status, approved_creator, email")
    .single();

  if (updateError) {
    console.error("Admin status update failed", { submissionId, status, updateError });
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // ── Onboarding trigger ───────────────────────────────────────────────────
  // Only fires when transitioning to accepted.
  // Uses supabase.auth.admin.inviteUserByEmail — service-role only.
  // The invite email lands the creator at /creators/update-password where
  // they set a password. The existing update-password page handles SIGNED_IN.
  if (status === "accepted" && application.status !== "accepted") {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
      "https://shangomaji.com";

    const redirectTo = `${siteUrl}/creators/update-password`;

    const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
      application.email,
      { redirectTo }
    );

    if (inviteError) {
      console.error("Creator invite failed", {
        email: application.email,
        error: inviteError.message,
      });

      // Status IS updated — we do not roll back.
      // Return 207 so the admin UI can surface the onboarding failure clearly.
      return NextResponse.json(
        {
          success: true,
          application: updated,
          onboardingWarning: `Status updated to accepted, but the onboarding invite failed to send to ${application.email}. Error: ${inviteError.message}. The creator will need to be invited manually or you can retry this approval.`,
        },
        { status: 207 }
      );
    }
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

  const { error } = await supabase
    .from("creator_applications")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
