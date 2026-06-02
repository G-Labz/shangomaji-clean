import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkAdminPassword } from "@/lib/admin-auth";
import { fetchTitleSummariesByIds } from "@/lib/title-summaries";

// Phase 10I.5 — Admin-only, read-only World follow inspection.
//
//   GET → list every World created by the Follow Updates foundation, each
//         with its PRIVATE follow count, hydrated to the primary title's
//         current public name + slug (best-effort).
//
// This is an internal control surface, NOT an Audience Signal feature:
//   • Auth is the admin password (x-admin-password), never member auth.
//   • Service-role reads only — no public RLS policy, no client Supabase.
//   • Follow counts are computed here and returned ONLY to this admin route;
//     they are never rendered on any public page, never aggregated into
//     public popularity, rankings, or social proof.
//   • Read-only. There are no mutating verbs on this route.

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
}

function checkAuth(req: NextRequest) {
  // Timing-safe comparison via shared helper. See src/lib/admin-auth.ts.
  return checkAdminPassword(req.headers.get("x-admin-password"));
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return unauthorized();

  // 1. All worlds, newest first. Chronological order is deliberate — this is
  //    an inventory, NOT a ranking/leaderboard by follow count.
  const { data: worldRows, error: worldsErr } = await supabase
    .from("worlds")
    .select("id, name, creator_email, primary_title_id, status, created_at")
    .order("created_at", { ascending: false });

  if (worldsErr) {
    return NextResponse.json({ error: worldsErr.message }, { status: 500, headers: NO_STORE });
  }
  const worlds = (worldRows ?? []) as Array<{
    id: string;
    name: string;
    creator_email: string | null;
    primary_title_id: string | null;
    status: string;
    created_at: string;
  }>;

  // 2. Private follow counts — counted server-side only. Pull world_id rows
  //    and tally in a Map (MVP scale; no GROUP BY / RPC / schema change).
  const { data: followRows } = await supabase
    .from("member_world_follows")
    .select("world_id");

  const followCountByWorld = new Map<string, number>();
  for (const r of (followRows ?? []) as Array<{ world_id: string }>) {
    if (!r.world_id) continue;
    followCountByWorld.set(r.world_id, (followCountByWorld.get(r.world_id) ?? 0) + 1);
  }

  // 3. Current public title name + slug via the canonical catalog hydration.
  //    Best-effort: a pulled / non-eligible title simply yields no slug, and
  //    we fall back to the World's stored name.
  const primaryTitleIds = worlds
    .map((w) => w.primary_title_id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  const summaries = primaryTitleIds.length
    ? await fetchTitleSummariesByIds(primaryTitleIds)
    : [];
  const titleById = new Map<string, { title: string; slug: string }>();
  for (const s of summaries) {
    titleById.set(s.titleId, { title: s.title, slug: s.slug });
  }

  const result = worlds.map((w) => {
    const summary = w.primary_title_id ? titleById.get(w.primary_title_id) : undefined;
    return {
      id:             w.id,
      name:           w.name,
      status:         w.status,
      creatorEmail:   w.creator_email ?? null,
      primaryTitleId: w.primary_title_id ?? null,
      titleName:      summary?.title ?? w.name ?? null,
      titleSlug:      summary?.slug ?? null,
      createdAt:      w.created_at,
      followCount:    followCountByWorld.get(w.id) ?? 0,
    };
  });

  return NextResponse.json({ worlds: result }, { headers: NO_STORE });
}
