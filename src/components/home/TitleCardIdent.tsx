"use client";

import { useEffect, useState } from "react";

// Phase 10K-R4 — Title Card ident.
//
// A brief, premium arrival moment shown once per browser session before the
// homepage. NOT a loading screen: there is no real loading dependency, no
// audio, no countdown, no progress bar, no loading indicator of any kind. The
// ShangoMaji mark is the single authority element; only a small amount of
// controlled presentation motion is used (founder-approved): a subtle
// resolve-into-focus on the mark (opacity + a small vertical settle + blur
// clearing), then the dark ground clears to reveal the homepage. The mark is
// sized to dominate the opening frame and the beat runs ~3.5s.
//
// No scale, no spin, no particles, no excessive glow, no Forge ignition, and
// no underline/bar that could read as a loader.
//
// Colors are the exact ShangoMaji Ember Spectrum v1 brand-kit values.
const SESSION_KEY = "sm:ident:v1";

// Timeline — a deliberate arrival beat (~3.5s total), not a blink.
const REVEAL_MS = 900; // subtle resolve-in of the mark
const HOLD_MS = 2000; // static authority hold — the arrival beat
const CLEAR_MS = 600; // ground fade-out into the homepage

// ShangoMaji Ember Spectrum v1 (exact brand-kit values).
const VOID_BLACK = "#000000"; // foundation / cinematic stage
const CHARCOAL = "#111111"; // secondary dark surface
const EASE = "cubic-bezier(0.25,0.46,0.45,0.94)";

export function TitleCardIdent() {
  const [show, setShow] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [reduced, setReduced] = useState(false);

  // Decide on the client only — the server (and the first client render)
  // render nothing, so there is no hydration mismatch and no SSR flash.
  //
  // NOTE: under React StrictMode (dev) effects double-invoke; this gate is
  // correct in production (single invoke), where the ident shows exactly once
  // per browser session.
  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(SESSION_KEY) === "1";
      if (!seen) sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      seen = false; // storage unavailable (e.g. private mode) — show this load
    }
    if (seen) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      !!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    setReduced(prefersReduced);
    setShow(true);
  }, []);

  // Drive the timeline once the ident is shown.
  useEffect(() => {
    if (!show) return;

    if (reduced) {
      // Accessibility: no entrance motion. Static mark held for the full
      // arrival length, then an instant clear (no transitions).
      const STATIC_HOLD = REVEAL_MS + HOLD_MS;
      const tClear = setTimeout(() => setClearing(true), STATIC_HOLD);
      const tUnmount = setTimeout(() => setShow(false), STATIC_HOLD + 20);
      return () => {
        clearTimeout(tClear);
        clearTimeout(tUnmount);
      };
    }

    // Resolve the mark in on the next frame so the initial (blurred, offset,
    // transparent) state paints first and the transition actually runs.
    const raf = requestAnimationFrame(() => setRevealed(true));
    const tClear = setTimeout(() => setClearing(true), REVEAL_MS + HOLD_MS);
    const tUnmount = setTimeout(
      () => setShow(false),
      REVEAL_MS + HOLD_MS + CLEAR_MS + 40
    );
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(tClear);
      clearTimeout(tUnmount);
    };
  }, [show, reduced]);

  if (!show) return null;

  const settled = reduced || revealed;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100, // above the fixed TopNav (z-50)
        background: VOID_BLACK,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        // The ground clearing is the only "exit" motion.
        opacity: clearing ? 0 : 1,
        transition: reduced ? "none" : `opacity ${CLEAR_MS}ms ease`,
        pointerEvents: clearing ? "none" : "auto",
      }}
    >
      {/* Disciplined charcoal vignette — dark field as the stage. No bloom
          stack (brand kit §07 forbids extra glows). */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: `radial-gradient(60% 60% at 50% 50%, ${CHARCOAL} 0%, ${VOID_BLACK} 78%)`,
          opacity: 0.6,
        }}
      />

      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          // Subtle resolve-into-focus on the MARK — opacity + a small vertical
          // settle + blur clearing. No scale, no spin, no swoop, no glow.
          opacity: settled ? 1 : 0,
          transform: settled ? "translateY(0)" : "translateY(14px)",
          filter: settled ? "blur(0px)" : "blur(8px)",
          transition: reduced
            ? "none"
            : `opacity ${REVEAL_MS}ms ${EASE}, transform ${REVEAL_MS}ms ${EASE}, filter ${REVEAL_MS}ms ${EASE}`,
        }}
      >
        {/* The ShangoMaji mark — the single authority element of the title
            card. Static asset that carries the official ember gradient. Sized
            to dominate the opening frame (≈1.5x the prior pass) while staying
            inside the viewport on any aspect ratio. No underline / signal bar. */}
        <div style={{ width: "min(90vw, 117vh, 1100px)", aspectRatio: "3 / 2" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt=""
            width={1536}
            height={1024}
            decoding="sync"
            loading="eager"
            style={{ display: "block", width: "100%", height: "100%", objectFit: "contain" }}
          />
        </div>
      </div>
    </div>
  );
}
