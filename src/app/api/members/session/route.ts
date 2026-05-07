import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import {
  isMemberEmail,
  hasAcceptedCreatorApplication,
  type MemberSessionPayload,
} from "@/lib/member-auth";

// Phase 2 — Member session probe.
//
// Returns whether the current Supabase session belongs to a Member, a
// Creator, both, or neither. Used by:
//   - /account auth gate to redirect non-members to /login.
//   - /login + /signup pages to forward already-signed-in members to /account.
//   - The header to show "Account" vs "Sign in" affordances later.
//
// Email is included for the *authenticated owner only* — it is not a
// public lookup endpoint. No service-role data is exposed.
export const dynamic   = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    const payload: MemberSessionPayload = {
      authenticated: false,
      email:         null,
      isMember:      false,
      isCreator:     false,
    };
    return NextResponse.json(payload, { headers: NO_STORE });
  }

  const [isMember, isCreator] = await Promise.all([
    isMemberEmail(user.email),
    hasAcceptedCreatorApplication(user.email),
  ]);

  const payload: MemberSessionPayload = {
    authenticated: true,
    email:         user.email,
    isMember,
    isCreator,
  };
  return NextResponse.json(payload, { headers: NO_STORE });
}
