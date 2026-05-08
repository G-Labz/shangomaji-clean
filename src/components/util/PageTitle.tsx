"use client";

// Phase 5 — Per-page browser-tab title for client components.
//
// The root layout exports a static `metadata.title` template. Client pages
// cannot export Next.js metadata, so we set `document.title` from a small
// effect. The result matches the same `[PAGE] · ShangoMaji` pattern the
// server template would produce.
//
// Usage:
//   <PageTitle title="Browse" />
//   <PageTitle title={`${creatorName}`} />          // → "Creator · ShangoMaji"
//   <PageTitle title="ShangoMaji" raw />            // → exact "ShangoMaji"
//
// Always renders null. Side-effect only.

import { useEffect } from "react";

const SUFFIX = " · ShangoMaji";

export function PageTitle({ title, raw }: { title: string; raw?: boolean }) {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const t = (title || "").trim();
    if (!t) return;
    document.title = raw || t === "ShangoMaji" ? t : `${t}${SUFFIX}`;
  }, [title, raw]);
  return null;
}
