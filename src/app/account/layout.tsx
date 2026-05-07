import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { isMemberEmail } from "@/lib/member-auth";

// Phase 2 — /account auth gate.
//
// Strict rules:
//   1. No Supabase session → redirect to /login with redirect target.
//   2. Authed but not a Member (no member_profiles row) → redirect to /signup
//      with redirect target. We intentionally do NOT auto-create a Member
//      profile here. A Creator-only account viewing /account is sent to
//      /signup so role separation stays explicit.
//   3. Authed Member → render /account.
//
// /account never exposes Creator workspace data or admin data — it reads
// only from member_profiles via /api/members/profile in the client.

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

  const member = await isMemberEmail(user.email);
  if (!member) {
    // Authed but no Member profile. Send them to /signup with their email
    // pre-fill not required; signup will use whatever they type. We do NOT
    // auto-create the row here.
    redirect("/signup?redirect=/account");
  }

  return <>{children}</>;
}
