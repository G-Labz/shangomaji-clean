import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { checkCreatorApproval } from "@/lib/creator-auth";

// Phase 1 patch — Creator Studio access surface.
//
// Returns the approval destination for the currently-authenticated user
// without performing a redirect. Used by /creators/login so the access
// page can decide whether to forward an authenticated user into /workspace
// or to stay on the access page and show explicit Apply guidance instead
// of letting the workspace layout silently bounce them into the
// application form.
//
// Session-only — no admin auth, no service role exposed to the client.
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ authenticated: false, destination: null });
  }

  const destination = await checkCreatorApproval(user.email);
  return NextResponse.json({
    authenticated: true,
    email:         user.email,
    destination,
    approved:      destination === "/workspace",
  });
}
