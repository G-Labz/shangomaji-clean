// Phase 10J-I-R3-A — Pipeline Rail.
//
// The signature shared component: a work's whole journey as an illuminated
// track. Forge-gold = travelled, ember = now, amber-pulse = held, dim = ahead.
// Terminal works (rejected/removed/archived) render a dimmed rail with an
// end-cap so the rail never implies a settled work is still in motion.
//
// Position comes ONLY from work-state.ts `pipelineStage()`; this component
// renders, it never computes a gate.

import React from "react";
import type { PipelineStage } from "@/lib/work-state";

type NodeKind = "done" | "now" | "held" | "future" | "terminal";

function nodeKind(i: number, stage: PipelineStage): NodeKind {
  if (stage.terminal) {
    return i === stage.activeIndex ? "terminal" : i < stage.activeIndex ? "done" : "future";
  }
  if (i < stage.activeIndex) return "done";
  if (i === stage.activeIndex) return stage.held ? "held" : "now";
  return "future";
}

const NODE_CLASS: Record<NodeKind, string> = {
  done: "rail-node--done",
  now: "rail-node--now",
  held: "rail-node--held",
  future: "rail-node--future",
  terminal: "rail-node--terminal",
};

export function PipelineRail({
  stage,
  orientation = "horizontal",
  size = "md",
  showAllLabels = false,
  className = "",
}: {
  stage: PipelineStage;
  orientation?: "horizontal" | "vertical";
  size?: "sm" | "md" | "lg";
  showAllLabels?: boolean;
  className?: string;
}) {
  const dot = size === "lg" ? "h-4 w-4" : size === "md" ? "h-3 w-3" : "h-2 w-2";
  const segDone = (i: number) => i < stage.activeIndex && !stage.terminal;

  if (orientation === "vertical") {
    return (
      <ol className={`flex flex-col gap-0 ${className}`}>
        {stage.nodes.map((label, i) => {
          const kind = nodeKind(i, stage);
          const isActive = i === stage.activeIndex;
          return (
            <li key={label} className="flex items-start gap-3">
              <div className="flex flex-col items-center self-stretch">
                <span className={`rail-node ${dot} ${NODE_CLASS[kind]}`} />
                {i < stage.nodes.length - 1 && (
                  <span className={`w-px flex-1 min-h-5 rail-seg ${segDone(i) ? "rail-seg--done" : ""}`} />
                )}
              </div>
              <span
                className={`pb-3 text-xs leading-none pt-[1px] ${
                  isActive ? "text-white font-medium" : "text-ink-faint"
                }`}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    );
  }

  // Horizontal
  return (
    <div className={className}>
      <div className="flex items-center">
        {stage.nodes.map((label, i) => {
          const kind = nodeKind(i, stage);
          return (
            <React.Fragment key={label}>
              <span className={`rail-node shrink-0 ${dot} ${NODE_CLASS[kind]}`} title={label} />
              {i < stage.nodes.length - 1 && (
                <span className={`h-px flex-1 rail-seg ${segDone(i) ? "rail-seg--done" : ""}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between">
        {showAllLabels ? (
          stage.nodes.map((label, i) => (
            <span
              key={label}
              className={`text-[9px] uppercase tracking-wider ${
                i === stage.activeIndex ? "text-state-move" : "text-ink-faint/70"
              }`}
            >
              {label}
            </span>
          ))
        ) : (
          <>
            <span className="text-[10px] uppercase tracking-wider text-ink-faint">
              {stage.nodes[0]}
            </span>
            <span className="text-[11px] font-medium uppercase tracking-wider text-state-move">
              {stage.terminal ? stage.terminal : stage.nodes[stage.activeIndex]}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-ink-faint">
              {stage.nodes[stage.nodes.length - 1]}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
