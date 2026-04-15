import type { SupabaseClient } from "@supabase/supabase-js";

// A creator is approved when creator_applications has a row where
// LOWER(email) matches their auth email AND status = 'accepted'.
// To approve: UPDATE creator_applications SET status = 'accepted' WHERE email = '<email>';
export async function checkCreatorApproval(
  supabase: SupabaseClient,
  email: string
): Promise<"/workspace" | "/creators/apply"> {
  const normalizedEmail = email.trim().toLowerCase();

  const { data, error } = await supabase
    .from("creator_applications")
    .select("email, status")
    .ilike("email", normalizedEmail)
    .eq("status", "accepted")
    .limit(1);

  const row = (data as any[])?.[0] ?? null;

  if (error || !row) {
    return "/creators/apply";
  }

  return "/workspace";
}