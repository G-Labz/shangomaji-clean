import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { ensureMemberFromUser, normalizeEmail } from "@/lib/member-auth";
import {
  ensureWorldForTitle,
  findWorldIdForTitle,
  fetchFollowedWorldSummaries,
} from "@/lib/worlds";

// Phase 10I.2 — Member private "Follow Updates" API.
//
//   GET    → list the Worlds the calling Member follows (hydrated to each
//            World's primary title summary). Private to the viewer.
//   POST   → follow the World of a title (by slug). Lazily creates the World.
//   DELETE → unfollow the World of a title (by slug) or by worldId.
//
// Follows attach to the WORLD (member_world_follows.world_id), never the
// Title. All three require an authenticated Supabase session AND Member
// status. Service role is used so the data path is immune to RLS
// configuration. Follows are NEVER aggregated into public counts, rankings,
// popularity, or social proof, and there is no public follower list.

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Resolve titleId (uuid) OR slug ("cp-<projectId>") to a real titles.id.
// Mirrors /api/members/my-list. Returns null when nothing matches (e.g. a
// mock/dev title with no backing titles row).
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

// Auth + Member gate. Returns the authenticated Member's email + user_id, or
// a NextResponse to short-circuit with the right status. Mirrors my-list.
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

  const following = await fetchFollowedWorldSummaries(auth.email);
  return NextResponse.json({ following }, { headers: NO_STORE });
}

export async function POST(req: NextRequest) {
  const auth = await requireMember();
  if (!auth.ok) return auth.response;

  let body: { titleId?: string; slug?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: NO_STORE });
  }

  const titleId = await resolveTitleId({ titleId: body.titleId ?? null, slug: body.slug ?? null });
  if (!titleId) {
    return NextResponse.json({ error: "Title not found" }, { status: 404, headers: NO_STORE });
  }

  // Lazily resolve-or-create the World this title belongs to. Follow attaches
  // to the World.
  const worldId = await ensureWorldForTitle(titleId);
  if (!worldId) {
    return NextResponse.json({ error: "World not available" }, { status: 404, headers: NO_STORE });
  }

  const admin = svc();
  const { error } = await admin
    .from("member_world_follows")
    .upsert(
      {
        member_email:   auth.email,
        member_user_id: auth.userId,
        world_id:       worldId,
        updated_at:     new Date().toISOString(),
      },
      { onConflict: "member_email,world_id" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: NO_STORE });
  }

  return NextResponse.json({ ok: true, following: true, worldId }, { headers: NO_STORE });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireMember();
  if (!auth.ok) return auth.response;

  // Accept payload as JSON body or query params (some clients suppress DELETE
  // bodies). A direct worldId wins; otherwise resolve via slug/titleId WITHOUT
  // creating a World as a side effect.
  let body: { titleId?: string; slug?: string; worldId?: string } = {};
  try { body = await req.json(); } catch { /* ok — try query */ }
  const url = new URL(req.url);

  let worldId = body.worldId ?? url.searchParams.get("worldId") ?? null;

  if (!worldId) {
    const titleId = await resolveTitleId({
      titleId: body.titleId ?? url.searchParams.get("titleId"),
      slug:    body.slug    ?? url.searchParams.get("slug"),
    });
    if (titleId) worldId = await findWorldIdForTitle(titleId);
  }

  if (!worldId) {
    return NextResponse.json({ error: "World not found" }, { status: 404, headers: NO_STORE });
  }

  const admin = svc();
  const { error } = await admin
    .from("member_world_follows")
    .delete()
    .eq("member_email", auth.email)
    .eq("world_id", worldId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: NO_STORE });
  }

  return NextResponse.json({ ok: true, following: false, worldId }, { headers: NO_STORE });
}
