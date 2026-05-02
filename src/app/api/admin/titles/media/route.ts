import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function checkAuth(req: NextRequest) {
  const pw = req.headers.get("x-admin-password");
  return pw === process.env.ADMIN_PASSWORD;
}

type ProcessingAction =
  | "submitted_for_processing"
  | "processing_reset"
  | "binding_updated";

type ProcessingEntry = {
  action: ProcessingAction;
  by:     "admin";
  at:     string;
  reason: string | null;
};

function readHistory(value: unknown): ProcessingEntry[] {
  return Array.isArray(value) ? (value as ProcessingEntry[]) : [];
}

// Admin Media Processing Lock v1.
//
// Three explicit operations, none of them silent toggles:
//
//   1. Save Bunny binding   — body has bunnyVideoId / bunnyThumbnailUrl,
//                              media_ready not changed.
//   2. action: "submitForProcessing"
//                            — flip media_ready false → true. Requires
//                              an existing or supplied bunny_video_id.
//   3. action: "resetProcessing"
//                            — flip media_ready true → false. Requires a
//                              non-empty reason. Bunny video ID is
//                              preserved. Title must be active.
//
// `mediaReady: false` over the wire is rejected — it would be a casual
// withdrawal. The only path back to media_ready=false is resetProcessing.
export async function PATCH(req: NextRequest) {
  if (!checkAuth(req)) return unauthorized();

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { projectId, bunnyVideoId, bunnyThumbnailUrl, mediaReady, action } = body;

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  // Resolve the active title row for this project.
  const { data: titleRow, error: lookupError } = await supabase
    .from("titles")
    .select("id, status, bunny_video_id, bunny_thumbnail_url, media_ready, media_processing_history")
    .eq("project_id", projectId)
    .neq("status", "removed")
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json({ error: lookupError.message }, { status: 500 });
  }
  if (!titleRow) {
    return NextResponse.json(
      { error: "No active title exists for this project. Activate distribution first." },
      { status: 404 }
    );
  }

  const now = new Date().toISOString();
  const history = readHistory((titleRow as any).media_processing_history);

  // ── Action: submit for processing ─────────────────────────────────────
  if (action === "submitForProcessing") {
    if (titleRow.status !== "active") {
      return NextResponse.json(
        {
          error:
            "Submit for processing is only valid on active titles. " +
            "Restore distribution before submitting media.",
        },
        { status: 422 }
      );
    }
    if (titleRow.media_ready === true) {
      return NextResponse.json(
        { error: "Processing has already been submitted. Use Reset processing status to restart." },
        { status: 422 }
      );
    }
    const incomingId = typeof bunnyVideoId === "string" ? bunnyVideoId.trim() : "";
    const effectiveId = incomingId || titleRow.bunny_video_id || "";
    if (!effectiveId) {
      return NextResponse.json(
        { error: "Cannot submit for processing without a Bunny video ID." },
        { status: 422 }
      );
    }

    const entry: ProcessingEntry = {
      action: "submitted_for_processing",
      by:     "admin",
      at:     now,
      reason: null,
    };

    const updates: Record<string, any> = {
      media_ready:                   true,
      bunny_video_id:                effectiveId,
      media_processing_submitted_at: now,
      media_processing_history:      [...history, entry],
      updated_at:                    now,
    };
    if (typeof bunnyThumbnailUrl === "string") {
      updates.bunny_thumbnail_url = bunnyThumbnailUrl.trim() || null;
    }

    const { error: updErr } = await supabase
      .from("titles")
      .update(updates)
      .eq("id", titleRow.id);
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }
    return refreshAndReturn(titleRow.id);
  }

  // ── Action: reset processing ──────────────────────────────────────────
  if (action === "resetProcessing") {
    if (titleRow.status !== "active") {
      return NextResponse.json(
        { error: "Reset is not valid for inactive titles." },
        { status: 422 }
      );
    }
    if (titleRow.media_ready !== true) {
      return NextResponse.json(
        { error: "Processing is not currently submitted; nothing to reset." },
        { status: 422 }
      );
    }
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (!reason) {
      return NextResponse.json(
        { error: "A reason is required to reset processing status." },
        { status: 422 }
      );
    }

    const entry: ProcessingEntry = {
      action: "processing_reset",
      by:     "admin",
      at:     now,
      reason,
    };

    // Reset preserves the Bunny video ID and thumbnail. Only media_ready
    // and the reset stamps move.
    const updates: Record<string, any> = {
      media_ready:                   false,
      media_processing_reset_at:     now,
      media_processing_reset_reason: reason,
      media_processing_history:      [...history, entry],
      updated_at:                    now,
    };

    const { error: updErr } = await supabase
      .from("titles")
      .update(updates)
      .eq("id", titleRow.id);
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }
    return refreshAndReturn(titleRow.id);
  }

  // ── Save binding (no action specified) ────────────────────────────────
  // Casual mediaReady toggling is forbidden. mediaReady=true must go through
  // submitForProcessing; mediaReady=false must go through resetProcessing.
  if (mediaReady !== undefined) {
    return NextResponse.json(
      {
        error:
          'Direct media_ready toggling is not supported. Use action: "submitForProcessing" or action: "resetProcessing".',
      },
      { status: 422 }
    );
  }

  const updates: Record<string, any> = { updated_at: now };
  if (bunnyVideoId !== undefined)      updates.bunny_video_id      = (typeof bunnyVideoId === "string" ? bunnyVideoId.trim() : "") || null;
  if (bunnyThumbnailUrl !== undefined) updates.bunny_thumbnail_url = (typeof bunnyThumbnailUrl === "string" ? bunnyThumbnailUrl.trim() : "") || null;

  // If a Save call clears the Bunny video ID while media_ready is true,
  // refuse — that would silently break processing without a reset audit.
  if (updates.bunny_video_id === null && titleRow.media_ready === true) {
    return NextResponse.json(
      { error: "Cannot clear the Bunny video ID while processing is submitted. Reset processing first." },
      { status: 422 }
    );
  }

  if (Object.keys(updates).length === 1) {
    // Only updated_at — nothing to do.
    return refreshAndReturn(titleRow.id);
  }

  // Log binding edits to the audit history (reason null) so admins can see
  // when the Bunny ID was last changed.
  if (updates.bunny_video_id !== undefined || updates.bunny_thumbnail_url !== undefined) {
    const entry: ProcessingEntry = {
      action: "binding_updated",
      by:     "admin",
      at:     now,
      reason: null,
    };
    updates.media_processing_history = [...history, entry];
  }

  const { error: updErr } = await supabase
    .from("titles")
    .update(updates)
    .eq("id", titleRow.id);
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return refreshAndReturn(titleRow.id);
}

async function refreshAndReturn(titleId: string) {
  const { data: refreshed } = await supabase
    .from("titles")
    .select(
      "id, project_id, bunny_video_id, bunny_thumbnail_url, media_ready, status, " +
        "media_processing_submitted_at, media_processing_reset_at, media_processing_reset_reason, media_processing_history"
    )
    .eq("id", titleId)
    .single();
  return NextResponse.json({ success: true, title: refreshed ?? null });
}
