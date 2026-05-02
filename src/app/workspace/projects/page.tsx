"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, StatusBadge, Pill, ItemActions, useConfirm, statusLabel } from "../components";

type Project = {
  id: string;
  title: string;
  status: string;
  project_type: string | null;
  genres: string[] | null;
  logline: string | null;
  description: string | null;
  updated_at: string;
  removal_requested?: boolean;
  license_status?: "executed" | "none";
  license_id?: string | null;
};

// Phase 4.9 filters — pending covers pending+in_review, live is the public state
const FILTERS = [
  { key: "all",      label: "All"      },
  { key: "live",     label: "Live"     },
  { key: "pending",  label: "Pending"  },
  { key: "draft",    label: "Drafts"   },
  { key: "rejected", label: "Rejected" },
];

function matchesFilter(status: string, filter: string): boolean {
  if (filter === "all") return true;
  if (filter === "pending") return status === "pending" || status === "in_review";
  return status === filter;
}

// Authority-of-state plain English. Visible directly under the badge so the
// creator never has to guess what their work's state means or who controls
// the next move.
function stateMeaning(status: string): string {
  switch (status) {
    case "draft":     return "Private draft. Fully editable.";
    case "pending":   return "Submitted for review. Editing locked.";
    case "in_review": return "Under editorial evaluation. No changes allowed.";
    case "approved":  return "Selected for distribution consideration. License required.";
    case "live":      return "Under active distribution license. Managed by ShangoMaji.";
    case "archived":  return "Removed from active catalog.";
    case "rejected":  return "Not selected. Revise to create a new draft.";
    default:          return "";
  }
}

// Human-readable block reasons per status
function deleteBlockReason(status: string): string {
  if (status === "live")      return "Live projects cannot be deleted. Submit a removal request instead.";
  if (status === "pending")   return "Projects under review cannot be deleted.";
  if (status === "in_review") return "Projects under review cannot be deleted.";
  if (status === "approved")  return "Approved projects cannot be deleted.";
  return "This project cannot be deleted.";
}

export default function WorkspaceProjects() {
  const [filter, setFilter]     = useState<string>("all");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [feedback, setFeedback] = useState("");
  const [removalProject, setRemovalProject] = useState<Project | null>(null);
  const [removalReason, setRemovalReason]   = useState("");
  const [removalBusy, setRemovalBusy]       = useState(false);
  const [submittingId, setSubmittingId]     = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();

  useEffect(() => {
    async function loadProjects() {
      try {
        const res  = await fetch("/api/creators/projects");
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Could not load projects");
        const raw: Project[] = (data.projects ?? []).filter(
          (p: Project) => p.status !== "archived"
        );
        const seen = new Map<string, Project>();
        raw.forEach((p) => { if (!seen.has(p.id)) seen.set(p.id, p); });
        setProjects(Array.from(seen.values()));
      } catch (err: any) {
        setError(err.message || "Could not load projects");
      } finally {
        setLoading(false);
      }
    }
    loadProjects();
  }, []);

  const filtered = useMemo(
    () => projects.filter((p) => matchesFilter(p.status, filter)),
    [filter, projects]
  );

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  }

  function showFeedback(msg: string) {
    setFeedback(msg);
    setTimeout(() => setFeedback(""), 2500);
  }

  function showError(msg: string) {
    setError(msg);
    setTimeout(() => setError(""), 3500);
  }

  async function handleDelete(project: Project) {
    const ok = await confirm({
      title: "Delete Project",
      description: `This will permanently delete "${project.title}" and all its associated data. This cannot be undone.`,
      confirmLabel: "Delete Project",
      destructive: true,
    });
    if (!ok) return;
    try {
      const res  = await fetch("/api/creators/projects", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: project.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Delete failed");
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
      showFeedback(`"${project.title}" deleted.`);
    } catch (err: any) {
      showError(err.message || "Delete failed");
    }
  }

  // Submit a draft for review directly from the list (draft → pending).
  // Mirrors the edit page's Submit for Review action, so a creator never
  // has to open the edit page just to find the submit button.
  async function handleSubmitDraft(project: Project) {
    setSubmittingId(project.id);
    try {
      const res = await fetch("/api/creators/projects", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ id: project.id, status: "pending" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Submit failed");
      setProjects((prev) =>
        prev.map((p) => (p.id === project.id ? { ...p, status: "pending" } : p))
      );
      showFeedback(`"${project.title}" submitted for review.`);
    } catch (err: any) {
      showError(err.message || "Submit failed");
    } finally {
      setSubmittingId(null);
    }
  }

  async function handleRemovalSubmit() {
    if (!removalProject) return;
    if (!removalReason.trim()) {
      showError("A reason is required for removal requests.");
      return;
    }
    setRemovalBusy(true);
    try {
      const res  = await fetch("/api/creators/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: removalProject.id,
          action: "requestRemoval",
          reason: removalReason.trim(),
        }),
      });
      const data = await res.json();
      if (res.status === 409) throw new Error("A removal request has already been submitted.");
      if (!res.ok) throw new Error(data?.error || "Request failed");
      setProjects((prev) =>
        prev.map((p) =>
          p.id === removalProject.id ? { ...p, removal_requested: true } : p
        )
      );
      showFeedback(`Removal request submitted for "${removalProject.title}".`);
      setRemovalProject(null);
      setRemovalReason("");
    } catch (err: any) {
      showError(err.message || "Request failed");
    } finally {
      setRemovalBusy(false);
    }
  }

  return (
    <div className="space-y-6 pb-10">
      {dialog}

      {/* Removal request modal */}
      {removalProject && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => { setRemovalProject(null); setRemovalReason(""); }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 440,
              margin: "0 16px",
              padding: "28px 24px 20px",
              borderRadius: 16,
              background: "#1a1210",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "white" }}>
              Request Removal
            </h3>
            <p style={{ margin: "10px 0 16px", fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
              "{removalProject.title}" will remain live while this request is reviewed.
            </p>
            <textarea
              value={removalReason}
              onChange={(e) => setRemovalReason(e.target.value)}
              placeholder="Reason for removal request…"
              rows={3}
              style={{
                width: "100%",
                background: "rgba(26,26,26,1)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10,
                padding: "10px 12px",
                color: "white",
                fontSize: 14,
                outline: "none",
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
              <button
                onClick={() => { setRemovalProject(null); setRemovalReason(""); }}
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "transparent",
                  color: "rgba(255,255,255,0.6)",
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRemovalSubmit}
                disabled={removalBusy}
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  border: "none",
                  background: "rgba(234,179,8,0.9)",
                  color: "black",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: removalBusy ? "not-allowed" : "pointer",
                  opacity: removalBusy ? 0.6 : 1,
                }}
              >
                {removalBusy ? "Submitting…" : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        <h1
          className="font-bold text-2xl text-white tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          My Works
        </h1>
        <p className="text-ink-faint text-sm mt-1">
          Track drafts and review status.
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
              filter === f.key
                ? "border-white/20 bg-white/10 text-white"
                : "border-white/10 text-ink-faint hover:border-white/20 hover:text-white"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Feedback toast */}
      {feedback && (
        <div
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            background: "rgba(52,211,153,0.1)",
            border: "1px solid rgba(52,211,153,0.3)",
            fontSize: 13,
            color: "rgba(52,211,153,0.9)",
          }}
        >
          {feedback}
        </div>
      )}

      {error && (
        <div
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            background: "rgba(220,38,38,0.08)",
            border: "1px solid rgba(220,38,38,0.25)",
            fontSize: 13,
            color: "rgba(252,165,165,0.9)",
          }}
        >
          {error}
        </div>
      )}

      {loading && <p className="text-ink-faint text-sm">Loading projects...</p>}

      {!loading && !error && filtered.length === 0 && (
        <Card className="text-center py-8">
          <p className="text-ink-faint text-sm">
            {filter === "all"
              ? "No projects yet. Create your first one."
              : "No projects match this filter."}
          </p>
        </Card>
      )}

      <div className="grid gap-3">
        {filtered.map((project) => {
          const canDelete = project.status === "draft" || project.status === "rejected";
          const isLive    = project.status === "live";
          const blocked   = !canDelete && !isLive;

          const isDraft           = project.status === "draft";
          const isApproved        = project.status === "approved";
          const licenseExecuted   = project.license_status === "executed";
          const needsLicense      = isApproved && !licenseExecuted;
          const isSubmittingThis  = submittingId === project.id;

          return (
            <Card key={project.id} className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="text-white font-semibold text-base">{project.title}</p>
                    <StatusBadge status={project.status} />
                    {project.project_type && <Pill>{project.project_type}</Pill>}
                    {project.genres?.map((g) => <Pill key={g}>{g}</Pill>)}
                    {isLive && project.removal_requested && (
                      <span className="text-[11px] px-2.5 py-1 rounded-full border bg-yellow-500/10 text-yellow-300 border-yellow-500/30">
                        Removal Requested
                      </span>
                    )}
                    {needsLicense && (
                      <span className="text-[11px] px-2.5 py-1 rounded-full border bg-yellow-500/10 text-yellow-300 border-yellow-500/30">
                        License required
                      </span>
                    )}
                    {isApproved && licenseExecuted && (
                      <span className="text-[11px] px-2.5 py-1 rounded-full border bg-emerald-500/10 text-emerald-300 border-emerald-500/30">
                        License executed
                      </span>
                    )}
                  </div>
                  {project.logline && (
                    <p className="text-ink-faint text-sm">{project.logline}</p>
                  )}
                  <p className="text-xs text-ink-faint italic">
                    {stateMeaning(project.status)}
                  </p>
                  <p className="text-[11px] text-ink-muted">
                    Last updated {formatDate(project.updated_at)}
                  </p>
                  {isLive && (
                    <p className="text-[11px] text-ink-muted leading-relaxed">
                      Subject to review. Removal may be denied during an active license term.
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {isDraft && (
                    <button
                      onClick={() => handleSubmitDraft(project)}
                      disabled={isSubmittingThis}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-black transition active:scale-95 disabled:opacity-50"
                      style={{ background: "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)" }}
                    >
                      {isSubmittingThis ? "Submitting…" : "Submit for Review"}
                    </button>
                  )}
                  <ItemActions
                    /* Edit is allowed only for draft (free editing) and
                       rejected (the edit page is already read-only there
                       and exposes Revise). All other states are read-only
                       to the creator. */
                    editHref={
                      project.status === "draft" || project.status === "rejected"
                        ? `/workspace/projects/${project.id}/edit`
                        : undefined
                    }
                    onDelete={canDelete ? () => handleDelete(project) : undefined}
                    onDeleteBlocked={blocked ? (reason) => showError(reason) : undefined}
                    deleteBlockedReason={blocked ? deleteBlockReason(project.status) : undefined}
                    onRequestRemoval={
                      isLive && !project.removal_requested
                        ? () => setRemovalProject(project)
                        : undefined
                    }
                  />
                </div>
              </div>

              {/* Approved projects: surface the license step. Without an executed
                  license, distribution cannot be activated. */}
              {isApproved && (
                <div
                  className="flex flex-col md:flex-row md:items-center gap-3 px-3 py-3 rounded-lg border"
                  style={{
                    borderColor: licenseExecuted
                      ? "rgba(52,211,153,0.25)"
                      : "rgba(245,197,24,0.3)",
                    background: licenseExecuted
                      ? "rgba(52,211,153,0.06)"
                      : "rgba(245,197,24,0.06)",
                  }}
                >
                  <div className="flex-1 text-sm">
                    <p className="text-white font-medium">
                      {licenseExecuted
                        ? "License executed. Distribution is pending ShangoMaji activation."
                        : "Selected for distribution consideration."}
                    </p>
                    <p className="text-ink-faint text-xs mt-0.5">
                      {licenseExecuted
                        ? "Your selected term begins when activation occurs."
                        : "Review and sign the Standard Distribution License — this is the required next step before activation."}
                    </p>
                  </div>
                  <Link
                    href={`/license/${project.id}`}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-black transition active:scale-95 self-start md:self-auto"
                    style={{
                      background: licenseExecuted
                        ? "rgba(255,255,255,0.85)"
                        : "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)",
                    }}
                  >
                    {licenseExecuted ? "View License" : "Review and Sign License"}
                  </Link>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
