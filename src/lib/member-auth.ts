// Phase 2 — Member Account System helpers.
//
// Roles in this codebase share Supabase auth.users but are differentiated
// by association rows:
//
//   Creator → creator_applications.status = 'accepted' for the user's email
//             (gated by checkCreatorApproval, used by /workspace).
//   Member  → member_profiles row exists for the user's email.
//   Admin   → ADMIN_PASSWORD header (separate from session auth).
//
// A user can be both Creator and Member (same email) but they must be
// established explicitly — neither role auto-grants the other. /account
// requires Member, /workspace requires Creator.

import { createClient as createServiceClient, type SupabaseClient } from "@supabase/supabase-js";

export type MembershipStatus = {
  authenticated: boolean;
  email:         string | null;
  isMember:      boolean;
  isCreator:     boolean; // accepted application
};

function svc(): SupabaseClient {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Returns a normalized email or null. Member writes always store lowercased.
export function normalizeEmail(input: string | null | undefined): string | null {
  if (typeof input !== "string") return null;
  const e = input.trim().toLowerCase();
  return e.length > 0 ? e : null;
}

// Resolve membership for an email — does a member_profiles row exist?
// Service role read so the gate is immune to RLS configuration.
export async function isMemberEmail(email: string): Promise<boolean> {
  const e = normalizeEmail(email);
  if (!e) return false;
  const admin = svc();
  const { data } = await admin
    .from("member_profiles")
    .select("id")
    .ilike("email", e)
    .maybeSingle();
  return !!data;
}

// Resolve creator-accepted status for an email. Mirrors the check that
// checkCreatorApproval() performs but returns just a boolean instead of a
// destination string. Service role read.
export async function hasAcceptedCreatorApplication(email: string): Promise<boolean> {
  const e = normalizeEmail(email);
  if (!e) return false;
  const admin = svc();
  const { data } = await admin
    .from("creator_applications")
    .select("email, status")
    .ilike("email", e)
    .eq("status", "accepted")
    .limit(1);
  return Array.isArray(data) && data.length > 0;
}

// Create or fetch the canonical Member profile row for this email. Used at
// sign-up time and lazily by /account if the row is somehow missing.
//
// `display_name` is optional and only set on first create — never overwritten
// here. Subsequent updates go through PUT /api/members/profile.
export async function ensureMemberProfile(opts: {
  email:        string;
  displayName?: string | null;
}): Promise<{ ok: true; created: boolean } | { ok: false; error: string }> {
  const email = normalizeEmail(opts.email);
  if (!email) return { ok: false, error: "Email is required." };

  const admin = svc();
  const { data: existing } = await admin
    .from("member_profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  if (existing) return { ok: true, created: false };

  const insertRow: Record<string, unknown> = { email };
  const dn = (opts.displayName ?? "").trim();
  if (dn) insertRow.display_name = dn.slice(0, 80);

  const { error } = await admin.from("member_profiles").insert(insertRow);
  if (error) {
    // Race tolerant — a parallel ensure may have inserted between SELECT and
    // INSERT. Treat unique violation as success.
    if (/duplicate key|unique/i.test(error.message)) {
      return { ok: true, created: false };
    }
    return { ok: false, error: error.message };
  }
  return { ok: true, created: true };
}

// Public-safe shape for the /api/members/session endpoint. Note: email is
// included only because it's the user's own email; the route requires an
// authenticated session so this is not a public PII leak.
export type MemberSessionPayload = {
  authenticated: boolean;
  email:         string | null;
  isMember:      boolean;
  isCreator:     boolean;
};
