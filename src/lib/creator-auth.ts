import type { SupabaseClient } from "@supabase/supabase-js";

// Creator approval is stored in creator_applications.status
// Real status values: "pending" | "accepted" | "rejected"
// "accepted" is the only state that unlocks /workspace.
//
// Destination map:
//   accepted  → /workspace
//   pending   → /creators/pending   (under review)
//   rejected  → /creators/rejected  (not approved)
//   no record → /creators/apply     (no application on file)

export async function checkCreatorApproval(
  supabase: SupabaseClient,
  email: string
): Promise<"/workspace" | "/creators/apply" | "/creators/pending" | "/creators/rejected"> {
  const normalizedEmail = email.trim().toLowerCase();

  const { data, error } = await supabase
    .from("creator_applications")
    .select("status")
    .ilike("email", normalizedEmail)
    .limit(1);

  const row = (data as any[])?.[0] ?? null;

  if (error || !row) {
    return "/creators/apply";
  }

  if (row.status === "accepted") {
    return "/workspace";
  }

  if (row.status === "pending") {
    return "/creators/pending";
  }

  if (row.status === "rejected") {
    return "/creators/rejected";
  }

  // Unknown status — treat as not approved, send to apply
  return "/creators/apply";
}
