// Phase 10I.2 — World foundation helpers.
//
// A World is the durable creator-owned IP / audience container. A Title is
// the release object. The private "Follow Updates" relationship attaches to
// the WORLD (member_world_follows.world_id), never the Title.
//
// No World/container concept existed before this phase, and no application
// code inserts titles rows (title creation is not a clean, hookable path).
// So World creation is intentionally LAZY and DECOUPLED: a World is
// created-or-resolved server-side the first time it is needed (at follow
// time) via ensureWorldForTitle(). This touches no part of the creator
// submission / approval / license / media pipeline.
//
// Launch rule: one accepted title = one World by default (per-title / per-IP).
// Editorial merging of related titles into one IP World is a future action
// and is deferred.
//
// Nothing here produces public counts, rankings, popularity, or social proof.

import { createClient as createServiceClient, type SupabaseClient } from "@supabase/supabase-js";
import { fetchTitleSummariesByIds, type TitleSummary } from "@/lib/title-summaries";

function svc(): SupabaseClient {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// A followed World, hydrated to its primary title's public-safe summary so
// the private "Following" surface can render the same cards as My List.
// `worldId` is attached so the UI can unfollow precisely.
export type FollowedWorldSummary = TitleSummary & { worldId: string };

// Resolve (and lazily create) the World for a given titles.id.
//
// Idempotent and race-safe:
//   1. If the title already has a world_id, return it.
//   2. Otherwise create a World anchored to this title (primary_title_id),
//      named from the creator_projects title, then stamp titles.world_id.
//   3. The partial UNIQUE index on worlds(primary_title_id) means a
//      concurrent caller that inserted first wins; we re-select on conflict.
//
// Returns the world id, or null if the title does not exist (e.g. a mock /
// dev title with no backing titles row).
export async function ensureWorldForTitle(titleId: string): Promise<string | null> {
  if (!titleId) return null;
  const admin = svc();

  const { data: titleRow } = await admin
    .from("titles")
    .select("id, project_id, creator_email, world_id")
    .eq("id", titleId)
    .maybeSingle();

  if (!titleRow) return null;
  if ((titleRow as any).world_id) return (titleRow as any).world_id as string;

  // Derive a readable World name from the backing project title.
  let worldName = "Untitled World";
  const projectId = (titleRow as any).project_id as string | null;
  if (projectId) {
    const { data: project } = await admin
      .from("creator_projects")
      .select("title")
      .eq("id", projectId)
      .maybeSingle();
    const t = typeof (project as any)?.title === "string" ? (project as any).title.trim() : "";
    if (t) worldName = t;
  }

  const creatorEmail = (titleRow as any).creator_email ?? null;

  // Attempt creation. On unique conflict (concurrent follow created it first),
  // fall through to re-select by primary_title_id.
  const { data: created, error: insertErr } = await admin
    .from("worlds")
    .insert({
      name:             worldName,
      creator_email:    creatorEmail,
      primary_title_id: titleId,
      status:           "active",
    })
    .select("id")
    .maybeSingle();

  let worldId: string | null = (created as any)?.id ?? null;

  if (!worldId) {
    // Either a conflict or a transient miss — resolve the canonical row.
    if (insertErr && !/duplicate key|unique/i.test(insertErr.message)) {
      console.error("ensureWorldForTitle insert failed", { titleId, error: insertErr.message });
      return null;
    }
    const { data: existing } = await admin
      .from("worlds")
      .select("id")
      .eq("primary_title_id", titleId)
      .maybeSingle();
    worldId = (existing as any)?.id ?? null;
  }

  if (!worldId) return null;

  // Stamp the title with its World. Guarded so we never clobber a value set
  // by a concurrent writer.
  await admin
    .from("titles")
    .update({ world_id: worldId })
    .eq("id", titleId)
    .is("world_id", null);

  return worldId;
}

// Resolve the World id for a title without creating one. Used by unfollow so
// we never create a World as a side effect of removing a follow.
export async function findWorldIdForTitle(titleId: string): Promise<string | null> {
  if (!titleId) return null;
  const admin = svc();

  const { data: titleRow } = await admin
    .from("titles")
    .select("world_id")
    .eq("id", titleId)
    .maybeSingle();
  if ((titleRow as any)?.world_id) return (titleRow as any).world_id as string;

  const { data: world } = await admin
    .from("worlds")
    .select("id")
    .eq("primary_title_id", titleId)
    .maybeSingle();
  return (world as any)?.id ?? null;
}

// List the Worlds a member follows, newest first, hydrated to their primary
// title's public-safe summary. Worlds whose primary title is no longer
// catalog-eligible are dropped by fetchTitleSummariesByIds (same filtering
// My List uses), so the Following surface never shows a pulled title.
export async function fetchFollowedWorldSummaries(memberEmail: string): Promise<FollowedWorldSummary[]> {
  const admin = svc();

  const { data: follows } = await admin
    .from("member_world_follows")
    .select("world_id, created_at")
    .eq("member_email", memberEmail)
    .order("created_at", { ascending: false });

  const worldIds = (follows ?? []).map((r: any) => r.world_id).filter(Boolean);
  if (!worldIds.length) return [];

  const { data: worldRows } = await admin
    .from("worlds")
    .select("id, primary_title_id")
    .in("id", worldIds);

  // Map primary_title_id → worldId, preserving follow order.
  const worldByPrimaryTitle = new Map<string, string>();
  const primaryTitleIds: string[] = [];
  const titleIdToWorldId = new Map<string, string>();
  for (const w of (worldRows ?? []) as any[]) {
    if (!w.primary_title_id) continue;
    worldByPrimaryTitle.set(w.id, w.primary_title_id);
    titleIdToWorldId.set(w.primary_title_id, w.id);
  }

  // Preserve the follow ordering (worldIds is newest-first).
  for (const wid of worldIds) {
    const ptid = worldByPrimaryTitle.get(wid);
    if (ptid) primaryTitleIds.push(ptid);
  }
  if (!primaryTitleIds.length) return [];

  const summaries = await fetchTitleSummariesByIds(primaryTitleIds);

  return summaries.map((s) => ({
    ...s,
    worldId: titleIdToWorldId.get(s.titleId) ?? "",
  })).filter((s) => s.worldId);
}
