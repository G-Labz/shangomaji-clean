// Phase 10J-I-R3-A — Ownership Verdict.
//
// The single, unambiguous answer to "whose move is it." Replaces the repeated
// next-action labels and the four separate ownership chips. The same logic is
// flipped per audience by work-state.ts; this component only renders.

import type { Verdict, VerdictTone, Audience } from "@/lib/work-state";

function capsFor(verdict: Verdict, tone: VerdictTone, audience: Audience): string {
  if (tone === "terminal") return "CLOSED";
  switch (verdict) {
    case "your_move":             return audience === "creator" ? "WAITING ON YOU" : "YOUR MOVE";
    case "waiting_on_creator":    return "WAITING ON CREATOR";
    case "waiting_on_shangomaji": return "SHANGOMAJI HAS IT";
    case "live_public":           return audience === "creator" ? "PUBLICLY VISIBLE" : "LIVE TO PUBLIC";
    case "system_hold":           return audience === "creator" ? "ARCHIVED" : "SYSTEM HOLD";
  }
}

const TONE_TEXT: Record<VerdictTone, string> = {
  move: "text-state-move",
  held: "text-state-held",
  public: "text-state-public",
  terminal: "text-state-terminal",
  waiting: "text-state-waiting",
};

const TONE_DOT: Record<VerdictTone, string> = {
  move: "bg-state-move",
  held: "bg-state-held",
  public: "bg-state-public",
  terminal: "bg-state-terminal",
  waiting: "bg-state-waiting",
};

export function OwnershipVerdict({
  verdict,
  tone,
  line,
  why,
  audience,
  size = "hero",
  className = "",
}: {
  verdict: Verdict;
  tone: VerdictTone;
  line: string;
  why?: string | null;
  audience: Audience;
  size?: "hero" | "chip";
  className?: string;
}) {
  const caps = capsFor(verdict, tone, audience);
  const moveGlow = tone === "move" ? "shadow-[0_0_10px_-1px_rgba(240,112,48,0.9)]" : "";

  if (size === "chip") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 ${className}`}
        title={why ?? undefined}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[tone]} ${moveGlow}`} />
        <span className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${TONE_TEXT[tone]}`}>
          {caps}
        </span>
      </span>
    );
  }

  const warmGlow = tone === "move" || tone === "held" || tone === "terminal" ? "storm-glow-text" : "";
  return (
    <div className={className}>
      <div className="flex items-center gap-3">
        <span className={`h-3.5 w-3.5 rounded-full ${TONE_DOT[tone]} ${moveGlow}`} />
        <span
          className={`text-[clamp(1.6rem,2.4vw,2.6rem)] uppercase leading-none tracking-[0.12em] ${TONE_TEXT[tone]} ${warmGlow}`}
          style={{ fontFamily: "var(--font-display)" }}
        >
          {caps}
        </span>
      </div>
      <p className="mt-2 text-base text-ink-muted">{line}</p>
      {why && <p className="mt-1 text-sm leading-relaxed text-ink-faint">{why}</p>}
    </div>
  );
}
