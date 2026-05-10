"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  WorkPoster,
  WorkStatusDot,
  useConfirm,
  workStateLine,
} from "../components";

type Project = {
  id: string;
  title: string;
  status: string;
  project_type: string | null;
  genres: string[] | null;
  logline: string | null;
  description: string | null;
  cover_image_url?: string | null;
  banner_url?: string | null;
  updated_at: string;
  removal_requested?: boolean;
  removal_request_reason?: string | null;
  removal_requested_at?: string | null;
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
] as const;

type FilterKey = typeof FILTERS[number]["key"];

function matchesFilter(status: string, filter: FilterKey): boolean {
  if (filter === "all") return true;
  if (filter === "pending") return status === "pending" || status === "in_review";
  return status === filter;
}

const EMPTY_HEADINGS: Record<FilterKey, string> = {
  all:      "Your catalog is empty.",
  live:     "No live works.",
  pending:  "No works awaiting review.",
  draft:    "No drafts.",
  rejected: "No rejected works.",
};

export default function WorkspaceProjects() {
  const [filter, setFilter]     = useState<FilterKey>("all");
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
        // Hide archived (admin-only state) but keep "removed" visible so the
        // creator sees the terminal outcome of an approved removal request.
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

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = { all: 0, live: 0, pending: 0, draft: 0, rejected: 0 };
    for (const p of projects) {
      c.all += 1;
      if (p.status === "live")     c.live     += 1;
      if (p.status === "pending" || p.status === "in_review") c.pending += 1;
      if (p.status === "draft")    c.draft    += 1;
      if (p.status === "rejected") c.rejected += 1;
    }
    return c;
  }, [projects]);

  const filtered = useMemo(
    () => projects.filter((p) => matchesFilter(p.status, filter)),
    [filter, projects]
  );

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
          p.id === removalProject.id
            ? {
                ...p,
                status: "removal_requested",
                removal_requested: true,
                removal_request_reason: removalReason.trim(),
                removal_requested_at: new Date().toISOString(),
              }
            : p
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
    <div className="space-y-8 pb-12">
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

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1
            className="font-bold text-2xl text-white tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            My Works
          </h1>
          <p className="text-ink-faint text-sm mt-1">
            Submit, track, and manage your catalog.
          </p>
        </div>
        <Link
          href="/workspace/projects/new"
          className="self-start md:self-auto px-4 py-2 rounded-xl text-black font-semibold text-sm transition-all active:scale-95"
          style={{ background: "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)" }}
        >
          New Work
        </Link>
      </div>

      {/* Quiet text filters with counts. Active filter uses subtle
          underline + brighter text. Zero-count filters dim but stay
          clickable so the catalog is always navigable. */}
      <div className="flex items-center gap-5 flex-wrap border-b border-white/8 pb-3">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const empty  = counts[f.key] === 0 && !active;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`text-xs tracking-wide transition pb-1 -mb-[13px] border-b-2 ${
                active
                  ? "text-white border-white/70"
                  : empty
                    ? "text-ink-muted/60 border-transparent hover:text-white/70"
                    : "text-ink-faint border-transparent hover:text-white/85"
              }`}
            >
              <span className={active ? "font-medium" : ""}>{f.label}</span>
              <span className={`ml-1.5 ${active ? "text-white/60" : "text-ink-muted"}`}>
                ({counts[f.key]})
              </span>
            </button>
          );
        })}
      </div>

      {/* Toasts */}
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

      {loading && <p className="text-ink-faint text-sm">Loading projects…</p>}

      {/* Empty states */}
      {!loading && !error && filtered.length === 0 && (
        <div className="py-16">
          <p
            className="text-white text-xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {EMPTY_HEADINGS[filter]}
          </p>
          {filter === "all" && (
            <>
              <p className="text-ink-faint text-sm mt-2">
                Submit your first work to begin distribution.
              </p>
              <Link
                href="/workspace/projects/new"
                className="inline-block mt-5 px-4 py-2 rounded-xl text-black font-semibold text-sm transition-all active:scale-95"
                style={{ background: "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)" }}
              >
                New Work
              </Link>
            </>
          )}
        </div>
      )}

      {/* Catalog grid — auto-fill with a 220–280px track keeps card
          width confident regardless of count. A single work sits left-
          aligned at ~280px wide rather than stretching across the page
          or shrinking to a postage stamp. */}
      {!loading && filtered.length > 0 && (
        <div
          className="grid gap-x-5 gap-y-10"
          style={{
            gridTemplateColumns:
              "repeat(auto-fill, minmax(min(100%, 220px), 280px))",
          }}
        >
          {filtered.map((project) => (
            <WorkCatalogCard
              key={project.id}
              project={project}
              submitting={submittingId === project.id}
              onSubmitDraft={handleSubmitDraft}
              onDelete={handleDelete}
              onRequestRemoval={(p) => setRemovalProject(p)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Work Catalog Card ─────────────────────────
   Poster-led card. Poster region is the visual anchor with a thin
   status stripe at its base; metadata + one full-width primary action
   sit beneath, with all secondaries (Request Removal, Submit for
   Review, View License, Delete) as quiet text links so the primary is
   never visually contested. Lifecycle/validation/API are unchanged —
   this is a visual reorganization of existing affordances. */

type PrimaryAction =
  | { kind: "link";   label: string; href: string; emphasis?: "amber" | "neutral" }
  | { kind: "button"; label: string; onClick: () => void; busy?: boolean; emphasis?: "amber" | "neutral" }
  | { kind: "quiet";  label: string };

function primaryAction(project: Project): PrimaryAction {
  const { status, license_status } = project;
  if (status === "live") {
    return {
      kind: "link",
      label: "Manage Media",
      href: `/workspace/projects/${project.id}/media`,
      emphasis: "neutral",
    };
  }
  if (status === "approved") {
    if (license_status === "executed") {
      return {
        kind: "link",
        label: "Manage Media",
        href: `/workspace/projects/${project.id}/media`,
        emphasis: "neutral",
      };
    }
    return {
      kind: "link",
      label: "Sign License",
      href: `/license/${project.id}`,
      emphasis: "amber",
    };
  }
  if (status === "draft") {
    return {
      kind: "link",
      label: "Continue",
      href: `/workspace/projects/${project.id}/edit`,
      emphasis: "amber",
    };
  }
  if (status === "rejected") {
    return {
      kind: "link",
      label: "View Notes",
      href: `/workspace/projects/${project.id}/edit`,
      emphasis: "neutral",
    };
  }
  if (status === "pending" || status === "in_review") {
    return { kind: "quiet", label: "Awaiting review" };
  }
  if (status === "removal_requested") {
    return { kind: "quiet", label: "Removal under review" };
  }
  if (status === "removed") {
    return { kind: "quiet", label: "Distribution ended" };
  }
  if (status === "archived") {
    return { kind: "quiet", label: "Archived" };
  }
  return { kind: "quiet", label: "" };
}

function WorkCatalogCard({
  project,
  submitting,
  onSubmitDraft,
  onDelete,
  onRequestRemoval,
}: {
  project: Project;
  submitting: boolean;
  onSubmitDraft: (p: Project) => void;
  onDelete: (p: Project) => void;
  onRequestRemoval: (p: Project) => void;
}) {
  const isLive            = project.status === "live";
  const isDraft           = project.status === "draft";
  const isApproved        = project.status === "approved";
  const isRejected        = project.status === "rejected";
  const licenseExecuted   = project.license_status === "executed";
  const canDelete         = isDraft || isRejected;

  const action = primaryAction(project);

  const genreLine = project.genres?.slice(0, 2).join(" · ") ?? "";
  const typeLine  = [project.project_type, genreLine].filter(Boolean).join(" · ");

  return (
    <div className="group flex flex-col gap-3">
      <Link
        href={
          isDraft || isRejected
            ? `/workspace/projects/${project.id}/edit`
            : (isApproved || isLive)
              ? `/workspace/projects/${project.id}/media`
              : `/workspace/projects/${project.id}/edit`
        }
        className="block transition-[border-color,filter] rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-white/30"
      >
        <WorkPoster
          title={project.title}
          projectType={project.project_type}
          coverUrl={project.cover_image_url}
          bannerUrl={project.banner_url}
          status={project.status}
          licenseStatus={project.license_status}
          className="group-hover:brightness-110"
        />
      </Link>

      <div className="space-y-1.5">
        <p className="text-white font-semibold text-[15px] leading-snug line-clamp-2">
          {project.title}
        </p>
        {typeLine && (
          <p className="text-[11px] text-ink-muted uppercase tracking-wide">{typeLine}</p>
        )}
        <p className="text-xs text-ink-faint flex items-center gap-2">
          <WorkStatusDot status={project.status} licenseStatus={project.license_status} />
          <span>{workStateLine(project.status, project.license_status)}</span>
        </p>
      </div>

      {/* Action region — one primary, full-width button; secondaries
          sit visually subordinate as quiet text links so they never
          compete with the primary even on a single-card layout. */}
      <div className="flex flex-col gap-2 mt-1">
        {action.kind === "link" ? (
          <Link
            href={action.href}
            className={
              action.emphasis === "amber"
                ? "block w-full text-center px-3 py-2 rounded-lg text-[13px] font-semibold text-black transition active:scale-[0.98]"
                : "block w-full text-center px-3 py-2 rounded-lg text-[13px] font-semibold border border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.09] hover:border-white/25 transition"
            }
            style={
              action.emphasis === "amber"
                ? { background: "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)" }
                : undefined
            }
          >
            {action.label}
          </Link>
        ) : action.kind === "button" ? (
          <button
            onClick={action.onClick}
            disabled={action.busy}
            className={
              action.emphasis === "amber"
                ? "w-full px-3 py-2 rounded-lg text-[13px] font-semibold text-black transition active:scale-[0.98] disabled:opacity-50"
                : "w-full px-3 py-2 rounded-lg text-[13px] font-semibold border border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.09] hover:border-white/25 transition disabled:opacity-50"
            }
            style={
              action.emphasis === "amber"
                ? { background: "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)" }
                : undefined
            }
          >
            {action.label}
          </button>
        ) : action.label ? (
          <p className="w-full text-center px-3 py-2 rounded-lg text-[12px] text-ink-muted italic border border-white/8 bg-white/[0.02]">
            {action.label}
          </p>
        ) : null}

        {/* Quiet secondaries — small text links beneath the primary
            button. Never compete visually; always reachable.
            Live           → Request Removal
            Drafts         → Submit for review · Delete
            Rejected       → Delete
            Approved/exec  → View License */}
        <div className="flex items-center justify-between gap-3 px-0.5 min-h-[18px]">
          <div className="flex items-center gap-3 text-[11px]">
            {isLive && (
              <button
                onClick={() => onRequestRemoval(project)}
                className="text-yellow-500/70 hover:text-yellow-400 transition"
              >
                Request removal
              </button>
            )}
            {isDraft && (
              <button
                onClick={() => onSubmitDraft(project)}
                disabled={submitting}
                className="text-ink-faint hover:text-white transition disabled:opacity-50"
              >
                {submitting ? "Submitting…" : "Submit for review →"}
              </button>
            )}
            {isApproved && licenseExecuted && (
              <Link
                href={`/license/${project.id}`}
                className="text-ink-faint hover:text-white transition"
              >
                View license →
              </Link>
            )}
          </div>

          {canDelete && (
            <button
              onClick={() => onDelete(project)}
              className="text-[11px] text-red-400/55 hover:text-red-400 transition"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
