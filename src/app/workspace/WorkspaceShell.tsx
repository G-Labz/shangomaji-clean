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

const SHELL_BG =
  "linear-gradient(135deg, #08080b 0%, #120b0b 35%, #1b0f08 65%, #09090b 100%)";

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
  const room = isRoomRoute(pathname);

  // ── Bounded room frame (World Room / Release Room only) ──────────────────
  // The shell is no longer a scrolling page here: it is a fixed-height studio
  // frame hosting one bounded room. The studio chrome is a static strip; the
  // room owns the full width and the full remaining height, and manages its
  // own contained scroll. No page scroll.
  if (room) {
    return (
      <main
        style={{
          height: "100vh",
          paddingTop: 68,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          background: SHELL_BG,
          color: "white",
        }}
      >
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
        minHeight: "100vh",
        paddingTop: 68,
        background: SHELL_BG,
        color: "white",
      }}
    >
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

export const STUDIO_SIGNAL = "#E0763A";

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
        /* The stage width is a single source of truth shared by the stage and
           the center's compression so they always stay in lock-step. */
        .room-body {
          position: relative;
          flex: 1;
          min-width: 0;
          min-height: 0;
          overflow: hidden;
          --stage-w: 56%;
        }
        @media (max-width: 900px)  { .room-body { --stage-w: 64%; } }
        @media (min-width: 1600px) { .room-body { --stage-w: 780px; } }
        @media (max-width: 640px)  { .room-body { --stage-w: 100%; } }
        .room-left {
          height: 100%;
          display: flex;
          min-width: 0;
          min-height: 0;
          transition: padding-right 300ms ease;
          padding-right: 0;
        }
        .room-body[data-stage="open"] .room-left { padding-right: var(--stage-w); }
        .room-rail { flex: none; height: 100%; min-height: 0; }
        .room-center {
          flex: 1;
          min-width: 0;
          height: 100%;
          overflow-y: auto;
          overflow-x: hidden;
        }
        .room-stage {
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          width: var(--stage-w);
          display: flex;
          flex-direction: column;
          min-width: 0;
          min-height: 0;
          overflow: hidden;
          background: rgba(12,9,9,0.98);
          border-left: 1px solid rgba(255,255,255,0.1);
          transition: transform 300ms ease;
          z-index: 20;
        }
        /* Closed: parked off-canvas AND inert, so it can never intercept a click. */
        .room-stage[data-open="false"] { transform: translateX(102%); pointer-events: none; }
        .room-stage[data-open="true"]  { transform: translateX(0); pointer-events: auto; }
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
        /* The instrument surface: scrolls vertically, never clips horizontally,
           wraps long words/URLs so nothing is pushed past the right edge. */
        .room-stage-body {
          flex: 1;
          min-width: 0;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 22px 20px;
          overflow-wrap: anywhere;
          word-break: break-word;
        }
        @media (max-width: 640px) {
          .room-body[data-stage="open"] .room-left { padding-right: 0; }
        }
      `}</style>
    </div>
  );
}
