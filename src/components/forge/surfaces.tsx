// Phase 10J-I-R3-A — Forge surface system.
//
// The three surface classes that replace the generic dashboard "card":
//   Stage     — the single hero focal surface (the work under decision).
//   Cartridge — a conveyor item / journey track row.
//   Ledger    — recessive audit / archive panels.
//
// Plus two small primitives the Pressure Rail and zone headers reuse. Pure
// presentational wrappers over the .forge-* utilities defined in globals.css.

import React from "react";

type DivProps = {
  children: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>;

export function Stage({ children, className = "", ...rest }: DivProps) {
  return (
    <div className={`forge-stage rounded-2xl ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function Cartridge({ children, className = "", ...rest }: DivProps) {
  return (
    <div className={`forge-cartridge rounded-xl ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function Ledger({ children, className = "", ...rest }: DivProps) {
  return (
    <div className={`forge-ledger rounded-xl ${className}`} {...rest}>
      {children}
    </div>
  );
}

/** Uppercase, letter-spaced command label used above each zone. */
export function Eyebrow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-[10px] font-medium uppercase tracking-[0.22em] text-ink-faint ${className}`}>
      {children}
    </p>
  );
}

/**
 * Pressure heat bar — ember intensity encodes operational pressure for a
 * lifecycle stage. `value` is the count; `max` scales the fill. Zero pressure
 * reads as a dim hairline rather than an empty void.
 */
export function HeatBar({ value, max, className = "" }: { value: number; max: number; className?: string }) {
  const ratio = max > 0 ? Math.min(1, value / max) : 0;
  const pct = value > 0 ? Math.max(0.12, ratio) * 100 : 0;
  return (
    <div className={`h-1 w-full overflow-hidden rounded-full bg-white/[0.06] ${className}`}>
      <div
        className="h-full rounded-full"
        style={{
          width: `${pct}%`,
          background:
            value > 0
              ? "linear-gradient(90deg, rgba(229,62,42,0.85), rgba(240,112,48,0.9), rgba(245,197,24,0.85))"
              : "transparent",
          boxShadow: value > 0 ? "0 0 10px -2px rgba(240,112,48,0.6)" : "none",
        }}
      />
    </div>
  );
}
