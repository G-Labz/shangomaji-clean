"use client";

import { useState, useEffect } from "react";
import SubmissionReviewPanel, {
  emptyReview,
  reviewFromProject,
  reviewToPayload,
  gateState,
  type AdminReviewState,
} from "./SubmissionReviewPanel";

interface Application {
  id: string;
  submitted_at: string;
  status: string;
  approved_creator: boolean;
  name: string;
  // Phase 10K — Public / Credited Name. Required for new submissions
  // (validated at the apply API + form). Older rows submitted before
  // Phase 10K may be null; admin display falls back to "Not provided".
  credited_name: string | null;
  handle: string;
  email: string;
  origin: string;
  project_title: string;
  project_type: string;
  genres: string[];
  logline: string;
  sample_url: string;
  influences: string;
  why_shangomaji: string;
  what_you_need: string;
  instagram: string;
  twitter: string;
  youtube: string;
  website: string;
}

export default function AdminPage() {
  const [password, setPassword]     = useState("");
  const [authed, setAuthed]         = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [filter, setFilter]         = useState<"all" | "pending" | "accepted" | "rejected" | "archived">("all");
  const [showRejected, setShowRejected] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [view, setView]             = useState<"applications" | "projects">("applications");
  const [projectList, setProjectList]   = useState<any[]>([]);
  // Works tab navigation by Mission Control bucket (Phase 7.2). Buckets
  // describe operational next-step rather than raw DB status, and are
  // derived from the same fields the public visibility diagnostic reads
  // (see classifyBucket below). Default to "all" so the founder sees
  // everything on load and drills in via cards/chips.
  const [projectFilter, setProjectFilter] = useState<BucketKey | "all">("all");
  const [projectLoading, setProjectLoading] = useState(false);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  // Phase 7.3 — Mission Control architecture: command-detail selection.
  // The desktop layout renders the queue on the left and a single command
  // detail panel on the right. These IDs track which record the right
  // panel currently shows. Selection is purely client-side and never
  // mutates server data; if the selected ID falls out of the filtered
  // list (e.g., the admin changes filter) the derivation below picks the
  // first available row so the panel never blanks unexpectedly while
  // there are still records to inspect.
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [selectedWorkId,        setSelectedWorkId]        = useState<string | null>(null);

  // Lifecycle control busy flags (per-project, per-action)
  const [restoreBusy, setRestoreBusy] = useState<string | null>(null);
  const [reopenBusy,  setReopenBusy]  = useState<string | null>(null);
  const [removalBusy, setRemovalBusy] = useState<string | null>(null);

  // System Authority Layer v1 — styled decision modals replacing native
  // window.prompt / confirm() flows. Each modal carries its own busy +
  // error state so background table refreshes don't blank user input.
  type RemovalTarget = { id: string; title: string };
  const [approveRemovalTarget, setApproveRemovalTarget] = useState<RemovalTarget | null>(null);
  const [approveRemovalReason, setApproveRemovalReason] = useState("");
  const [approveRemovalBusy,   setApproveRemovalBusy]   = useState(false);
  const [approveRemovalError,  setApproveRemovalError]  = useState("");

  const [denyRemovalTarget, setDenyRemovalTarget] = useState<RemovalTarget | null>(null);
  const [denyRemovalReason, setDenyRemovalReason] = useState("");
  const [denyRemovalBusy,   setDenyRemovalBusy]   = useState(false);
  const [denyRemovalError,  setDenyRemovalError]  = useState("");

  // Non-live archive (pending/in_review/approved/rejected) uses a styled
  // confirmation rather than the typed-title gate live archive uses.
  const [archiveHoldTarget, setArchiveHoldTarget] = useState<RemovalTarget | null>(null);
  const [archiveHoldBusy,   setArchiveHoldBusy]   = useState(false);
  const [archiveHoldError,  setArchiveHoldError]  = useState("");

  // Rejection reason state — tracks which project is being rejected
  const [rejectingId, setRejectingId]         = useState<string | null>(null);
  const [rejectionInput, setRejectionInput]   = useState("");
  const [rejectBusy, setRejectBusy]           = useState(false);

  // Bunny media binding (Phase 1) — keyed by project id
  const [mediaInputs, setMediaInputs] = useState<Record<string, string>>({});
  const [mediaBusy, setMediaBusy]     = useState<string | null>(null);

  // Admin Media Processing Lock v1 — reset modal state
  const [resetTarget, setResetTarget] = useState<{ id: string; title: string } | null>(null);
  const [resetReason, setResetReason] = useState("");
  const [resetBusy,   setResetBusy]   = useState(false);
  const [resetError,  setResetError]  = useState("");

  // Admin refresh button busy flag
  const [refreshing, setRefreshing] = useState(false);

  // Phase 1 — Creator Public Profile force-unpublish modal state.
  type ProfileTarget = { email: string; title: string; handle: string | null };
  const [forceUnpublishTarget, setForceUnpublishTarget] = useState<ProfileTarget | null>(null);
  const [forceUnpublishReason, setForceUnpublishReason] = useState("");
  const [forceUnpublishBusy,   setForceUnpublishBusy]   = useState(false);
  const [forceUnpublishError,  setForceUnpublishError]  = useState("");
  const [restoreProfileBusy,   setRestoreProfileBusy]   = useState<string | null>(null);

  async function adminForceUnpublishProfile(email: string, reason: string) {
    const res = await fetch("/api/admin/creator-profiles", {
      method:  "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body:    JSON.stringify({ email, action: "force_unpublish", reason }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Force-unpublish failed");
    await loadProjects();
  }

  async function adminRestoreProfile(email: string) {
    setRestoreProfileBusy(email);
    try {
      const res = await fetch("/api/admin/creator-profiles", {
        method:  "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body:    JSON.stringify({ email, action: "restore" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Restore failed");
      await loadProjects();
    } catch (e: any) {
      alert(e?.message || "Restore failed");
    } finally {
      setRestoreProfileBusy(null);
    }
  }

  // Submission Integrity v1 — admin review state per project (keyed by id).
  // Lazily seeded from the project record when an admin expands it.
  const [reviewByProject, setReviewByProject] = useState<Record<string, AdminReviewState>>({});
  const [reviewBusy, setReviewBusy]           = useState<string | null>(null);
  const [reviewSavedFor, setReviewSavedFor]   = useState<string | null>(null);

  // Seed review state on first expand of each project. Once seeded, the
  // local state is the source of truth until the admin saves or approves
  // (which round-trips to the API and then we re-seed from the response).
  useEffect(() => {
    if (!expandedProject) return;
    if (reviewByProject[expandedProject]) return;
    const proj = projectList.find((p: any) => p.id === expandedProject);
    if (!proj) return;
    setReviewByProject((prev) => ({
      ...prev,
      [expandedProject]: reviewFromProject(proj),
    }));
  }, [expandedProject, projectList, reviewByProject]);

  function setReviewFor(projectId: string, next: AdminReviewState) {
    setReviewByProject((prev) => ({ ...prev, [projectId]: next }));
    if (reviewSavedFor === projectId) setReviewSavedFor(null);
  }

  async function saveReviewNotes(projectId: string) {
    const review = reviewByProject[projectId];
    if (!review) return;
    setReviewBusy(projectId);
    try {
      const payload = reviewToPayload(review);
      const res = await fetch("/api/admin/projects", {
        method:  "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body:    JSON.stringify({ id: projectId, action: "saveReview", ...payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Save failed");
      // Reflect persisted reviewed_at/by on the local row so the panel updates.
      const now = new Date().toISOString();
      setProjectList((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? {
                ...p,
                ...payload,
                reviewed_at: now,
                reviewed_by:  p.reviewed_by ?? "admin",
              }
            : p
        )
      );
      // Re-sync the local review state from the canonical post-save shape so
      // the gate reads from the same values that were just persisted. Without
      // this, multi-tab / concurrent-admin saves can leave the locked-button
      // gate computing against a stale local copy.
      const synced = reviewFromProject({
        review_thesis_confirmed:              payload.review_thesis_confirmed,
        review_meaningful_presence_rationale: payload.review_meaningful_presence_rationale,
        review_rights_posture:                payload.review_rights_posture,
        review_craft_result:                  payload.review_craft_result,
        review_catalog_fit:                   payload.review_catalog_fit,
        review_decision_record:               payload.review_decision_record,
        review_risk_notes:                    payload.review_risk_notes,
      });
      setReviewByProject((prev) => ({ ...prev, [projectId]: synced }));
      setReviewSavedFor(projectId);
      setTimeout(() => setReviewSavedFor((cur) => (cur === projectId ? null : cur)), 2000);
    } catch (e: any) {
      alert(e.message || "Save failed");
    } finally {
      setReviewBusy(null);
    }
  }

  // Archive confirmation gate — typed-title required before archive proceeds.
  // Archive removes a live work from the public catalog. It is intentionally
  // not a one-click action.
  const [archiveTarget, setArchiveTarget]   = useState<{ id: string; title: string } | null>(null);
  const [archiveConfirm, setArchiveConfirm] = useState("");
  const [archiveBusy, setArchiveBusy]       = useState(false);
  const [archiveError, setArchiveError]     = useState("");

  const headers = { "x-admin-password": password };

  async function login() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/applications", { headers });
      if (!res.ok) throw new Error("Wrong password");
      const data = await res.json();
      setApplications(data.applications);
      setAuthed(true);
      fetch("/api/admin/projects", { headers: { "x-admin-password": password } })
        .then((r) => r.json())
        .then((d) => setProjectList(d.projects ?? []))
        .catch(() => {});
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    try {
      const res = await fetch("/api/admin/applications", {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json().catch(() => ({}));

      // 207: status updated but onboarding invite failed — surface the warning
      if (res.status === 207) {
        const approved = data?.application?.approved_creator ?? status === "accepted";
        setApplications((prev) =>
          prev.map((app) =>
            app.id === id ? { ...app, status, approved_creator: approved } : app
          )
        );
        alert(`⚠️ Onboarding warning:\n\n${data.onboardingWarning}`);
        return;
      }

      if (!res.ok) {
        console.error("Admin status update failed", data?.error || res.statusText);
        throw new Error(data?.error || "Update failed");
      }

      const approved = data?.application?.approved_creator ?? status === "accepted";
      setApplications((prev) =>
        prev.map((app) =>
          app.id === id ? { ...app, status, approved_creator: approved } : app
        )
      );

      // Confirm invite was sent when accepting
      if (status === "accepted") {
        alert(`✓ Creator accepted. Onboarding invite sent to ${data.application?.email || "their email"}.`);
      }
    } catch (e: any) {
      console.error("Admin update error", e);
      alert(e.message);
    }
  }

  async function deleteApplication(id: string) {
    if (!confirm("Delete this application permanently?")) return;
    try {
      const res = await fetch("/api/admin/applications", {
        method: "DELETE",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Delete failed");
      setApplications((prev) => prev.filter((app) => app.id !== id));
      setExpanded(null);
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function loadProjects() {
    setProjectLoading(true);
    try {
      const res = await fetch("/api/admin/projects", { headers });
      if (!res.ok) throw new Error("Failed to load projects");
      const data = await res.json();
      setProjectList(data.projects ?? []);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setProjectLoading(false);
    }
  }

  // Refresh both applications and works without browser reload or sign-out.
  // Used by the visible "Refresh Data" button in the admin header.
  async function refreshAll() {
    setRefreshing(true);
    try {
      const [appsRes, projRes] = await Promise.all([
        fetch("/api/admin/applications", { headers }),
        fetch("/api/admin/projects",      { headers }),
      ]);
      if (appsRes.ok) {
        const appsData = await appsRes.json();
        setApplications(appsData.applications ?? []);
      }
      if (projRes.ok) {
        const projData = await projRes.json();
        setProjectList(projData.projects ?? []);
      }
    } catch (e: any) {
      alert(e?.message || "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  }

  // Standard status update (non-rejection)
  async function updateProjectStatus(projectId: string, status: string) {
    try {
      // When approving, include the local review record so the server gate
      // can validate against the latest state without requiring a separate
      // Save Review press first.
      const reviewPayload =
        status === "approved" && reviewByProject[projectId]
          ? reviewToPayload(reviewByProject[projectId])
          : {};
      const res = await fetch("/api/admin/projects", {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ id: projectId, status, ...reviewPayload }),
      });
      const data = await res.json();

      // 207 — transition committed but a side-effect (title creation, license
      // term stamping, license-required email) failed. Update local state
      // truthfully and surface whichever warning came back.
      if (res.status === 207) {
        setProjectList((prev) =>
          prev.map((p) =>
            p.id === projectId
              ? { ...p, status, updated_at: new Date().toISOString() }
              : p
          )
        );
        const warning =
          data?.distributionWarning ||
          data?.licenseEmailWarning  ||
          "Side-effect warning (no detail).";
        alert(`⚠️ Warning:\n\n${warning}`);
        return;
      }

      if (!res.ok) throw new Error(data?.error || "Update failed");
      setProjectList((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? { ...p, status, updated_at: new Date().toISOString() }
            : p
        )
      );
    } catch (e: any) {
      alert(e.message);
      // Reload from server so local state reflects actual DB state.
      // This prevents stale-state issues (e.g. Archive button remaining
      // visible after a failed or already-completed transition).
      loadProjects();
    }
  }

  // Rejection — requires a reason
  async function confirmReject(projectId: string) {
    if (!rejectionInput.trim()) {
      alert("A rejection reason is required.");
      return;
    }
    setRejectBusy(true);
    try {
      const res = await fetch("/api/admin/projects", {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ id: projectId, status: "rejected", rejectionReason: rejectionInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Reject failed");
      setProjectList((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? { ...p, status: "rejected", rejection_reason: rejectionInput.trim(), updated_at: new Date().toISOString() }
            : p
        )
      );
      setRejectingId(null);
      setRejectionInput("");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setRejectBusy(false);
    }
  }

  // Archive — live archives require typed-title confirmation. Other source
  // states are archived without confirmation (still gated server-side).
  async function confirmArchive() {
    if (!archiveTarget) return;
    const expected = archiveTarget.title.trim();
    const provided = archiveConfirm.trim();
    if (!expected || provided !== expected) {
      setArchiveError("Typed title does not match.");
      return;
    }
    setArchiveBusy(true);
    setArchiveError("");
    try {
      const res = await fetch("/api/admin/projects", {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          id: archiveTarget.id,
          action: "archive",
          confirmTitle: provided,
        }),
      });
      const data = await res.json();

      // 207 — archive committed but the title cascade failed; still update UI.
      if (res.status === 207) {
        setProjectList((prev) =>
          prev.map((p) =>
            p.id === archiveTarget.id
              ? { ...p, status: "archived", updated_at: new Date().toISOString() }
              : p
          )
        );
        alert(`⚠️ Distribution warning:\n\n${data.distributionWarning}`);
        setArchiveTarget(null);
        setArchiveConfirm("");
        return;
      }

      if (!res.ok) throw new Error(data?.error || "Archive failed");

      setProjectList((prev) =>
        prev.map((p) =>
          p.id === archiveTarget.id
            ? { ...p, status: "archived", updated_at: new Date().toISOString() }
            : p
        )
      );
      setArchiveTarget(null);
      setArchiveConfirm("");
    } catch (e: any) {
      setArchiveError(e.message || "Archive failed");
    } finally {
      setArchiveBusy(false);
    }
  }

  // ── Lifecycle Control v1: archive (non-live), restore, reopen, resolveRemoval ──
  // Lightweight admin actions. Each round-trips the API and reloads the row
  // from the server so the UI never lies about the post-action state.
  async function archiveToInternalHold(projectId: string): Promise<void> {
    // Server-only call. The styled confirmation modal owns the gate.
    const res = await fetch("/api/admin/projects", {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ id: projectId, action: "archive" }),
    });
    const data = await res.json();
    if (res.status === 207) {
      await loadProjects();
      throw new Error(data?.distributionWarning || "Archive completed with a warning.");
    }
    if (!res.ok) throw new Error(data?.error || "Archive failed");
    await loadProjects();
  }

  async function restoreFromArchive(projectId: string) {
    setRestoreBusy(projectId);
    try {
      const res = await fetch("/api/admin/projects", {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ id: projectId, action: "restore" }),
      });
      const data = await res.json();
      if (res.status === 207) {
        await loadProjects();
        alert(`⚠️ ${data?.distributionWarning || "Restore completed with a warning."}`);
        return;
      }
      if (!res.ok) throw new Error(data?.error || "Restore failed");
      await loadProjects();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setRestoreBusy(null);
    }
  }

  async function reopenForReview(projectId: string) {
    setReopenBusy(projectId);
    try {
      const res = await fetch("/api/admin/projects", {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ id: projectId, action: "reopen" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Reopen failed");
      await loadProjects();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setReopenBusy(null);
    }
  }

  async function resolveRemoval(
    projectId: string,
    decision: "approve" | "deny",
    reason?: string
  ) {
    setRemovalBusy(projectId);
    try {
      const res = await fetch("/api/admin/projects", {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          id: projectId,
          action: "resolveRemoval",
          decision,
          ...(reason && reason.trim() ? { reason: reason.trim() } : {}),
        }),
      });
      const data = await res.json();
      if (res.status === 207) {
        await loadProjects();
        alert(`⚠️ ${data?.distributionWarning || "Resolution completed with a warning."}`);
        return;
      }
      if (!res.ok) throw new Error(data?.error || "Resolution failed");
      await loadProjects();
    } catch (e: any) {
      // Re-throw so the calling modal can surface the error in its own
      // styled error state. We do NOT alert() here — every caller is a
      // styled modal that owns the failure surface.
      throw e;
    } finally {
      setRemovalBusy(null);
    }
  }

  // Apply a /api/admin/titles/media response to local state, mirroring all
  // audit columns so the UI never renders stale processing state after an
  // action. Used by save / submit / reset.
  function applyMediaResponse(projectId: string, data: any) {
    setProjectList((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? {
              ...p,
              bunny_video_id:                 data.title?.bunny_video_id                 ?? p.bunny_video_id,
              bunny_thumbnail_url:            data.title?.bunny_thumbnail_url            ?? p.bunny_thumbnail_url,
              media_ready:                    data.title?.media_ready                    ?? p.media_ready,
              media_processing_submitted_at:  data.title?.media_processing_submitted_at  ?? p.media_processing_submitted_at,
              media_processing_reset_at:      data.title?.media_processing_reset_at      ?? p.media_processing_reset_at,
              media_processing_reset_reason:  data.title?.media_processing_reset_reason  ?? p.media_processing_reset_reason,
              media_processing_history:       data.title?.media_processing_history       ?? p.media_processing_history,
            }
          : p
      )
    );
  }

  // Save Bunny video ID only. media_ready is intentionally not part of this
  // call — the API rejects direct toggles. Submit/Reset are separate actions.
  async function saveBunnyId(projectId: string, bunnyVideoId: string) {
    setMediaBusy(projectId);
    try {
      const res = await fetch("/api/admin/titles/media", {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, bunnyVideoId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Media update failed");
      applyMediaResponse(projectId, data);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setMediaBusy(null);
    }
  }

  async function submitMediaForProcessing(projectId: string, bunnyVideoId?: string) {
    setMediaBusy(projectId);
    try {
      const res = await fetch("/api/admin/titles/media", {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          action: "submitForProcessing",
          ...(bunnyVideoId ? { bunnyVideoId } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Submit for processing failed");
      applyMediaResponse(projectId, data);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setMediaBusy(null);
    }
  }

  async function resetMediaProcessing(projectId: string, reason: string) {
    setMediaBusy(projectId);
    try {
      const res = await fetch("/api/admin/titles/media", {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, action: "resetProcessing", reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Reset failed");
      applyMediaResponse(projectId, data);
    } catch (e: any) {
      throw e;
    } finally {
      setMediaBusy(null);
    }
  }

  // Phase 7.2: bucket counts power the readiness cards, the chip row,
  // and the launch readiness pill — derived once from classifyBucket so
  // every Mission Control surface stays consistent with the per-row
  // public visibility diagnostic.
  const bucketCounts = projectList.reduce<Record<BucketKey, number>>(
    (acc, p) => {
      const k = classifyBucket(p);
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    },
    { ...EMPTY_BUCKET_COUNTS }
  );
  const totalProjects = projectList.length;

  const filteredProjects =
    projectFilter === "all"
      ? projectList
      : projectList.filter((p) => classifyBucket(p) === projectFilter);

  // Phase 7.3 — derive the effective work selection. The user's explicit
  // selectedWorkId is honored when present in the filtered list; otherwise
  // fall back to the first row so the command detail panel does not blank
  // out unexpectedly while there are still records to inspect.
  const effectiveSelectedWorkId =
    selectedWorkId && filteredProjects.find((p: any) => p.id === selectedWorkId)
      ? selectedWorkId
      : filteredProjects[0]?.id ?? null;
  const selectedWork =
    effectiveSelectedWorkId
      ? filteredProjects.find((p: any) => p.id === effectiveSelectedWorkId) ?? null
      : null;

  const launchReadiness = deriveLaunchReadiness(bucketCounts);

  const EMPTY_COPY: Record<BucketKey | "all", string> = {
    all:              "No works in this state.",
    needs_review:     "No works awaiting review.",
    needs_license:    "No public blockers in this category.",
    needs_activation: "No public blockers in this category.",
    needs_bunny:      "No public blockers in this category.",
    needs_processing: "No public blockers in this category.",
    public_ready:     "No works in this state.",
    internal_hold:    "No works in this state.",
    draft:            "No works in this state.",
  };

  const removalQueue = projectList.filter((p) => p.status === "removal_requested");

  const projectStatusColor: Record<string, string> = {
    pending:           "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    in_review:         "bg-blue-500/20 text-blue-400 border-blue-500/30",
    approved:          "bg-teal-500/20 text-teal-400 border-teal-500/30",
    rejected:          "bg-red-500/20 text-red-400 border-red-500/30",
    live:              "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    archived:          "bg-white/10 text-neutral-400 border-white/10",
    removal_requested: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    removed:           "bg-red-900/30 text-red-300 border-red-500/30",
  };

  function statusDisplay(s: string): string {
    if (s === "in_review") return "In Review";
    if (s === "removal_requested") return "Removal Requested";
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // Default visible = pending + accepted. Rejected and Archived require an
  // explicit toggle so the working list stays focused on actionable rows.
  const visibleByToggle = applications.filter((a) => {
    if (a.status === "rejected" && !showRejected) return false;
    if (a.status === "archived" && !showArchived) return false;
    return true;
  });
  const filtered =
    filter === "all"
      ? visibleByToggle
      : visibleByToggle.filter((a) => a.status === filter);

  // Phase 7.3 — same derivation pattern for the applications selection.
  const effectiveSelectedApplicationId =
    selectedApplicationId && filtered.find((a) => a.id === selectedApplicationId)
      ? selectedApplicationId
      : filtered[0]?.id ?? null;
  const selectedApplication =
    effectiveSelectedApplicationId
      ? filtered.find((a) => a.id === effectiveSelectedApplicationId) ?? null
      : null;

  const counts = {
    all:      visibleByToggle.length,
    pending:  applications.filter((a) => a.status === "pending").length,
    accepted: applications.filter((a) => a.status === "accepted").length,
    rejected: applications.filter((a) => a.status === "rejected").length,
    archived: applications.filter((a) => a.status === "archived").length,
  };

  const statusColor: Record<string, string> = {
    pending:  "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    accepted: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    rejected: "bg-red-500/20 text-red-400 border-red-500/30",
    archived: "bg-white/5 text-neutral-400 border-white/10",
  };

  // ── Password gate ──
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <h1
              className="text-2xl font-semibold text-white tracking-wide"
              style={{ fontFamily: "var(--font-display)" }}
            >
              SHANGOMAJI
            </h1>
            <p className="text-sm text-neutral-500 mt-1">Admin</p>
          </div>
          <div className="space-y-3">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && login()}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500/50 transition"
            />
            <button
              onClick={login}
              disabled={loading || !password}
              className="w-full py-3 rounded-lg font-medium text-sm transition"
              style={{
                background: "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)",
                color: "#000",
                opacity: loading || !password ? 0.5 : 1,
              }}
            >
              {loading ? "Checking..." : "Enter"}
            </button>
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          </div>
        </div>
      </div>
    );
  }

  // ── Phase 7.3 — Command-detail render helpers ──
  //
  // The Mission Control architecture renders the same detail content in
  // two places: inline-under-row on tablet/mobile (xl:hidden) and in the
  // right command panel on desktop (hidden xl:block). Both call sites
  // pass the selected record into one of these helpers so the detail
  // markup stays single-source. They are declared inside AdminPage so
  // they close over the page state and handlers; behavior is preserved
  // exactly — no API, schema, lifecycle, gate, license, or media logic
  // moves. Phase 7.3 Layer 2E.3: the two-column board collapses earlier
  // (xl: instead of lg:) so the right detail panel never squeezes into
  // a skinny sidebar at narrow desktop widths.
  function renderApplicationDetail(app: Application) {
    return (
      <div className="space-y-4">
        {/* HEADER — applicant identity (priority 1).
            Phase 10K: legal name remains the primary identifier (used
            for review, rights verification, and licensing). The Public
            / Credited Name is surfaced immediately beneath as a
            distinct identity row so admin sees both at a glance.
            Older rows submitted before Phase 10K may have a null
            credited_name; we render "Not provided" rather than mutate
            old data. */}
        <div className="pb-3 border-b border-white/8">
          <p className="text-[10px] uppercase tracking-[0.24em] text-orange-400/80 font-semibold mb-2">
            Selected Application
          </p>
          <h2
            className="text-2xl font-semibold text-white leading-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {app.name || "—"}
          </h2>
          <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500 font-semibold mt-1">
            Legal name
          </p>

          <div className="mt-3 pt-3 border-t border-white/10">
            <p className="text-[10px] uppercase tracking-[0.18em] text-amber-400/75 font-semibold">
              Public / Credited Name
            </p>
            <p className="text-base text-white mt-1 break-words">
              {app.credited_name?.trim()
                ? app.credited_name
                : <span className="text-neutral-500 italic">Not provided</span>}
            </p>
          </div>

          <p className="text-xs text-neutral-400 break-words mt-3">
            {app.handle ? `@${app.handle}` : "no handle"}
            {app.email ? ` · ${app.email}` : ""}
          </p>
          <div className="flex items-center gap-2 flex-wrap mt-3">
            <span
              className={`text-[11px] px-2 py-0.5 rounded border ${
                statusColor[app.status] || "text-neutral-400"
              }`}
            >
              {app.status}
            </span>
            <span className="text-neutral-600 text-[11px] tabular-nums">
              Submitted {new Date(app.submitted_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* SUBMISSION (priority 2) */}
        <section className="rounded-lg border border-white/8 bg-white/[0.02] p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-400 mb-3 font-medium">
            Submission
          </p>
          <div className="grid grid-cols-1 gap-3 text-sm">
            <Field label="Project Title" value={app.project_title} full />
            <Field label="Project Type" value={app.project_type} />
            <Field label="Genres" value={app.genres?.join(", ")} />
            <Field label="Logline" value={app.logline} full />
            <Field label="Sample URL" value={app.sample_url} link />
            <Field label="Influences" value={app.influences} full />
            <Field label="Why ShangoMaji" value={app.why_shangomaji} full />
            <Field label="What They Need" value={app.what_you_need} full />
          </div>
        </section>

        {/* CONTACT */}
        <section className="rounded-lg border border-white/8 bg-white/[0.02] p-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-400 mb-3 font-medium">
            Contact
          </p>
          <div className="grid grid-cols-1 gap-3 text-sm">
            <Field label="Email" value={app.email} />
            <Field label="Origin" value={app.origin} />
            <Field
              label="Instagram"
              value={app.instagram ? `instagram.com/${app.instagram}` : undefined}
              link
            />
            <Field
              label="X / Twitter"
              value={app.twitter ? `x.com/${app.twitter}` : undefined}
              link
            />
            <Field
              label="YouTube"
              value={app.youtube ? `youtube.com/${app.youtube}` : undefined}
              link
            />
            <Field label="Website" value={app.website} link />
          </div>
        </section>

        {/* AUTHORITY-OF-STATE COPY (status 3, informational) */}
        {(app.status === "accepted" ||
          app.status === "rejected" ||
          app.status === "archived") && (
          <div>
            {app.status === "accepted" && (
              <p className="text-xs text-emerald-300/90">
                Decision finalized — creator onboarded.
              </p>
            )}
            {app.status === "rejected" && (
              <p className="text-xs text-red-300/80">
                Application closed.
              </p>
            )}
            {app.status === "archived" && (
              <p className="text-xs text-neutral-400">
                Archived. Terminal state.
              </p>
            )}
          </div>
        )}

        {/* DECISION CONTROLS (priority 4) + delete (priority 5).
            Phase 8 polish: decision controls and the destructive Delete
            action are visually separated by a thicker top rule and an
            eyebrow label. Delete remains the subordinate trailing
            action so it never reads as primary. */}
        <div className="mt-2 pt-4 border-t border-white/10 flex items-center gap-2 flex-wrap">
          <span className="text-[10px] uppercase tracking-[0.22em] text-neutral-500 font-medium mr-2">
            Set status
          </span>
          {(["pending", "accepted", "rejected"] as const).map((s) => {
            const allowed =
              app.status === "pending" &&
              (s === "accepted" || s === "rejected");
            const isCurrent = app.status === s;
            const disabled = !allowed && !isCurrent;
            return (
              <button
                key={s}
                onClick={() => !disabled && updateStatus(app.id, s)}
                disabled={disabled}
                className={`px-3 py-1.5 rounded text-xs font-medium border transition ${
                  isCurrent
                    ? statusColor[s]
                    : disabled
                    ? "border-white/5 text-neutral-700 cursor-not-allowed"
                    : "border-white/10 text-neutral-500 hover:text-white hover:border-white/20"
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            );
          })}
          {(app.status === "accepted" || app.status === "rejected") && (
            <button
              onClick={() => updateStatus(app.id, "archived")}
              className="px-3 py-1.5 rounded text-xs font-medium border border-white/10 text-neutral-400 hover:text-white hover:border-white/20 transition"
            >
              Archive
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={() => deleteApplication(app.id)}
            className="px-3 py-1.5 rounded text-xs font-medium border border-red-500/20 text-red-400/60 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/10 transition"
          >
            Delete
          </button>
        </div>
      </div>
    );
  }

  function renderProjectDetail(project: any) {
    const reviewState = reviewByProject[project.id] ?? reviewFromProject(project);
    const gate        = gateState(project, reviewState);
    const reviewGateOpen =
      (project.status === "pending" || project.status === "in_review") &&
      !gate.approvalAllowed &&
      !gate.isLegacyMissingIntegrity;
    const showApproveGate =
      project.status === "pending" || project.status === "in_review";

    const missingApprovalReqs: string[] = [];
    if (showApproveGate && !gate.isLegacyMissingIntegrity) {
      const r = reviewState;
      if (!r.review_thesis_confirmed) {
        missingApprovalReqs.push("Confirm thesis fit");
      }
      const rightsPassing =
        r.review_rights_posture === "clear" ||
        r.review_rights_posture === "co_owned_clear";
      if (!rightsPassing) {
        missingApprovalReqs.push("Select a passing rights posture (Clear or Co-owned)");
      }
      const craftPassing = r.review_craft_result === "pass";
      if (!craftPassing) {
        missingApprovalReqs.push("Select a passing craft result (Pass)");
      }
      const fitPassing =
        r.review_catalog_fit === "distinct" ||
        r.review_catalog_fit === "strategic_fit";
      if (!fitPassing) {
        missingApprovalReqs.push("Select a passing catalog fit (Distinct or Strategic fit)");
      }
    }

    const next        = adminNextAction(project);
    const nextEmerald = classifyBucket(project) === "public_ready";

    return (
      <div className="space-y-4">
        {/* HEADER — title / creator / status (priority 1).
            Phase 8 polish: stronger identity block with eyebrow, larger
            title, and a clean meta line; the status badge + last-updated
            stamp share a row so the panel reads as an authoritative
            command surface rather than a stack of fields. */}
        <div className="pb-3 border-b border-white/8">
          <p className="text-[10px] uppercase tracking-[0.24em] text-orange-400/80 font-semibold mb-2">
            Selected Work
          </p>
          <h2
            className="text-2xl font-semibold text-white leading-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {project.title || "Untitled"}
          </h2>
          <p className="text-xs text-neutral-400 break-words mt-1.5">
            {project.creator_email}
            {project.project_type ? ` · ${project.project_type}` : ""}
          </p>
          <div className="flex items-center gap-2 flex-wrap mt-3">
            <span
              className={`text-[11px] px-2 py-0.5 rounded border ${
                projectStatusColor[project.status] || "text-neutral-400"
              }`}
            >
              {statusDisplay(project.status)}
            </span>
            <span className="text-neutral-600 text-[11px] tabular-nums">
              Updated {new Date(project.updated_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* OPERATIONAL SIGNAL BAND — public visibility + next required
            action grouped together at the top for fast scan. */}
        <div className="space-y-2">
          <PublicVisibilityRow project={project} />

          {next && (
            <div
              className={`rounded-md border px-3 py-2 ${
                nextEmerald
                  ? "border-emerald-500/30 bg-emerald-500/[0.06]"
                  : "border-amber-500/30 bg-amber-500/[0.06]"
              }`}
            >
              <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-500 font-medium mb-0.5">
                Next required action
              </p>
              <p
                className={`text-sm leading-snug ${
                  nextEmerald ? "text-emerald-200" : "text-amber-200"
                }`}
              >
                {next}
              </p>
            </div>
          )}
        </div>

        {/* AUTHORITY BLOCKS (status-specific copy) */}
        {project.status === "removed" && (
          <div className="rounded-lg border border-red-500/40 bg-red-900/10 p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-red-300/90 font-semibold mb-2">
              Distribution Status
            </p>
            <h3 className="text-white text-base font-semibold mb-2">
              Permanently Removed
            </h3>
            <p className="text-xs text-neutral-300 leading-relaxed">
              This work is no longer eligible for restoration or public distribution.
              The removal decision is final.
            </p>
          </div>
        )}

        {project.status === "removal_requested" && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-amber-300/90 font-semibold mb-2">
              Removal Review
            </p>
            <h3 className="text-white text-base font-semibold mb-2">
              Removal request under review
            </h3>
            <p className="text-xs text-neutral-300 leading-relaxed">
              The work remains live while ShangoMaji reviews the request.
              Approval permanently removes it from distribution. Denial returns it
              to active distribution.
            </p>
          </div>
        )}

        {(project.rejection_reason ||
          project.removal_request_reason ||
          project.removal_reason ||
          project.removal_requested_at ||
          project.removal_resolution ||
          project.previous_status_before_archive) && (
          <div className="grid grid-cols-1 gap-3 text-sm rounded-lg border border-white/8 bg-white/[0.02] p-4">
            {project.rejection_reason && (
              <Field label="Rejection Reason" value={project.rejection_reason} full />
            )}
            {(project.removal_request_reason || project.removal_reason) && (
              <Field
                label="Removal Request Reason"
                value={project.removal_request_reason || project.removal_reason}
                full
              />
            )}
            {project.removal_requested_at && (
              <Field
                label="Removal Requested"
                value={new Date(project.removal_requested_at).toUTCString()}
              />
            )}
            {project.removal_resolution && (
              <Field
                label="Removal Resolution"
                value={`${project.removal_resolution}${
                  project.removal_resolved_at
                    ? ` · ${new Date(project.removal_resolved_at).toUTCString()}`
                    : ""
                }${
                  project.removal_resolution_reason
                    ? ` — ${project.removal_resolution_reason}`
                    : ""
                }`}
                full
              />
            )}
            {project.previous_status_before_archive && (
              <Field
                label="Pre-archive State"
                value={statusDisplay(project.previous_status_before_archive)}
              />
            )}
          </div>
        )}

        {/* REVIEW RECORD & LICENSE (priority 4) */}
        {(project.status === "pending" ||
          project.status === "in_review" ||
          project.status === "approved" ||
          project.status === "live" ||
          project.status === "rejected") && (
          <ExpandableSection
            title="Review Record & License"
            summary={licenseSummary(project)}
            defaultOpen={reviewGateOpen}
            emphasis={reviewGateOpen ? "authority" : undefined}
          >
            <SubmissionReviewPanel
              project={project}
              review={reviewByProject[project.id] ?? reviewFromProject(project)}
              onChange={(nextR) => setReviewFor(project.id, nextR)}
              onSaveReview={() => saveReviewNotes(project.id)}
              saving={reviewBusy === project.id}
              saved={reviewSavedFor === project.id}
              hideForLegacyStates
            />

            {(project.status === "approved" || project.status === "live") && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-xs uppercase tracking-widest text-neutral-500">
                    Standard Distribution License v1
                  </p>
                  {project.license ? (
                    <span className="text-[11px] px-2 py-0.5 rounded border bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                      {project.status === "approved"
                        ? "Executed — ready for activation"
                        : "Executed"}
                    </span>
                  ) : project.status === "live" ? (
                    <span className="text-[11px] px-2 py-0.5 rounded border bg-red-500/20 text-red-400 border-red-500/30">
                      License missing (legacy)
                    </span>
                  ) : (
                    <span className="text-[11px] px-2 py-0.5 rounded border bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                      Not signed — activation blocked
                    </span>
                  )}
                </div>

                {project.license && project.status === "approved" && (
                  <>
                    <p className="text-[11px] text-emerald-300/90 leading-relaxed">
                      License is on file. Distribution can be activated now.
                      Media binding (Bunny video ID) becomes available after activation.
                    </p>
                    <p className="text-[11px] text-yellow-300/80 leading-relaxed">
                      Identity is self-certified and not independently verified.
                    </p>
                  </>
                )}

                <IdentityRow status={project.identity_status ?? null} />
                {project.license?.identity_certification_version && (
                  <p className="text-[11px] text-neutral-500 leading-relaxed">
                    Certification copy at signing:{" "}
                    <code className="text-neutral-300 bg-white/5 border border-white/10 rounded px-1 py-0.5 text-[10px]">
                      {project.license.identity_certification_version}
                    </code>
                  </p>
                )}

                {project.license ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <Field label="Signer" value={project.license.signer_legal_name} />
                    <Field label="Signer Email" value={project.license.signer_email} />
                    <Field label="Term" value={`${project.license.term_years} year(s)`} />
                    <Field
                      label="Signed"
                      value={
                        project.license.signed_at
                          ? new Date(project.license.signed_at).toUTCString()
                          : ""
                      }
                    />
                    <Field
                      label="Term Start"
                      value={
                        project.license.term_start
                          ? new Date(project.license.term_start).toUTCString()
                          : "Pending activation"
                      }
                    />
                    <Field
                      label="Term End"
                      value={
                        project.license.term_end
                          ? new Date(project.license.term_end).toUTCString()
                          : "Pending activation"
                      }
                    />
                    <div className="md:col-span-2">
                      <a
                        href={
                          project.license.pdf_url ??
                          `/api/licenses/${project.license.id}/receipt`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-orange-400 hover:text-orange-300 text-xs underline underline-offset-2"
                      >
                        {project.license.pdf_url ? "View Receipt" : "View HTML Receipt"}
                      </a>
                      {!project.license.pdf_url && (
                        <span className="text-neutral-500 text-[11px] ml-2">
                          (HTML receipt)
                        </span>
                      )}
                    </div>
                  </div>
                ) : project.status === "live" ? (
                  <p className="text-[11px] text-neutral-500 leading-relaxed">
                    This title was activated before the license layer existed. New activations
                    now require an executed license. No automatic backfill is performed.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[11px] text-neutral-500 leading-relaxed">
                      The creator must execute the license before distribution can be activated.
                      A license-required email is sent at approval and the workspace surfaces
                      the same link. If the email failed, hand the URL below to the creator.
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-[11px] text-neutral-300 bg-white/5 border border-white/10 rounded px-2 py-1 break-all">
                        /license/{project.id}
                      </code>
                      <button
                        onClick={() => {
                          const url =
                            typeof window !== "undefined"
                              ? `${window.location.origin}/license/${project.id}`
                              : `/license/${project.id}`;
                          navigator.clipboard?.writeText(url);
                        }}
                        className="px-2 py-1 rounded text-[11px] font-medium border border-white/15 text-white hover:bg-white/10 transition"
                      >
                        Copy creator URL
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ExpandableSection>
        )}

        {/* MEDIA (priority 5) — live only */}
        {project.status === "live" && (
          <ExpandableSection
            title="Media"
            summary={
              project.media_ready ? "Submitted for processing" : "Not submitted"
            }
            defaultOpen={!project.media_ready}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-xs uppercase tracking-widest text-neutral-500">
                  Bunny Stream
                </p>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded border ${
                    project.media_ready
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                  }`}
                >
                  {project.media_ready ? "Submitted for processing" : "Not submitted"}
                </span>
              </div>

              {(() => {
                const effectiveVideoId = (
                  mediaInputs[project.id] !== undefined
                    ? mediaInputs[project.id]
                    : project.bunny_video_id || ""
                ).trim();
                const hasVideoId       = effectiveVideoId.length > 0;
                const submitDisabled   = !hasVideoId || project.media_ready;

                return (
                  <>
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="text"
                        placeholder="Bunny video ID"
                        defaultValue={project.bunny_video_id || ""}
                        disabled={project.media_ready}
                        onChange={(e) =>
                          setMediaInputs((s) => ({ ...s, [project.id]: e.target.value }))
                        }
                        className="flex-1 min-w-[220px] px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-orange-500/40 disabled:opacity-50"
                      />
                      <button
                        onClick={() => saveBunnyId(project.id, effectiveVideoId)}
                        disabled={mediaBusy === project.id || project.media_ready}
                        className="px-3 py-2 rounded text-xs font-medium border border-white/15 text-white hover:bg-white/10 transition disabled:opacity-50"
                        title={
                          project.media_ready
                            ? "Processing is locked. Reset processing status before changing the binding."
                            : undefined
                        }
                      >
                        {mediaBusy === project.id ? "Saving…" : "Save ID"}
                      </button>
                      {!project.media_ready && (
                        <button
                          onClick={() => {
                            if (submitDisabled) return;
                            submitMediaForProcessing(project.id, effectiveVideoId);
                          }}
                          disabled={mediaBusy === project.id || submitDisabled}
                          title={
                            !hasVideoId
                              ? "Save a Bunny Stream Video ID before submitting for processing."
                              : undefined
                          }
                          className="px-3 py-2 rounded text-xs font-medium border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Submit for processing
                        </button>
                      )}
                      {project.media_ready && (
                        <button
                          onClick={() => {
                            setResetTarget({
                              id:    project.id,
                              title: project.title || "",
                            });
                            setResetReason("");
                            setResetError("");
                          }}
                          disabled={mediaBusy === project.id}
                          className="px-3 py-2 rounded text-xs font-medium border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/10 transition disabled:opacity-50"
                        >
                          Reset processing status
                        </button>
                      )}
                    </div>

                    {project.media_ready ? (
                      <p className="text-[11px] text-yellow-300/80 leading-relaxed">
                        Processing is locked. Reset only if the media binding was entered
                        incorrectly or processing must restart.
                      </p>
                    ) : !hasVideoId ? (
                      <p className="text-[11px] text-yellow-300/80 leading-relaxed">
                        Paste the Bunny Stream Video ID, save it, then submit for internal
                        processing. Final catalog readiness is controlled by ShangoMaji.
                      </p>
                    ) : (
                      <p className="text-[11px] text-neutral-500 leading-relaxed">
                        Save the Bunny Stream Video ID, then submit for internal processing.
                        Final catalog readiness is controlled by ShangoMaji.
                      </p>
                    )}

                    <MediaProcessingHistory
                      history={project.media_processing_history}
                    />
                  </>
                );
              })()}
            </div>
          </ExpandableSection>
        )}

        {/* SUPPORTING DETAILS (priority 6) */}
        <ExpandableSection
          title="Supporting Details"
          summary={
            [project.project_type, ...(project.genres ?? [])]
              .filter(Boolean)
              .slice(0, 3)
              .join(" · ") || undefined
          }
          defaultOpen={false}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <Field label="Creator Email" value={project.creator_email} />
            <Field label="Type" value={project.project_type} />
            <Field label="Genres" value={project.genres?.join(", ")} />
            <Field label="Logline" value={project.logline} full />
            <Field label="Description" value={project.description} full />
            <Field label="Cover Image" value={project.cover_image_url} link />
            <Field label="Sample URL" value={project.sample_url} link />
          </div>

          <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs uppercase tracking-widest text-neutral-500">
                Public Profile
              </p>
              {project.profile_quarantined ? (
                <span className="text-[11px] px-2 py-0.5 rounded border bg-red-500/15 text-red-300 border-red-500/30">
                  Quarantined (placeholder)
                </span>
              ) : project.profile_force_unpublished ? (
                <span className="text-[11px] px-2 py-0.5 rounded border bg-yellow-500/15 text-yellow-300 border-yellow-500/30">
                  Force-unpublished
                </span>
              ) : project.profile_published ? (
                <span className="text-[11px] px-2 py-0.5 rounded border bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
                  Published
                </span>
              ) : (
                <span className="text-[11px] px-2 py-0.5 rounded border bg-white/5 text-neutral-400 border-white/10">
                  Not published
                </span>
              )}
            </div>

            {project.profile_handle ? (
              <p className="text-[11px] text-neutral-500 break-all">
                Handle:{" "}
                <code className="text-neutral-300 bg-white/5 border border-white/10 rounded px-1 py-0.5">
                  @{project.profile_handle}
                </code>
                {project.profile_published &&
                 !project.profile_force_unpublished &&
                 !project.profile_quarantined && (
                  <>
                    {" "}·{" "}
                    <a
                      href={`/creators/${project.profile_handle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-400 hover:text-orange-300 underline underline-offset-2"
                    >
                      View public profile
                    </a>
                  </>
                )}
              </p>
            ) : (
              <p className="text-[11px] text-neutral-500">
                No handle set — creator has not configured a public profile yet.
              </p>
            )}

            <div className="flex items-center gap-2 flex-wrap pt-1">
              {!project.profile_quarantined && !project.profile_force_unpublished && (
                <button
                  onClick={() => {
                    setForceUnpublishTarget({
                      email:  project.creator_email,
                      title:  project.title || "",
                      handle: project.profile_handle ?? null,
                    });
                    setForceUnpublishReason("");
                    setForceUnpublishError("");
                  }}
                  className="px-3 py-1.5 rounded text-xs font-medium border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/10 transition"
                >
                  Force Unpublish Profile
                </button>
              )}
              {project.profile_force_unpublished && (
                <button
                  onClick={() => adminRestoreProfile(project.creator_email)}
                  disabled={restoreProfileBusy === project.creator_email}
                  className="px-3 py-1.5 rounded text-xs font-medium border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 transition disabled:opacity-50"
                >
                  {restoreProfileBusy === project.creator_email
                    ? "Restoring…"
                    : "Restore Profile (Admin)"}
                </button>
              )}
              {project.profile_quarantined && (
                <span className="text-[11px] text-red-300/80">
                  Quarantined rows must be reviewed via SQL before any further action.
                </span>
              )}
            </div>
          </div>
        </ExpandableSection>

        {/* STATE HISTORY (priority 7) */}
        {Array.isArray(project.state_history) && project.state_history.length > 0 && (
          <ExpandableSection
            title="State History"
            summary={`${project.state_history.length} event${
              project.state_history.length === 1 ? "" : "s"
            }`}
            defaultOpen={false}
          >
            <StateHistory entries={project.state_history} bare />
          </ExpandableSection>
        )}

        {/* Rejection input */}
        {rejectingId === project.id && (
          <div className="space-y-2">
            <p className="text-xs text-neutral-400">Rejection reason (required):</p>
            <textarea
              value={rejectionInput}
              onChange={(e) => setRejectionInput(e.target.value)}
              placeholder="Explain why this project is being rejected…"
              rows={2}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-red-500/40 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => confirmReject(project.id)}
                disabled={rejectBusy}
                className="px-4 py-1.5 rounded text-xs font-medium border border-red-500/40 text-red-400 hover:bg-red-500/10 transition disabled:opacity-50"
              >
                {rejectBusy ? "Rejecting…" : "Confirm Reject"}
              </button>
              <button
                onClick={() => { setRejectingId(null); setRejectionInput(""); }}
                className="px-4 py-1.5 rounded text-xs font-medium border border-white/10 text-neutral-500 hover:text-white transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ACTIONS ROW (priority 8) — Phase 8 polish: action area is
            visually separated from record details by a thicker rule and
            an "Actions" eyebrow so the controls read as a distinct
            decision surface, not a continuation of fields. */}
        <div className="mt-2 pt-4 border-t border-white/10 flex items-center gap-2 flex-wrap">
          <span className="text-[10px] uppercase tracking-[0.22em] text-neutral-500 font-medium mr-2">
            Actions
          </span>

          {project.status === "pending" && rejectingId !== project.id && (
            <>
              <button
                onClick={() => updateProjectStatus(project.id, "in_review")}
                className="px-3 py-1.5 rounded text-xs font-medium border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 transition"
              >
                Start Review
              </button>
              <button
                onClick={() => updateProjectStatus(project.id, "approved")}
                disabled={!gate.approvalAllowed}
                title={
                  gate.approvalAllowed
                    ? undefined
                    : gate.approvalBlockedMessage ?? "Approval is locked until the review record is complete."
                }
                className={`px-3 py-1.5 rounded text-xs font-medium border transition ${
                  gate.approvalAllowed
                    ? "border-teal-500/30 text-teal-400 hover:bg-teal-500/10"
                    : "border-teal-500/15 text-teal-500/40 cursor-not-allowed"
                }`}
              >
                Approve Work
              </button>
              <button
                onClick={() => { setRejectingId(project.id); setRejectionInput(""); }}
                className="px-3 py-1.5 rounded text-xs font-medium border border-red-500/30 text-red-400 hover:bg-red-500/10 transition"
              >
                Reject Submission
              </button>
            </>
          )}

          {project.status === "in_review" && rejectingId !== project.id && (
            <>
              <button
                onClick={() => updateProjectStatus(project.id, "approved")}
                disabled={!gate.approvalAllowed}
                title={
                  gate.approvalAllowed
                    ? undefined
                    : gate.approvalBlockedMessage ?? "Approval is locked until the review record is complete."
                }
                className={`px-3 py-1.5 rounded text-xs font-medium border transition ${
                  gate.approvalAllowed
                    ? "border-teal-500/30 text-teal-400 hover:bg-teal-500/10"
                    : "border-teal-500/15 text-teal-500/40 cursor-not-allowed"
                }`}
              >
                Approve Work
              </button>
              <button
                onClick={() => { setRejectingId(project.id); setRejectionInput(""); }}
                className="px-3 py-1.5 rounded text-xs font-medium border border-red-500/30 text-red-400 hover:bg-red-500/10 transition"
              >
                Reject Submission
              </button>
            </>
          )}

          {showApproveGate && !gate.approvalAllowed && (
            <div className="basis-full flex flex-col gap-0.5 mt-1">
              {gate.isLegacyMissingIntegrity ? (
                <p className="text-[11px] text-yellow-300/90 leading-relaxed">
                  This work predates Submission Integrity v1. It must be rejected and resubmitted through the new integrity gate.
                </p>
              ) : (
                <>
                  {gate.integrityMessage && (
                    <p className="text-[11px] text-yellow-300/80 leading-relaxed">
                      Creator integrity: {gate.integrityMessage}
                    </p>
                  )}
                  {missingApprovalReqs.length > 0 && (
                    <div className="mt-1">
                      <p className="text-[11px] text-neutral-300 leading-relaxed font-medium">
                        Approval requires:
                      </p>
                      <ul className="mt-1 ml-4 list-disc space-y-0.5">
                        {missingApprovalReqs.map((req) => (
                          <li
                            key={req}
                            className="text-[11px] text-neutral-300 leading-relaxed"
                          >
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {gate.reviewMessage && (
                    <>
                      <p className="text-[11px] text-neutral-500 leading-relaxed mt-1">
                        Open the <strong className="text-white/80">Review Record &amp; License</strong> section above to complete these requirements. Rejection remains available.
                      </p>
                      <p className="text-[11px] text-neutral-500 leading-relaxed">
                        Review record: {gate.reviewMessage}
                      </p>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {project.status === "approved" && (
            project.license ? (
              <button
                onClick={() => updateProjectStatus(project.id, "live")}
                className="px-3 py-1.5 rounded text-xs font-medium border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition"
              >
                Activate Distribution
              </button>
            ) : (
              <span
                title="An executed license is required before distribution can be activated."
                className="px-3 py-1.5 rounded text-xs font-medium border border-white/10 text-neutral-600 cursor-not-allowed"
              >
                Activate Distribution — license required
              </span>
            )
          )}

          {project.status === "approved" && (() => {
            const checks: Array<{ label: string; ok: boolean }> = [
              { label: "Poster",  ok: !!(project.cover_image_url && String(project.cover_image_url).trim()) },
              { label: "Banner",  ok: !!(project.banner_url      && String(project.banner_url).trim()) },
              { label: "Stills",  ok: Array.isArray(project.stills_urls) && project.stills_urls.length >= 2 },
              { label: "Trailer", ok: !!(project.trailer_url     && String(project.trailer_url).trim()) },
            ];
            const missing = checks.filter((c) => !c.ok).map((c) => c.label);
            const ready   = missing.length === 0;
            return (
              <div className="basis-full flex flex-wrap items-center gap-2 mt-1">
                <span className="text-[11px] uppercase tracking-widest text-neutral-500">
                  Media package:
                </span>
                {ready ? (
                  <span className="text-[11px] px-2 py-0.5 rounded border bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
                    Ready
                  </span>
                ) : (
                  <>
                    <span className="text-[11px] px-2 py-0.5 rounded border bg-yellow-500/15 text-yellow-300 border-yellow-500/30">
                      Incomplete
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      Missing: {missing.join(", ")}
                    </span>
                  </>
                )}
                <span className="text-[11px] text-neutral-500">
                  · Public visibility additionally requires the Bunny
                  video binding + processing on Live.
                </span>
              </div>
            );
          })()}

          {project.status === "live" && (
            <button
              onClick={() => {
                setArchiveTarget({ id: project.id, title: project.title || "" });
                setArchiveConfirm("");
                setArchiveError("");
              }}
              title="Archive is an internal reversible hold. It is not approval, not rejection, and not a review outcome."
              className="px-3 py-1.5 rounded text-xs font-medium border border-white/20 text-neutral-400 hover:text-white hover:border-white/30 transition"
            >
              Archive to Internal Hold
            </button>
          )}

          {project.status === "approved" && (
            <button
              onClick={() => {
                setArchiveHoldTarget({ id: project.id, title: project.title || "" });
                setArchiveHoldError("");
              }}
              title="Archive is an internal reversible hold. It is not approval, not rejection, and not a review outcome."
              className="px-3 py-1.5 rounded text-xs font-medium border border-white/20 text-neutral-400 hover:text-white hover:border-white/30 transition"
            >
              Archive to Internal Hold
            </button>
          )}

          {project.status === "rejected" && rejectingId !== project.id && (
            <>
              <button
                onClick={() => reopenForReview(project.id)}
                disabled={reopenBusy === project.id}
                className="px-3 py-1.5 rounded text-xs font-medium border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 transition disabled:opacity-50"
              >
                {reopenBusy === project.id ? "Reopening…" : "Reopen for Review"}
              </button>
              <button
                onClick={() => {
                  setArchiveHoldTarget({ id: project.id, title: project.title || "" });
                  setArchiveHoldError("");
                }}
                title="Archive is an internal reversible hold. It is not approval, not rejection, and not a review outcome."
                className="px-3 py-1.5 rounded text-xs font-medium border border-white/20 text-neutral-400 hover:text-white hover:border-white/30 transition"
              >
                Archive to Internal Hold
              </button>
            </>
          )}

          {project.status === "archived" && (
            (() => {
              const target = project.previous_status_before_archive;
              const canRestore = !!target;
              return canRestore ? (
                <button
                  onClick={() => restoreFromArchive(project.id)}
                  disabled={restoreBusy === project.id}
                  title={`Restores to ${statusDisplay(target)} state.`}
                  className="px-3 py-1.5 rounded text-xs font-medium border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition disabled:opacity-50"
                >
                  {restoreBusy === project.id
                    ? "Restoring…"
                    : "Restore from Internal Hold"}
                </button>
              ) : (
                <span
                  title="Cannot restore because no previous state is recorded."
                  className="px-3 py-1.5 rounded text-xs font-medium border border-white/10 text-neutral-600 cursor-not-allowed"
                >
                  Restore unavailable — no prior state recorded
                </span>
              );
            })()
          )}

          {project.status === "removed" && (
            <span className="text-xs text-red-300/80">
              Removed — terminal state.
            </span>
          )}

          {project.status === "removal_requested" && (
            <div className="basis-full flex flex-col gap-2">
              <div className="flex items-start gap-3 flex-wrap">
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => {
                      setApproveRemovalTarget({ id: project.id, title: project.title || "" });
                      setApproveRemovalReason("");
                      setApproveRemovalError("");
                    }}
                    disabled={removalBusy === project.id}
                    className="px-3 py-1.5 rounded text-xs font-medium border border-amber-500/40 text-amber-300 hover:bg-amber-500/10 transition disabled:opacity-50"
                  >
                    {removalBusy === project.id ? "Working…" : "Approve Removal"}
                  </button>
                  <span className="text-[10px] text-neutral-500 px-1">
                    Permanently remove from distribution.
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => {
                      setDenyRemovalTarget({ id: project.id, title: project.title || "" });
                      setDenyRemovalReason("");
                      setDenyRemovalError("");
                    }}
                    disabled={removalBusy === project.id}
                    className="px-3 py-1.5 rounded text-xs font-medium border border-white/20 text-neutral-300 hover:bg-white/5 transition disabled:opacity-50"
                  >
                    Deny Removal
                  </button>
                  <span className="text-[10px] text-neutral-500 px-1">
                    Return to active distribution.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Dashboard ──
  // Phase 7.3 Layer 2E.3 — Mission Control board anatomy. The wrapper
  // uses the legitimate 100vw breakout pattern (parent shell agnostic)
  // and the inner canvas runs to max-w-[1760px] with light horizontal
  // padding so the board occupies most of the desktop canvas. The two-
  // column queue + command-detail board now collapses at xl: (1280px)
  // rather than lg:, with minmax(620,1fr)/(560,0.9fr) columns so the
  // right detail panel can never squeeze into a skinny sidebar. All
  // existing handlers, payloads, gates, and state are preserved.
  return (
    <div
      className="min-h-screen pt-24 pb-12"
      style={{
        width: "100vw",
        marginLeft: "calc(50% - 50vw)",
        marginRight: "calc(50% - 50vw)",
      }}
    >
      <div className="w-full mx-auto max-w-[1760px] px-4 sm:px-6 lg:px-8">
      {/* Archive confirmation gate */}
      {archiveTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
          onClick={() => {
            if (archiveBusy) return;
            setArchiveTarget(null);
            setArchiveConfirm("");
            setArchiveError("");
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-white/10 bg-[#141010] p-6 space-y-5"
          >
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-yellow-400/80 font-semibold mb-2">
                Internal Hold
              </p>
              <h3 className="text-white text-lg font-semibold">
                Archive this work?
              </h3>
            </div>

            <div className="space-y-2 text-sm text-neutral-400 leading-relaxed">
              <p>
                This places <span className="text-white">{archiveTarget.title || "this title"}</span> into
                an internal hold state and removes it from public catalog visibility. The work is not
                deleted and may be restored if a previous state is recorded.
              </p>
              <p className="text-[11px] text-neutral-500">
                Archive is an internal reversible hold. It is not a removal outcome.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs text-neutral-500">
                Type the project title exactly to confirm:
              </label>
              <p className="text-[11px] text-neutral-600 font-mono break-words">
                {archiveTarget.title}
              </p>
              <input
                type="text"
                value={archiveConfirm}
                onChange={(e) => {
                  setArchiveConfirm(e.target.value);
                  if (archiveError) setArchiveError("");
                }}
                disabled={archiveBusy}
                placeholder="Project title"
                autoFocus
                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-yellow-500/50 transition"
              />
              {archiveError && (
                <p className="text-red-400 text-xs">{archiveError}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  if (archiveBusy) return;
                  setArchiveTarget(null);
                  setArchiveConfirm("");
                  setArchiveError("");
                }}
                disabled={archiveBusy}
                className="px-4 py-2 rounded-md text-xs font-medium border border-white/10 text-neutral-400 hover:text-white hover:border-white/20 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmArchive}
                disabled={
                  archiveBusy ||
                  archiveConfirm.trim() !== (archiveTarget.title || "").trim() ||
                  !archiveTarget.title.trim()
                }
                className="px-4 py-2 rounded-md text-xs font-semibold border border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/10 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                {archiveBusy ? "Archiving…" : "Archive to Internal Hold"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Removal modal */}
      {approveRemovalTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
          onClick={() => {
            if (approveRemovalBusy) return;
            setApproveRemovalTarget(null);
            setApproveRemovalReason("");
            setApproveRemovalError("");
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-white/10 bg-[#141010] p-6 space-y-5"
          >
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-red-400/80 font-semibold mb-2">
                Removal Decision
              </p>
              <h3 className="text-white text-lg font-semibold">
                Approve removal request?
              </h3>
            </div>

            <div className="space-y-2 text-sm text-neutral-400 leading-relaxed">
              <p>
                This permanently ends distribution for
                <span className="text-white"> {approveRemovalTarget.title || "this work"}</span>.
              </p>
              <p>
                The work will move to <span className="text-white">Removed</span>, will not be
                restorable, and will no longer be eligible for public distribution.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs text-neutral-500">
                Resolution reason (required):
              </label>
              <textarea
                value={approveRemovalReason}
                onChange={(e) => {
                  setApproveRemovalReason(e.target.value);
                  if (approveRemovalError) setApproveRemovalError("");
                }}
                disabled={approveRemovalBusy}
                rows={3}
                placeholder="Why is this removal being approved?"
                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-red-500/40 transition resize-none"
              />
              {approveRemovalError && (
                <p className="text-red-400 text-xs">{approveRemovalError}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  if (approveRemovalBusy) return;
                  setApproveRemovalTarget(null);
                  setApproveRemovalReason("");
                  setApproveRemovalError("");
                }}
                disabled={approveRemovalBusy}
                className="px-4 py-2 rounded-md text-xs font-medium border border-white/10 text-neutral-400 hover:text-white hover:border-white/20 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const reason = approveRemovalReason.trim();
                  if (!reason) {
                    setApproveRemovalError("A resolution reason is required.");
                    return;
                  }
                  setApproveRemovalBusy(true);
                  setApproveRemovalError("");
                  try {
                    await resolveRemoval(approveRemovalTarget.id, "approve", reason);
                    setApproveRemovalTarget(null);
                    setApproveRemovalReason("");
                  } catch (e: any) {
                    setApproveRemovalError(e?.message || "Removal failed");
                  } finally {
                    setApproveRemovalBusy(false);
                  }
                }}
                disabled={approveRemovalBusy || !approveRemovalReason.trim()}
                className="px-4 py-2 rounded-md text-xs font-semibold border border-red-500/40 text-red-300 hover:bg-red-500/10 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                {approveRemovalBusy ? "Removing…" : "Permanently Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deny Removal modal */}
      {denyRemovalTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
          onClick={() => {
            if (denyRemovalBusy) return;
            setDenyRemovalTarget(null);
            setDenyRemovalReason("");
            setDenyRemovalError("");
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-white/10 bg-[#141010] p-6 space-y-5"
          >
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-400/80 font-semibold mb-2">
                Removal Decision
              </p>
              <h3 className="text-white text-lg font-semibold">
                Deny removal request?
              </h3>
            </div>

            <div className="space-y-2 text-sm text-neutral-400 leading-relaxed">
              <p>
                This returns <span className="text-white">{denyRemovalTarget.title || "this work"}</span> to
                active distribution. The creator request will be marked denied, and the work remains
                governed by the active license and catalog controls.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs text-neutral-500">
                Denial reason (required):
              </label>
              <textarea
                value={denyRemovalReason}
                onChange={(e) => {
                  setDenyRemovalReason(e.target.value);
                  if (denyRemovalError) setDenyRemovalError("");
                }}
                disabled={denyRemovalBusy}
                rows={3}
                placeholder="Why is this removal being denied?"
                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-emerald-500/40 transition resize-none"
              />
              {denyRemovalError && (
                <p className="text-red-400 text-xs">{denyRemovalError}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  if (denyRemovalBusy) return;
                  setDenyRemovalTarget(null);
                  setDenyRemovalReason("");
                  setDenyRemovalError("");
                }}
                disabled={denyRemovalBusy}
                className="px-4 py-2 rounded-md text-xs font-medium border border-white/10 text-neutral-400 hover:text-white hover:border-white/20 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const reason = denyRemovalReason.trim();
                  if (!reason) {
                    setDenyRemovalError("A denial reason is required.");
                    return;
                  }
                  setDenyRemovalBusy(true);
                  setDenyRemovalError("");
                  try {
                    await resolveRemoval(denyRemovalTarget.id, "deny", reason);
                    setDenyRemovalTarget(null);
                    setDenyRemovalReason("");
                  } catch (e: any) {
                    setDenyRemovalError(e?.message || "Denial failed");
                  } finally {
                    setDenyRemovalBusy(false);
                  }
                }}
                disabled={denyRemovalBusy || !denyRemovalReason.trim()}
                className="px-4 py-2 rounded-md text-xs font-semibold border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                {denyRemovalBusy ? "Denying…" : "Confirm Denial"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Non-live Archive (Internal Hold) confirmation modal */}
      {archiveHoldTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
          onClick={() => {
            if (archiveHoldBusy) return;
            setArchiveHoldTarget(null);
            setArchiveHoldError("");
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-white/10 bg-[#141010] p-6 space-y-5"
          >
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-yellow-400/80 font-semibold mb-2">
                Internal Hold
              </p>
              <h3 className="text-white text-lg font-semibold">
                Archive this work?
              </h3>
            </div>

            <div className="space-y-2 text-sm text-neutral-400 leading-relaxed">
              <p>
                This places <span className="text-white">{archiveHoldTarget.title || "this work"}</span> into
                an internal hold state and removes it from public catalog visibility. The work is not
                deleted and may be restored if a previous state is recorded.
              </p>
              <p className="text-[11px] text-neutral-500">
                Archive is an internal reversible hold. It is not a removal outcome.
              </p>
              {archiveHoldError && (
                <p className="text-red-400 text-xs">{archiveHoldError}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  if (archiveHoldBusy) return;
                  setArchiveHoldTarget(null);
                  setArchiveHoldError("");
                }}
                disabled={archiveHoldBusy}
                className="px-4 py-2 rounded-md text-xs font-medium border border-white/10 text-neutral-400 hover:text-white hover:border-white/20 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setArchiveHoldBusy(true);
                  setArchiveHoldError("");
                  try {
                    await archiveToInternalHold(archiveHoldTarget.id);
                    setArchiveHoldTarget(null);
                  } catch (e: any) {
                    setArchiveHoldError(e?.message || "Archive failed");
                  } finally {
                    setArchiveHoldBusy(false);
                  }
                }}
                disabled={archiveHoldBusy}
                className="px-4 py-2 rounded-md text-xs font-semibold border border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/10 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                {archiveHoldBusy ? "Archiving…" : "Archive to Internal Hold"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Force-unpublish creator profile modal */}
      {forceUnpublishTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
          onClick={() => {
            if (forceUnpublishBusy) return;
            setForceUnpublishTarget(null);
            setForceUnpublishReason("");
            setForceUnpublishError("");
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-white/10 bg-[#141010] p-6 space-y-5"
          >
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-yellow-400/80 font-semibold mb-2">
                Trust &amp; Safety
              </p>
              <h3 className="text-white text-lg font-semibold">
                Force-unpublish public profile?
              </h3>
            </div>

            <div className="space-y-2 text-sm text-neutral-400 leading-relaxed">
              <p>
                This hides
                <span className="text-white">
                  {" "}{forceUnpublishTarget.title || forceUnpublishTarget.email}{" "}
                </span>
                from public-facing routes immediately. The creator can still see
                and edit their fields in the workspace, but cannot republish
                until you restore.
              </p>
              <p className="text-[11px] text-neutral-500">
                Profile data is not deleted. This is a reversible administrative override.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs text-neutral-500">
                Reason (required):
              </label>
              <textarea
                value={forceUnpublishReason}
                onChange={(e) => {
                  setForceUnpublishReason(e.target.value);
                  if (forceUnpublishError) setForceUnpublishError("");
                }}
                disabled={forceUnpublishBusy}
                rows={3}
                placeholder="Why is this profile being unpublished?"
                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-yellow-500/40 transition resize-none"
              />
              {forceUnpublishError && (
                <p className="text-red-400 text-xs">{forceUnpublishError}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  if (forceUnpublishBusy) return;
                  setForceUnpublishTarget(null);
                  setForceUnpublishReason("");
                  setForceUnpublishError("");
                }}
                disabled={forceUnpublishBusy}
                className="px-4 py-2 rounded-md text-xs font-medium border border-white/10 text-neutral-400 hover:text-white hover:border-white/20 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const reason = forceUnpublishReason.trim();
                  if (!reason) {
                    setForceUnpublishError("A reason is required.");
                    return;
                  }
                  setForceUnpublishBusy(true);
                  setForceUnpublishError("");
                  try {
                    await adminForceUnpublishProfile(forceUnpublishTarget.email, reason);
                    setForceUnpublishTarget(null);
                    setForceUnpublishReason("");
                  } catch (e: any) {
                    setForceUnpublishError(e?.message || "Force-unpublish failed");
                  } finally {
                    setForceUnpublishBusy(false);
                  }
                }}
                disabled={forceUnpublishBusy || !forceUnpublishReason.trim()}
                className="px-4 py-2 rounded-md text-xs font-semibold border border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/10 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                {forceUnpublishBusy ? "Unpublishing…" : "Force Unpublish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset processing modal */}
      {resetTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
          onClick={() => {
            if (resetBusy) return;
            setResetTarget(null);
            setResetReason("");
            setResetError("");
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-white/10 bg-[#141010] p-6 space-y-5"
          >
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-yellow-400/80 font-semibold mb-2">
                Internal Processing
              </p>
              <h3 className="text-white text-lg font-semibold">
                Reset processing status?
              </h3>
            </div>

            <div className="space-y-2 text-sm text-neutral-400 leading-relaxed">
              <p>
                This does not remove the Bunny video ID. It returns
                <span className="text-white"> {resetTarget.title || "this work"} </span>
                to "Not submitted" and records the reason.
              </p>
              <p>
                Use only when the media binding was entered incorrectly or processing must restart.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs text-neutral-500">
                Reason (required):
              </label>
              <textarea
                value={resetReason}
                onChange={(e) => {
                  setResetReason(e.target.value);
                  if (resetError) setResetError("");
                }}
                disabled={resetBusy}
                rows={3}
                placeholder="Why is processing being reset?"
                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-yellow-500/50 transition resize-none"
              />
              {resetError && (
                <p className="text-red-400 text-xs">{resetError}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  if (resetBusy) return;
                  setResetTarget(null);
                  setResetReason("");
                  setResetError("");
                }}
                disabled={resetBusy}
                className="px-4 py-2 rounded-md text-xs font-medium border border-white/10 text-neutral-400 hover:text-white hover:border-white/20 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const reason = resetReason.trim();
                  if (!reason) {
                    setResetError("A reason is required.");
                    return;
                  }
                  setResetBusy(true);
                  setResetError("");
                  try {
                    await resetMediaProcessing(resetTarget.id, reason);
                    setResetTarget(null);
                    setResetReason("");
                  } catch (e: any) {
                    setResetError(e?.message || "Reset failed");
                  } finally {
                    setResetBusy(false);
                  }
                }}
                disabled={resetBusy || !resetReason.trim()}
                className="px-4 py-2 rounded-md text-xs font-semibold border border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/10 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                {resetBusy ? "Resetting…" : "Confirm Reset"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phase 8 — Admin Mission Control header. Replaces the legacy
          "Creator Applications" title (which only described the
          application-review surface) with mission-control framing that
          covers both applications and works. Existing total submissions
          count is retained as secondary operational metadata. Refresh
          and Lock controls keep their behavior, aligned cleanly to the
          right of the header. */}
      <div className="flex items-start justify-between gap-6 flex-wrap mb-6">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.28em] text-neutral-500 font-medium mb-2">
            ShangoMaji · Operations
          </p>
          <h1
            className="text-2xl sm:text-3xl font-semibold text-white tracking-wide leading-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Admin Mission Control
          </h1>
          <p className="text-sm text-neutral-400 mt-1.5 leading-relaxed max-w-2xl">
            Review creator applications, monitor works, and manage launch readiness.
          </p>
          <p className="text-[11px] text-neutral-600 mt-2">
            {applications.length} total submission{applications.length === 1 ? "" : "s"}
            {projectList.length > 0 && (
              <> · {projectList.length} work{projectList.length === 1 ? "" : "s"} tracked</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={refreshAll}
            disabled={refreshing}
            title="Refresh applications and works without reloading the browser."
            type="button"
            className="text-xs font-medium px-3.5 py-2 rounded-md border border-white/15 bg-white/5 text-white hover:bg-white/10 hover:border-white/25 transition disabled:opacity-50"
          >
            {refreshing ? "Refreshing…" : "Refresh Data"}
          </button>
          <button
            onClick={() => { setAuthed(false); setPassword(""); }}
            className="text-xs font-medium px-3 py-2 rounded-md border border-white/10 text-neutral-500 hover:text-white hover:border-white/20 transition"
          >
            Lock
          </button>
        </div>
      </div>

      {/* View toggle — Applications / Works */}
      <div className="flex gap-1 mb-6 border-b border-white/10">
        <button
          onClick={() => setView("applications")}
          className={`px-4 py-2.5 -mb-px text-sm font-medium transition border-b-2 ${
            view === "applications"
              ? "text-white border-orange-500/60"
              : "text-neutral-500 hover:text-white border-transparent"
          }`}
        >
          Applications
          <span className="ml-2 text-[10px] text-neutral-600 font-normal">
            {applications.length}
          </span>
        </button>
        <button
          onClick={() => {
            setView("projects");
            if (projectList.length === 0) loadProjects();
          }}
          className={`px-4 py-2.5 -mb-px text-sm font-medium transition border-b-2 ${
            view === "projects"
              ? "text-white border-orange-500/60"
              : "text-neutral-500 hover:text-white border-transparent"
          }`}
        >
          Works
          {projectList.length > 0 && (
            <span className="ml-2 text-[10px] text-neutral-600 font-normal">
              {projectList.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Applications tab ── */}
      {view === "applications" && (
        <>
          <div className="flex gap-2 mb-3 flex-wrap">
            {(["all", "pending", "accepted"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  filter === f
                    ? "bg-white/10 text-white"
                    : "text-neutral-500 hover:text-white hover:bg-white/5"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
              </button>
            ))}
            {showRejected && (
              <button
                onClick={() => setFilter("rejected")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  filter === "rejected"
                    ? "bg-white/10 text-white"
                    : "text-neutral-500 hover:text-white hover:bg-white/5"
                }`}
              >
                Rejected ({counts.rejected})
              </button>
            )}
            {showArchived && (
              <button
                onClick={() => setFilter("archived")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  filter === "archived"
                    ? "bg-white/10 text-white"
                    : "text-neutral-500 hover:text-white hover:bg-white/5"
                }`}
              >
                Archived ({counts.archived})
              </button>
            )}
          </div>
          <div className="flex gap-3 mb-6 text-xs text-neutral-500">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showRejected}
                onChange={(e) => {
                  setShowRejected(e.target.checked);
                  if (!e.target.checked && filter === "rejected") setFilter("all");
                }}
                className="accent-orange-500"
              />
              Show rejected
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => {
                  setShowArchived(e.target.checked);
                  if (!e.target.checked && filter === "archived") setFilter("all");
                }}
                className="accent-orange-500"
              />
              Show archived
            </label>
          </div>

          {/* Phase 7.3 — Mission Control architecture: queue + command
              detail. The two-column desktop layout puts the operational
              queue on the left and a single command detail panel on the
              right (selectedApplication). Below the lg breakpoint the
              right panel collapses out and each row reverts to inline
              expansion via the existing `expanded` toggle so mobile
              admins keep a usable view. Selection is purely client-side
              and the existing handlers / payloads are unchanged. */}
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 px-6 py-10 text-center">
              <p className="text-neutral-500 text-sm">No applications match this filter.</p>
            </div>
          ) : (
            <div className="xl:grid xl:grid-cols-[minmax(620px,1fr)_minmax(560px,0.9fr)] xl:gap-x-8">
              {/* LEFT — operational queue */}
              <div className="space-y-2">
                {filtered.map((app) => {
                  const isSelected = effectiveSelectedApplicationId === app.id;
                  const isExpanded = expanded === app.id;
                  return (
                    <div
                      key={app.id}
                      className={`rounded-md border overflow-hidden transition ${
                        isSelected
                          ? "border-orange-500/45 bg-orange-500/[0.06] xl:bg-orange-500/[0.04] xl:border-l-2 xl:border-l-orange-500/80"
                          : "border-white/8 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.035]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedApplicationId(app.id);
                          setExpanded(isExpanded ? null : app.id);
                        }}
                        className="w-full text-left flex items-start gap-3 px-4 py-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-[13px] leading-snug truncate">
                            {app.name || "—"}
                          </p>
                          <p className="text-neutral-500 text-[11px] mt-0.5 truncate">
                            {app.handle && (
                              <>
                                <span className="text-neutral-400">@{app.handle}</span>
                                <span className="text-neutral-700 mx-1.5">·</span>
                              </>
                            )}
                            <span className="text-neutral-400">{app.project_title || "No project title"}</span>
                            {app.project_type && (
                              <>
                                <span className="text-neutral-700 mx-1.5">·</span>
                                {app.project_type}
                              </>
                            )}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0 pt-0.5">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded border tabular-nums ${
                              statusColor[app.status] || "text-neutral-400"
                            }`}
                          >
                            {app.status}
                          </span>
                          <span className="text-neutral-600 text-[10px] tabular-nums">
                            {new Date(app.submitted_at).toLocaleDateString()}
                          </span>
                        </div>
                        <svg
                          className={`xl:hidden w-4 h-4 mt-1 text-neutral-500 transition-transform shrink-0 ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>

                      {/* Mobile inline expansion (hidden on desktop) */}
                      <div className="xl:hidden">
                        {isExpanded && (
                          <div className="px-5 pb-5 border-t border-white/5 pt-4">
                            {renderApplicationDetail(app)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* RIGHT — command detail (desktop only) */}
              <aside className="hidden xl:block">
                <div className="xl:sticky xl:top-24 rounded-xl border border-white/10 bg-white/[0.02] p-7 max-h-[calc(100vh-7rem)] overflow-y-auto">
                  {selectedApplication ? (
                    renderApplicationDetail(selectedApplication)
                  ) : (
                    <p className="text-neutral-500 text-sm text-center py-12">
                      Select an application to inspect.
                    </p>
                  )}
                </div>
              </aside>
            </div>
          )}
        </>
      )}

      {/* ── Projects tab ── */}
      {view === "projects" && (
        <>
          {/* Phase 8 — Launch Readiness command deck. Seven existing
              buckets, counts, and filter behavior are unchanged; polish
              targets alignment and rhythm: tiles share consistent
              interior height (label rail + count rail), counts align on
              a baseline, and the active tile uses a calm ring rather
              than a louder fill so the deck reads as command indicators
              rather than competing buttons. */}
          {!projectLoading && totalProjects > 0 && (
            <>
              <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-[0.22em] text-neutral-500 font-medium">
                    Launch readiness
                  </span>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded border ${
                      launchReadiness.tone === "ready"
                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                        : launchReadiness.tone === "attention"
                        ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                        : "bg-white/5 text-neutral-300 border-white/15"
                    }`}
                  >
                    {launchReadiness.label}
                  </span>
                </div>
                <span className="text-[10px] text-neutral-600">
                  {totalProjects} work{totalProjects === 1 ? "" : "s"} across {BUCKET_ORDER.length} states
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
                {BUCKET_ORDER.map((key) => {
                  const tone   = BUCKET_TONES[key];
                  const count  = bucketCounts[key];
                  const active = projectFilter === key;
                  const toneCls =
                    tone === "amber"
                      ? "border-amber-500/30 bg-amber-500/[0.04]"
                      : tone === "emerald"
                      ? "border-emerald-500/30 bg-emerald-500/[0.04]"
                      : "border-white/10 bg-white/[0.02]";
                  return (
                    <button
                      key={key}
                      onClick={() => setProjectFilter(key)}
                      aria-pressed={active}
                      className={`group flex flex-col justify-between text-left rounded-lg border px-4 py-3.5 min-h-[88px] transition ${toneCls} ${
                        active
                          ? "ring-1 ring-white/35 bg-white/[0.04]"
                          : "hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-400 leading-snug min-h-[28px] flex items-start">
                        {BUCKET_LABELS[key]}
                      </div>
                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-2xl font-semibold text-white leading-none tabular-nums">
                          {count}
                        </span>
                        {count > 0 && tone === "amber" && (
                          <span className="text-[10px] text-amber-400/80 leading-none">
                            open
                          </span>
                        )}
                        {count > 0 && tone === "emerald" && (
                          <span className="text-[10px] text-emerald-400/80 leading-none">
                            ready
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Phase 8A.1 — Queue filter. Sits directly under the readiness
              deck as structured metadata/control, not a separate
              navigation system. The single "Queue filter" eyebrow
              labels a left-anchored chip row in which "All" is promoted
              to the leading chip — replacing the previous loose
              "FILTER:" label + trailing "View all/Showing all" toggle.
              Bucket order, counts, and click behavior come from
              BUCKET_ORDER / bucketCounts / setProjectFilter and are
              unchanged. */}
          <div className="mb-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-500 font-medium mb-2">
              Queue filter
            </p>
            <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
              <button
                onClick={() => setProjectFilter("all")}
                aria-pressed={projectFilter === "all"}
                className={`px-2.5 py-1 rounded font-medium transition ${
                  projectFilter === "all"
                    ? "bg-white/10 text-white"
                    : "text-neutral-500 hover:text-white hover:bg-white/5"
                }`}
              >
                All{" "}
                <span
                  className={`tabular-nums ${
                    projectFilter === "all" ? "text-neutral-400" : "text-neutral-600"
                  }`}
                >
                  {totalProjects}
                </span>
              </button>
              {BUCKET_ORDER.map((key) => (
                <button
                  key={key}
                  onClick={() => setProjectFilter(key)}
                  aria-pressed={projectFilter === key}
                  className={`px-2.5 py-1 rounded font-medium transition ${
                    projectFilter === key
                      ? "bg-white/10 text-white"
                      : "text-neutral-500 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {BUCKET_LABELS[key]}{" "}
                  <span
                    className={`tabular-nums ${
                      projectFilter === key ? "text-neutral-400" : "text-neutral-600"
                    }`}
                  >
                    {bucketCounts[key]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Removal Requests banner — compact alert pointing admin at the
              filter where pending removal decisions live. Per-row Approve/
              Deny actions remain inside each row's expanded Actions panel
              (no duplication). Phase 7.3: suppressed when the admin is
              already filtered to needs_review, since the bucket card is
              the canonical signal there. */}
          {!projectLoading && removalQueue.length > 0 && projectFilter !== "needs_review" && (
            <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-[220px]">
                <p className="text-xs uppercase tracking-widest text-amber-300/90 font-semibold">
                  Removal Requests ({removalQueue.length})
                </p>
                <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                  Pending requests are awaiting an approve or deny decision.
                </p>
              </div>
              <button
                onClick={() => setProjectFilter("needs_review")}
                className="px-3 py-1.5 rounded text-xs font-medium border border-amber-500/40 text-amber-300 hover:bg-amber-500/10 transition shrink-0"
              >
                View Removal Requested
              </button>
            </div>
          )}

          {projectLoading && <p className="text-neutral-500 text-sm">Loading projects...</p>}

          {/* Phase 7.3 — Mission Control architecture: queue + command
              detail. The two-column desktop layout puts the operational
              queue on the left and a single Work Command Detail panel on
              the right (selectedWork). Below the lg breakpoint the right
              panel collapses out and each row reverts to inline
              expansion via the existing `expandedProject` toggle. All
              admin handlers, payloads, and lifecycle logic are
              unchanged. */}
          {!projectLoading && filteredProjects.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/10 px-6 py-10 text-center">
              <p className="text-neutral-500 text-sm">{EMPTY_COPY[projectFilter]}</p>
            </div>
          )}

          {!projectLoading && filteredProjects.length > 0 && (
            <div className="xl:grid xl:grid-cols-[minmax(620px,1fr)_minmax(560px,0.9fr)] xl:gap-x-8">
              {/* LEFT — operational queue */}
              <div className="space-y-2">
                {filteredProjects.map((project) => {
                  const isSelected = effectiveSelectedWorkId === project.id;
                  const isExpanded = expandedProject === project.id;
                  const next       = adminNextAction(project);
                  const nextTone   =
                    classifyBucket(project) === "public_ready"
                      ? "text-emerald-300/90"
                      : "text-amber-300/90";
                  return (
                    <div
                      key={project.id}
                      className={`rounded-md border overflow-hidden transition ${
                        isSelected
                          ? "border-orange-500/45 bg-orange-500/[0.06] xl:bg-orange-500/[0.04] xl:border-l-2 xl:border-l-orange-500/80"
                          : "border-white/8 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.035]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedWorkId(project.id);
                          setExpandedProject(isExpanded ? null : project.id);
                        }}
                        className="w-full text-left flex items-start gap-3 px-4 py-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-[13px] leading-snug truncate">
                            {project.title}
                          </p>
                          <p className="text-neutral-500 text-[11px] mt-0.5 truncate">
                            <span className="text-neutral-400">{project.creator_email}</span>
                            {project.project_type && (
                              <>
                                <span className="text-neutral-700 mx-1.5">·</span>
                                {project.project_type}
                              </>
                            )}
                          </p>
                          {next && (
                            <p className={`text-[11px] mt-1.5 leading-snug ${nextTone}`}>
                              {next}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0 pt-0.5">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded border tabular-nums ${
                              projectStatusColor[project.status] || "text-neutral-400"
                            }`}
                          >
                            {statusDisplay(project.status)}
                          </span>
                          <span className="text-neutral-600 text-[10px] tabular-nums">
                            {new Date(project.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                        <svg
                          className={`xl:hidden w-4 h-4 mt-1 text-neutral-500 transition-transform shrink-0 ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>

                      {/* Mobile inline expansion (hidden on desktop) */}
                      <div className="xl:hidden">
                        {isExpanded && (
                          <div className="px-5 pb-5 border-t border-white/5 pt-4">
                            {renderProjectDetail(project)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* RIGHT — command detail (desktop only) */}
              <aside className="hidden xl:block">
                <div className="xl:sticky xl:top-24 rounded-xl border border-white/10 bg-white/[0.02] p-7 max-h-[calc(100vh-7rem)] overflow-y-auto">
                  {selectedWork ? (
                    renderProjectDetail(selectedWork)
                  ) : (
                    <p className="text-neutral-500 text-sm text-center py-12">
                      Select a work to inspect.
                    </p>
                  )}
                </div>
              </aside>
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
}

// Identity Enforcement v1: small admin-only badge surfacing the creator's
// current identity tier. Falls back to "Self-certified" when the column has
// not been populated yet (covers the brief window before migration 015 has
// been applied to the DB and PostgREST schema cache reload).

// Local progressive-disclosure primitive used inside the admin expanded
// work panel. Pure presentational + local state; no global state, no URL.
function ExpandableSection({
  title,
  summary,
  defaultOpen = false,
  children,
  emphasis,
}: {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  emphasis?: "authority" | "default";
}) {
  const [open, setOpen] = useState(defaultOpen);
  const isAuth = emphasis === "authority";
  return (
    <section
      className={`rounded-lg border ${
        isAuth
          ? "border-amber-500/30 bg-amber-500/[0.04]"
          : "border-white/8 bg-white/[0.015]"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition"
      >
        <div className="flex items-baseline gap-3 min-w-0 flex-1 text-left">
          <span
            className={`text-[11px] uppercase tracking-widest ${
              isAuth
                ? "text-amber-300/90 font-semibold"
                : "text-neutral-400 font-medium"
            }`}
          >
            {title}
          </span>
          {summary && (
            <span className="text-[11px] text-neutral-500 truncate">
              {summary}
            </span>
          )}
        </div>
        <svg
          className={`w-3.5 h-3.5 text-neutral-500 transition-transform shrink-0 ${
            open ? "rotate-180" : ""
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-3 border-t border-white/5">{children}</div>
      )}
    </section>
  );
}

// Pure derivation. One-line description of the Review Record & License
// section when collapsed.
function licenseSummary(p: any): string {
  if (p.status === "approved" || p.status === "live") {
    if (p.license) {
      const term = p.license.term_years;
      return `SDL v1 · Executed${term ? ` · ${term} yr term` : ""}`;
    }
    if (p.status === "live") return "License missing (legacy)";
    return "License required";
  }
  if (p.status === "pending" || p.status === "in_review") {
    return "Awaiting approval";
  }
  if (p.status === "rejected") return "Rejected — no license";
  return "—";
}

// Phase 7.1 — Public Visibility Diagnostic (read-only).
//
// Mirrors the public-titles gate exactly as enforced by
// /api/public/titles. Every "held" reason maps to a specific row
// condition that currently excludes the work from the public catalog.
// The diagnostic does not infer anything beyond what the public read
// path actually checks, and it never mutates state.
//
// Public-titles gate (per src/app/api/public/titles/route.ts):
//   1. A `titles` row exists for this project.
//   2. titles.status = 'active'.
//   3. titles.media_ready = true.
//   4. titles.bunny_video_id IS NOT NULL.
//   5. process.env.BUNNY_STREAM_LIBRARY_ID is set on the server
//      (drops every row when missing — flagged as a server caveat
//      rather than a per-row block since it's not safely knowable
//      client-side from the admin page).
//
// Lifecycle states map cleanly to "Held — <reason>" prefixes for
// non-public works. Approved-but-not-yet-activated is split between
// the license-required and license-executed sub-states because both
// founder and operators read those as different "next step" prompts.
type PublicVisibilityTone = "ready" | "held" | "rejected" | "neutral";
type PublicVisibilityDiagnostic = {
  label:  string;
  tone:   PublicVisibilityTone;
};

function getPublicVisibilityDiagnostic(p: any): PublicVisibilityDiagnostic {
  const status = p?.status as string | undefined;
  // Terminal / non-decision states first — these explicitly cannot
  // appear publicly regardless of media binding.
  if (status === "removed") {
    return { label: "Removed",                                  tone: "rejected" };
  }
  if (status === "rejected") {
    return { label: "Rejected",                                 tone: "rejected" };
  }
  if (status === "archived") {
    return { label: "Internal hold",                            tone: "neutral" };
  }
  if (status === "removal_requested") {
    return { label: "Held — removal under review",              tone: "held" };
  }
  if (status === "draft") {
    return { label: "Held — awaiting submission",               tone: "held" };
  }
  if (status === "pending" || status === "in_review") {
    return { label: "Held — awaiting approval",                 tone: "held" };
  }
  if (status === "approved") {
    // Approved is a two-step: license execution, then admin
    // Activate Distribution. Surface the next step honestly.
    if (!p?.license) {
      return { label: "Held — license not executed",            tone: "held" };
    }
    return { label: "Held — distribution not activated",        tone: "held" };
  }
  if (status === "live") {
    // Live works flow through the actual public-titles gate.
    if (p?.title_status && p.title_status !== "active") {
      return { label: "Held — title row inactive",              tone: "held" };
    }
    if (!p?.bunny_video_id) {
      return { label: "Held — Bunny video missing",             tone: "held" };
    }
    if (p?.media_ready !== true) {
      return { label: "Held — media not ready",                 tone: "held" };
    }
    return { label: "Ready — visible in public catalog",        tone: "ready" };
  }
  // Unknown status — never claim visibility.
  return { label: "Held — unknown state",                       tone: "held" };
}

function PublicVisibilityRow({ project }: { project: any }) {
  const d = getPublicVisibilityDiagnostic(project);
  const cls =
    d.tone === "ready"
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
      : d.tone === "rejected"
      ? "bg-red-500/15 text-red-300 border-red-500/40"
      : d.tone === "held"
      ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30"
      : "bg-white/5 text-neutral-300 border-white/15";
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[11px] uppercase tracking-widest text-neutral-500">
        Public visibility:
      </span>
      <span className={`text-[11px] px-2 py-0.5 rounded border ${cls}`}>
        {d.label}
      </span>
    </div>
  );
}

// ── Phase 7.2: Mission Control bucket classification ─────────────────
//
// Operational buckets describe what a work *needs next* from admin —
// they are derived strictly from the same fields the public visibility
// diagnostic reads, so the readiness cards/chips cannot drift from the
// per-row badge. Live works delegate to getPublicVisibilityDiagnostic
// to decide between needs_bunny / needs_processing / public_ready.
type BucketKey =
  | "needs_review"
  | "needs_license"
  | "needs_activation"
  | "needs_bunny"
  | "needs_processing"
  | "public_ready"
  | "internal_hold"
  | "draft";

function classifyBucket(p: any): BucketKey {
  const status = p?.status as string | undefined;

  if (status === "pending" || status === "in_review" || status === "removal_requested") {
    return "needs_review";
  }
  if (status === "approved") {
    return p?.license ? "needs_activation" : "needs_license";
  }
  if (status === "live") {
    const d = getPublicVisibilityDiagnostic(p);
    if (d.tone === "ready") return "public_ready";
    if (p?.title_status && p.title_status !== "active") return "internal_hold";
    if (!p?.bunny_video_id) return "needs_bunny";
    if (p?.media_ready !== true) return "needs_processing";
    return "internal_hold";
  }
  if (status === "archived" || status === "rejected" || status === "removed") {
    return "internal_hold";
  }
  if (status === "draft") return "draft";
  return "internal_hold";
}

const BUCKET_ORDER: BucketKey[] = [
  "needs_review",
  "needs_license",
  "needs_activation",
  "needs_bunny",
  "needs_processing",
  "public_ready",
  "internal_hold",
];

const BUCKET_LABELS: Record<BucketKey, string> = {
  needs_review:     "Needs Review",
  needs_license:    "Needs License",
  needs_activation: "Needs Activation",
  needs_bunny:      "Needs Bunny",
  needs_processing: "Needs Processing",
  public_ready:     "Public Ready",
  internal_hold:    "Internal Hold / Removed",
  draft:            "Draft",
};

type BucketTone = "amber" | "emerald" | "neutral";
const BUCKET_TONES: Record<BucketKey, BucketTone> = {
  needs_review:     "amber",
  needs_license:    "amber",
  needs_activation: "amber",
  needs_bunny:      "amber",
  needs_processing: "amber",
  public_ready:     "emerald",
  internal_hold:    "neutral",
  draft:            "neutral",
};

const EMPTY_BUCKET_COUNTS: Record<BucketKey, number> = {
  needs_review:     0,
  needs_license:    0,
  needs_activation: 0,
  needs_bunny:      0,
  needs_processing: 0,
  public_ready:     0,
  internal_hold:    0,
  draft:            0,
};

type LaunchReadinessTone = "ready" | "attention" | "neutral";
type LaunchReadiness = { label: string; tone: LaunchReadinessTone };

function deriveLaunchReadiness(counts: Record<BucketKey, number>): LaunchReadiness {
  if (counts.public_ready === 0) {
    return { label: "No public-ready titles", tone: "neutral" };
  }
  const backlog =
    counts.needs_review +
    counts.needs_license +
    counts.needs_activation +
    counts.needs_bunny +
    counts.needs_processing;
  if (backlog > 0) return { label: "Needs attention", tone: "attention" };
  return { label: "Ready", tone: "ready" };
}

// Phase 7.3: short imperative the admin sees on the collapsed row, so
// the next operational step is visible without expanding the panel.
// Terminal buckets (internal_hold, draft) return null — the row stays
// quiet rather than echoing a settled state.
function adminNextAction(p: any): string | null {
  switch (classifyBucket(p)) {
    case "needs_review":     return "Next: Review and decide";
    case "needs_license":    return "Next: Awaiting creator license signature";
    case "needs_activation": return "Next: Activate distribution";
    case "needs_bunny":      return "Next: Bunny video ID required";
    case "needs_processing": return "Next: Submit for processing";
    case "public_ready":     return "Listed in public catalog";
    case "internal_hold":    return null;
    case "draft":            return null;
    default:                 return null;
  }
}

function IdentityRow({ status }: { status: string | null }) {
  const map: Record<string, { label: string; cls: string }> = {
    self_certified: {
      label: "Self-certified",
      cls:   "bg-white/5 text-neutral-300 border-white/15",
    },
    verification_requested: {
      label: "Verification requested",
      cls:   "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    },
    verified: {
      label: "Verified",
      cls:   "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    },
    flagged: {
      label: "Flagged",
      cls:   "bg-red-500/20 text-red-300 border-red-500/30",
    },
  };
  const tier = map[status ?? "self_certified"] ?? map.self_certified;
  return (
    <p className="text-[11px] text-neutral-500 leading-relaxed">
      Identity:{" "}
      <span className={`text-[11px] px-1.5 py-0.5 rounded border ${tier.cls}`}>
        {tier.label}
      </span>
    </p>
  );
}

function MediaProcessingHistory({ history }: { history: unknown }) {
  const list = Array.isArray(history) ? history : [];
  if (list.length === 0) return null;
  const recent = list.slice(-3).reverse();
  const labelFor = (a: string): string => {
    if (a === "submitted_for_processing") return "Submitted for processing";
    if (a === "processing_reset")         return "Processing reset";
    if (a === "binding_updated")          return "Binding updated";
    return a;
  };
  return (
    <div className="mt-3 pt-3 border-t border-white/5">
      <p className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1.5">
        Processing History
      </p>
      <ul className="space-y-1">
        {recent.map((e: any, idx: number) => (
          <li
            key={idx}
            className="text-[11px] text-neutral-400 leading-relaxed flex items-start gap-2"
          >
            <span className="text-neutral-600 font-mono shrink-0">
              {e?.at ? new Date(e.at).toUTCString() : "—"}
            </span>
            <span className="text-white">{labelFor(String(e?.action ?? "—"))}</span>
            <span className="text-neutral-500">by {String(e?.by ?? "—")}</span>
            {e?.reason && (
              <span className="text-neutral-500 italic break-words">
                — {String(e.reason)}
              </span>
            )}
          </li>
        ))}
        {list.length > 3 && (
          <li className="text-[10px] text-neutral-600">
            (showing most recent 3 of {list.length} entries)
          </li>
        )}
      </ul>
    </div>
  );
}

function StateHistory({
  entries,
  bare,
}: {
  entries: unknown;
  bare?: boolean;
}) {
  const list = Array.isArray(entries) ? entries : [];
  if (list.length === 0) return null;
  // Show most recent 5 transitions, newest first.
  const recent = list.slice(-5).reverse();
  if (bare) {
    return (
      <ul className="space-y-1.5">
        {recent.map((e: any, idx: number) => (
          <li
            key={idx}
            className="text-[11px] text-neutral-400 leading-relaxed flex items-start gap-2"
          >
            <span className="text-neutral-600 font-mono shrink-0">
              {e?.at ? new Date(e.at).toUTCString() : "—"}
            </span>
            <span className="text-neutral-300">
              {String(e?.from ?? "—")} →{" "}
              <span className="text-white">{String(e?.to ?? "—")}</span>
            </span>
            <span className="text-neutral-500">by {String(e?.by ?? "—")}</span>
            {e?.reason && (
              <span className="text-neutral-500 italic break-words">
                — {String(e.reason)}
              </span>
            )}
          </li>
        ))}
        {list.length > 5 && (
          <li className="text-[10px] text-neutral-600">
            (showing most recent 5 of {list.length} transitions)
          </li>
        )}
      </ul>
    );
  }
  return (
    <div className="mt-5 pt-4 border-t border-white/5">
      <p className="text-xs uppercase tracking-widest text-neutral-500 mb-2">
        State History
      </p>
      <ul className="space-y-1.5">
        {recent.map((e: any, idx: number) => (
          <li
            key={idx}
            className="text-[11px] text-neutral-400 leading-relaxed flex items-start gap-2"
          >
            <span className="text-neutral-600 font-mono shrink-0">
              {e?.at ? new Date(e.at).toUTCString() : "—"}
            </span>
            <span className="text-neutral-300">
              {String(e?.from ?? "—")} → <span className="text-white">{String(e?.to ?? "—")}</span>
            </span>
            <span className="text-neutral-500">by {String(e?.by ?? "—")}</span>
            {e?.reason && (
              <span className="text-neutral-500 italic break-words">
                — {String(e.reason)}
              </span>
            )}
          </li>
        ))}
        {list.length > 5 && (
          <li className="text-[10px] text-neutral-600">
            (showing most recent 5 of {list.length} transitions)
          </li>
        )}
      </ul>
    </div>
  );
}

function Field({
  label,
  value,
  full,
  link,
}: {
  label: string;
  value?: string;
  full?: boolean;
  link?: boolean;
}) {
  if (!value) return null;
  const href = link
    ? value.startsWith("http")
      ? value
      : `https://${value}`
    : undefined;

  return (
    <div className={full ? "md:col-span-2" : ""}>
      <p className="text-neutral-500 text-xs mb-0.5">{label}</p>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-orange-400 hover:text-orange-300 text-sm underline underline-offset-2 break-all"
        >
          {value}
        </a>
      ) : (
        <p className="text-white text-sm whitespace-pre-wrap">{value}</p>
      )}
    </div>
  );
}
