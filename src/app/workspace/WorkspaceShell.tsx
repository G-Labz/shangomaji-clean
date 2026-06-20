"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, X } from "lucide-react";

type RouteConfig = {
  label: string;
  parent: string | null;
  parentLabel: string | null;
  primaryAction: { label: string; href: string } | null;
};

// Phase 11D-R4A — the two rooms become bounded workspace frames; every other
// workspace route keeps the current scrolling 1000px-column studio page.
function isRoomRoute(pathname: string): boolean {
  const m = pathname.match(/^\/workspace\/projects\/([^/]+)\/(edit|media)$/);
  return !!m && m[1] !== "new";
}

// Phase 11D-R6A — the New World entry ("the room before the World Room") joins
// the same bounded-frame family as the rooms so crossing into the Studio feels
// continuous, not a teleport from a centered page. It renders its own threshold
// composition (no ribbon/rail); only the frame is shared.
function usesWorkspaceFrame(pathname: string): boolean {
  return isRoomRoute(pathname) || pathname === "/workspace/projects/new";
}

function resolveRoute(pathname: string): RouteConfig {
  // /workspace/projects/[id] (Studio Desk) and its rooms. World Room (edit),
  // Release Room (media), and Dossier all return to the Studio Desk.
  const roomMatch = pathname.match(/^\/workspace\/projects\/([^/]+)(?:\/(edit|media|dossier))?$/);
  if (roomMatch && roomMatch[1] !== "new") {
    const desk = `/workspace/projects/${roomMatch[1]}`;
    const sub = roomMatch[2];
    if (sub === "edit")    return { label: "World Room",   parent: desk, parentLabel: "Studio Desk", primaryAction: null };
    if (sub === "media")   return { label: "Release Room", parent: desk, parentLabel: "Studio Desk", primaryAction: null };
    if (sub === "dossier") return { label: "Dossier",      parent: desk, parentLabel: "Studio Desk", primaryAction: null };
    return { label: "Studio Desk", parent: "/workspace", parentLabel: "Studio", primaryAction: null };
  }
  // /workspace/projects/new
  if (pathname === "/workspace/projects/new") {
    return {
      label: "Begin a world",
      parent: "/workspace/projects",
      parentLabel: "Worlds",
      primaryAction: null,
    };
  }

  const routes: Record<string, RouteConfig> = {
    "/workspace": {
      label: "Creator Studio",
      parent: null,
      parentLabel: null,
      primaryAction: null,
    },
    "/workspace/profile": {
      label: "Profile",
      parent: "/workspace",
      parentLabel: "Studio",
      primaryAction: null,
    },
    "/workspace/projects": {
      label: "Worlds",
      parent: "/workspace",
      parentLabel: "Studio",
      primaryAction: { label: "Begin a world", href: "/workspace/projects/new" },
    },
    "/workspace/media": {
      label: "Media",
      parent: "/workspace",
      parentLabel: "Studio",
      // Phase 6 Tier 2.5 fix v2 — Media Library is a read-only browser
      // of assets already attached to existing works. The header CTA
      // used to send the creator to /workspace/projects/new, which
      // looked like a "submit a new work" loop. The correct action is
      // to choose an existing work whose Media Package they want to
      // open. The list page surfaces "Manage Media Package" / "View
      // Media Package" inline per work.
      primaryAction: { label: "Choose a world", href: "/workspace/projects" },
    },
    "/workspace/settings": {
      label: "Settings",
      parent: "/workspace",
      parentLabel: "Studio",
      primaryAction: null,
    },
  };

  return routes[pathname] || {
    label: "Workspace",
    parent: "/workspace",
    parentLabel: "Studio",
    primaryAction: null,
  };
}

// Phase 12C — shared lit Studio atmosphere (ShangoMaji Ember Spectrum v1).
// Replaces the flat near-black shell: warm foundation black lit by an ambient
// ember field + crimson power + golden warmth — "darkness as the stage floor,
// gradient as the active light source" (Brand Kit). Workspace-scoped (shell only).
const STUDIO_BG =
  "radial-gradient(110% 75% at 14% -8%, rgba(234,115,27,0.13) 0%, rgba(234,115,27,0.04) 34%, transparent 62%)," + // Solar Orange ember field
  "radial-gradient(95% 70% at 88% 6%, rgba(200,10,46,0.10) 0%, transparent 58%)," +                               // Shango Crimson power
  "radial-gradient(120% 85% at 50% 118%, rgba(246,163,26,0.06) 0%, transparent 60%)," +                           // Golden Ember warmth
  "linear-gradient(165deg, #0c0807 0%, #0e0a08 40%, #130d0a 72%, #0c0908 100%)";                                  // warm foundation black

// Phase 12C — canonical color-role tokens, verified against the ShangoMaji
// Branding Kit (Ember Spectrum v1). Defined on the shell <main> so the entire
// creator-workspace subtree shares one token source; nothing sitewide changes.
const STUDIO_TOKENS = {
  "--studio-action":      "#EA731B", // Solar Orange — action / creation
  "--studio-recognition": "#FFD500", // Shango Gold — recognition / prestige
  "--studio-authority":   "#C80A2E", // Shango Crimson — authority / power
  "--studio-danger":      "#D9261C", // Ember Red — danger (documented UI-role exception, A1)
  "--studio-heat":        "#F6A31A", // Golden Ember — heat / in-progress
  "--studio-ink":         "#F2F2F2", // Stage White — primary text
  "--studio-ink-2":       "#B5B5B5", // Soft Ash — secondary text
} as React.CSSProperties;

// Phase 12C — cinematic film grain restored inside the Studio (the flat shell
// used to cover the brand's grain). Fixed, inert, very low opacity — felt, not
// seen. Sits under the TopNav / modals / side stage; does not affect layout.
function StudioGrain() {
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1,
        pointerEvents: "none",
        opacity: 0.1,
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        backgroundSize: "170px 170px",
      }}
    />
  );
}

// Studio chrome strip — shared by both the scrolling pages and the bounded
// rooms; only its inner-bar width differs (rooms own the full canvas).
function ShellHeader({ route, fullWidth }: { route: RouteConfig; fullWidth: boolean }) {
  return (
    <div
      style={{
        maxWidth: fullWidth ? "none" : 1000,
        margin: fullWidth ? 0 : "0 auto",
        padding: "12px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {route.parent && (
          <Link
            href={route.parent}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px 6px 10px",
              fontSize: 14,
              fontWeight: 500,
              color: "rgba(255,255,255,0.7)",
              textDecoration: "none",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "white";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
              e.currentTarget.style.background = "rgba(255,255,255,0.08)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "rgba(255,255,255,0.7)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
              e.currentTarget.style.background = "rgba(255,255,255,0.04)";
            }}
          >
            <ArrowLeft size={14} />
            {route.parentLabel}
          </Link>
        )}
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "rgba(255,255,255,0.5)",
            letterSpacing: "0.01em",
          }}
        >
          {route.label}
        </span>
      </div>

      {route.primaryAction && (
        <Link
          href={route.primaryAction.href}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            borderRadius: 10,
            background: "rgba(255,255,255,0.04)",
            color: "rgba(255,255,255,0.85)",
            fontWeight: 600,
            fontSize: 13,
            textDecoration: "none",
            border: "1px solid rgba(255,255,255,0.15)",
            transition: "background 0.15s, border-color 0.15s",
          }}
        >
          {route.primaryAction.label}
        </Link>
      )}
    </div>
  );
}

export default function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const route = resolveRoute(pathname);
  const room = usesWorkspaceFrame(pathname);

  // ── Bounded room frame (World Room / Release Room only) ──────────────────
  // The shell is no longer a scrolling page here: it is a fixed-height studio
  // frame hosting one bounded room. The studio chrome is a static strip; the
  // room owns the full width and the full remaining height, and manages its
  // own contained scroll. No page scroll.
  if (room) {
    return (
      <main
        style={{
          ...STUDIO_TOKENS,
          height: "100vh",
          paddingTop: 68,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          background: STUDIO_BG,
          color: "white",
        }}
      >
        <StudioGrain />
        <div
          style={{
            flex: "none",
            background: "rgba(8,8,11,0.92)",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(12px)",
          }}
        >
          <ShellHeader route={route} fullWidth />
        </div>

        {/* The bounded room workspace fills the rest of the frame. */}
        <div style={{ flex: 1, minHeight: 0, width: "100%", display: "flex" }}>
          {children}
        </div>
      </main>
    );
  }

  // ── Studio pages (everything else) — unchanged scrolling 1000px column ───
  return (
    <main
      style={{
        ...STUDIO_TOKENS,
        minHeight: "100vh",
        paddingTop: 68,
        background: STUDIO_BG,
        color: "white",
      }}
    >
      <StudioGrain />
      {/* Shell Header — positioned below the 68px fixed TopNav */}
      <div
        style={{
          position: "sticky",
          top: 68,
          zIndex: 40,
          background: "rgba(8,8,11,0.92)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(12px)",
        }}
      >
        <ShellHeader route={route} fullWidth={false} />
      </div>

      {/* Page Content */}
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "48px 24px 24px" }}>
        {children}
      </div>
    </main>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Phase 11D-R4A — Workspace-frame primitives (the studio frame hosts these).
   Used ONLY by the World Room (Workbench) and Release Room (Assembly Table).
   This is the single Studio-wide summon mechanism (blueprint §4): one side
   stage, right entrance, ~58% width, the central object stays visible/live and
   exits via close / ESC / clicking the object. No second mechanism exists.
   ────────────────────────────────────────────────────────────────────────── */

// Phase 12C — the canonical action signal is now the tokenized Solar Orange
// (#EA731B), replacing the off-kit #E0763A. Fallback keeps it valid anywhere.
export const STUDIO_SIGNAL = "var(--studio-action, #EA731B)";

export function RoomLayout({
  ribbon,
  rail,
  center,
  stage,
}: {
  ribbon: React.ReactNode;
  rail?: React.ReactNode;
  center: React.ReactNode;
  stage: { open: boolean; title: React.ReactNode; onClose: () => void; children: React.ReactNode };
}) {
  // ESC closes the side stage — part of the single, consistent summon contract.
  useEffect(() => {
    if (!stage.open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") stage.onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage.open, stage.onClose]);

  return (
    <div className="room-frame">
      <div className="room-ribbon">{ribbon}</div>

      <div className="room-body" data-stage={stage.open ? "open" : "closed"}>
        {/* Left cluster: facet rail (World Room) + the persistent central
            object. Compresses right when the stage is summoned; the object
            never disappears. Clicking the object closes the stage. */}
        <div className="room-left">
          {rail && <div className="room-rail">{rail}</div>}
          <div
            className="room-center"
            onClick={() => { if (stage.open) stage.onClose(); }}
          >
            {center}
          </div>
        </div>

        {/* The single side-stage summon — slides in from the right. */}
        <aside className="room-stage" data-open={stage.open ? "true" : "false"} aria-hidden={!stage.open}>
          <div className="room-stage-head">
            <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: STUDIO_SIGNAL }}>
              {stage.title}
            </p>
            <button onClick={stage.onClose} aria-label="Close" className="text-white/50 hover:text-white transition">
              <X size={16} />
            </button>
          </div>
          <div className="room-stage-body">{stage.children}</div>
        </aside>
      </div>

      <style jsx global>{`
        .room-frame {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 0;
          min-height: 0;
          width: 100%;
        }
        .room-ribbon { flex: none; min-width: 0; }
        /* R5E geometry — the side stage is an IN-FLOW flex sibling of the center
           with a stable, clamped PIXEL width (never collapses to near-zero, never
           dominates). No absolute positioning, no percentage/var width, no
           compression-padding. The center is flex:1 and always visible; opening
           the stage compresses it leftward, closing returns its full width. */
        .room-body {
          position: relative;
          flex: 1;
          min-width: 0;
          min-height: 0;
          overflow: hidden;
          display: flex;
          flex-direction: row;
        }
        .room-left {
          flex: 1;
          min-width: 0;
          min-height: 0;
          height: 100%;
          display: flex;
        }
        .room-rail { flex: none; height: 100%; min-height: 0; }
        .room-center {
          flex: 1;
          min-width: 0;
          height: 100%;
          overflow-y: auto;
          overflow-x: hidden;
        }
        .room-stage {
          flex: none;
          height: 100%;
          min-width: 0;
          min-height: 0;
          width: clamp(400px, 44vw, 600px);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: rgba(12,9,9,0.98);
          border-left: 1px solid rgba(255,255,255,0.1);
          transition: width 280ms ease;
          will-change: width;
        }
        /* Closed: collapses to zero width in flow and is inert. */
        .room-stage[data-open="false"] { width: 0; border-left-width: 0; pointer-events: none; }
        .room-stage[data-open="true"]  { pointer-events: auto; }
        .room-stage-head {
          flex: none;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          min-width: 0;
          padding: 14px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .room-stage-head > p {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        /* The instrument surface: a guaranteed readable width, vertical scroll,
           normal word-level wrapping (long URLs still break only when needed). */
        .room-stage-body {
          flex: 1;
          min-width: 0;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 22px 20px;
          overflow-wrap: break-word;
          word-break: normal;
        }
        /* Phones / very narrow: the stage becomes a full-width focused sheet so
           the center isn't crushed (the approved mobile summon behaviour). */
        @media (max-width: 720px) {
          .room-stage[data-open="true"] { width: 100%; }
        }
      `}</style>
    </div>
  );
}
