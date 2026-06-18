"use client";

// Phase 11C — Studio Desk (the per-world landing).
//
// The creator meets their world as a ShangoMaji Title coming to life: the
// Title-in-the-Making leads (key art / title treatment + premise + release-
// facing presentation state). Standing and the next move sit beneath, never
// dominating. Rooms (World, Release) shape it; the Dossier records it.
// Pure presentation over the existing GET /api/creators/projects row. No backend.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { workStateLine } from "../../components";
import {
  type DossierWork,
  NextMove,
  EditorialReview,
  DistributionRecord,
  TrustPosture,
  releaseReady,
  isStr,
  SIGNAL,
} from "../../dossier";

function RoomCard({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <Link
      href={href}
      className="group block rounded-xl border p-5 transition"
      style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.02)" }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-white font-semibold" style={{ fontFamily: "var(--font-display)" }}>{title}</p>
        <span className="text-white/25 group-hover:text-white/60 transition">→</span>
      </div>
      <p className="text-sm mt-1.5 leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>{body}</p>
    </Link>
  );
}

export default function StudioDeskPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [work, setWork] = useState<DossierWork | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "notfound" | "error">("loading");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/creators/projects");
        const data = await res.json();
        if (!alive) return;
        if (!res.ok) { setState("error"); return; }
        const found = (data.projects ?? []).find((p: DossierWork) => p.id === id) ?? null;
        if (!found) { setState("notfound"); return; }
        setWork(found);
        setState("ready");
      } catch {
        if (alive) setState("error");
      }
    })();
    return () => { alive = false; };
  }, [id]);

  if (state === "loading") {
    return <p className="text-sm py-10" style={{ color: "rgba(255,255,255,0.4)" }}>Opening your title…</p>;
  }
  if (state === "notfound" || state === "error" || !work) {
    return (
      <div className="py-10 space-y-3">
        <p className="text-white text-lg" style={{ fontFamily: "var(--font-display)" }}>
          {state === "notfound" ? "That title isn’t in your studio." : "Your title could not be loaded."}
        </p>
        <Link href="/workspace" className="text-sm" style={{ color: SIGNAL }}>← Back to your studio</Link>
      </div>
    );
  }

  const p = work;
  const keyArt = isStr(p.banner_url) ? (p.banner_url as string) : isStr(p.cover_image_url) ? (p.cover_image_url as string) : null;
  const release = releaseReady(p);
  const isLive = p.status === "live";
  const releaseHref = `/workspace/projects/${p.id}/media`;
  const worldHref = `/workspace/projects/${p.id}/edit`;
  const dossierHref = `/workspace/projects/${p.id}/dossier`;

  // Release-facing presentation state — how the title currently presents.
  const presentationState = isLive
    ? workStateLine(p.status, p.license_status, p.public_visibility)
    : `${release.ready} of ${release.total} release assets ready`;

  return (
    <div className="space-y-12 pb-14">
      <Link href="/workspace" className="text-xs transition" style={{ color: "rgba(255,255,255,0.45)" }}>
        ← Studio
      </Link>

      {/* ── Title-in-the-Making — the creator meets their world ── */}
      <section
        className="relative overflow-hidden rounded-2xl border"
        style={{
          borderColor: "rgba(217,38,28,0.24)",
          background:
            "linear-gradient(135deg, rgba(200,10,46,0.14) 0%, rgba(17,17,17,0.55) 46%, rgba(234,115,27,0.08) 100%)",
        }}
      >
        {keyArt && (
          <div className="relative w-full" style={{ aspectRatio: "16 / 6" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={keyArt} alt={p.title} className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(8,5,6,0.15) 0%, rgba(8,5,6,0.85) 100%)" }} />
          </div>
        )}

        <div className={`relative p-7 md:p-10 ${keyArt ? "-mt-20" : ""}`}>
          <p className="text-[11px] uppercase tracking-[0.28em] mb-3" style={{ color: "#F6A31A" }}>
            ShangoMaji Title · in the making
          </p>
          {isStr(p.project_type) && (
            <p className="text-[11px] uppercase tracking-[0.18em] mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>
              {p.project_type}
            </p>
          )}
          <h1
            className="text-white font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)", fontSize: "clamp(34px, 6vw, 64px)", lineHeight: 1.02 }}
          >
            {p.title}
          </h1>

          {isStr(p.logline) && (
            <p className="text-base md:text-lg italic mt-3 max-w-2xl" style={{ color: "rgba(255,255,255,0.78)", fontFamily: "var(--font-display)" }}>
              {(p.logline as string).trim()}
            </p>
          )}
          {isStr(p.description) && (
            <p className="text-sm leading-relaxed mt-3 max-w-2xl line-clamp-3" style={{ color: "rgba(255,255,255,0.6)" }}>
              {(p.description as string).trim()}
            </p>
          )}

          {/* Standing + presentation state — present, but supporting. */}
          <div className="flex items-center gap-2 flex-wrap mt-5 text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
            <span>{workStateLine(p.status, p.license_status, p.public_visibility)}</span>
            <span className="text-white/20">·</span>
            <span>{presentationState}</span>
          </div>

          {/* The one next move. */}
          <div className="mt-5">
            <NextMove p={p} />
          </div>
        </div>
      </section>

      {/* ── Rooms — shape your title ── */}
      <section className="space-y-4">
        <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: "rgba(255,255,255,0.4)" }}>
          Rooms
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <RoomCard href={worldHref} title="World Room" body="Shape identity, premise, thesis, and creative substance." />
          <RoomCard href={releaseHref} title="Release Room" body="Prepare how your title presents — key art, gallery, and trailer." />
          <RoomCard href={dossierHref} title="Dossier" body="The compiled record of your world. Read-only." />
        </div>
      </section>

      {/* ── Rights & provenance — trust posture ── */}
      <TrustPosture p={p} />

      {/* ── Editorial & distribution (minimum, read-only) ── */}
      <EditorialReview p={p} />
      <DistributionRecord p={p} />
    </div>
  );
}
