"use client";

// Phase 11A-R3-1 — World Dossier (the per-world working surface).
//
// The world shown as a persistent creative record: identity, premise, thesis &
// fit, materials, rights & provenance, distribution, and permanent record —
// with one warm next move. The world substance dominates; status supports.
// Pure presentation over the existing GET /api/creators/projects row + shared
// dossier module. No new APIs, no lifecycle. Editorial review is creator-safe
// only (in-review state + state_history reason); raw admin review_* never render.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { WorkPoster, workStateLine } from "../../components";
import {
  type DossierWork,
  WorldIdentity,
  Premise,
  MaterialsBlock,
  ReadinessSummary,
  StageRail,
  NextMove,
  ThesisFit,
  RightsProvenance,
  EditorialReview,
  DistributionRecord,
  PermanentRecord,
  Facing,
  railFor,
  SIGNAL,
} from "../../dossier";

export default function WorldDossierPage() {
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
    return <p className="text-sm py-10" style={{ color: "rgba(255,255,255,0.4)" }}>Opening the dossier…</p>;
  }
  if (state === "notfound" || state === "error" || !work) {
    return (
      <div className="py-10 space-y-3">
        <p className="text-white text-lg" style={{ fontFamily: "var(--font-display)" }}>
          {state === "notfound" ? "That world isn’t in your studio." : "The dossier could not be loaded."}
        </p>
        <Link href="/workspace" className="text-sm" style={{ color: SIGNAL }}>← Back to your studio</Link>
      </div>
    );
  }

  const p = work;
  const rail = railFor(p);
  const isDraft = p.status === "draft";
  const isLicensed = p.license_status === "executed";

  return (
    <div className="space-y-12 pb-14">
      <Link href="/workspace" className="text-xs transition" style={{ color: "rgba(255,255,255,0.45)" }}>
        ← Studio
      </Link>

      {/* 1–2. World Identity + Premise — the substance dominates. */}
      <section className="grid gap-6 sm:grid-cols-[140px_1fr] items-start">
        <div className="w-full max-w-[140px]">
          <WorkPoster
            title={p.title}
            projectType={p.project_type}
            coverUrl={p.cover_image_url}
            bannerUrl={p.banner_url}
            status={p.status}
            licenseStatus={p.license_status}
            publicVisibility={p.public_visibility}
          />
        </div>
        <div className="space-y-3">
          <WorldIdentity p={p} />
          <Facing kind="public" />
          {isLicensed && (
            <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
              Core details are locked under your distribution license.
            </p>
          )}
        </div>
      </section>

      <Premise p={p} />

      {/* 3. Thesis & Fit — first-class internal section. */}
      <ThesisFit p={p} />

      {/* 4. Current move / honest state — prominent, but supporting; never the headline. */}
      <section className="space-y-3 border-y py-6" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
          {workStateLine(p.status, p.license_status, p.public_visibility)}
        </p>
        <StageRail active={rail.active} held={rail.held} terminal={rail.terminal} />
        <NextMove p={p} />
        {isDraft && <div className="pt-2"><ReadinessSummary p={p} /></div>}
      </section>

      {/* 6. Editorial review — elevated here when the world is in review or has a decision. */}
      <EditorialReview p={p} />

      {/* 5. Creative Materials — how the world presents. */}
      <MaterialsBlock p={p} />

      {/* 7. Rights & Provenance — the world's trust record. */}
      <RightsProvenance p={p} />

      {/* 8. Distribution record. */}
      <DistributionRecord p={p} />

      {/* 9. Permanent record — what stands. */}
      <PermanentRecord p={p} />
    </div>
  );
}
