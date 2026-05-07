import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { ensureMemberFromUser } from "@/lib/member-auth";

// Phase 2 — /account auth gate.
//
// Strict rules:
//   1. No Supabase session → redirect to /login with redirect target.
//   2. Authed but no member_profiles row:
//        - If user_metadata.account_type === "member" (set by /signup),
//          lazily create the profile row. This handles the email-confirmation
//          case where data.session was null at signup time so the row could
//          not be created then.
//        - Otherwise (Creator-only or unknown intent) → redirect to /signup.
//          We do NOT auto-create profiles for users without Member intent
//          metadata, preserving role separation.
//   3. Authed Member → render /account.

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/login?redirect=/account");
  }

  const { isMember } = await ensureMemberFromUser(user);
  if (!isMember) {
    redirect("/signup?redirect=/account");
  }

  return <>{children}</>;
}
