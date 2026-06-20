"use client";

// Phase 11A-R2-1 — Creator Studio Desk (front door at /workspace).
//
// The default, always-present studio: studio identity, one world in focus as a
// dossier (creative substance, not a status line or card), the single next
// move, a restrained shelf of other worlds, and label context. A prepared
// waiting desk when no world exists. Pure presentation over the existing
// GET /api/creators/projects row + shared dossier module. No new backend.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { WorkPoster, workStateLine, GradientButton } from "./components";
import {
  type DossierWork,
  StudioHeader,
  LabelContext,
  NextMove,
  ShelfRow,
  WorldIdentity,
  creatorNextMove,
  readinessSummary,
  SIGNAL,
} from "./dossier";

const PATH = ["Draft", "Submitted", "In review", "Approved", "Signed", "Public"];
const PREPARE = [
  "Thesis declaration",
  "Rights attestation",
  "Collaborator disclosure",
  "AI disclosure",
  "Prior distribution",
  "License awareness",
];

export default function StudioDeskPage() {
  const [projects, setProjects] = useState<DossierWork[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/creators/projects");
        const data = await res.json();
        if (!alive) return;
        if (!res.ok) { setFailed(true); return; }
        const rows: DossierWork[] = (data.projects ?? []).filter((p: DossierWork) => p.status !== "archived");
        setProjects(rows);
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => { alive = false; };
  }, []);

  // One world in focus: prefer a world whose move is the creator's; otherwise
  // the most recently updated (the API already sorts updated_at desc).
  const focus = useMemo(() => {
    if (!projects || projects.length === 0) return null;
    return projects.find((p) => creatorNextMove(p) !== null) ?? projects[0];
  }, [projects]);

  const others = useMemo(
    () => (projects && focus ? projects.filter((p) => p.id !== focus.id) : []),
    [projects, focus]
  );

  const loading = projects === null && !failed;
  const isEmpty = projects !== null && projects.length === 0;

  return (
    <div className="space-y-12 pb-14">
      <StudioHeader />

      {loading && (
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Opening your studio…</p>
      )}

      {failed && (
        <p className="text-sm" style={{ color: "rgba(255,120,90,0.7)" }}>Your worlds could not be loaded.</p>
      )}

      {/* ── No-world: a prepared waiting desk ── */}
      {isEmpty && (
        <>
          <section
            className="rounded-2xl border px-7 py-10 md:px-10 md:py-12 space-y-7"
            style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.015)" }}
          >
            <div className="max-w-xl space-y-2">
              <h2 className="text-white font-bold text-2xl md:text-3xl tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                Begin your first world.
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
                Your studio is ready. A world is shaped here as a living dossier, then brought to
                ShangoMaji for review, licensing, and release.
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {PATH.map((s, i) => (
                <span key={s} className="flex items-center gap-1.5">
                  <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.45)" }}>{s}</span>
                  {i < PATH.length - 1 && <span className="text-[11px] text-white/15">→</span>}
                </span>
              ))}
            </div>

            <div className="max-w-md">
              <p className="text-[11px] uppercase tracking-[0.2em] mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
                What you’ll prepare
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
                {PREPARE.map((x) => <li key={x}>{x}</li>)}
              </ul>
            </div>

            <GradientButton href="/workspace/projects/new">Begin a world →</GradientButton>
          </section>

          <LabelContext />
        </>
      )}

      {/* ── World in focus: the dossier centerpiece ── */}
      {focus && (
        <section className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-[160px_1fr] items-start">
            <Link href={`/workspace/projects/${focus.id}`} className="block w-full max-w-[160px]">
              <WorkPoster
                title={focus.title}
                projectType={focus.project_type}
                coverUrl={focus.cover_image_url}
                bannerUrl={focus.banner_url}
                status={focus.status}
                licenseStatus={focus.license_status}
                publicVisibility={focus.public_visibility}
              />
            </Link>

            <div className="space-y-4">
              <WorldIdentity p={focus} />

              {focus.description && focus.description.trim() && (
                <p className="text-sm leading-relaxed line-clamp-2" style={{ color: "rgba(255,255,255,0.55)" }}>
                  {focus.description.trim()}
                </p>
              )}

              <p className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
                {workStateLine(focus.status, focus.license_status, focus.public_visibility)}
                {focus.status === "draft" && (() => {
                  const r = readinessSummary(focus);
                  return <span style={{ color: "rgba(255,255,255,0.4)" }}> · {r.done} of {r.total} ready for review</span>;
                })()}
              </p>

              <NextMove p={focus} />

              <Link href={`/workspace/projects/${focus.id}`} className="inline-block text-sm transition" style={{ color: SIGNAL }}>
                Open this world →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Studio shelf: other worlds, a restrained list (never a grid) ── */}
      {others.length > 0 && (
        <section className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.2em] mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
            Your other worlds
          </p>
          <div className="-mx-3 space-y-0.5">
            {others.map((p) => <ShelfRow key={p.id} p={p} />)}
          </div>
        </section>
      )}

      {/* ── Begin a world (secondary when worlds exist) + label context ── */}
      {focus && (
        <section className="flex flex-col gap-6">
          <Link
            href="/workspace/projects/new"
            className="inline-flex w-fit items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition"
            style={{ borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.85)", background: "rgba(255,255,255,0.03)" }}
          >
            Begin another world
          </Link>
          <LabelContext />
        </section>
      )}
    </div>
  );
}
