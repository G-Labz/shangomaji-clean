"use client";

// Phase 11A-R2-1 — Creator Studio dossier presentation (UI-only).
//
// Shared rendering for the world-as-dossier. Consumed by the Studio Desk
// front door (/workspace) as a centerpiece summary and by the per-world view
// (/workspace/projects/[id]) as the full working surface. Pure presentation
// over the existing GET /api/creators/projects row + existing derives. No new
// data, no API, no lifecycle.
//
// Brand: ShangoMaji editorial — dark ground, monochrome discipline, one warm
// Signal accent reserved for the single next move / active state. No gradients,
// no glow.

import Link from "next/link";
import { workStateLine, ReadinessChip, GradientButton } from "./components";
import { nextAction, pipelineStage, PIPELINE_NODES, type WorkLike, type WorkAction } from "@/lib/work-state";
import type { PublicReadiness } from "@/lib/public-visibility";

// Single warm Signal accent for the Studio surface.
export const SIGNAL = "#E0763A";

export type StateHistoryEntry = { from: string; to: string; by: string; at: string; reason: string | null };

export type DossierWork = {
  id: string;
  title: string;
  status: string;
  project_type?: string | null;
  genres?: string[] | null;
  logline?: string | null;
  description?: string | null;
  cover_image_url?: string | null;
  banner_url?: string | null;
  stills_urls?: string[] | null;
  trailer_url?: string | null;
  sample_url?: string | null;
  deliverables?: string[] | null;
  updated_at?: string;
  license_status?: "executed" | "none";
  license_id?: string | null;
  public_visibility?: PublicReadiness;
  // Submission-integrity columns (read-only display only).
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

// ── Pure helpers (UI-only; renderIfPresent discipline) ──────────────────────
export const isStr = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const isTrue = (v: unknown) => v === true;
const len = (v: unknown) => (typeof v === "string" ? v.trim().length : 0);

export function toWorkLike(p: DossierWork): WorkLike {
  return {
    id: p.id,
    status: p.status,
    license: p.license_status === "executed" ? { id: p.license_id ?? undefined } : null,
  };
}

export function creatorNextMove(p: DossierWork): WorkAction | null {
  return nextAction(toWorkLike(p), "creator");
}

// Rail position. Non-live uses pipelineStage; a live work uses the
// server-computed public_visibility (raw title fields aren't returned client-side).
export function railFor(p: DossierWork): { active: number; held: boolean; terminal: "rejected" | "removed" | "archived" | null } {
  if (p.status === "live") {
    const isPublic = p.public_visibility?.state === "public";
    return { active: isPublic ? 7 : 6, held: !isPublic, terminal: null };
  }
  const stage = pipelineStage(toWorkLike(p));
  return { active: stage.activeIndex, held: stage.held, terminal: stage.terminal };
}

// Per-gate readiness, UI-only. Mirrors lib/submission-integrity.ts
// validateCreatorIntegrity (which stays the server source of truth).
export function readinessGates(p: DossierWork): { label: string; done: boolean }[] {
  const thesisDone = isStr(p.thesis_path) && len(p.thesis_explanation) >= 20;
  const rightsDone =
    isTrue(p.rights_ownership_ack) &&
    isTrue(p.rights_collaborators_disclosed_ack) &&
    isTrue(p.rights_no_conflicts_ack) &&
    isTrue(p.rights_no_unlicensed_assets_ack);
  const collaboratorsDone = isStr(p.collaborators) !== isTrue(p.no_collaborators_ack);
  const aiDone =
    isStr(p.ai_usage) &&
    (p.ai_usage === "assisted" || p.ai_usage === "generated" ? len(p.ai_usage_description) >= 20 : true);
  const priorDone =
    isStr(p.prior_distribution) &&
    (p.prior_distribution === "published" ? len(p.prior_distribution_details) >= 10 : true);
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

export function readinessSummary(p: DossierWork): { done: number; total: number } {
  const gates = readinessGates(p);
  return { done: gates.filter((g) => g.done).length, total: gates.length };
}

export function finishingReason(pv?: PublicReadiness): string {
  if (pv?.state !== "finishing_setup") return "";
  if (pv.reason === "title_inactive") return "The catalog listing is being finalized.";
  if (pv.reason === "bunny_missing") return "The video is being prepared for streaming.";
  return "The media is being finalized for streaming.";
}

// ── Studio furniture ────────────────────────────────────────────────────────
export function StudioHeader() {
  return (
    <header className="space-y-1.5">
      <p className="text-[11px] uppercase tracking-[0.28em]" style={{ color: SIGNAL }}>
        ShangoMaji · Creator Studio
      </p>
      <h1 className="text-white font-bold text-3xl tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
        Your studio
      </h1>
      <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
        Where a world is shaped and prepared for the ShangoMaji label.
      </p>
    </header>
  );
}

export function LabelContext() {
  return (
    <section
      className="rounded-xl border px-5 py-4"
      style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.015)" }}
    >
      <p className="text-[11px] uppercase tracking-[0.22em] mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
        What ShangoMaji expects
      </p>
      <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
        ShangoMaji is a curated label. A world is brought for editorial review, licensed, and
        released on purpose — chosen, not uploaded. You build the world; we read it, decide,
        and prepare it for the collection.
      </p>
    </section>
  );
}

// One editorial action — the single warm Signal of the screen.
export function NextMove({ p }: { p: DossierWork }) {
  const action = creatorNextMove(p);
  const isWaiting = p.status === "pending" || p.status === "in_review";

  if (action) {
    return (
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[11px] uppercase tracking-[0.2em]" style={{ color: "rgba(255,255,255,0.4)" }}>
          Next move
        </span>
        <GradientButton href={action.href}>{action.label} →</GradientButton>
      </div>
    );
  }
  if (isWaiting) {
    return (
      <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
        Your world is with our editorial team. Nothing is needed from you right now — strengthen
        its materials, or begin another world.
      </p>
    );
  }
  return null;
}

export function StageRail({
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
          terminal && isActive ? "#b5483a"
          : isActive ? SIGNAL
          : done ? "rgba(255,255,255,0.55)"
          : "rgba(255,255,255,0.16)";
        return (
          <span key={node} className="flex items-center gap-1">
            <span
              className={`inline-block rounded-full ${held && isActive ? "animate-pulse" : ""}`}
              style={{ width: isActive ? 9 : 7, height: isActive ? 9 : 7, background: color }}
            />
            <span className="text-[10px]" style={{ color: isActive ? "#ffffff" : "rgba(255,255,255,0.4)" }}>
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

// ── Dossier sections (renderIfPresent throughout) ───────────────────────────
export function WorldIdentity({ p }: { p: DossierWork }) {
  return (
    <div>
      {isStr(p.project_type) && (
        <p className="text-[11px] uppercase tracking-[0.18em] mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>
          {p.project_type}
        </p>
      )}
      <h2 className="text-white font-bold text-3xl tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
        {p.title}
      </h2>
      {isStr(p.logline) && (
        <p className="text-base italic mt-2" style={{ color: "rgba(255,255,255,0.7)", fontFamily: "var(--font-display)" }}>
          {p.logline.trim()}
        </p>
      )}
      {(p.genres?.length ?? 0) > 0 && (
        <div className="flex gap-2 flex-wrap mt-3">
          {p.genres!.slice(0, 4).map((g) => (
            <span
              key={g}
              className="text-[11px] px-2 py-0.5 rounded-full"
              style={{ color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.12)" }}
            >
              {g}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function Premise({ p }: { p: DossierWork }) {
  if (!isStr(p.description)) return null;
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.22em] mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
        Premise
      </p>
      <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "rgba(255,255,255,0.72)" }}>
        {p.description.trim()}
      </p>
    </div>
  );
}

type MaterialSpec = { key: string; label: string; purpose: string; present: boolean; thumb?: string | null };

function materialSpecs(p: DossierWork): MaterialSpec[] {
  const firstStill = (p.stills_urls ?? []).find((s) => isStr(s)) ?? null;
  return [
    { key: "poster", label: "Poster", purpose: "Anchors your title page in the collection.", present: isStr(p.cover_image_url), thumb: p.cover_image_url },
    { key: "banner", label: "Banner", purpose: "The wide hero image on your world's page.", present: isStr(p.banner_url), thumb: p.banner_url },
    { key: "stills", label: "Stills", purpose: "Become your release gallery.", present: (p.stills_urls ?? []).some((s) => isStr(s)), thumb: firstStill },
    { key: "trailer", label: "Trailer", purpose: "Your single Watch-trailer action.", present: isStr(p.trailer_url), thumb: null },
  ];
}

// Materials shown as release-preparation substance. Editing reuses the existing
// editor drawer (draft → edit form; approved/live → media package); locked
// states render read-only — matching the existing server rules. No new backend.
export function MaterialsBlock({ p }: { p: DossierWork }) {
  const specs = materialSpecs(p);
  const editHref =
    p.status === "draft" ? `/workspace/projects/${p.id}/edit`
    : p.status === "approved" || p.status === "live" ? `/workspace/projects/${p.id}/media`
    : null;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <p className="text-[11px] uppercase tracking-[0.22em]" style={{ color: "rgba(255,255,255,0.4)" }}>
          Materials · release preparation
        </p>
        {editHref && (
          <Link href={editHref} className="text-xs transition" style={{ color: SIGNAL }}>
            Prepare materials →
          </Link>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {specs.map((m) => (
          <div
            key={m.key}
            className="flex gap-3 rounded-lg border p-3"
            style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.015)" }}
          >
            <div
              className="h-14 w-14 flex-shrink-0 rounded-md overflow-hidden flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              {m.thumb && isStr(m.thumb) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.thumb} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>—</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-white">{m.label}</p>
                <ReadinessChip tone={m.present ? "emerald" : "neutral"} label={m.present ? "Ready" : "Needed"} />
              </div>
              <p className="text-[11px] leading-snug mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
                {m.purpose}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Readiness as supporting guidance — never the headline. Draft only.
export function ReadinessSummary({ p }: { p: DossierWork }) {
  const gates = readinessGates(p);
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.22em] mb-3" style={{ color: "rgba(255,255,255,0.4)" }}>
        Readiness for review
      </p>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
        {gates.map((g) => (
          <li key={g.label} className="flex items-center justify-between gap-3">
            <span className="text-sm" style={{ color: "rgba(255,255,255,0.75)" }}>{g.label}</span>
            <ReadinessChip tone={g.done ? "emerald" : "amber"} label={g.done ? "Received" : "Needed"} />
          </li>
        ))}
      </ul>
    </div>
  );
}

// Restrained shelf row — a list entry, never a promotional card.
export function ShelfRow({ p }: { p: DossierWork }) {
  return (
    <Link
      href={`/workspace/projects/${p.id}`}
      className="flex items-center justify-between gap-4 py-3 border-b transition group"
      style={{ borderColor: "rgba(255,255,255,0.06)" }}
    >
      <div className="min-w-0">
        <p className="text-sm text-white truncate group-hover:text-white">{p.title}</p>
        <p className="text-[11px] mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.4)" }}>
          {[isStr(p.project_type) ? p.project_type : null, workStateLine(p.status, p.license_status, p.public_visibility)]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      <span className="text-white/25 group-hover:text-white/50 transition flex-shrink-0">→</span>
    </Link>
  );
}
