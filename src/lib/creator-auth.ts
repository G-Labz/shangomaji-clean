import type { SupabaseClient } from "@supabase/supabase-js";

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

export type CreatorDestination =
  | "/workspace"
  | "/creators/apply"
  | "/creators/pending"
  | "/creators/rejected"
  | "/creators/onboarding/required";

export async function checkCreatorApproval(
  supabase: SupabaseClient,
  email: string
): Promise<CreatorDestination> {
  const normalizedEmail = email.trim().toLowerCase();

  const { data, error } = await supabase
    .from("creator_applications")
    .select("id, status")
    .ilike("email", normalizedEmail)
    .limit(1);

  const row = (data as any[])?.[0] ?? null;

  if (error || !row) {
    return "/creators/apply";
  }

  if (row.status === "pending") {
    return "/creators/pending";
  }

  if (row.status === "rejected") {
    return "/creators/rejected";
  }

  if (row.status === "accepted") {
    // Gate on explicit onboarding acceptance.
    const { data: onboardingRow } = await supabase
      .from("creator_onboarding")
      .select("accepted_at")
      .eq("application_id", row.id)
      .maybeSingle();

    const acceptedAt = (onboardingRow as any)?.accepted_at ?? null;

    if (acceptedAt) {
      return "/workspace";
    }
    return "/creators/onboarding/required";
  }

  // Unknown status — treat as not approved
  return "/creators/apply";
}
