// Phase 3 — Member playback gating + signed URL issuance.
//
// This is the single server-side point that decides whether a Member can
// watch a title and, if yes, what signed Bunny URL to hand them. Public
// payloads MUST NOT bypass this — `/api/public/titles` returns only a
// `playable` boolean and never the embed URL.
//
// Reason categories are stable strings used by:
//   - playback_access_logs.reason (DB CHECK constraint)
//   - /api/playback/session response body (mapped to UX states client-side)
//
// We never log access tokens, signed URLs, or the Bunny signing key.
// Logging emails is acceptable — they are the user's own identity.

import { createClient as createServiceClient, type SupabaseClient } from "@supabase/supabase-js";
import { signBunnyEmbedUrl, PLAYBACK_TTL_SECONDS } from "@/lib/bunny";
import { isMemberEmail } from "@/lib/member-auth";

export type PlaybackReason =
  | "allowed"
  | "not_authenticated"
  | "not_member"
  | "title_not_found"
  | "title_unavailable"
  | "media_not_ready"
  | "license_out_of_term"
  | "rate_limited"
  | "playback_not_configured";

export type PlaybackTitleSummary = {
  id:           string;
  title:        string;
  type:         "movie" | "series";
  backdropUrl:  string | null;
  creatorHandle: string | null;
  creatorName:   string | null;
};

export type PlaybackResolution =
  | {
      ok:   true;
      reason: "allowed";
      playbackUrl: string;
      expiresAt:   number; // unix seconds
      title:       PlaybackTitleSummary;
    }
  | {
      ok:   false;
      reason: Exclude<PlaybackReason, "allowed">;
      title?: PlaybackTitleSummary | null;
    };

function svc(): SupabaseClient {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Resolve a title row by either UUID or "cp-<projectId>" slug used in the
// public catalog. Returns the title row + minimal project metadata.
async function resolveTitleByIdOrSlug(opts: {
  titleId?: string | null;
  slug?:    string | null;
}): Promise<
  | {
      ok: true;
      titleRow: any;
      projectRow: any | null;
    }
  | { ok: false }
> {
  const admin = svc();

  let titleRow: any | null = null;

  if (opts.titleId) {
    const { data } = await admin
      .from("titles")
      .select("id, project_id, creator_email, status, media_ready, bunny_video_id, bunny_thumbnail_url, distribution_start, distribution_end")
      .eq("id", opts.titleId)
      .maybeSingle();
    titleRow = data;
  } else if (opts.slug) {
    // Public catalog slug shape is `cp-<projectId>` per /api/public/titles.
    const slug = opts.slug.trim();
    const m = slug.match(/^cp-([0-9a-f-]{36})$/i);
    if (m) {
      const projectId = m[1];
      const { data } = await admin
        .from("titles")
        .select("id, project_id, creator_email, status, media_ready, bunny_video_id, bunny_thumbnail_url, distribution_start, distribution_end")
        .eq("project_id", projectId)
        .order("activated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      titleRow = data;
    }
  }

  if (!titleRow) return { ok: false };

  const { data: projectRow } = await admin
    .from("creator_projects")
    .select("id, title, project_type, banner_url, cover_image_url")
    .eq("id", titleRow.project_id)
    .maybeSingle();

  return { ok: true, titleRow, projectRow };
}

// Look up an executed license for the project and confirm `now` is inside
// the term window. A null term_start or term_end means open-ended in that
// direction (matches the schema convention used elsewhere).
async function isInLicenseTerm(projectId: string): Promise<boolean> {
  const admin = svc();
  const { data: license } = await admin
    .from("creator_licenses")
    .select("term_start, term_end, status")
    .eq("project_id", projectId)
    .eq("status", "executed")
    .maybeSingle();

  if (!license) {
    // No executed license → publication is not allowed. Fail closed.
    return false;
  }

  const now = Date.now();
  const startOk =
    !license.term_start || new Date(license.term_start).getTime() <= now;
  const endOk =
    !license.term_end || new Date(license.term_end).getTime() >= now;
  return startOk && endOk;
}

// Attribution lookup for the title summary. Mirrors the public/titles logic
// at a smaller surface — we only need name + reachable handle for the
// "Visit Creator" CTA in the unavailable state.
async function resolveCreatorAttribution(creatorEmail: string | null | undefined): Promise<{
  creatorHandle: string | null;
  creatorName:   string | null;
}> {
  const e = (creatorEmail ?? "").trim().toLowerCase();
  if (!e) return { creatorHandle: null, creatorName: null };

  const admin = svc();
  const [{ data: appRows }, { data: profileRows }] = await Promise.all([
    admin.from("creator_applications").select("email, name, status"),
    admin
      .from("creator_profiles")
      .select("email, handle, display_name, is_published_publicly, force_unpublished, placeholder_quarantined"),
  ]);

  const accepted = (appRows ?? []).find(
    (a: any) => (a.email ?? "").trim().toLowerCase() === e && a.status === "accepted"
  );
  const profile = (profileRows ?? []).find(
    (p: any) => (p.email ?? "").trim().toLowerCase() === e
  );

  let handle: string | null = null;
  if (
    profile &&
    profile.is_published_publicly === true &&
    profile.force_unpublished === false &&
    profile.placeholder_quarantined === false &&
    profile.handle
  ) {
    handle = String(profile.handle);
  }

  let name: string | null = null;
  if (accepted && typeof accepted.name === "string" && accepted.name.trim()) {
    name = accepted.name.trim();
  } else if (
    profile &&
    profile.placeholder_quarantined !== true &&
    typeof profile.display_name === "string" &&
    profile.display_name.trim()
  ) {
    name = profile.display_name.trim();
  }

  return { creatorHandle: handle, creatorName: name };
}

// Insert a row into playback_access_logs. Best-effort; an insertion error
// must never block the playback decision. We never store tokens or URLs.
export async function logPlaybackAccess(opts: {
  reason:        PlaybackReason;
  memberEmail:   string | null;
  memberUserId:  string | null;
  titleId:       string | null;
  requestedSlug: string | null;
  requestIp:     string | null;
}): Promise<void> {
  try {
    const admin = svc();
    await admin.from("playback_access_logs").insert({
      reason:         opts.reason,
      member_email:   opts.memberEmail,
      member_user_id: opts.memberUserId,
      title_id:       opts.titleId,
      requested_slug: opts.requestedSlug,
      request_ip:     opts.requestIp,
    });
  } catch {
    // Logging must not affect the playback decision.
  }
}

// Upsert a watch_sessions row when a fresh signed URL is issued. Best-effort.
export async function recordWatchSession(opts: {
  memberEmail:  string;
  memberUserId: string | null;
  titleId:      string;
  expiresAt:    number; // unix seconds
}): Promise<void> {
  try {
    const admin = svc();
    const expiresIso = new Date(opts.expiresAt * 1000).toISOString();

    // We treat (member_email, title_id) as the natural session key for
    // ops aggregation. Find the most recent open session for this pair
    // and increment, otherwise insert a new row.
    const { data: existing } = await admin
      .from("watch_sessions")
      .select("id, token_issue_count")
      .eq("member_email", opts.memberEmail)
      .eq("title_id", opts.titleId)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      await admin
        .from("watch_sessions")
        .update({
          last_token_issued_at: new Date().toISOString(),
          expires_at:           expiresIso,
          token_issue_count:    (existing.token_issue_count ?? 1) + 1,
          updated_at:           new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await admin.from("watch_sessions").insert({
        member_email:         opts.memberEmail,
        member_user_id:       opts.memberUserId,
        title_id:             opts.titleId,
        expires_at:           expiresIso,
      });
    }
  } catch {
    // Session bookkeeping must not affect playback.
  }
}

// Core resolver: takes minimal request inputs, runs every gate, returns a
// structured PlaybackResolution. The HTTP route is responsible for translating
// `reason` to an HTTP status.
export async function resolvePlaybackAccess(opts: {
  authenticated:     boolean;
  authenticatedEmail: string | null;
  titleId?:          string | null;
  slug?:             string | null;
}): Promise<PlaybackResolution> {
  // 1. Auth gate.
  if (!opts.authenticated || !opts.authenticatedEmail) {
    return { ok: false, reason: "not_authenticated" };
  }

  // 2. Member gate. Creator-only users without a member_profiles row are
  //    NOT auto-promoted here. They must complete /signup as a Member.
  const isMember = await isMemberEmail(opts.authenticatedEmail);
  if (!isMember) {
    return { ok: false, reason: "not_member" };
  }

  // 3. Title resolution.
  const resolved = await resolveTitleByIdOrSlug({
    titleId: opts.titleId ?? null,
    slug:    opts.slug    ?? null,
  });
  if (!resolved.ok) {
    return { ok: false, reason: "title_not_found" };
  }

  const t = resolved.titleRow;
  const p = resolved.projectRow;

  // Build a minimal title summary used by both success and failure UX so
  // the client can render the title name + a "Visit Creator" CTA when
  // appropriate.
  const attribution = await resolveCreatorAttribution(t.creator_email);
  const titleSummary: PlaybackTitleSummary = {
    id:            t.id,
    title:         p?.title || "Untitled",
    type:          (p?.project_type || "").toLowerCase() === "series" ? "series" : "movie",
    backdropUrl:   p?.banner_url || p?.cover_image_url || t.bunny_thumbnail_url || null,
    creatorHandle: attribution.creatorHandle,
    creatorName:   attribution.creatorName,
  };

  // 4. Distribution status gate.
  if (t.status !== "active") {
    return { ok: false, reason: "title_unavailable", title: titleSummary };
  }

  // 5. Media readiness gate.
  if (t.media_ready !== true || !t.bunny_video_id) {
    return { ok: false, reason: "media_not_ready", title: titleSummary };
  }

  // 6. Distribution window gate (titles.distribution_start/end).
  const now = Date.now();
  const distStartOk =
    !t.distribution_start || new Date(t.distribution_start).getTime() <= now;
  const distEndOk =
    !t.distribution_end || new Date(t.distribution_end).getTime() >= now;
  if (!distStartOk || !distEndOk) {
    return { ok: false, reason: "title_unavailable", title: titleSummary };
  }

  // 7. License term gate.
  const inLicenseTerm = await isInLicenseTerm(t.project_id);
  if (!inLicenseTerm) {
    return { ok: false, reason: "license_out_of_term", title: titleSummary };
  }

  // 8. Sign the embed URL.
  const signed = signBunnyEmbedUrl(t.bunny_video_id, PLAYBACK_TTL_SECONDS);
  if (!signed.ok) {
    if (signed.error === "signing_key_not_configured" || signed.error === "library_not_configured") {
      return { ok: false, reason: "playback_not_configured", title: titleSummary };
    }
    return { ok: false, reason: "media_not_ready", title: titleSummary };
  }

  return {
    ok:          true,
    reason:      "allowed",
    playbackUrl: signed.embedUrl,
    expiresAt:   signed.expiresAt,
    title:       titleSummary,
  };
}
