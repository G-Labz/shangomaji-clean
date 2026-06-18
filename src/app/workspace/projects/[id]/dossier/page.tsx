"use client";

// Phase 11C — Dossier (read-only compiled record).
//
// Demoted from the landing: this is the world's compiled record, not the
// studio. It records what the Studio Desk and Rooms shape — identity, premise,
// thesis & fit, rights & provenance, editorial decision, distribution, and the
// permanent record. Read-only. No editing happens here. Pure presentation over
// the existing GET /api/creators/projects row. No backend.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { WorkPoster, workStateLine } from "../../../components";
import {
  type DossierWork,
  WorldIdentity,
  Premise,
  ThesisFit,
  RightsProvenance,
  EditorialReview,
  DistributionRecord,
  PermanentRecord,
  Facing,
  SIGNAL,
} from "../../../dossier";

export default function DossierRecordPage() {
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
    return <p className="text-sm py-10" style={{ color: "rgba(255,255,255,0.4)" }}>Compiling the record…</p>;
  }
  if (state === "notfound" || state === "error" || !work) {
    return (
      <div className="py-10 space-y-3">
        <p className="text-white text-lg" style={{ fontFamily: "var(--font-display)" }}>
          {state === "notfound" ? "That title isn’t in your studio." : "The record could not be loaded."}
        </p>
        <Link href="/workspace" className="text-sm" style={{ color: SIGNAL }}>← Back to your studio</Link>
      </div>
    );
  }

  const p = work;

  return (
    <div className="space-y-12 pb-14">
      <Link href={`/workspace/projects/${p.id}`} className="text-xs transition" style={{ color: "rgba(255,255,255,0.45)" }}>
        ← Back to the Studio Desk
      </Link>

      <header className="space-y-1.5">
        <p className="text-[11px] uppercase tracking-[0.28em]" style={{ color: SIGNAL }}>
          Dossier · compiled record
        </p>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
          The record of <span className="text-white">{p.title}</span> under the ShangoMaji label. Read-only — shape your world in the Rooms.
        </p>
      </header>

      <section className="grid gap-6 sm:grid-cols-[120px_1fr] items-start">
        <div className="w-full max-w-[120px]">
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
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
            {workStateLine(p.status, p.license_status, p.public_visibility)}
          </p>
        </div>
      </section>

      <Premise p={p} />
      <ThesisFit p={p} />
      <EditorialReview p={p} />
      <RightsProvenance p={p} />
      <DistributionRecord p={p} />
      <PermanentRecord p={p} />
    </div>
  );
}
