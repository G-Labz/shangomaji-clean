import { createClient as createServiceClient } from "@supabase/supabase-js";

// Creator approval is stored in creator_applications.status
// Real status values: "pending" | "accepted" | "rejected"
//
// A creator is only fully onboarded when:
//   1. creator_applications.status === "accepted" (admin approval), AND
//   2. creator_onboarding.accepted_at IS NOT NULL (creator clicked Accept
//      on the platform terms page)
//
// Admin approval alone is NOT sufficient to unlock the workspace.
//
// Destination map:
//   accepted + onboarding accepted  → /workspace
//   accepted + onboarding pending   → /creators/onboarding/required
//   pending                         → /creators/pending
//   rejected                        → /creators/rejected
//   no record                       → /creators/apply
//
// Implementation notes:
//   - This function reads onboarding state using the SERVICE ROLE client so
//     the gate is immune to RLS policy on creator_onboarding. The write side
//     (acceptance API, admin API) already uses service role; the read side
//     must match, otherwise the gate can silently miss a real acceptance
//     when RLS is enabled without a SELECT policy.
//   - The function also handles multiple application rows for the same email
//     (re-applications, test records, case variants): it looks across ALL
//     matching applications and considers the creator onboarded if ANY
//     accepted application has an accepted onboarding row.

export type CreatorDestination =
  | "/workspace"
  | "/creators/apply"
  | "/creators/pending"
  | "/creators/rejected"
  | "/creators/onboarding/required";

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function checkCreatorApproval(
  email: string
): Promise<CreatorDestination> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return "/creators/apply";

  const supabase = svc();

  // Fetch ALL applications for this email, newest first. Covers re-applications,
  // test records, and case/whitespace variants.
  const { data: apps, error } = await supabase
    .from("creator_applications")
    .select("id, status, submitted_at")
    .ilike("email", normalizedEmail)
    .order("submitted_at", { ascending: false });

  if (error) {
    console.error("checkCreatorApproval: application lookup failed", {
      email: normalizedEmail,
      error: error.message,
    });
    // Fail safely: send to apply rather than silently pass a non-approved user.
    return "/creators/apply";
  }

  if (!apps || apps.length === 0) {
    return "/creators/apply";
  }

  const accepted = apps.filter((a: any) => a.status === "accepted");

  if (accepted.length === 0) {
    // No accepted application. Determine destination from the most recent row.
    const latest = apps[0] as any;
    if (latest.status === "pending")  return "/creators/pending";
    if (latest.status === "rejected") return "/creators/rejected";
    return "/creators/apply";
  }

  // Check whether ANY accepted application has a completed onboarding record.
  const acceptedIds = accepted.map((a: any) => a.id);
  const { data: onboardingRows, error: onboardingError } = await supabase
    .from("creator_onboarding")
    .select("application_id, accepted_at")
    .in("application_id", acceptedIds);

  if (onboardingError) {
    console.error("checkCreatorApproval: onboarding lookup failed", {
      email: normalizedEmail,
      acceptedIds,
      error: onboardingError.message,
    });
    // Fail safely: require onboarding. Never silently unlock the workspace.
    return "/creators/onboarding/required";
  }

  const hasAcceptedOnboarding = (onboardingRows ?? []).some(
    (r: any) => r?.accepted_at != null
  );

  return hasAcceptedOnboarding
    ? "/workspace"
    : "/creators/onboarding/required";
}
