"use client";

// Phase 10J-I-R3-A — Admin Forge (read-only preview).
//
// A structural preview of the redesigned Admin Mission Control as a three-zone
// command room: Pressure Rail (left) · Command Stage (center hero) · The Flow
// (right). It proves the shared premium language (Pipeline Rail, Ownership
// Verdict, Sealed Record, Launch Control) against REAL admin data without
// touching the live /admin page or any validated logic.
//
// DISCIPLINE (enforced):
//   • Read-only. The only network call is GET /api/admin/projects (+ a GET to
//     the existing receipt route). No PATCH/POST/DELETE. No mutations.
//   • Reuses the existing admin password gate (x-admin-password header).
//   • Action buttons render in final form but deep-link to /admin; they never
//     mutate here.
//   • A parity panel asserts the new derive agrees with Mission Control's logic.

import React, { useMemo, useState } from "react";
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
  Cartridge,
  Eyebrow,
  HeatBar,
  OwnershipVerdict,
  PipelineRail,
  SealedRecord,
  Stage,
} from "@/components/forge";

type WorkRow = WorkLike & { id: string };

// ── Inline parity mirror — a literal copy of the live admin
// getPublicVisibilityDiagnostic mapping, used ONLY to prove the new shared
// derive reproduces Mission Control's logic. Both delegate the live gate to the
// same derivePublicReadiness, so a match here is real parity, not a tautology.
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
      status,
      titleStatus: p?.title_status ?? null,
      mediaReady: p?.media_ready ?? null,
      bunnyVideoId: p?.bunny_video_id ?? null,
      libraryConfigured: true,
    });
    if (r.state === "public") return { label: "Ready — visible in public catalog", tone: "ready" };
    if (r.state === "finishing_setup") {
      const label =
        r.reason === "title_inactive" ? "Held — title row inactive"
        : r.reason === "bunny_missing" ? "Held — Bunny video missing"
        : "Held — media not ready";
      return { label, tone: "held" };
    }
    return { label: "Held — not live", tone: "held" };
  }
  return { label: "Held — unknown state", tone: "held" };
}

// Static tone → dot class map. Must be literal class names so Tailwind's JIT
// emits them (a `bg-state-${tone}` template would be purged).
const TONE_DOT: Record<VerdictTone, string> = {
  move: "bg-state-move",
  held: "bg-state-held",
  public: "bg-state-public",
  terminal: "bg-state-terminal",
  waiting: "bg-state-waiting",
};

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
  const [flowSource, setFlowSource] = useState<string>("needs_you"); // needs_you | all | <rail key>
  const [showDebug, setShowDebug] = useState(false);
  const [receiptBusy, setReceiptBusy] = useState<string | null>(null);
  const [receiptError, setReceiptError] = useState<Record<string, string>>({});

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

  // Read-only receipt open — identical pattern to the live admin bridge. GET
  // only; uses the existing receipt route + admin password header unchanged.
  async function viewReceipt(licenseId: string) {
    setReceiptBusy(licenseId);
    setReceiptError((p) => ({ ...p, [licenseId]: "" }));
    const win = typeof window !== "undefined" ? window.open("", "_blank") : null;
    if (win) win.opener = null;
    try {
      const res = await fetch(`/api/licenses/${licenseId}/receipt`, {
        headers: { "x-admin-password": password },
      });
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
      flowSource === "needs_you"
        ? projects.filter((p) => operatorPriorityRank(p) !== null)
        : flowSource === "all"
        ? projects
        : projects.filter((p) => RAIL.find((r) => r.key === flowSource)?.match(p));
    return [...base].sort((a, b) => {
      const ra = operatorPriorityRank(a);
      const rb = operatorPriorityRank(b);
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
      const a = adminDiagnosticMirror(p);
      const b = publicDiagnostic(p);
      if (a.label !== b.label || a.tone !== b.tone) {
        fails.push(`${p.title ?? p.id}: diagnostic ${JSON.stringify(b)} ≠ ${JSON.stringify(a)}`);
      }
      const yourMove = ownershipVerdict(p, "admin").verdict === "your_move";
      if (yourMove !== (operatorPriorityRank(p) !== null)) {
        fails.push(`${p.title ?? p.id}: your_move ≠ priority-rank invariant`);
      }
      if ((classifyBucket(p) === "public_ready") !== (b.tone === "ready")) {
        fails.push(`${p.title ?? p.id}: public_ready ≠ ready-tone invariant`);
      }
    }
    return { ok: fails.length === 0, fails, total: projects.length };
  }, [projects]);

  // ── Password gate ────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="grid min-h-[70vh] place-items-center px-4">
        <Stage className="w-full max-w-sm p-7">
          <Eyebrow>ShangoMaji · Operations</Eyebrow>
          <h1 className="mt-1 text-2xl text-white" style={{ fontFamily: "var(--font-display)" }}>
            The Forge
          </h1>
          <p className="mt-1 text-xs text-ink-faint">
            Read-only preview of the redesigned Mission Control. Enter the admin password.
          </p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
            placeholder="Admin password"
            className="mt-4 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-state-move/50"
          />
          {error && <p className="mt-2 text-xs text-state-terminal">{error}</p>}
          <button
            onClick={login}
            disabled={loading || !password}
            className="mt-4 w-full rounded-lg bg-brand-gradient px-4 py-2 text-sm font-semibold text-black shadow-ember-glow transition active:scale-95 disabled:opacity-50"
          >
            {loading ? "Entering…" : "Enter the Forge"}
          </button>
          <Link href="/admin" className="mt-4 block text-center text-[11px] text-ink-faint hover:text-white">
            ← Back to live Mission Control
          </Link>
        </Stage>
      </div>
    );
  }

  const needsYou = projects.filter((p) => operatorPriorityRank(p) !== null).length;
  const removals = projects.filter((p) => p.status === "removal_requested").length;
  const finishing = counts.needs_bunny + counts.needs_processing;

  return (
    <div className="mx-auto w-full max-w-[1680px] px-4 pb-16 pt-6">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow>ShangoMaji · Operations · Preview</Eyebrow>
          <h1 className="text-3xl text-white" style={{ fontFamily: "var(--font-display)" }}>
            The Forge
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-state-held/30 bg-state-held/[0.06] px-3 py-1 text-[11px] uppercase tracking-wider text-state-held">
            Read-only preview
          </span>
          <button
            onClick={() => setShowDebug((s) => !s)}
            className="rounded-lg border border-white/12 px-3 py-1.5 text-xs text-ink-muted transition hover:bg-white/5"
          >
            {showDebug ? "Hide parity" : "Show parity"}
          </button>
          <Link href="/admin" className="rounded-lg border border-white/12 px-3 py-1.5 text-xs text-ink-muted transition hover:bg-white/5">
            Live Mission Control →
          </Link>
        </div>
      </div>

      {/* Parity banner */}
      {showDebug && (
        <div
          className={`mb-5 rounded-xl border p-4 ${
            parity.ok ? "border-state-public/30 bg-state-public/[0.06]" : "border-state-terminal/40 bg-state-terminal/[0.06]"
          }`}
        >
          <p className={`text-sm font-semibold ${parity.ok ? "text-state-public" : "text-state-terminal"}`}>
            {parity.ok
              ? `PARITY OK — derived state matches Mission Control logic across ${parity.total} works.`
              : `PARITY FAILED — ${parity.fails.length} mismatch(es).`}
          </p>
          <p className="mt-1 text-[11px] text-ink-faint">
            Checks: public-visibility diagnostic (vs inline admin mirror) · your_move ⟺ operatorPriorityRank · public_ready ⟺ ready-tone. All delegate the live gate to derivePublicReadiness.
          </p>
          {!parity.ok && (
            <ul className="mt-2 space-y-1 text-[11px] text-state-terminal">
              {parity.fails.map((f, i) => (
                <li key={i}>• {f}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Three-zone command room */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[230px_minmax(0,1fr)_360px]">
        {/* ── Pressure Rail ── */}
        <aside className="forge-ledger hidden rounded-2xl p-4 xl:block">
          <Eyebrow>Operation pulse</Eyebrow>
          <p className="mt-1.5 text-sm text-white">
            <span className="text-state-move">{needsYou}</span> need you ·{" "}
            <span className={removals ? "text-state-held" : "text-ink-faint"}>{removals}</span> removal ·{" "}
            <span className={finishing ? "text-state-held" : "text-ink-faint"}>{finishing}</span> finishing
          </p>
          <div className="forge-rim my-4" />
          <Eyebrow className="mb-2">Pressure</Eyebrow>
          <button
            onClick={() => setFlowSource("needs_you")}
            className={`mb-1 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs transition ${
              flowSource === "needs_you" ? "bg-state-move/10 text-state-move" : "text-ink-muted hover:bg-white/5"
            }`}
          >
            <span className="font-medium uppercase tracking-wider">Needs you</span>
            <span>{needsYou}</span>
          </button>
          <div className="space-y-2.5 pt-1.5">
            {RAIL.map((r) => {
              const c = projects.filter(r.match).length;
              const active = flowSource === r.key;
              return (
                <button
                  key={r.key}
                  onClick={() => setFlowSource(r.key)}
                  className={`block w-full text-left ${active ? "" : "opacity-90 hover:opacity-100"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs uppercase tracking-wider ${active ? "text-white" : "text-ink-muted"}`}>
                      {r.label}
                    </span>
                    <span className={`text-xs tabular-nums ${c ? "text-white" : "text-ink-faint"}`}>{c}</span>
                  </div>
                  <HeatBar value={c} max={Math.max(1, projects.length)} className="mt-1" />
                </button>
              );
            })}
          </div>
          <div className="forge-rim my-4" />
          <button
            onClick={() => setFlowSource("all")}
            className={`text-[11px] uppercase tracking-wider transition ${
              flowSource === "all" ? "text-state-move" : "text-ink-faint hover:text-white"
            }`}
          >
            View all {projects.length} works
          </button>
        </aside>

        {/* ── Command Stage ── */}
        <main>
          {selected ? (
            <CommandStage
              key={selected.id}
              work={selected}
              receiptBusy={receiptBusy === selected.license?.id}
              receiptError={selected.license?.id ? receiptError[selected.license.id] : undefined}
              onViewReceipt={selected.license?.id ? () => viewReceipt(selected.license!.id as string) : undefined}
            />
          ) : (
            <Stage className="grid min-h-[300px] place-items-center p-8 text-center">
              <div>
                <p className="text-lg text-white" style={{ fontFamily: "var(--font-display)" }}>
                  Queue clear. The forge is quiet.
                </p>
                <p className="mt-1 text-sm text-ink-faint">Nothing in this view needs an operator right now.</p>
              </div>
            </Stage>
          )}
        </main>

        {/* ── The Flow ── */}
        <aside>
          <div className="mb-2 flex items-center justify-between">
            <Eyebrow>The Flow</Eyebrow>
            <span className="text-[11px] text-ink-faint">
              {flowSource === "needs_you" ? "Needs you" : flowSource === "all" ? "All" : RAIL.find((r) => r.key === flowSource)?.label}
              {" · "}
              {flow.length}
            </span>
          </div>
          <div className="space-y-2">
            {flow.map((p) => (
              <FlowCartridge key={p.id} work={p} active={p.id === selected?.id} onClick={() => setSelectedId(p.id)} />
            ))}
            {flow.length === 0 && (
              <Cartridge className="p-4 text-center text-xs text-ink-faint">No works in this view.</Cartridge>
            )}
          </div>
        </aside>
      </div>

      {/* Debug per-work table */}
      {showDebug && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-white/8">
          <table className="w-full text-left text-[11px]">
            <thead className="text-ink-faint">
              <tr className="[&>th]:px-3 [&>th]:py-2">
                <th>Work</th>
                <th>Status</th>
                <th>Bucket</th>
                <th>Diagnostic</th>
                <th>Verdict (admin)</th>
                <th>Priority</th>
                <th>Pipeline</th>
              </tr>
            </thead>
            <tbody className="text-ink-muted">
              {projects.map((p) => {
                const v = ownershipVerdict(p, "admin");
                const stg = pipelineStage(p);
                return (
                  <tr key={p.id} className="border-t border-white/5 [&>td]:px-3 [&>td]:py-2">
                    <td className="max-w-[180px] truncate text-white">{p.title ?? p.id}</td>
                    <td>{p.status}</td>
                    <td>{classifyBucket(p)}</td>
                    <td>{publicDiagnostic(p).label}</td>
                    <td>{v.verdict}</td>
                    <td>{operatorPriorityRank(p) ?? "—"}</td>
                    <td>{stg.terminal ?? stg.nodes[stg.activeIndex]}{stg.held ? " (held)" : ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Flow conveyor cartridge ──────────────────────────────────────────────────
function FlowCartridge({ work, active, onClick }: { work: WorkRow; active: boolean; onClick: () => void }) {
  const v = ownershipVerdict(work, "admin");
  return (
    <button onClick={onClick} className="block w-full text-left">
      <Cartridge
        className={`animate-flow-in p-3 transition ${
          active ? "ring-1 ring-state-move/60" : "hover:ring-1 hover:ring-white/15"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[v.tone]}`} />
          <p className="min-w-0 flex-1 truncate text-sm text-white">{work.title ?? "Untitled"}</p>
        </div>
        <p className="mt-1 truncate text-[11px] text-ink-faint">{v.line}</p>
      </Cartridge>
    </button>
  );
}

// ── Command Stage ────────────────────────────────────────────────────────────
function CommandStage({
  work,
  onViewReceipt,
  receiptBusy,
  receiptError,
}: {
  work: WorkRow;
  onViewReceipt?: () => void;
  receiptBusy?: boolean;
  receiptError?: string;
}) {
  const v = ownershipVerdict(work, "admin");
  const stage = pipelineStage(work);
  const lstate = licenseState(work);
  const action = nextAction(work, "admin");
  const cover = (work.cover_image_url || work.banner_url || "").trim();

  // Launch Control — the public-readiness gate sequence, mapped to the same
  // fields derivePublicReadiness checks. Meaningful for live / removal works.
  const liveish = work.status === "live" || work.status === "removal_requested";
  const gates = [
    { label: "Activated", ok: liveish },
    { label: "Title active", ok: liveish && (!work.title_status || work.title_status === "active") },
    { label: "Bunny bound", ok: !!work.bunny_video_id },
    { label: "Media ready", ok: work.media_ready === true },
  ];

  return (
    <Stage className="overflow-hidden">
      {/* Cinematic identity */}
      <div className="relative">
        {cover && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
            <div className="absolute inset-0 bg-gradient-to-t from-forge-stage via-forge-stage/85 to-transparent" />
          </>
        )}
        <div className="relative p-6">
          <Eyebrow>Selected work</Eyebrow>
          <h2 className="mt-1 text-3xl leading-tight text-white" style={{ fontFamily: "var(--font-display)" }}>
            {work.title ?? "Untitled"}
          </h2>
          <p className="mt-1 text-xs text-ink-faint">
            {work.creator_email ?? "—"}
            {work.project_type ? ` · ${work.project_type}` : ""}
          </p>
          <PipelineRail stage={stage} className="mt-5 max-w-xl" />
        </div>
      </div>

      <div className="space-y-5 p-6 pt-1">
        {/* Verdict + primary action */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <OwnershipVerdict verdict={v.verdict} tone={v.tone} line={v.line} why={v.why} audience="admin" />
          {action && (
            <div className="flex flex-col items-end gap-1">
              <Link
                href={action.href}
                className={
                  action.emphasis === "primary"
                    ? "rounded-xl bg-brand-gradient px-5 py-2.5 text-sm font-semibold text-black shadow-ember-glow transition active:scale-95"
                    : action.emphasis === "secondary"
                    ? "rounded-xl border border-white/20 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/5"
                    : "rounded-xl border border-white/10 px-5 py-2.5 text-sm font-medium text-ink-muted"
                }
              >
                {action.label}
              </Link>
              <span className="text-[10px] uppercase tracking-wider text-ink-faint">Opens live Mission Control</span>
            </div>
          )}
        </div>

        {/* Proof strip */}
        <SealedRecord
          licenseState={lstate}
          license={work.license}
          audience="admin"
          onView={onViewReceipt}
          busy={receiptBusy}
          error={receiptError}
          signingUrl={lstate === "awaiting" ? `/license/${work.id}` : undefined}
        />

        {/* Launch Control */}
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between">
            <Eyebrow>Launch control</Eyebrow>
            <span
              className={`text-[11px] uppercase tracking-wider ${
                publicDiagnostic(work).tone === "ready" ? "text-state-public" : "text-state-held"
              }`}
            >
              {publicDiagnostic(work).label}
            </span>
          </div>
          {liveish ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {gates.map((g) => (
                <span
                  key={g.label}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] ${
                    g.ok
                      ? "border-state-public/30 bg-state-public/[0.06] text-state-public"
                      : "border-state-move/40 bg-state-move/[0.06] text-state-move"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${g.ok ? "bg-state-public" : "bg-state-move"}`} />
                  {g.label}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-ink-faint">Not in distribution yet — gates open after activation.</p>
          )}
        </div>
      </div>
    </Stage>
  );
}
