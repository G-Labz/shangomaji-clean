// Phase 10J-I-R3-A.2 — Launch Runway.
//
// The lower Command Stage made into a real operational floor: a recessed,
// horizon-based ignition corridor showing the launch gates between the work
// and PUBLIC, which gate is open, and what the primary action does next. It is
// NOT decoration and adds NO data — every state is derived from existing logic,
// and the live gate is delegated to derivePublicReadiness (never reimplemented).

import { derivePublicReadiness } from "@/lib/public-visibility";
import type { WorkLike } from "@/lib/work-state";
import { Eyebrow } from "./surfaces";

const GATES = ["License", "Activate", "Title", "Bunny", "Media"] as const;

type GateState = "cleared" | "open" | "future" | "dark" | "paused";
type Floor = "live" | "locked" | "extinguished" | "paused";
type Horizon = "dim" | "public" | "flagged" | "dark" | "paused";
type Tone = "move" | "held" | "public" | "terminal" | "waiting";

interface RunwayModel {
  gates: GateState[];
  openIdx: number;
  openOwner: "creator" | "shangomaji" | null;
  floor: Floor;
  horizon: Horizon;
  tone: Tone;
  condition: string;
}

function runwayModel(work: WorkLike): RunwayModel {
  const s = work?.status;
  const fill = (g: GateState) => GATES.map(() => g);
  const base = { openIdx: -1, openOwner: null as RunwayModel["openOwner"] };

  if (s === "pending" || s === "in_review" || s === "draft")
    return { ...base, gates: fill("future"), floor: "locked", horizon: "dim", tone: "waiting", condition: "Awaiting clearance to launch" };
  if (s === "rejected")
    return { ...base, gates: fill("dark"), floor: "extinguished", horizon: "dark", tone: "terminal", condition: "Not approved — corridor closed" };
  if (s === "removed")
    return { ...base, gates: fill("dark"), floor: "extinguished", horizon: "dark", tone: "terminal", condition: "Removed from distribution" };
  if (s === "archived")
    return { ...base, gates: fill("paused"), floor: "paused", horizon: "paused", tone: "waiting", condition: "Internal hold — corridor paused" };
  if (s === "approved") {
    if (!work.license)
      return { gates: ["open", "future", "future", "future", "future"], openIdx: 0, openOwner: "creator", floor: "live", horizon: "dim", tone: "held", condition: "Awaiting creator signature — License gate" };
    return { gates: ["cleared", "open", "future", "future", "future"], openIdx: 1, openOwner: "shangomaji", floor: "live", horizon: "dim", tone: "move", condition: "Signed — Activation gate open" };
  }
  if (s === "removal_requested")
    return { ...base, gates: fill("cleared"), floor: "live", horizon: "flagged", tone: "held", condition: "Live — removal under review" };
  if (s === "live") {
    const r = derivePublicReadiness({
      status: "live",
      titleStatus: work.title_status ?? null,
      mediaReady: work.media_ready ?? null,
      bunnyVideoId: work.bunny_video_id ?? null,
      libraryConfigured: true,
    });
    if (r.state === "public")
      return { ...base, gates: fill("cleared"), floor: "live", horizon: "public", tone: "public", condition: "Publicly visible" };
    const reason = r.state === "finishing_setup" ? r.reason : "media_not_ready";
    const idx = reason === "title_inactive" ? 2 : reason === "bunny_missing" ? 3 : 4;
    const gates = GATES.map((_, i): GateState => (i < idx ? "cleared" : i === idx ? "open" : "future"));
    const label = reason === "title_inactive" ? "Title gate open" : reason === "bunny_missing" ? "Bunny gate open" : "Media gate open";
    return { gates, openIdx: idx, openOwner: "shangomaji", floor: "live", horizon: "dim", tone: "move", condition: `Finishing setup — ${label}` };
  }
  return { ...base, gates: fill("future"), floor: "locked", horizon: "dim", tone: "waiting", condition: "—" };
}

const TONE_TEXT: Record<Tone, string> = {
  move: "text-state-move",
  held: "text-state-held",
  public: "text-state-public",
  terminal: "text-state-terminal",
  waiting: "text-state-waiting",
};

// Per-gate visual treatment. Open gate colour depends on who owns the move.
function slatStyle(state: GateState, owner: RunwayModel["openOwner"]): { h: string; bg: string; glow?: string } {
  switch (state) {
    case "open": {
      const ember = owner === "creator" ? "#f5c518" : "#f07030";
      return { h: "h-12", bg: ember, glow: `0 9px 26px -6px ${ember}, 0 0 16px -2px ${ember}` };
    }
    case "cleared": return { h: "h-7", bg: "rgba(245,197,24,0.50)" };
    case "future":  return { h: "h-5", bg: "rgba(255,255,255,0.12)" };
    case "dark":    return { h: "h-4", bg: "rgba(229,62,42,0.30)" };
    case "paused":  return { h: "h-6", bg: "rgba(139,143,152,0.42)" };
  }
}

function gateLabelClass(i: number, m: RunwayModel): string {
  if (i === m.openIdx) return m.openOwner === "creator" ? "text-state-held" : "text-state-move";
  if (m.gates[i] === "cleared") return "text-state-held/70";
  if (m.gates[i] === "dark") return "text-state-terminal/60";
  return "text-ink-faint/70";
}

export function LaunchRunway({ work, className = "" }: { work: WorkLike; className?: string }) {
  const m = runwayModel(work);
  const horizonClass =
    m.horizon === "public" ? "runway-horizon--public"
    : m.horizon === "flagged" ? "runway-horizon--flagged"
    : m.horizon === "dark" ? "runway-horizon--dark"
    : m.horizon === "paused" ? "runway-horizon--paused"
    : "";

  return (
    <div className={`runway-floor px-6 pb-6 pt-5 sm:px-8 ${className}`}>
      <div className={`runway-horizon ${horizonClass}`} aria-hidden />
      <div className="relative mb-3 flex items-center justify-between">
        <Eyebrow>Launch control · runway</Eyebrow>
        <span className={`text-[11px] uppercase tracking-wider ${TONE_TEXT[m.tone]}`}>{m.condition}</span>
      </div>

      <div className="relative flex items-end gap-3 sm:gap-5">
        {/* baseline */}
        <span className="pointer-events-none absolute inset-x-0 bottom-[18px] h-px bg-white/5" aria-hidden />

        {m.floor === "locked" && (
          <span className="mb-[14px] mr-1 shrink-0 rounded border border-state-waiting/30 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-state-waiting">
            Locked
          </span>
        )}

        {GATES.map((label, i) => {
          const st = slatStyle(m.gates[i], m.openOwner);
          return (
            <div key={label} className="relative flex flex-1 flex-col items-center justify-end">
              <span
                className={`${st.h} w-[3px] rounded-full`}
                style={{ background: st.bg, boxShadow: st.glow }}
                aria-hidden
              />
              <span className={`mt-2 text-[9px] uppercase tracking-wider ${gateLabelClass(i, m)}`}>{label}</span>
            </div>
          );
        })}

        {/* PUBLIC horizon marker */}
        <div className="relative ml-1 flex shrink-0 flex-col items-center justify-end self-stretch pl-2">
          <span
            className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${m.horizon === "public" ? "text-state-public" : m.horizon === "flagged" ? "text-state-terminal" : "text-ink-faint/70"}`}
          >
            ▸ Public
          </span>
        </div>
      </div>
    </div>
  );
}
