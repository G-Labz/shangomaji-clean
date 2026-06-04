"use client";

// Phase 10J-I-R3-A.1 — Admin Forge (read-only preview) · Full-Viewport Command Room.
//
// A structural preview of the redesigned Admin Mission Control as a full-height,
// three-zone command room: Pressure Rail (heat-gauge column) · Command Stage
// (dominant hero) · The Flow (ranked conveyor). It proves the shared premium
// language against REAL admin data without touching the live /admin page or any
// validated logic.
//
// DISCIPLINE (enforced):
//   • Read-only. Real-data mode's only network calls are GET /api/admin/projects
//     and a GET to the existing receipt route. No PATCH/POST/DELETE. No mutations.
//   • Reuses the existing admin password gate (x-admin-password header).
//   • Action buttons render in final form but deep-link to /admin; never mutate here.
//   • A parity panel asserts the new derive agrees with Mission Control's logic.
//   • Dev-only `?demo=1` sample mode (see DEMO_WORKS) renders fixtures through the
//     same components/derives so the layout can be screenshotted without a backend.
//     It is gated on NODE_ENV !== "production" (dead-code-eliminated in prod),
//     labeled DEMO, unlinked, and performs zero network/mutations.

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { derivePublicReadiness } from "@/lib/public-visibility";
import {
  bucketCounts,
  classifyBucket,
  licenseState,
  nextAction,
  operatorPriorityRank,
  ownershipVerdict,
  pipelineStage,
  publicDiagnostic,
  type WorkLike,
  type VerdictTone,
} from "@/lib/work-state";
import {
  Eyebrow,
  HeatBar,
  LaunchRunway,
  OwnershipVerdict,
  PipelineRail,
  SealedRecord,
  Stage,
} from "@/components/forge";

type WorkRow = WorkLike & { id: string };

const TONE_HEX: Record<VerdictTone, string> = {
  move: "#f07030",
  held: "#f5c518",
  public: "#34d399",
  terminal: "#e53e2a",
  waiting: "#8b8f98",
};

// ── Dev-only sample data (screenshot/visual-validation aid) ──────────────────
// Static, read-only fixtures covering the key lifecycle states. Reachable ONLY
// at /admin/forge?demo=1 in development; the branch that loads them is removed
// from production builds. No network, no mutations, no real licenses.
const DEMO_WORKS: WorkRow[] = [
  {
    id: "d1", status: "removal_requested", title: "Ìjàlá: Hunter's Verse",
    project_type: "Manga", creator_email: "ade@ijala.studio", updated_at: "2026-06-03T09:10:00Z",
    title_status: "active", bunny_video_id: "vid-d1", media_ready: true,
    license: { id: "lic-d1", term_years: 2, signer_legal_name: "Adébáyò Ogún", signed_at: "2026-04-12T00:00:00Z", sdl_version: "SDL-v1", sdl_snapshot_stored: true },
  },
  {
    id: "d2", status: "pending", title: "Ashfall Saga",
    project_type: "Anime series", creator_email: "kenji@emberworks.jp", updated_at: "2026-06-03T08:40:00Z",
  },
  {
    id: "d3", status: "in_review", title: "Neon Orisha",
    project_type: "Comic", creator_email: "lola@neonorisha.co", updated_at: "2026-06-02T20:15:00Z",
  },
  {
    id: "d4", status: "approved", title: "Stormcaller",
    project_type: "Anime film", creator_email: "amara@storm.studio", updated_at: "2026-06-02T18:05:00Z",
    license: { id: "lic-d4", term_years: 3, signer_legal_name: "Amara Okoye", signed_at: "2026-05-30T00:00:00Z", sdl_version: "SDL-v1", sdl_snapshot_stored: true },
  },
  {
    id: "d5", status: "approved", title: "Cinder & Bone",
    project_type: "Manga", creator_email: "ravi@cinder.art", updated_at: "2026-06-01T12:00:00Z",
  },
  {
    id: "d6", status: "live", title: "Thunderforge",
    project_type: "Anime series", creator_email: "kofi@thunderforge.gh", updated_at: "2026-05-31T16:30:00Z",
    title_status: "active", bunny_video_id: null, media_ready: false,
  },
  {
    id: "d7", status: "live", title: "Sky Mariners",
    project_type: "Anime series", creator_email: "yuki@skymariners.jp", updated_at: "2026-05-28T10:00:00Z",
    title_status: "active", bunny_video_id: "vid-d7", media_ready: true,
  },
  {
    id: "d8", status: "removed", title: "Hollow Tide",
    project_type: "Comic", creator_email: "sam@hollowtide.co", updated_at: "2026-05-20T09:00:00Z",
  },
];

// Inline parity mirror — a literal copy of the live admin getPublicVisibilityDiagnostic
// mapping, used ONLY to prove the new shared derive reproduces Mission Control's
// logic. Both delegate the live gate to the same derivePublicReadiness.
function adminDiagnosticMirror(p: WorkLike): { label: string; tone: string } {
  const status = p?.status as string | undefined;
  if (status === "removed") return { label: "Removed", tone: "rejected" };
  if (status === "rejected") return { label: "Rejected", tone: "rejected" };
  if (status === "archived") return { label: "Internal hold", tone: "neutral" };
  if (status === "removal_requested") return { label: "Held — removal under review", tone: "held" };
  if (status === "draft") return { label: "Held — awaiting submission", tone: "held" };
  if (status === "pending" || status === "in_review") return { label: "Held — awaiting approval", tone: "held" };
  if (status === "approved") {
    return p?.license
      ? { label: "Held — distribution not activated", tone: "held" }
      : { label: "Held — license not executed", tone: "held" };
  }
  if (status === "live") {
    const r = derivePublicReadiness({
      status, titleStatus: p?.title_status ?? null, mediaReady: p?.media_ready ?? null,
      bunnyVideoId: p?.bunny_video_id ?? null, libraryConfigured: true,
    });
    if (r.state === "public") return { label: "Ready — visible in public catalog", tone: "ready" };
    if (r.state === "finishing_setup") {
      const label = r.reason === "title_inactive" ? "Held — title row inactive"
        : r.reason === "bunny_missing" ? "Held — Bunny video missing" : "Held — media not ready";
      return { label, tone: "held" };
    }
    return { label: "Held — not live", tone: "held" };
  }
  return { label: "Held — unknown state", tone: "held" };
}

const RAIL: { key: string; label: string; match: (p: WorkLike) => boolean }[] = [
  { key: "needs_review", label: "Review", match: (p) => classifyBucket(p) === "needs_review" },
  { key: "needs_license", label: "License", match: (p) => classifyBucket(p) === "needs_license" },
  { key: "needs_activation", label: "Activation", match: (p) => classifyBucket(p) === "needs_activation" },
  { key: "media", label: "Media", match: (p) => ["needs_bunny", "needs_processing"].includes(classifyBucket(p)) },
  { key: "public_ready", label: "Public", match: (p) => classifyBucket(p) === "public_ready" },
  { key: "internal_hold", label: "Holds", match: (p) => classifyBucket(p) === "internal_hold" },
];

export default function AdminForgePreview() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [projects, setProjects] = useState<WorkRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flowSource, setFlowSource] = useState<string>("needs_you");
  const [showDebug, setShowDebug] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [receiptBusy, setReceiptBusy] = useState<string | null>(null);
  const [receiptError, setReceiptError] = useState<Record<string, string>>({});

  // Dev-only sample mode. In production NODE_ENV === "production", so this whole
  // block is dead-code-eliminated and ?demo=1 is inert (real gate still applies).
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
      if (new URLSearchParams(window.location.search).get("demo") === "1") {
        setProjects(DEMO_WORKS);
        setIsDemo(true);
        setAuthed(true);
      }
    }
  }, []);

  async function login() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/projects", { headers: { "x-admin-password": password } });
      if (res.status === 401) throw new Error("Wrong password");
      if (!res.ok) throw new Error("Could not load works");
      const data = await res.json();
      setProjects((data.projects ?? []) as WorkRow[]);
      setAuthed(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  // Read-only receipt open — identical pattern to the live admin bridge. GET only.
  async function viewReceipt(licenseId: string) {
    setReceiptBusy(licenseId);
    setReceiptError((p) => ({ ...p, [licenseId]: "" }));
    const win = typeof window !== "undefined" ? window.open("", "_blank") : null;
    if (win) win.opener = null;
    try {
      const res = await fetch(`/api/licenses/${licenseId}/receipt`, { headers: { "x-admin-password": password } });
      if (!res.ok) throw new Error(`Could not load receipt (${res.status}).`);
      const html = await res.text();
      const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
      if (win) win.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      win?.close();
      setReceiptError((p) => ({ ...p, [licenseId]: e instanceof Error ? e.message : "Could not load receipt." }));
    } finally {
      setReceiptBusy((b) => (b === licenseId ? null : b));
    }
  }

  const counts = useMemo(() => bucketCounts(projects), [projects]);
  const flow = useMemo(() => {
    const base =
      flowSource === "needs_you" ? projects.filter((p) => operatorPriorityRank(p) !== null)
      : flowSource === "all" ? projects
      : projects.filter((p) => RAIL.find((r) => r.key === flowSource)?.match(p));
    return [...base].sort((a, b) => {
      const ra = operatorPriorityRank(a); const rb = operatorPriorityRank(b);
      if (ra !== rb) return (ra ?? 99) - (rb ?? 99);
      return String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? ""));
    });
  }, [projects, flowSource]);

  const selected = useMemo(
    () => projects.find((p) => p.id === selectedId) ?? flow[0] ?? projects[0] ?? null,
    [projects, selectedId, flow]
  );

  const parity = useMemo(() => {
    const fails: string[] = [];
    for (const p of projects) {
      const a = adminDiagnosticMirror(p); const b = publicDiagnostic(p);
      if (a.label !== b.label || a.tone !== b.tone) fails.push(`${p.title ?? p.id}: diagnostic ${JSON.stringify(b)} ≠ ${JSON.stringify(a)}`);
      if ((ownershipVerdict(p, "admin").verdict === "your_move") !== (operatorPriorityRank(p) !== null)) fails.push(`${p.title ?? p.id}: your_move ≠ priority invariant`);
      if ((classifyBucket(p) === "public_ready") !== (b.tone === "ready")) fails.push(`${p.title ?? p.id}: public_ready ≠ ready-tone`);
    }
    return { ok: fails.length === 0, fails, total: projects.length };
  }, [projects]);

  // ── Password gate (real mode) ─────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="mt-[68px] grid min-h-[calc(100dvh-68px)] place-items-center px-4">
        <Stage className="w-full max-w-sm p-7">
          <Eyebrow>ShangoMaji · Operations</Eyebrow>
          <h1 className="mt-1 text-2xl text-white" style={{ fontFamily: "var(--font-display)" }}>The Forge</h1>
          <p className="mt-1 text-xs text-ink-faint">Read-only preview of the redesigned Mission Control. Enter the admin password.</p>
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()} placeholder="Admin password"
            className="mt-4 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-state-move/50"
          />
          {error && <p className="mt-2 text-xs text-state-terminal">{error}</p>}
          <button onClick={login} disabled={loading || !password}
            className="mt-4 w-full rounded-lg bg-brand-gradient px-4 py-2 text-sm font-semibold text-black shadow-ember-glow transition active:scale-95 disabled:opacity-50">
            {loading ? "Entering…" : "Enter the Forge"}
          </button>
          <Link href="/admin" className="mt-4 block text-center text-[11px] text-ink-faint hover:text-white">← Back to live Mission Control</Link>
        </Stage>
      </div>
    );
  }

  const needsYou = projects.filter((p) => operatorPriorityRank(p) !== null).length;
  const removals = projects.filter((p) => p.status === "removal_requested").length;
  const finishing = counts.needs_bunny + counts.needs_processing;
  const canReceipt = !isDemo && !!selected?.license?.id;

  return (
    <>
      <div className="relative mx-auto flex w-full max-w-[2240px] flex-col px-4 sm:px-5 mt-[68px] min-h-[calc(100dvh-68px)] xl:h-[calc(100dvh-68px)] xl:min-h-0 xl:overflow-hidden">
        {/* In-room command bar */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 py-3">
          <div className="flex items-baseline gap-3">
            <span className="text-xl text-white" style={{ fontFamily: "var(--font-display)" }}>The Forge</span>
            <Eyebrow>Operations · Preview</Eyebrow>
          </div>
          <div className="flex items-center gap-2">
            {isDemo && (
              <span className="rounded-full border border-state-held/45 bg-state-held/[0.10] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-state-held">
                Demo · Sample data
              </span>
            )}
            {showDebug && (
              <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${parity.ok ? "border-state-public/40 bg-state-public/[0.08] text-state-public" : "border-state-terminal/45 bg-state-terminal/[0.08] text-state-terminal"}`}>
                {parity.ok ? `Parity OK · ${parity.total}` : `Parity ✗ ${parity.fails.length}`}
              </span>
            )}
            {!isDemo && <span className="rounded-full border border-white/12 px-3 py-1 text-[11px] uppercase tracking-wider text-ink-faint">Read-only</span>}
            <button onClick={() => setShowDebug((s) => !s)} className="rounded-lg border border-white/12 px-3 py-1.5 text-xs text-ink-muted transition hover:bg-white/5">
              {showDebug ? "Hide parity" : "Show parity"}
            </button>
            <Link href="/admin" className="rounded-lg border border-white/12 px-3 py-1.5 text-xs text-ink-muted transition hover:bg-white/5">Live Mission Control →</Link>
          </div>
        </div>

        {isDemo && (
          <div className="mb-3 flex shrink-0 items-center gap-2 rounded-lg border border-state-held/35 bg-state-held/[0.07] px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-state-held" />
            <span className="text-[11px] text-ink-muted"><span className="font-semibold uppercase tracking-wider text-state-held">Demo · Sample data</span> — dev-only visual preview. Not real works; no backend, no actions.</span>
          </div>
        )}

        {/* Three-zone command room — fills the viewport below the nav */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 pb-5 xl:grid-cols-[clamp(224px,15vw,288px)_minmax(0,1fr)_clamp(348px,23vw,432px)] xl:gap-5 xl:pb-0">
          {/* ── Pressure Rail ── */}
          <aside className="forge-ledger relative min-h-0 rounded-2xl p-4 xl:h-full xl:overflow-y-auto">
            <span className="absolute bottom-6 left-0 top-6 w-px heat-spine" aria-hidden />
            <span className="rail-feed" aria-hidden />
            <Eyebrow>Operation pulse</Eyebrow>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-4xl leading-none text-state-move storm-glow-text" style={{ fontFamily: "var(--font-display)" }}>{needsYou}</span>
              <span className="text-xs uppercase tracking-wider text-ink-faint">need you</span>
            </div>
            <p className="mt-1.5 text-xs text-ink-faint">
              <span className={removals ? "text-state-held" : ""}>{removals}</span> removal ·{" "}
              <span className={finishing ? "text-state-held" : ""}>{finishing}</span> finishing
            </p>

            <div className="glow-cut my-4" />

            {/* Needs-you gauge */}
            <button onClick={() => setFlowSource("needs_you")} className="mb-3.5 block w-full text-left">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium uppercase tracking-wider ${flowSource === "needs_you" ? "text-state-move" : "text-ink-muted"}`}>Needs you</span>
                <span className="text-sm tabular-nums text-white">{needsYou}</span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="h-3 w-0.5 rounded-full" style={{ background: flowSource === "needs_you" ? "#f07030" : "rgba(255,255,255,0.12)", boxShadow: flowSource === "needs_you" ? "0 0 8px 0 rgba(240,112,48,0.7)" : undefined }} aria-hidden />
                <HeatBar value={needsYou} max={Math.max(1, projects.length)} size="md" className="flex-1" />
              </div>
            </button>

            {/* Category gauges */}
            <div className="space-y-3.5">
              {RAIL.map((r) => {
                const c = projects.filter(r.match).length;
                const active = flowSource === r.key;
                return (
                  <button key={r.key} onClick={() => setFlowSource(r.key)} className="block w-full text-left">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs uppercase tracking-wider ${active ? "text-white" : "text-ink-muted"}`}>{r.label}</span>
                      <span className={`text-sm tabular-nums ${c ? "text-white" : "text-ink-faint"}`}>{c}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="h-3 w-0.5 rounded-full" style={{ background: active ? "#f07030" : "rgba(255,255,255,0.12)", boxShadow: active ? "0 0 8px 0 rgba(240,112,48,0.7)" : undefined }} aria-hidden />
                      <HeatBar value={c} max={Math.max(1, projects.length)} size="md" className="flex-1" />
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="glow-cut my-4" />
            <button onClick={() => setFlowSource("all")}
              className={`text-[11px] uppercase tracking-wider transition ${flowSource === "all" ? "text-state-move" : "text-ink-faint hover:text-white"}`}>
              View all {projects.length} works
            </button>
          </aside>

          {/* ── Command Stage ── */}
          <main className="min-h-0">
            {selected ? (
              <CommandStage
                key={selected.id} work={selected}
                receiptBusy={receiptBusy === selected.license?.id}
                receiptError={selected.license?.id ? receiptError[selected.license.id] : undefined}
                onViewReceipt={canReceipt ? () => viewReceipt(selected.license!.id as string) : undefined}
              />
            ) : (
              <Stage className="grid h-full min-h-[320px] place-items-center p-8 text-center">
                <div>
                  <p className="text-2xl text-white" style={{ fontFamily: "var(--font-display)" }}>Queue clear. The forge is quiet.</p>
                  <p className="mt-1 text-sm text-ink-faint">Nothing in this view needs an operator right now.</p>
                </div>
              </Stage>
            )}
          </main>

          {/* ── The Flow ── */}
          <aside className="flex min-h-0 flex-col xl:h-full">
            <div className="mb-2 flex shrink-0 items-center justify-between">
              <Eyebrow>The Flow · Next up</Eyebrow>
              <span className="text-[11px] text-ink-faint">
                {flowSource === "needs_you" ? "Needs you" : flowSource === "all" ? "All" : RAIL.find((r) => r.key === flowSource)?.label} · {flow.length}
              </span>
            </div>
            <div className="forge-scroll relative min-h-0 flex-1 pr-1">
              <span className="conveyor-track" aria-hidden />
              {flow.map((p, i) => (
                <FlowCartridge key={p.id} work={p} rank={i} active={p.id === selected?.id} onClick={() => setSelectedId(p.id)} />
              ))}
              {flow.length === 0 && <div className="ml-4 mt-3 text-center text-xs text-ink-faint">No works in this view.</div>}
            </div>
          </aside>
        </div>
      </div>

      {/* Debug detail (below the console; only when parity is shown) */}
      {showDebug && (
        <div className="mx-auto w-full max-w-[2240px] px-4 pb-16 sm:px-5">
          {!parity.ok && (
            <ul className="mb-3 space-y-1 rounded-xl border border-state-terminal/40 bg-state-terminal/[0.06] p-3 text-[11px] text-state-terminal">
              {parity.fails.map((f, i) => <li key={i}>• {f}</li>)}
            </ul>
          )}
          <p className="mb-2 text-[11px] text-ink-faint">
            Parity checks: public-visibility diagnostic (vs inline admin mirror) · your_move ⟺ operatorPriorityRank · public_ready ⟺ ready-tone. All delegate the live gate to derivePublicReadiness.
          </p>
          <div className="overflow-x-auto rounded-xl border border-white/8">
            <table className="w-full text-left text-[11px]">
              <thead className="text-ink-faint">
                <tr className="[&>th]:px-3 [&>th]:py-2"><th>Work</th><th>Status</th><th>Bucket</th><th>Diagnostic</th><th>Verdict</th><th>Priority</th><th>Pipeline</th></tr>
              </thead>
              <tbody className="text-ink-muted">
                {projects.map((p) => {
                  const stg = pipelineStage(p);
                  return (
                    <tr key={p.id} className="border-t border-white/5 [&>td]:px-3 [&>td]:py-2">
                      <td className="max-w-[180px] truncate text-white">{p.title ?? p.id}</td>
                      <td>{p.status}</td><td>{classifyBucket(p)}</td><td>{publicDiagnostic(p).label}</td>
                      <td>{ownershipVerdict(p, "admin").verdict}</td><td>{operatorPriorityRank(p) ?? "—"}</td>
                      <td>{stg.terminal ?? stg.nodes[stg.activeIndex]}{stg.held ? " (held)" : ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

// ── Flow conveyor cartridge ──────────────────────────────────────────────────
function FlowCartridge({ work, active, rank, onClick }: { work: WorkRow; active: boolean; rank: number; onClick: () => void }) {
  const v = ownershipVerdict(work, "admin");
  const isNext = rank === 0 && operatorPriorityRank(work) !== null;
  const tone = TONE_HEX[v.tone];
  return (
    <button onClick={onClick} className="block w-full text-left">
      <div
        className={`flow-shell animate-flow-in ml-4 border-b border-white/[0.04] py-3 pl-4 pr-2 ${active ? "bg-white/[0.045]" : "hover:bg-white/[0.02]"}`}
        style={active ? { boxShadow: `-14px 0 30px -12px ${tone}` } : undefined}
      >
        {/* node seated on the conveyor track + heat edge */}
        <span className="absolute -left-[11px] top-1/2 h-2 w-2 -translate-y-1/2 rounded-full" style={{ background: tone, opacity: active ? 1 : 0.5, boxShadow: active ? `0 0 10px 0 ${tone}` : undefined }} aria-hidden />
        <span className="absolute inset-y-0 left-0 w-0.5" style={{ background: tone, opacity: active ? 0.95 : 0.4 }} aria-hidden />
        <div className="flex items-center gap-3">
          <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-md text-sm tabular-nums ${isNext ? "bg-state-move/15 text-state-move" : "bg-white/[0.04] text-ink-faint"}`}>{rank + 1}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="min-w-0 flex-1 truncate text-sm text-white">{work.title ?? "Untitled"}</p>
              {isNext && !active && <span className="shrink-0 rounded-full border border-state-move/45 bg-state-move/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-state-move">Next</span>}
              {active && <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wider text-state-move">▸ loaded</span>}
            </div>
            <p className="mt-0.5 truncate text-[11px] text-ink-faint">{work.creator_email ?? "—"}</p>
          </div>
        </div>
        <div className="mt-2 pl-10">
          <OwnershipVerdict verdict={v.verdict} tone={v.tone} line={v.line} audience="admin" size="chip" />
        </div>
      </div>
    </button>
  );
}

// ── Command Stage ────────────────────────────────────────────────────────────
function CommandStage({
  work, onViewReceipt, receiptBusy, receiptError,
}: {
  work: WorkRow; onViewReceipt?: () => void; receiptBusy?: boolean; receiptError?: string;
}) {
  const v = ownershipVerdict(work, "admin");
  const stage = pipelineStage(work);
  const lstate = licenseState(work);
  const action = nextAction(work, "admin");
  const cover = (work.cover_image_url || work.banner_url || "").trim();
  const tone = TONE_HEX[v.tone];

  return (
    <Stage className="relative flex h-full min-h-[480px] flex-col overflow-hidden">
      {/* Artwork backdrop bleed — dimmed + subordinate; fallback = forge bloom only */}
      {cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.16]" aria-hidden />
      )}
      {cover && <span className="stage-scrim" aria-hidden />}
      <span className="stage-bloom" aria-hidden />
      {/* Edge feeds: Rail (left, ember) + Flow (right, verdict tone) — Stage fed from both sides */}
      <span className="stage-edge-left" aria-hidden />
      <span className="stage-edge-right" aria-hidden style={{ background: `linear-gradient(270deg, ${tone}29, transparent)` }} />

      <div className="forge-scroll relative z-10 flex h-full flex-col">
        {/* ① Identity marquee (top-anchored) */}
        <div className="shrink-0 p-6 pb-4 sm:p-8 sm:pb-5">
          <Eyebrow>Selected work</Eyebrow>
          <h2 className="mt-2 text-[clamp(2rem,3.4vw,3.75rem)] font-medium leading-[1.03] text-white storm-glow-text" style={{ fontFamily: "var(--font-display)" }}>
            {work.title ?? "Untitled"}
          </h2>
          <p className="mt-2 text-sm text-ink-faint">{work.creator_email ?? "—"}{work.project_type ? ` · ${work.project_type}` : ""}</p>
        </div>

        {/* ② Pipeline — thin lifecycle line (position only; distinct from the runway) */}
        <div className="shrink-0 px-6 sm:px-8">
          <PipelineRail stage={stage} size="md" showAllLabels className="max-w-2xl" />
        </div>

        <div className="glow-cut mx-6 my-5 sm:mx-8" />

        {/* ③ Verdict + primary action — floated at the optical center of gravity */}
        <div className="relative flex flex-1 flex-col justify-center gap-4 px-6 py-2 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <OwnershipVerdict verdict={v.verdict} tone={v.tone} line={v.line} why={v.why} audience="admin" />
            {action && (
              <div className="flex flex-col items-stretch gap-1.5 sm:items-end">
                {action.emphasis === "quiet" ? (
                  <span className="rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-ink-muted">{action.label}</span>
                ) : (
                  <Link href={action.href}
                    className={action.emphasis === "primary"
                      ? "rounded-xl bg-brand-gradient px-7 py-3.5 text-base font-semibold text-black shadow-ember-glow transition active:scale-95"
                      : "rounded-xl border border-white/20 px-7 py-3.5 text-base font-medium text-white transition hover:bg-white/5"}>
                    {action.label}
                  </Link>
                )}
                {action.emphasis !== "quiet" && <span className="text-[10px] uppercase tracking-wider text-ink-faint sm:text-right">Opens live Mission Control</span>}
              </div>
            )}
          </div>
        </div>

        <div className="glow-cut mx-6 my-5 sm:mx-8" />

        {/* ④ Proof plate — embedded (no inner card; gold stamp rim = instrument boundary) */}
        <div className="proof-plate shrink-0 px-6 py-4 sm:px-8">
          <Eyebrow className="mb-2">Proof</Eyebrow>
          {lstate === "not_required" ? (
            <p className="text-xs text-ink-faint">No license at this stage — proof appears after approval and signing.</p>
          ) : (
            <SealedRecord
              embedded
              licenseState={lstate} license={work.license} audience="admin"
              onView={onViewReceipt} busy={receiptBusy} error={receiptError}
              signingUrl={lstate === "awaiting" ? `/license/${work.id}` : undefined}
            />
          )}
        </div>

        {/* ⑤ Launch Runway — recessed ignition floor (bottom-anchored mission floor) */}
        <div className="shrink-0">
          <LaunchRunway work={work} />
        </div>
      </div>
    </Stage>
  );
}
