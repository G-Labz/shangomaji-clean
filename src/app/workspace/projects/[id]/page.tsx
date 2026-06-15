"use client";

// Phase 11A-R2-1 — World Dossier (the per-world working surface).
//
// The world shown as creative substance — identity, premise, materials,
// readiness, and condition — with one warm next move. Not a status tracker.
// Pure presentation over the existing GET /api/creators/projects row + shared
// dossier module. No new APIs, no lifecycle, read-only review.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, WorkPoster, workStateLine, ReceiptLink } from "../../components";
import {
  type DossierWork,
  WorldIdentity,
  Premise,
  MaterialsBlock,
  ReadinessSummary,
  StageRail,
  NextMove,
  railFor,
  finishingReason,
  isStr,
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
  const isApprovedUnsigned = p.status === "approved" && p.license_status !== "executed";
  const isLicensed = p.license_status === "executed";
  const isRejected = p.status === "rejected";

  const rejectionNote = isRejected
    ? [...(p.state_history ?? [])].reverse().find((h) => h.to === "rejected")?.reason ?? null
    : null;

  return (
    <div className="space-y-10 pb-14">
      <Link href="/workspace" className="text-xs transition" style={{ color: "rgba(255,255,255,0.45)" }}>
        ← Studio
      </Link>

      {/* ── Dossier header: the world as substance + the one next move ── */}
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
        <div className="space-y-5">
          <WorldIdentity p={p} />
          <div className="space-y-3">
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
              {workStateLine(p.status, p.license_status, p.public_visibility)}
            </p>
            <StageRail active={rail.active} held={rail.held} terminal={rail.terminal} />
          </div>
          <NextMove p={p} />
        </div>
      </section>

      {/* ── Premise (creative substance) ── */}
      <Premise p={p} />

      {/* ── Materials · release preparation (folded into the dossier) ── */}
      <MaterialsBlock p={p} />

      {/* ── Readiness — supporting guidance, draft only ── */}
      {isDraft && <ReadinessSummary p={p} />}

      {/* ── Editorial review (read-only) — rejected notes only ── */}
      {isRejected && (
        <Card>
          <p className="text-[11px] uppercase tracking-[0.22em] mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
            Editorial review
          </p>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>
            ShangoMaji did not move this world forward.
          </p>
          {rejectionNote ? (
            <div className="rounded-lg border mt-3 p-4" style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.02)" }}>
              <p className="text-[11px] uppercase tracking-[0.18em] mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
                Notes from ShangoMaji
              </p>
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "rgba(255,255,255,0.8)" }}>
                {rejectionNote}
              </p>
            </div>
          ) : (
            <p className="text-sm mt-2" style={{ color: "rgba(255,255,255,0.45)" }}>
              No additional notes were left. Reach out if you have questions about this decision.
            </p>
          )}
        </Card>
      )}

      {/* ── Rights & license (read-only condition) ── */}
      <Card>
        <p className="text-[11px] uppercase tracking-[0.22em] mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
          Rights & license
        </p>
        {isApprovedUnsigned ? (
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>
            Approved. Your distribution license is ready to sign — see your next move above. You keep ownership of your work.
          </p>
        ) : isLicensed ? (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>Licensed · your distribution license is executed.</p>
            {isStr(p.license_id) && <ReceiptLink licenseId={p.license_id as string} />}
          </div>
        ) : (
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
            After approval, you’ll sign a simple distribution license. You keep ownership of your work.
          </p>
        )}
      </Card>

      {/* ── Distribution (read-only condition) ── */}
      {(isLicensed || p.status === "live") && (
        <Card>
          <p className="text-[11px] uppercase tracking-[0.22em] mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
            Distribution
          </p>
          {p.status === "live" && p.public_visibility?.state === "public" ? (
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>Live and publicly visible in the ShangoMaji collection.</p>
          ) : p.status === "live" ? (
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>
              Finishing setup — not yet public. {finishingReason(p.public_visibility)} ShangoMaji curates go-live; nothing is needed from you.
            </p>
          ) : (
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>
              Licensed and awaiting activation. ShangoMaji prepares and curates the release — what arrives in the collection is chosen, not uploaded.
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
