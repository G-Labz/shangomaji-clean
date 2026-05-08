import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { ensureMemberFromUser, normalizeEmail } from "@/lib/member-auth";
import { fetchTitleSummariesByIds } from "@/lib/title-summaries";

// Phase 4 — Member private playback progress API (foundation only).
//
//   GET  ?titleId=…    → progress row for one title (or null).
//   GET  ?recent=1     → most recent in-progress / last-watched item, used
//                        by the Member Account page. Returns at most one.
//   POST { titleId|slug, position_seconds, duration_seconds? }
//                       → upsert progress. Negative position clamped to 0;
//                        positions < 5s ignored to avoid storing meaningless
//                        partial progress unless we have explicit duration
//                        coverage. Marked `completed` when position is
//                        within 30s of duration.
//
// Auth + Member gate identical to /api/members/my-list.
//
// Note on Bunny precise resume position: the current player surface (Bunny
// Stream iframe) does not expose a reliable client-side timeUpdate signal
// in this build, so callers should treat this endpoint as the foundation
// and may post coarse-grained "session started" rows (position 0) until
// a real player time source is wired in. See watch page comments.

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function resolveTitleId(opts: { titleId?: string | null; slug?: string | null }): Promise<string | null> {
  const admin = svc();
  if (opts.titleId) {
    const { data } = await admin.from("titles").select("id").eq("id", opts.titleId).maybeSingle();
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

async function requireMember() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { ok: false as const, response: NextResponse.json({ error: "Not authenticated" }, { status: 401, headers: NO_STORE }) };
  }
  const { isMember } = await ensureMemberFromUser(user);
  if (!isMember) {
    return { ok: false as const, response: NextResponse.json({ error: "Member account required" }, { status: 403, headers: NO_STORE }) };
  }
  const email = normalizeEmail(user.email);
  if (!email) {
    return { ok: false as const, response: NextResponse.json({ error: "Invalid session" }, { status: 401, headers: NO_STORE }) };
  }
  return { ok: true as const, email, userId: user.id ?? null };
}

export async function GET(req: NextRequest) {
  const auth = await requireMember();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const recent = url.searchParams.get("recent");
  const admin = svc();

  if (recent) {
    // Most recent in-progress (not completed) item, then most recent at all.
    const { data: rows } = await admin
      .from("member_title_progress")
      .select("title_id, position_seconds, duration_seconds, completed, last_watched_at")
      .eq("member_email", auth.email)
      .order("last_watched_at", { ascending: false })
      .limit(5);

    if (!rows || rows.length === 0) {
      return NextResponse.json({ recent: null }, { headers: NO_STORE });
    }

    const inProgress = (rows as any[]).find((r) => !r.completed) ?? rows[0];
    const titles = await fetchTitleSummariesByIds([inProgress.title_id]);
    const title = titles[0] ?? null;
    if (!title) return NextResponse.json({ recent: null }, { headers: NO_STORE });

    return NextResponse.json(
      {
        recent: {
          title,
          position_seconds: inProgress.position_seconds ?? 0,
          duration_seconds: inProgress.duration_seconds ?? null,
          completed:        !!inProgress.completed,
          last_watched_at:  inProgress.last_watched_at,
        },
      },
      { headers: NO_STORE }
    );
  }

  const titleIdParam = url.searchParams.get("titleId");
  const slugParam    = url.searchParams.get("slug");
  const titleId = await resolveTitleId({ titleId: titleIdParam, slug: slugParam });
  if (!titleId) {
    return NextResponse.json({ progress: null }, { headers: NO_STORE });
  }

  const { data, error } = await admin
    .from("member_title_progress")
    .select("title_id, position_seconds, duration_seconds, completed, last_watched_at")
    .eq("member_email", auth.email)
    .eq("title_id", titleId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: NO_STORE });
  }

  return NextResponse.json({ progress: data ?? null }, { headers: NO_STORE });
}

export async function POST(req: NextRequest) {
  const auth = await requireMember();
  if (!auth.ok) return auth.response;

  let body: {
    titleId?:           string;
    slug?:              string;
    position_seconds?:  number;
    duration_seconds?:  number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: NO_STORE });
  }

  const titleId = await resolveTitleId({ titleId: body.titleId ?? null, slug: body.slug ?? null });
  if (!titleId) {
    return NextResponse.json({ error: "Title not found" }, { status: 404, headers: NO_STORE });
  }

  // Clamp position. Reject NaN. Round to integer seconds.
  const rawPos = Number(body.position_seconds);
  const position = Number.isFinite(rawPos) ? Math.max(0, Math.floor(rawPos)) : 0;

  const rawDur = body.duration_seconds == null ? null : Number(body.duration_seconds);
  const duration = rawDur != null && Number.isFinite(rawDur) && rawDur > 0 ? Math.floor(rawDur) : null;

  // Avoid storing meaningless partial progress: if position < 5s and no
  // duration override, treat this as a "session started" record only —
  // we still upsert a row so /account can show the title was last watched,
  // but position stays at 0 and completed stays false.
  const effectivePosition = position < 5 ? 0 : position;

  // Mark completed when within ~30s of a known duration.
  const completed =
    duration != null && effectivePosition > 0 && effectivePosition >= duration - 30;

  const admin = svc();
  const nowIso = new Date().toISOString();

  const { error } = await admin
    .from("member_title_progress")
    .upsert(
      {
        member_email:     auth.email,
        member_user_id:   auth.userId,
        title_id:         titleId,
        position_seconds: effectivePosition,
        duration_seconds: duration,
        completed,
        last_watched_at:  nowIso,
        updated_at:       nowIso,
      },
      { onConflict: "member_email,title_id" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: NO_STORE });
  }

  return NextResponse.json(
    { ok: true, titleId, position_seconds: effectivePosition, completed },
    { headers: NO_STORE }
  );
}
