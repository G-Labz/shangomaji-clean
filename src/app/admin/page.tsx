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
  const [projectFilter, setProjectFilter] = useState<"all" | "pending" | "in_review" | "approved" | "rejected" | "live" | "archived">("all");
  const [projectLoading, setProjectLoading] = useState(false);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  // Rejection reason state — tracks which project is being rejected
  const [rejectingId, setRejectingId]         = useState<string | null>(null);
  const [rejectionInput, setRejectionInput]   = useState("");
  const [rejectBusy, setRejectBusy]           = useState(false);

  // Bunny media binding (Phase 1) — keyed by project id
  const [mediaInputs, setMediaInputs] = useState<Record<string, string>>({});
  const [mediaBusy, setMediaBusy]     = useState<string | null>(null);

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

  // Archive — requires typed-title confirmation. live → archived only.
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
          status: "archived",
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

  // Save Bunny video ID + media_ready flag for a live project's title row.
  async function saveMedia(projectId: string, opts: { bunnyVideoId?: string; mediaReady?: boolean }) {
    setMediaBusy(projectId);
    try {
      const res = await fetch("/api/admin/titles/media", {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          ...(opts.bunnyVideoId !== undefined ? { bunnyVideoId: opts.bunnyVideoId } : {}),
          ...(opts.mediaReady   !== undefined ? { mediaReady:   opts.mediaReady   } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Media update failed");
      setProjectList((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? {
                ...p,
                bunny_video_id:      data.title?.bunny_video_id      ?? p.bunny_video_id,
                bunny_thumbnail_url: data.title?.bunny_thumbnail_url ?? p.bunny_thumbnail_url,
                media_ready:         data.title?.media_ready         ?? p.media_ready,
              }
            : p
        )
      );
    } catch (e: any) {
      alert(e.message);
    } finally {
      setMediaBusy(null);
    }
  }

  const filteredProjects =
    projectFilter === "all"
      ? projectList
      : projectList.filter((p) => p.status === projectFilter);

  const projectCounts = {
    all:       projectList.length,
    pending:   projectList.filter((p) => p.status === "pending").length,
    in_review: projectList.filter((p) => p.status === "in_review").length,
    approved:  projectList.filter((p) => p.status === "approved").length,
    rejected:  projectList.filter((p) => p.status === "rejected").length,
    live:      projectList.filter((p) => p.status === "live").length,
    archived:  projectList.filter((p) => p.status === "archived").length,
  };

  const projectStatusColor: Record<string, string> = {
    pending:   "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    in_review: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    approved:  "bg-teal-500/20 text-teal-400 border-teal-500/30",
    rejected:  "bg-red-500/20 text-red-400 border-red-500/30",
    live:      "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    archived:  "bg-white/10 text-neutral-400 border-white/10",
  };

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
    <div className="min-h-screen px-4 py-8 max-w-6xl mx-auto">
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
                Catalog Action
              </p>
              <h3 className="text-white text-lg font-semibold">
                Archive this work?
              </h3>
            </div>

            <div className="space-y-2 text-sm text-neutral-400 leading-relaxed">
              <p>
                This removes <span className="text-white">{archiveTarget.title || "this title"}</span> from
                public catalog visibility.
              </p>
              <ul className="list-disc pl-5 space-y-1 text-neutral-400">
                <li>The work is not deleted.</li>
                <li>This is an admin catalog action, not a creator action.</li>
                <li>Use only when removal from public distribution is intentional.</li>
              </ul>
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
                {archiveBusy ? "Archiving…" : "Archive from Catalog"}
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
        <button
          onClick={() => { setAuthed(false); setPassword(""); }}
          className="text-xs text-neutral-500 hover:text-white transition"
        >
          Lock
        </button>
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
                { key: "all",       label: "All"       },
                { key: "pending",   label: "Pending"   },
                { key: "in_review", label: "In Review" },
                { key: "approved",  label: "Approved"  },
                { key: "rejected",  label: "Rejected"  },
                { key: "live",      label: "Live"      },
                { key: "archived",  label: "Archived"  },
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
                        {project.status === "in_review"
                          ? "In Review"
                          : project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                      </span>
                      {project.removal_requested && (
                        <span className="text-[11px] px-2 py-0.5 rounded border bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                          Removal Req.
                        </span>
                      )}
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
                        {project.removal_requested && project.removal_reason && (
                          <Field label="Removal Reason" value={project.removal_reason} full />
                        )}
                      </div>

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
                            const wantsMarkReady   = !project.media_ready;
                            const markReadyBlocked = wantsMarkReady && !hasVideoId;

                            return (
                              <>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <input
                                    type="text"
                                    placeholder="Bunny video ID"
                                    defaultValue={project.bunny_video_id || ""}
                                    onChange={(e) =>
                                      setMediaInputs((s) => ({ ...s, [project.id]: e.target.value }))
                                    }
                                    className="flex-1 min-w-[220px] px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-orange-500/40"
                                  />
                                  <button
                                    onClick={() =>
                                      saveMedia(project.id, { bunnyVideoId: effectiveVideoId })
                                    }
                                    disabled={mediaBusy === project.id}
                                    className="px-3 py-2 rounded text-xs font-medium border border-white/15 text-white hover:bg-white/10 transition disabled:opacity-50"
                                  >
                                    {mediaBusy === project.id ? "Saving…" : "Save ID"}
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (markReadyBlocked) return;
                                      saveMedia(project.id, { mediaReady: !project.media_ready });
                                    }}
                                    disabled={mediaBusy === project.id || markReadyBlocked}
                                    title={
                                      markReadyBlocked
                                        ? "Paste the Bunny Stream Video ID before marking media ready."
                                        : undefined
                                    }
                                    className={`px-3 py-2 rounded text-xs font-medium border transition disabled:opacity-40 disabled:cursor-not-allowed ${
                                      project.media_ready
                                        ? "border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
                                        : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                                    }`}
                                  >
                                    {project.media_ready ? "Withdraw from processing" : "Submit for processing"}
                                  </button>
                                </div>

                                {markReadyBlocked ? (
                                  <p className="text-[11px] text-yellow-300/80 leading-relaxed">
                                    Paste the Bunny Stream Video ID, save it, then submit for processing.
                                    Final activation is controlled by ShangoMaji.
                                  </p>
                                ) : (
                                  <p className="text-[11px] text-neutral-500 leading-relaxed">
                                    A title only appears in the public catalog when it has a Bunny video ID
                                    and has been submitted for processing. Final activation is controlled by ShangoMaji.
                                  </p>
                                )}
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
                                Approve
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
                              Reject
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
                                Approve
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
                              Reject
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
                                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                                    Review record: {gate.reviewMessage}
                                  </p>
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

                        {/* live: Archive (opens typed-confirmation gate) */}
                        {project.status === "live" && (
                          <button
                            onClick={() => {
                              setArchiveTarget({ id: project.id, title: project.title || "" });
                              setArchiveConfirm("");
                              setArchiveError("");
                            }}
                            className="px-3 py-1.5 rounded text-xs font-medium border border-white/20 text-neutral-400 hover:text-white hover:border-white/30 transition"
                          >
                            Archive
                          </button>
                        )}

                        {/* rejected / archived: terminal */}
                        {(project.status === "rejected" || project.status === "archived") &&
                          rejectingId !== project.id && (
                            <span className="text-xs text-neutral-500">
                              {project.status === "rejected" ? "Rejected — terminal state" : "Archived — terminal state"}
                            </span>
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
