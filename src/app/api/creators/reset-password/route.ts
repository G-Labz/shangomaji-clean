import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPasswordSetupEmail } from "@/lib/email";

// Service-role client — we need admin.generateLink to produce a hashed-token
// recovery link that does not depend on client-side PKCE storage.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://shangomaji.com";

  // Always return success to avoid email enumeration. We only log real failures.
  const genericSuccess = NextResponse.json({ ok: true });

  const { data, error } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${siteUrl}/creators/update-password` },
  });

  if (error || !data?.properties?.hashed_token) {
    // Most common cause: user does not exist. Do not leak that.
    const msg = error?.message || "no hashed_token returned";
    if (!/user.*not.*found|not.*exist/i.test(msg)) {
      console.error("Recovery link generation failed", { email, error: msg });
    }
    return genericSuccess;
  }

  const setupUrl =
    `${siteUrl}/creators/update-password` +
    `?token_hash=${encodeURIComponent(data.properties.hashed_token)}` +
    `&type=recovery`;

  const mail = await sendPasswordSetupEmail({
    to:       email,
    setupUrl,
    kind:     "recovery",
  });

  if (!mail.ok) {
    console.error("Recovery email send failed", { email, error: mail.error });
    // Still return generic success — the caller cannot distinguish real-user
    // vs unknown-user by response. Failures surface in logs for ops.
  }

  return genericSuccess;
}
