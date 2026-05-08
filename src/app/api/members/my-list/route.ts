import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { ensureMemberFromUser, normalizeEmail } from "@/lib/member-auth";
import { fetchTitleSummariesByIds } from "@/lib/title-summaries";

// Phase 4 — Member private My List API.
//
//   GET    → list saved titles for the calling Member (catalog-eligible only).
//   POST   → save a title by titleId or slug.
//   DELETE → remove a title by titleId or slug.
//
// All three require an authenticated Supabase session AND Member status.
// Service role is used so the data path is immune to RLS configuration.
// We never expose member_email to the client beyond standard auth-owner
// use, never expose permanent Bunny embed URLs, and never aggregate saves
// into public counts.

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Resolve titleId (uuid) OR slug ("cp-<projectId>") to a real titles.id.
// Returns null when nothing matches.
async function resolveTitleId(opts: { titleId?: string | null; slug?: string | null }): Promise<string | null> {
  const admin = svc();
  if (opts.titleId) {
    const { data } = await admin
      .from("titles")
      .select("id")
      .eq("id", opts.titleId)
      .maybeSingle();
    return data?.id ?? null;
  }
  if (opts.slug) {
    const m = opts.slug.trim().match(/^cp-([0-9a-f-]{36})$/i);
    if (!m) return null;
    const { data } = await admin
      .from("titles")
      .select("id")
      .eq("project_id", m[1])
      .order("activated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data?.id ?? null;
  }
  return null;
}

// Auth + Member gate. Returns the authenticated Member's email + user_id,
// or a NextResponse to short-circuit with the right status.
async function requireMember(): Promise<
  | { ok: true; email: string; userId: string | null }
  | { ok: false; response: NextResponse }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Not authenticated" },
        { status: 401, headers: NO_STORE }
      ),
    };
  }

  // Self-healing membership check (matches /api/members/session pattern).
  // Creator-only users without Member intent metadata are NOT promoted.
  const { isMember } = await ensureMemberFromUser(user);
  if (!isMember) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Member account required" },
        { status: 403, headers: NO_STORE }
      ),
    };
  }

  const email = normalizeEmail(user.email);
  if (!email) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid session" },
        { status: 401, headers: NO_STORE }
      ),
    };
  }

  return { ok: true, email, userId: user.id ?? null };
}

export async function GET() {
  const auth = await requireMember();
  if (!auth.ok) return auth.response;

  const admin = svc();
  const { data: rows, error } = await admin
    .from("member_saved_titles")
    .select("title_id, created_at")
    .eq("member_email", auth.email)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: NO_STORE }
    );
  }

  const ids = (rows ?? []).map((r: any) => r.title_id).filter(Boolean);
  const titles = await fetchTitleSummariesByIds(ids);

  return NextResponse.json({ titles }, { headers: NO_STORE });
}

export async function POST(req: NextRequest) {
  const auth = await requireMember();
  if (!auth.ok) return auth.response;

  let body: { titleId?: string; slug?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400, headers: NO_STORE }
    );
  }

  const titleId = await resolveTitleId({ titleId: body.titleId ?? null, slug: body.slug ?? null });
  if (!titleId) {
    return NextResponse.json(
      { error: "Title not found" },
      { status: 404, headers: NO_STORE }
    );
  }

  const admin = svc();
  const { error } = await admin
    .from("member_saved_titles")
    .upsert(
      {
        member_email:   auth.email,
        member_user_id: auth.userId,
        title_id:       titleId,
        updated_at:     new Date().toISOString(),
      },
      { onConflict: "member_email,title_id" }
    );

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: NO_STORE }
    );
  }

  return NextResponse.json({ ok: true, saved: true, titleId }, { headers: NO_STORE });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireMember();
  if (!auth.ok) return auth.response;

  // Accept payload either as JSON body or as ?titleId / ?slug query params,
  // since some HTTP clients suppress DELETE bodies.
  let body: { titleId?: string; slug?: string } = {};
  try { body = await req.json(); } catch { /* ok — try query */ }
  const url = new URL(req.url);
  const titleId = await resolveTitleId({
    titleId: body.titleId ?? url.searchParams.get("titleId"),
    slug:    body.slug    ?? url.searchParams.get("slug"),
  });

  if (!titleId) {
    return NextResponse.json(
      { error: "Title not found" },
      { status: 404, headers: NO_STORE }
    );
  }

  const admin = svc();
  const { error } = await admin
    .from("member_saved_titles")
    .delete()
    .eq("member_email", auth.email)
    .eq("title_id", titleId);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: NO_STORE }
    );
  }

  return NextResponse.json({ ok: true, saved: false, titleId }, { headers: NO_STORE });
}
