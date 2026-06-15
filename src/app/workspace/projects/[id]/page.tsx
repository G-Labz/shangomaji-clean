"use client";

// Phase 11A-1 — Creator Studio Desk (per-world).
//
// A single operational surface for one world: where it sits on the path, whose
// move it is, what's still missing, what ShangoMaji has said, and the one thing
// to do next. Pure surface over the already-built engine — it reads the
// existing GET /api/creators/projects row and renders the existing creator-side
// derives. No new APIs, no lifecycle changes, no resubmit loop.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, WorkPoster, workStateLine, ReadinessChip, GradientButton, ReceiptLink } from "../../components";
import { nextAction, pipelineStage, PIPELINE_NODES, type WorkLike } from "@/lib/work-state";
import type { PublicReadiness } from "@/lib/public-visibility";

type StateHistoryEntry = { from: string; to: string; by: string; at: string; reason: string | null };

type DeskProject = {
  id: string;
  title: string;
  status: string;
  project_type?: string | null;
  cover_image_url?: string | null;
  banner_url?: string | null;
  logline?: string | null;
  updated_at?: string;
  license_status?: "executed" | "none";
  license_id?: string | null;
  public_visibility?: PublicReadiness;
  // Submission-integrity columns (returned by select("*")). Read-only here.
  thesis_path?: string | null;
  thesis_explanation?: string | null;
  rights_ownership_ack?: boolean | null;
  rights_collaborators_disclosed_ack?: boolean | null;
  rights_no_conflicts_ack?: boolean | null;
  rights_no_unlicensed_assets_ack?: boolean | null;
  collaborators?: string | null;
  no_collaborators_ack?: boolean | null;
  ai_usage?: string | null;
  ai_usage_description?: string | null;
  prior_distribution?: string | null;
  prior_distribution_details?: string | null;
  license_awareness_ack?: boolean | null;
  state_history?: StateHistoryEntry[] | null;
};

// ── Small UI-only helpers ────────────────────────────────────────────────────
const isStr = (v: unknown) => typeof v === "string" && v.trim().length > 0;
const len = (v: unknown) => (typeof v === "string" ? v.trim().length : 0);
const isTrue = (v: unknown) => v === true;

// Per-gate readiness, computed UI-only. Mirrors the creator gates in
// lib/submission-integrity.ts (validateCreatorIntegrity), which remains the
// server source of truth — the submit button still enforces it. This list is
// for "what's received / what's missing" feedback only.
function readinessGates(p: DeskProject): { label: string; done: boolean }[] {
  const thesisDone =
    isStr(p.thesis_path) && len(p.thesis_explanation) >= 20;
  const rightsDone =
    isTrue(p.rights_ownership_ack) &&
    isTrue(p.rights_collaborators_disclosed_ack) &&
    isTrue(p.rights_no_conflicts_ack) &&
    isTrue(p.rights_no_unlicensed_assets_ack);
  const collaboratorsDone =
    isStr(p.collaborators) !== isTrue(p.no_collaborators_ack); // exactly one
  const aiDone =
    isStr(p.ai_usage) &&
    (p.ai_usage === "assisted" || p.ai_usage === "generated"
      ? len(p.ai_usage_description) >= 20
      : true);
  const priorDone =
    isStr(p.prior_distribution) &&
    (p.prior_distribution === "published"
      ? len(p.prior_distribution_details) >= 10
      : true);
  const licenseAwareDone = isTrue(p.license_awareness_ack);

  return [
    { label: "Thesis declaration", done: thesisDone },
    { label: "Rights attestation", done: rightsDone },
    { label: "Collaborator disclosure", done: collaboratorsDone },
    { label: "AI disclosure", done: aiDone },
    { label: "Prior distribution", done: priorDone },
    { label: "License awareness", done: licenseAwareDone },
  ];
}

// Rail position. Non-live stages use the existing pipelineStage derive; a live
// work uses the server-computed public_visibility (the title/Bunny fields it
// needs aren't returned to the client) to choose Public vs. Finishing.
function railFor(p: DeskProject): { active: number; held: boolean; terminal: "rejected" | "removed" | "archived" | null } {
  if (p.status === "live") {
    const isPublic = p.public_visibility?.state === "public";
    return { active: isPublic ? 7 : 6, held: !isPublic, terminal: null };
  }
  const work: WorkLike = {
    id: p.id,
    status: p.status,
    license: p.license_status === "executed" ? { id: p.license_id ?? undefined } : null,
  };
  const stage = pipelineStage(work);
  return { active: stage.activeIndex, held: stage.held, terminal: stage.terminal };
}

// Friendly reason text for a live work that isn't public yet.
function finishingReason(pv?: PublicReadiness): string {
  if (pv?.state !== "finishing_setup") return "";
  if (pv.reason === "title_inactive") return "The catalog listing is being finalized.";
  if (pv.reason === "bunny_missing") return "The video is being prepared for streaming.";
  return "The media is being finalized for streaming.";
}

export default function StudioDeskPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [project, setProject] = useState<DeskProject | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "notfound" | "error">("loading");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/creators/projects");
        const data = await res.json();
        if (!alive) return;
        if (!res.ok) { setState("error"); return; }
        const found = (data.projects ?? []).find((p: DeskProject) => p.id === id) ?? null;
        if (!found) { setState("notfound"); return; }
        setProject(found);
        setState("ready");
      } catch {
        if (alive) setState("error");
      }
    })();
    return () => { alive = false; };
  }, [id]);

  if (state === "loading") {
    return <p className="text-ink-faint text-sm py-10">Opening the desk…</p>;
  }
  if (state === "notfound") {
    return (
      <div className="py-10 space-y-3">
        <p className="text-white text-lg" style={{ fontFamily: "var(--font-display)" }}>
          That world isn&rsquo;t on your desk.
        </p>
        <Link href="/workspace" className="text-sm brand-text">← Back to the studio</Link>
      </div>
    );
  }
  if (state === "error" || !project) {
    return (
      <div className="py-10 space-y-3">
        <p className="text-white text-lg" style={{ fontFamily: "var(--font-display)" }}>
          The desk could not be loaded.
        </p>
        <Link href="/workspace" className="text-sm brand-text">← Back to the studio</Link>
      </div>
    );
  }

  const p = project;
  const work: WorkLike = {
    id: p.id,
    status: p.status,
    license: p.license_status === "executed" ? { id: p.license_id ?? undefined } : null,
  };
  const action = nextAction(work, "creator");
  const stateLine = workStateLine(p.status, p.license_status, p.public_visibility);
  const rail = railFor(p);

  const isDraft = p.status === "draft";
  const isWaiting = p.status === "pending" || p.status === "in_review";
  const isApprovedUnsigned = p.status === "approved" && p.license_status !== "executed";
  const isLicensed = p.license_status === "executed";
  const isRejected = p.status === "rejected";

  // Latest rejection reason (creator-safe; this is the note ShangoMaji left).
  const rejectionNote = isRejected
    ? [...(p.state_history ?? [])].reverse().find((h) => h.to === "rejected")?.reason ?? null
    : null;

  return (
    <div className="space-y-10 pb-14">
      <Link href="/workspace" className="text-xs text-ink-faint hover:text-white transition">
        ← Studio
      </Link>

      {/* ── Marquee — where am I / whose move / what next ── */}
      <section className="grid gap-6 sm:grid-cols-[160px_1fr] items-start">
        <div className="w-full max-w-[160px]">
          <WorkPoster
            title={p.title}
            projectType={p.project_type}
            coverUrl={p.cover_image_url}
            bannerUrl={p.banner_url}
            status={p.status}
            licenseStatus={p.license_status}
            publicVisibility={p.public_visibility}
          />
        </div>

        <div className="space-y-4">
          <div>
            {p.project_type && (
              <p className="text-[11px] uppercase tracking-[0.18em] text-ink-muted mb-1">
                {p.project_type}
              </p>
            )}
            <h1 className="text-white font-bold text-3xl tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              {p.title}
            </h1>
            <p className="text-sm text-white/70 mt-2">{stateLine}</p>
          </div>

          <StageRail active={rail.active} held={rail.held} terminal={rail.terminal} />

          {/* The one next move */}
          {action ? (
            <div className="flex items-center gap-3 flex-wrap pt-1">
              <span className="text-[11px] uppercase tracking-[0.18em] text-ink-muted">Next</span>
              <GradientButton href={action.href}>{action.label} →</GradientButton>
            </div>
          ) : isWaiting ? (
            <p className="text-sm text-ink-faint pt-1">
              Received and with ShangoMaji. Nothing is needed from you right now.
            </p>
          ) : null}
        </div>
      </section>

      {/* ── Readiness — what ShangoMaji needs to begin review ── */}
      {isDraft ? (
        <Card>
          <h2 className="text-white font-semibold mb-1" style={{ fontFamily: "var(--font-display)" }}>
            Readiness
          </h2>
          <p className="text-ink-faint text-sm mb-4">
            Everything ShangoMaji needs before this world can enter review.
          </p>
          <ul className="space-y-2.5">
            {readinessGates(p).map((g) => (
              <li key={g.label} className="flex items-center justify-between gap-3">
                <span className="text-sm text-white/85">{g.label}</span>
                <ReadinessChip tone={g.done ? "emerald" : "amber"} label={g.done ? "Received" : "Needed"} />
              </li>
            ))}
            <li className="flex items-center justify-between gap-3 pt-1">
              <span className="text-sm text-white/60">Cover art <span className="text-ink-faint">(recommended)</span></span>
              <ReadinessChip tone={isStr(p.cover_image_url) ? "emerald" : "neutral"} label={isStr(p.cover_image_url) ? "Received" : "Optional"} />
            </li>
          </ul>
          <div className="mt-5">
            <Link
              href={`/workspace/projects/${p.id}/edit`}
              className="text-sm brand-text hover:opacity-80 transition"
            >
              Complete the world →
            </Link>
          </div>
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-white/80">
            Submission record complete.
          </p>
          <p className="text-ink-faint text-sm mt-1">
            ShangoMaji has everything it needs from your submission for this world.
          </p>
        </Card>
      )}

      {/* ── Review & feedback (read-only) ── */}
      {(isWaiting || isRejected) && (
        <Card>
          <h2 className="text-white font-semibold mb-1" style={{ fontFamily: "var(--font-display)" }}>
            Review
          </h2>
          {isWaiting ? (
            <p className="text-ink-faint text-sm">
              Your world is in review. ShangoMaji reviews each submission with intention —
              there is nothing for you to do while it&rsquo;s with us.
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-white/80">ShangoMaji did not move this world forward.</p>
              {rejectionNote ? (
                <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-ink-muted mb-2">Notes from ShangoMaji</p>
                  <p className="text-sm text-white/80 leading-relaxed whitespace-pre-line">{rejectionNote}</p>
                </div>
              ) : (
                <p className="text-ink-faint text-sm">
                  No additional notes were left. Reach out if you have questions about this decision.
                </p>
              )}
            </div>
          )}
        </Card>
      )}

      {/* ── Rights & license readiness ── */}
      {(isApprovedUnsigned || isLicensed) ? (
        <Card>
          <h2 className="text-white font-semibold mb-1" style={{ fontFamily: "var(--font-display)" }}>
            License
          </h2>
          {isApprovedUnsigned ? (
            <div className="space-y-4">
              <p className="text-sm text-white/80 leading-relaxed">
                Approved. Your Standard Distribution License is ready to sign. Signing lets
                ShangoMaji distribute this world — you keep ownership of your work.
              </p>
              <GradientButton href={`/license/${p.id}`}>Sign license →</GradientButton>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm text-white/80">Licensed. Your distribution license is executed.</p>
              {isStr(p.license_id) && <ReceiptLink licenseId={p.license_id as string} />}
            </div>
          )}
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-white/70">
            After approval, you&rsquo;ll sign a simple distribution license here. You keep ownership of your work.
          </p>
        </Card>
      )}

      {/* ── Distribution preparation ── */}
      {(isLicensed || p.status === "live") && (
        <Card>
          <h2 className="text-white font-semibold mb-1" style={{ fontFamily: "var(--font-display)" }}>
            Distribution
          </h2>
          {p.status === "live" && p.public_visibility?.state === "public" ? (
            <p className="text-sm text-white/80">Live and publicly visible in the ShangoMaji collection.</p>
          ) : p.status === "live" ? (
            <p className="text-sm text-white/80">
              Finishing setup — not yet public. {finishingReason(p.public_visibility)} ShangoMaji
              completes and curates go-live; nothing is needed from you.
            </p>
          ) : (
            <p className="text-sm text-white/80">
              Licensed and awaiting activation. ShangoMaji prepares and curates the release —
              what arrives in the collection is chosen, not uploaded.
            </p>
          )}
          {(p.status === "live") && (
            <div className="mt-4">
              <Link
                href={`/workspace/projects/${p.id}/media`}
                className="text-sm brand-text hover:opacity-80 transition"
              >
                Manage media →
              </Link>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

// ── Stage rail ───────────────────────────────────────────────────────────────
function StageRail({
  active,
  held,
  terminal,
}: {
  active: number;
  held: boolean;
  terminal: "rejected" | "removed" | "archived" | null;
}) {
  return (
    <div className="flex items-center gap-1 flex-wrap" aria-label="Stage">
      {PIPELINE_NODES.map((node, i) => {
        const done = i < active;
        const isActive = i === active;
        const color =
          terminal && isActive ? "#e24b4a"
          : isActive ? "#f07030"
          : done ? "#f5c518"
          : "rgba(255,255,255,0.18)";
        return (
          <span key={node} className="flex items-center gap-1">
            <span
              className={`inline-block rounded-full ${held && isActive ? "animate-pulse" : ""}`}
              style={{ width: isActive ? 9 : 7, height: isActive ? 9 : 7, background: color }}
            />
            <span
              className="text-[10px]"
              style={{ color: isActive ? "#ffffff" : "rgba(255,255,255,0.4)" }}
            >
              {node}
            </span>
            {i < PIPELINE_NODES.length - 1 && (
              <span className="text-white/15 text-[10px] px-0.5">–</span>
            )}
          </span>
        );
      })}
    </div>
  );
}
