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
  const [projectFilter, setProjectFilter] = useState<"all" | "pending" | "in_review" | "approved" | "rejected" | "live" | "archived" | "removal_requested" | "removed">("all");
  const [projectLoading, setProjectLoading] = useState(false);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

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

  const filteredProjects =
    projectFilter === "all"
      ? projectList
      : projectList.filter((p) => p.status === projectFilter);

  const projectCounts = {
    all:               projectList.length,
    pending:           projectList.filter((p) => p.status === "pending").length,
    in_review:         projectList.filter((p) => p.status === "in_review").length,
    approved:          projectList.filter((p) => p.status === "approved").length,
    rejected:          projectList.filter((p) => p.status === "rejected").length,
    live:              projectList.filter((p) => p.status === "live").length,
    archived:          projectList.filter((p) => p.status === "archived").length,
    removal_requested: projectList.filter((p) => p.status === "removal_requested").length,
    removed:           projectList.filter((p) => p.status === "removed").length,
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

  // ── Dashboard ──
  return (
    <div className="min-h-screen px-4 pt-24 pb-12 max-w-6xl mx-auto">
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

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            className="text-2xl font-semibold text-white tracking-wide"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Creator Applications
          </h1>
          <p className="text-sm text-neutral-500 mt-1">{applications.length} total submissions</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={refreshAll}
              disabled={refreshing}
              title="Refresh applications and works without reloading the browser."
              type="button"
              className="text-xs font-medium px-3.5 py-2 rounded-md border border-white/30 bg-white/10 text-white hover:bg-white/15 hover:border-white/45 transition disabled:opacity-50"
            >
              {refreshing ? "Refreshing…" : "Refresh Data"}
            </button>
            <span className="text-[10px] text-neutral-600 leading-none">
              Refresh applications and works without reloading the browser.
            </span>
          </div>
          <button
            onClick={() => { setAuthed(false); setPassword(""); }}
            className="text-xs text-neutral-500 hover:text-white transition"
          >
            Lock
          </button>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex gap-2 mb-6 border-b border-white/10 pb-3">
        <button
          onClick={() => setView("applications")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${
            view === "applications" ? "bg-white/10 text-white" : "text-neutral-500 hover:text-white"
          }`}
        >
          Applications
        </button>
        <button
          onClick={() => {
            setView("projects");
            if (projectList.length === 0) loadProjects();
          }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${
            view === "projects" ? "bg-white/10 text-white" : "text-neutral-500 hover:text-white"
          }`}
        >
          Works
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

          {filtered.length === 0 ? (
            <p className="text-neutral-500 text-sm">No applications found.</p>
          ) : (
            <div className="space-y-3">
              {filtered.map((app) => (
                <div
                  key={app.id}
                  className="border border-white/8 rounded-lg bg-white/[0.02] overflow-hidden"
                >
                  <div
                    className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-white/[0.03] transition"
                    onClick={() => setExpanded(expanded === app.id ? null : app.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="text-white font-medium text-sm">{app.name || "—"}</span>
                        {app.handle && (
                          <span className="text-neutral-500 text-xs">@{app.handle}</span>
                        )}
                      </div>
                      <p className="text-neutral-400 text-xs mt-0.5 truncate">
                        {app.project_title || "No project title"} · {app.project_type || "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded border ${
                          statusColor[app.status] || "text-neutral-400"
                        }`}
                      >
                        {app.status}
                      </span>
                      <span className="text-neutral-600 text-xs">
                        {new Date(app.submitted_at).toLocaleDateString()}
                      </span>
                      <svg
                        className={`w-4 h-4 text-neutral-500 transition-transform ${
                          expanded === app.id ? "rotate-180" : ""
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
                    </div>
                  </div>

                  {expanded === app.id && (
                    <div className="px-5 pb-5 border-t border-white/5 pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <Field label="Email" value={app.email} />
                        <Field label="Origin" value={app.origin} />
                        <Field label="Project Type" value={app.project_type} />
                        <Field label="Genres" value={app.genres?.join(", ")} />
                        <Field label="Logline" value={app.logline} full />
                        <Field label="Sample URL" value={app.sample_url} link />
                        <Field label="Influences" value={app.influences} full />
                        <Field label="Why ShangoMaji" value={app.why_shangomaji} full />
                        <Field label="What They Need" value={app.what_you_need} full />
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

                      <div className="mt-5 pt-4 border-t border-white/5 space-y-3">
                        {/* Authority-of-state messaging. Decisions are final. */}
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

                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-neutral-500 mr-2">Set status:</span>
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
                          {/* Archive: non-destructive close from accepted/rejected. */}
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
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Projects tab ── */}
      {view === "projects" && (
        <>
          <div className="flex gap-2 mb-6 flex-wrap">
            {(
              [
                { key: "all",                label: "All"                },
                { key: "pending",            label: "Pending"            },
                { key: "in_review",          label: "In Review"          },
                { key: "approved",           label: "Approved"           },
                { key: "rejected",           label: "Rejected"           },
                { key: "live",               label: "Live"               },
                { key: "removal_requested",  label: "Removal Requested"  },
                { key: "archived",           label: "Archived"           },
                { key: "removed",            label: "Removed"            },
              ] as const
            ).map((f) => (
              <button
                key={f.key}
                onClick={() => setProjectFilter(f.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  projectFilter === f.key
                    ? "bg-white/10 text-white"
                    : "text-neutral-500 hover:text-white hover:bg-white/5"
                }`}
              >
                {f.label} ({projectCounts[f.key]})
              </button>
            ))}
          </div>

          {/* Removal Requests queue — surfaces all removal_requested rows
              regardless of the current filter so admin always sees pending
              requests at the top of the Works tab. */}
          {!projectLoading && removalQueue.length > 0 && (
            <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
              <div className="flex items-start justify-between mb-3 gap-4 flex-wrap">
                <p className="text-xs uppercase tracking-widest text-amber-300/90 font-semibold">
                  Removal Requests ({removalQueue.length})
                </p>
                <p className="text-[11px] text-neutral-500 max-w-md">
                  Resolve this request by permanently removing the work from distribution or returning it to active status.
                </p>
              </div>
              <div className="space-y-2">
                {removalQueue.map((p: any) => (
                  <div
                    key={`removal-${p.id}`}
                    className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm"
                  >
                    <div className="flex flex-wrap items-start gap-x-4 gap-y-1">
                      <p className="text-white font-medium">{p.title || "Untitled"}</p>
                      <p className="text-xs text-neutral-400">{p.creator_email}</p>
                      {p.removal_requested_at && (
                        <p className="text-[11px] text-neutral-500">
                          Requested {new Date(p.removal_requested_at).toUTCString()}
                        </p>
                      )}
                    </div>
                    {(p.removal_request_reason || p.removal_reason) && (
                      <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
                        Reason: {p.removal_request_reason || p.removal_reason}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => {
                            setApproveRemovalTarget({ id: p.id, title: p.title || "" });
                            setApproveRemovalReason("");
                            setApproveRemovalError("");
                          }}
                          disabled={removalBusy === p.id}
                          className="px-3 py-1.5 rounded text-xs font-medium border border-amber-500/40 text-amber-300 hover:bg-amber-500/10 transition disabled:opacity-50"
                        >
                          Approve Removal
                        </button>
                        <span className="text-[10px] text-neutral-500 px-1">
                          Permanently remove from distribution.
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => {
                            setDenyRemovalTarget({ id: p.id, title: p.title || "" });
                            setDenyRemovalReason("");
                            setDenyRemovalError("");
                          }}
                          disabled={removalBusy === p.id}
                          className="px-3 py-1.5 rounded text-xs font-medium border border-white/20 text-neutral-300 hover:bg-white/5 transition disabled:opacity-50"
                        >
                          Deny Removal
                        </button>
                        <span className="text-[10px] text-neutral-500 px-1">
                          Return to active distribution.
                        </span>
                      </div>
                      <button
                        onClick={() => setExpandedProject(p.id)}
                        className="px-3 py-1.5 rounded text-xs font-medium border border-white/10 text-neutral-500 hover:text-white transition self-start"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {projectLoading && <p className="text-neutral-500 text-sm">Loading projects...</p>}

          {!projectLoading && filteredProjects.length === 0 && (
            <p className="text-neutral-500 text-sm">No projects found.</p>
          )}

          {!projectLoading && filteredProjects.length > 0 && (
            <div className="space-y-3">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className="border border-white/8 rounded-lg bg-white/[0.02] overflow-hidden"
                >
                  <div
                    className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-white/[0.03] transition"
                    onClick={() =>
                      setExpandedProject(expandedProject === project.id ? null : project.id)
                    }
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="text-white font-medium text-sm">{project.title}</span>
                        {project.project_type && (
                          <span className="text-neutral-500 text-xs">{project.project_type}</span>
                        )}
                      </div>
                      <p className="text-neutral-400 text-xs mt-0.5 truncate">
                        {project.creator_email} · {project.logline || "No logline"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded border ${
                          projectStatusColor[project.status] || "text-neutral-400"
                        }`}
                      >
                        {statusDisplay(project.status)}
                      </span>
                      <span className="text-neutral-600 text-xs">
                        {new Date(project.updated_at).toLocaleDateString()}
                      </span>
                      <svg
                        className={`w-4 h-4 text-neutral-500 transition-transform ${
                          expandedProject === project.id ? "rotate-180" : ""
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
                    </div>
                  </div>

                  {expandedProject === project.id && (
                    <div className="px-5 pb-5 border-t border-white/5 pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <Field label="Creator Email" value={project.creator_email} />
                        <Field label="Type" value={project.project_type} />
                        <Field label="Genres" value={project.genres?.join(", ")} />
                        <Field label="Logline" value={project.logline} full />
                        <Field label="Description" value={project.description} full />
                        <Field label="Cover Image" value={project.cover_image_url} link />
                        <Field label="Sample URL" value={project.sample_url} link />
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

                      {/* ── DISTRIBUTION STATUS — Permanently Removed ──
                          Terminal state authority block. No restore, no reopen,
                          no archive. The decision is final. */}
                      {project.status === "removed" && (
                        <div className="mt-5 rounded-lg border border-red-500/40 bg-red-900/10 p-4">
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

                      {/* ── REMOVAL REVIEW — request under review ──
                            Authority block above the action strip; the action
                            buttons themselves live in the action row below. */}
                      {project.status === "removal_requested" && (
                        <div className="mt-5 rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
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

                      <StateHistory entries={project.state_history} />


                      {/* ── Submission Integrity + Review (pending/in_review/approved) ── */}
                      {(project.status === "pending" ||
                        project.status === "in_review" ||
                        project.status === "approved" ||
                        project.status === "live" ||
                        project.status === "rejected") && (
                        <SubmissionReviewPanel
                          project={project}
                          review={reviewByProject[project.id] ?? reviewFromProject(project)}
                          onChange={(next) => setReviewFor(project.id, next)}
                          onSaveReview={() => saveReviewNotes(project.id)}
                          saving={reviewBusy === project.id}
                          saved={reviewSavedFor === project.id}
                          hideForLegacyStates
                        />
                      )}

                      {/* ── License panel (approved & live) ── */}
                      {(project.status === "approved" || project.status === "live") && (
                        <div className="mt-5 pt-4 border-t border-white/5 space-y-3">
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
                              {/* Identity Enforcement v1: subtle activation-awareness note.
                                  Does NOT block activation. */}
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
                                  View receipt
                                </a>
                                {!project.license.pdf_url && (
                                  <span className="text-neutral-500 text-[11px] ml-2">
                                    (HTML — PDF generation is future work)
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

                      {/* ── Bunny media binding (live projects only) ── */}
                      {project.status === "live" && (
                        <div className="mt-5 pt-4 border-t border-white/5 space-y-3">
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
                      )}

                      {/* Rejection input */}
                      {rejectingId === project.id && (
                        <div className="mt-4 space-y-2">
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

                      {/* Action buttons */}
                      {(() => {
                        const reviewState =
                          reviewByProject[project.id] ?? reviewFromProject(project);
                        const gate = gateState(project, reviewState);
                        const showApproveGate =
                          project.status === "pending" || project.status === "in_review";
                        return (
                      <div className="mt-5 pt-4 border-t border-white/5 flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-neutral-500 mr-2">Actions:</span>

                        {/* pending: Start Review, Approve, Reject */}
                        {project.status === "pending" && rejectingId !== project.id && (
                          <>
                            <button
                              onClick={() => updateProjectStatus(project.id, "in_review")}
                              className="px-3 py-1.5 rounded text-xs font-medium border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 transition"
                            >
                              Start Review
                            </button>
                            {gate.approvalAllowed ? (
                              <button
                                onClick={() => updateProjectStatus(project.id, "approved")}
                                className="px-3 py-1.5 rounded text-xs font-medium border border-teal-500/30 text-teal-400 hover:bg-teal-500/10 transition"
                              >
                                Approve for Licensing
                              </button>
                            ) : (
                              <span
                                title={gate.approvalBlockedMessage ?? undefined}
                                className="px-3 py-1.5 rounded text-xs font-medium border border-white/10 text-neutral-600 cursor-not-allowed"
                              >
                                Approval locked
                              </span>
                            )}
                            <button
                              onClick={() => { setRejectingId(project.id); setRejectionInput(""); }}
                              className="px-3 py-1.5 rounded text-xs font-medium border border-red-500/30 text-red-400 hover:bg-red-500/10 transition"
                            >
                              Reject Submission
                            </button>
                          </>
                        )}

                        {/* in_review: Approve, Reject */}
                        {project.status === "in_review" && rejectingId !== project.id && (
                          <>
                            {gate.approvalAllowed ? (
                              <button
                                onClick={() => updateProjectStatus(project.id, "approved")}
                                className="px-3 py-1.5 rounded text-xs font-medium border border-teal-500/30 text-teal-400 hover:bg-teal-500/10 transition"
                              >
                                Approve for Licensing
                              </button>
                            ) : (
                              <span
                                title={gate.approvalBlockedMessage ?? undefined}
                                className="px-3 py-1.5 rounded text-xs font-medium border border-white/10 text-neutral-600 cursor-not-allowed"
                              >
                                Approval locked
                              </span>
                            )}
                            <button
                              onClick={() => { setRejectingId(project.id); setRejectionInput(""); }}
                              className="px-3 py-1.5 rounded text-xs font-medium border border-red-500/30 text-red-400 hover:bg-red-500/10 transition"
                            >
                              Reject Submission
                            </button>
                          </>
                        )}

                        {/* Inline approval-blocker diagnostics — show both axes
                            (creator integrity and review record) when both fail,
                            or the dedicated legacy copy when the work predates
                            Submission Integrity v1. Visible always, not only on
                            tooltip hover. */}
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
                                {gate.reviewMessage && (
                                  <>
                                    <p className="text-[11px] text-neutral-300 leading-relaxed">
                                      Approval is locked because the review record is not passing. Rejection remains available.
                                    </p>
                                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                                      Review record: {gate.reviewMessage}
                                    </p>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        )}

                        {/* approved: Activate Distribution (requires executed license) */}
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

                        {/* live: Archive to Internal Hold (typed-confirmation gate) */}
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

                        {/* pending / in_review / approved: Archive to Internal Hold */}
                        {(project.status === "pending" ||
                          project.status === "in_review" ||
                          project.status === "approved") && (
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

                        {/* rejected: Reopen for Review + Archive to Internal Hold */}
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

                        {/* archived: Restore */}
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

                        {/* removed: terminal — no actions allowed. The block at
                            the top of the expanded panel carries the full
                            DISTRIBUTION STATUS authority copy; this row is the
                            inline action-strip stub. */}
                        {project.status === "removed" && (
                          <span className="text-xs text-red-300/80">
                            Removed — terminal state.
                          </span>
                        )}

                        {/* removal_requested: Approve Removal / Deny Removal — both
                            open styled modals with required reason. No native
                            prompt(), no inline forms. */}
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
                        );
                      })()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Identity Enforcement v1: small admin-only badge surfacing the creator's
// current identity tier. Falls back to "Self-certified" when the column has
// not been populated yet (covers the brief window before migration 015 has
// been applied to the DB and PostgREST schema cache reload).
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

function StateHistory({ entries }: { entries: unknown }) {
  const list = Array.isArray(entries) ? entries : [];
  if (list.length === 0) return null;
  // Show most recent 5 transitions, newest first.
  const recent = list.slice(-5).reverse();
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
