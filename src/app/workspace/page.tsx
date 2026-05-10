"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { WorkPoster, WorkStatusDot, workStateLine } from "./components";

type Project = {
  id: string;
  title: string;
  status: string;
  project_type: string | null;
  cover_image_url?: string | null;
  banner_url?: string | null;
  updated_at: string;
  license_status?: "executed" | "none";
};

type CatalogPulse = { live: number; inReview: number; drafts: number };

const STUDIO_TOOLS = [
  { label: "Profile",  hint: "Public creator identity",     href: "/workspace/profile"  },
  { label: "Settings", hint: "Account preferences and session", href: "/workspace/settings" },
];

export default function WorkspacePage() {
  // Phase 7.3 Layer 2B.2 — landing reads as a catalog orientation
  // dashboard with an explicit operational action row. Single fetch
  // against the existing creator projects endpoint; no new APIs, no
  // analytics. Fails closed on error so the page always renders.
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [failed, setFailed]     = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res  = await fetch("/api/creators/projects");
        const data = await res.json();
        if (!alive) return;
        if (!res.ok) { setFailed(true); return; }
        const rows: Project[] = (data.projects ?? []).filter(
          (p: Project) => p.status !== "archived"
        );
        setProjects(rows);
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => { alive = false; };
  }, []);

  const pulse: CatalogPulse | null = projects
    ? {
        live:     projects.filter((p) => p.status === "live").length,
        inReview: projects.filter((p) => p.status === "pending" || p.status === "in_review").length,
        drafts:   projects.filter((p) => p.status === "draft").length,
      }
    : null;

  const totalShown = projects?.length ?? 0;
  const isEmpty    = projects !== null && totalShown === 0;

  // Pick the most actionable next move. Priority mirrors the lifecycle's
  // creator-side urgency: license signing > continuing a draft > media
  // packaging on a live work. Falls through silently when nothing is
  // pressing.
  const nextHint = (() => {
    if (!projects) return null;
    const needsLicense = projects.find(
      (p) => p.status === "approved" && p.license_status !== "executed"
    );
    if (needsLicense) {
      return {
        label: `Sign license for ${needsLicense.title}`,
        href:  `/license/${needsLicense.id}`,
      };
    }
    const draft = projects.find((p) => p.status === "draft");
    if (draft) {
      return {
        label: `Continue draft ${draft.title}`,
        href:  `/workspace/projects/${draft.id}/edit`,
      };
    }
    const live = projects.find((p) => p.status === "live");
    if (live) {
      return {
        label: `Manage media for ${live.title}`,
        href:  `/workspace/projects/${live.id}/media`,
      };
    }
    return null;
  })();

  // Recent works — already sorted by updated_at desc on the API. Cap at
  // four for the strip. Hidden states (archived) already filtered.
  const recent = projects?.slice(0, 4) ?? [];

  return (
    <div className="space-y-12 pb-12">
      {/* Header */}
      <header>
        <h1
          className="font-bold text-3xl text-white tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Creator Studio
        </h1>
        <p className="text-ink-faint text-sm mt-2">
          Your catalog and distribution room.
        </p>
      </header>

      {/* Catalog pulse — three large numerics. Restrained type, generous
          spacing; no chart, no badge. Bordered top/bottom to read as a
          studio status readout, not a card. */}
      <section
        aria-label="Catalog pulse"
        className="grid grid-cols-3 gap-x-6 gap-y-4 border-y border-white/8 py-8"
      >
        <PulseStat label="LIVE"      value={pulse?.live} />
        <PulseStat label="IN REVIEW" value={pulse?.inReview} />
        <PulseStat label="DRAFTS"    value={pulse?.drafts} />
      </section>

      {/* Primary action row — operational center of the studio.
          New Work is the accent action; Manage Works and Media Library
          are clearly visible secondaries. These three replace the old
          equal-tile grid as the durable navigation spine. */}
      <section aria-label="Studio actions" className="space-y-4">
        <div className="flex flex-wrap items-stretch gap-3">
          <Link
            href="/workspace/projects/new"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-black font-semibold text-sm transition-all active:scale-95 shrink-0"
            style={{ background: "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)" }}
          >
            + New Work
          </Link>
          <Link
            href="/workspace/projects"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl border border-white/15 bg-white/[0.03] text-white font-semibold text-sm transition hover:bg-white/[0.06] hover:border-white/25"
          >
            Manage Works
          </Link>
          <Link
            href="/workspace/media"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl border border-white/15 bg-white/[0.03] text-white font-semibold text-sm transition hover:bg-white/[0.06] hover:border-white/25"
          >
            Media Library
          </Link>
        </div>

        {/* Next action line — single restrained sentence sitting under
            the action row as a soft recommendation. Hidden when nothing
            is actionable. */}
        {nextHint && (
          <Link
            href={nextHint.href}
            className="inline-flex items-baseline gap-2 text-sm text-white/85 hover:text-white transition group"
          >
            <span className="text-ink-muted text-[11px] uppercase tracking-[0.18em]">Next</span>
            <span className="text-ink-faint">·</span>
            <span className="font-medium">{nextHint.label}</span>
            <span className="text-ink-faint group-hover:translate-x-0.5 transition">→</span>
          </Link>
        )}
      </section>

      {/* Recent works strip — same poster-led visual language as My
          Works, scaled compact. Hidden when the catalog is empty. */}
      {recent.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <h2
              className="text-white text-lg font-semibold tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Recent works
            </h2>
            <Link
              href="/workspace/projects"
              className="text-xs text-ink-faint hover:text-white transition"
            >
              View all →
            </Link>
          </div>

          <div
            className="grid gap-x-5 gap-y-6"
            style={{
              gridTemplateColumns:
                "repeat(auto-fill, minmax(min(100%, 200px), 240px))",
            }}
          >
            {recent.map((p) => (
              <RecentWorkTile key={p.id} project={p} />
            ))}
          </div>
        </section>
      )}

      {/* Empty catalog — strong copy invitation. Pulse above still shows
          zeros so creators see the system is responsive. */}
      {isEmpty && !failed && (
        <section className="border-y border-white/8 py-14">
          <p
            className="text-white text-2xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Your catalog is empty.
          </p>
          <p className="text-ink-faint text-sm mt-2 max-w-md">
            Submit your first work to begin distribution.
          </p>
          <Link
            href="/workspace/projects/new"
            className="inline-block mt-5 px-5 py-2.5 rounded-xl text-black font-semibold text-sm transition-all active:scale-95"
            style={{ background: "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)" }}
          >
            New Work
          </Link>
        </section>
      )}

      {/* Studio tools — Profile + Settings as discoverable, restrained
          text cards. Quieter than the primary action row, more obvious
          than tiny footer links. Media Library lives in the action row,
          not here. */}
      <section aria-label="Studio tools" className="pt-2">
        <p className="text-[11px] uppercase tracking-[0.18em] text-ink-muted mb-3">
          Studio tools
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
          {STUDIO_TOOLS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="group flex items-baseline justify-between gap-3 px-4 py-3 rounded-lg border border-white/8 bg-white/[0.02] hover:border-white/20 transition"
            >
              <div className="min-w-0">
                <p className="text-sm text-white font-medium">{t.label}</p>
                <p className="text-[11px] text-ink-muted mt-0.5">{t.hint}</p>
              </div>
              <span className="text-ink-muted group-hover:text-white/70 transition shrink-0">→</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function PulseStat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">{label}</span>
      <span
        className="text-white text-4xl md:text-5xl font-semibold tabular-nums leading-none"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {value ?? "—"}
      </span>
    </div>
  );
}

function RecentWorkTile({ project }: { project: Project }) {
  return (
    <Link
      href={`/workspace/projects/${project.id}/edit`}
      className="group flex flex-col gap-2 outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded-lg"
    >
      <WorkPoster
        title={project.title}
        projectType={project.project_type}
        coverUrl={project.cover_image_url}
        bannerUrl={project.banner_url}
        status={project.status}
        licenseStatus={project.license_status}
        className="group-hover:brightness-110"
      />
      <div className="space-y-1">
        <p className="text-white text-sm font-medium leading-snug line-clamp-2">
          {project.title}
        </p>
        <p className="text-[11px] text-ink-faint flex items-center gap-1.5">
          <WorkStatusDot status={project.status} licenseStatus={project.license_status} />
          <span className="truncate">{workStateLine(project.status, project.license_status)}</span>
        </p>
      </div>
    </Link>
  );
}
