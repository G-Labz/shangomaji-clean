"use client";

// Phase 11D-R2 — Release Room (assemble through the preview).
//
// The preview IS the workspace: every asset is edited inline in its
// presentation position — hero banner, key art, trailer action, and the
// release gallery. No upload-wall cards, no slot grids. Reuses the existing
// upload + PUT endpoints and the same server-enforced media whitelist
// (cover/banner/stills/trailer/deliverables). No backend, no media editing.
//
// State rules (mirror the server gate in /api/creators/projects PUT):
//   draft           → redirected to the World Room (assets are shaped there)
//   approved | live  → editable release; core identity locked
//   all else         → read-only "locked" notice with the reason

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, Lock, ChevronLeft, ChevronRight, Star, Plus } from "lucide-react";
import { Card, GradientButton, StatusBadge } from "../../../components";

interface PageProps {
  params: { id: string };
}

const SIGNAL = "#E0763A";

type LoadedProject = {
  id: string;
  title: string;
  status: string;
  logline?: string | null;
  cover_image_url: string | null;
  banner_url: string | null;
  trailer_url: string | null;
  stills_urls: string[] | null;
  deliverables: string[] | null;
  license_status?: "executed" | "none";
};

type MediaDraft = {
  thumbUrl: string;
  bannerUrl: string;
  trailerUrl: string;
  stillsUrls: string[];
  deliverables: string[];
};

const emptyDraft: MediaDraft = { thumbUrl: "", bannerUrl: "", trailerUrl: "", stillsUrls: [], deliverables: [] };

export default function ReleaseRoomPage({ params }: PageProps) {
  const { id } = params;
  const router = useRouter();

  const [project, setProject] = useState<LoadedProject | null>(null);
  const [draft, setDraft] = useState<MediaDraft>(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/creators/projects");
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Could not load title");
        const found: LoadedProject | undefined = (data.projects ?? []).find((p: LoadedProject) => p.id === id);
        if (!found) { setError("Title not found."); setLoading(false); return; }
        setProject(found);
        setDraft({
          thumbUrl: found.cover_image_url || "",
          bannerUrl: found.banner_url || "",
          trailerUrl: found.trailer_url || "",
          stillsUrls: found.stills_urls || [],
          deliverables: found.deliverables || [],
        });
      } catch (err: any) {
        setError(err.message || "Could not load title");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  useEffect(() => {
    if (!loading && project && project.status === "draft") {
      router.replace(`/workspace/projects/${id}/edit`);
    }
  }, [loading, project, id, router]);

  function showFeedback(msg: string) { setFeedback(msg); setTimeout(() => setFeedback(""), 2500); }
  function showError(msg: string) { setError(msg); setTimeout(() => setError(""), 3500); }

  async function uploadFile(file: File, assetType: string): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("assetType", assetType);
    setUploading((u) => ({ ...u, [assetType]: true }));
    try {
      const res = await fetch("/api/creators/upload/asset", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Upload failed");
      return data.url as string;
    } finally {
      setUploading((u) => ({ ...u, [assetType]: false }));
    }
  }

  function moveStill(i: number, dir: "left" | "right") {
    setDraft((d) => {
      const arr = [...d.stillsUrls];
      const j = dir === "left" ? i - 1 : i + 1;
      if (j < 0 || j >= arr.length) return d;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...d, stillsUrls: arr };
    });
  }

  async function saveRelease() {
    if (!project) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/creators/projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          cover_image_url: draft.thumbUrl.trim() || null,
          banner_url: draft.bannerUrl.trim() || null,
          trailer_url: draft.trailerUrl.trim() || null,
          stills_urls: draft.stillsUrls,
          deliverables: draft.deliverables, // preserved as-is
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save failed");
      setSaved(true);
      showFeedback("Release updated.");
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      showError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="animate-spin text-ink-faint" size={20} />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="space-y-4 pb-10">
        <Link href="/workspace" className="text-ink-faint text-sm hover:text-white inline-flex items-center gap-1.5">
          <ArrowLeft size={14} /> Studio
        </Link>
        <Card><p className="text-sm text-red-300/80">{error || "Title not found."}</p></Card>
      </div>
    );
  }

  const deskHref = `/workspace/projects/${id}`;
  const allowed = new Set(["approved", "live"]);
  if (!allowed.has(project.status)) {
    return (
      <div className="space-y-4 pb-10">
        <Link href={deskHref} className="text-ink-faint text-sm hover:text-white inline-flex items-center gap-1.5">
          <ArrowLeft size={14} /> Studio Desk
        </Link>
        <Card className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-white font-semibold text-base">{project.title}</p>
            <StatusBadge status={project.status} />
          </div>
          <p className="text-sm text-ink-muted leading-relaxed inline-flex items-start gap-1.5">
            <Lock size={13} className="mt-[2px] shrink-0 opacity-70" aria-hidden="true" />
            <span>The Release Room opens after your title is approved. Until then, shape it in the World Room.</span>
          </p>
        </Card>
      </div>
    );
  }

  const isLive = project.status === "live";
  const licenseExecuted = project.license_status === "executed";
  const trailer = draft.trailerUrl.trim();

  // "What ships" — derived from the assets actually present (not a checklist).
  const ships: string[] = [];
  if (draft.thumbUrl.trim()) ships.push("Key art");
  if (draft.bannerUrl.trim()) ships.push("Hero");
  if (trailer) ships.push("Trailer");
  if (draft.stillsUrls.length) ships.push(`${draft.stillsUrls.length} still${draft.stillsUrls.length === 1 ? "" : "s"}`);

  return (
    <div className="space-y-7 pb-10">
      <div>
        <Link href={deskHref} className="text-ink-faint text-sm hover:text-white inline-flex items-center gap-1.5 mb-3">
          <ArrowLeft size={14} /> Studio Desk
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="font-bold text-2xl text-white tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            Release Room
          </h1>
          <StatusBadge status={project.status} />
        </div>
        <p className="text-ink-faint text-sm mt-1">Assemble how {project.title} presents under the ShangoMaji label.</p>
      </div>

      {feedback && (
        <div style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)", fontSize: 13, color: "rgba(52,211,153,0.9)" }}>{feedback}</div>
      )}
      {error && (
        <div style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.25)", fontSize: 13, color: "rgba(252,165,165,0.9)" }}>{error}</div>
      )}

      {/* ── The release — assembled directly in the preview ── */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ borderColor: "rgba(217,38,28,0.22)", background: "linear-gradient(135deg, rgba(200,10,46,0.12) 0%, rgba(17,17,17,0.6) 50%, rgba(234,115,27,0.07) 100%)" }}
      >
        {/* Hero band — edited in place */}
        <div className="relative w-full" style={{ aspectRatio: "16 / 6", background: "rgba(0,0,0,0.4)" }}>
          {draft.bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={draft.bannerUrl} alt="Hero" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[12px]" style={{ color: "rgba(255,255,255,0.4)" }}>The hero banner appears here</span>
            </div>
          )}
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(8,5,6,0.15) 0%, rgba(8,5,6,0.65) 100%)" }} />
          <div className="absolute top-2 right-2">
            <InlineUpload
              label={draft.bannerUrl ? "Replace hero" : "Add hero"}
              busy={uploading.banner}
              onFile={async (f) => { try { const url = await uploadFile(f, "banner"); setDraft((d) => ({ ...d, bannerUrl: url })); } catch (e: any) { showError(e.message || "Upload failed"); } }}
            />
          </div>
        </div>

        <div className="grid gap-5 p-6 sm:grid-cols-[150px_1fr] items-start -mt-10 relative">
          {/* Key art position */}
          <div className="w-full max-w-[150px] space-y-2">
            <div className="relative aspect-[2/3] w-full rounded-lg overflow-hidden border" style={{ borderColor: "rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.5)" }}>
              {draft.thumbUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={draft.thumbUrl} alt={project.title} className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center p-3 text-center">
                  <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>Key art appears here</span>
                </div>
              )}
            </div>
            <InlineUpload
              label={draft.thumbUrl ? "Replace key art" : "Add key art"}
              busy={uploading.poster}
              onFile={async (f) => { try { const url = await uploadFile(f, "poster"); setDraft((d) => ({ ...d, thumbUrl: url })); } catch (e: any) { showError(e.message || "Upload failed"); } }}
            />
          </div>

          {/* Title presentation */}
          <div className="space-y-3 pt-10">
            <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: "#F6A31A" }}>ShangoMaji Title</p>
            <h2 className="text-white font-bold tracking-tight" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(24px, 4vw, 40px)", lineHeight: 1.05 }}>
              {project.title}
            </h2>
            {project.logline && project.logline.trim() && (
              <p className="text-sm italic max-w-xl" style={{ color: "rgba(255,255,255,0.72)", fontFamily: "var(--font-display)" }}>
                {project.logline.trim()}
              </p>
            )}
            {/* Trailer action — edited in place */}
            <div className="space-y-2 pt-1">
              {trailer ? (
                <a href={trailer} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-lg text-black" style={{ background: SIGNAL }}>
                  ▷ Watch trailer
                </a>
              ) : (
                <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>The Watch-trailer action appears once you add a link.</p>
              )}
              <input
                value={draft.trailerUrl}
                onChange={(e) => setDraft((d) => ({ ...d, trailerUrl: e.target.value }))}
                placeholder="Trailer link (https://…)"
                className="w-full max-w-md rounded-lg px-3 py-2 text-[13px] text-white outline-none"
                style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.12)" }}
              />
            </div>
          </div>
        </div>

        {/* Release gallery — assembled in place */}
        <div className="px-6 pb-6 space-y-3">
          <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: "rgba(255,255,255,0.45)" }}>Release gallery</p>
          <div className="flex gap-3 flex-wrap">
            {draft.stillsUrls.map((url, i) => (
              <div key={`${url}-${i}`} className="relative h-24 w-40 rounded-lg overflow-hidden border flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 p-1" style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.75), transparent)" }}>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => moveStill(i, "left")} disabled={i === 0} className="p-1 rounded bg-black/50 text-white disabled:opacity-30 hover:bg-black/70" aria-label="Move left"><ChevronLeft size={12} /></button>
                    <button type="button" onClick={() => moveStill(i, "right")} disabled={i === draft.stillsUrls.length - 1} className="p-1 rounded bg-black/50 text-white disabled:opacity-30 hover:bg-black/70" aria-label="Move right"><ChevronRight size={12} /></button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => { setDraft((d) => ({ ...d, thumbUrl: url })); showFeedback("Set as key art. Save to apply."); }} className="p-1 rounded bg-black/50 text-white hover:bg-black/70" aria-label="Set as key art" title="Set as key art"><Star size={11} /></button>
                    <button type="button" onClick={() => setDraft((d) => ({ ...d, stillsUrls: d.stillsUrls.filter((_, idx) => idx !== i) }))} className="px-1.5 py-0.5 rounded bg-black/50 text-white text-[10px] hover:bg-black/70">Remove</button>
                  </div>
                </div>
              </div>
            ))}
            {/* Add-still position */}
            <label
              className={`h-24 w-40 rounded-lg border border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer flex-shrink-0 transition ${uploading.still ? "opacity-60 cursor-not-allowed" : "hover:border-white/30"}`}
              style={{ borderColor: "rgba(255,255,255,0.18)", color: "rgba(255,255,255,0.5)" }}
            >
              {uploading.still ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              <span className="text-[11px]">{draft.stillsUrls.length ? "Add still" : "Add your first still"}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                disabled={uploading.still}
                className="sr-only"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  try { const url = await uploadFile(f, "still"); setDraft((d) => ({ ...d, stillsUrls: [...d.stillsUrls, url] })); }
                  catch (err: any) { showError(err.message || "Upload failed"); }
                }}
              />
            </label>
          </div>
        </div>
      </div>

      {/* What ships — derived, not a checklist */}
      <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
        {ships.length ? <>Ships with · {ships.join(" · ")}</> : "Add key art to begin assembling your release."}
      </p>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-[11px] text-ink-muted leading-relaxed max-w-md inline-flex items-start gap-1.5">
          <Lock size={12} className="mt-[2px] shrink-0 opacity-70" aria-hidden="true" />
          <span>
            {isLive
              ? "Your title is live. The release stays updatable; core identity (title, logline, synopsis, rights, license terms) is locked under the license."
              : licenseExecuted
              ? "The release is yours to refine. Core identity is locked under your executed license; ShangoMaji activates distribution after review."
              : "The release is yours to refine. Core identity is locked. Media is required for activation."}
          </span>
        </p>
        <GradientButton onClick={saveRelease} disabled={saving}>
          {saving ? (<><Loader2 size={14} className="animate-spin" /> Saving…</>) : saved ? "Saved" : (<><Save size={14} /> Save release</>)}
        </GradientButton>
      </div>
    </div>
  );
}

// Compact in-position upload control (reuses the asset upload endpoint).
function InlineUpload({ label, busy, onFile }: { label: string; busy?: boolean; onFile: (f: File) => void | Promise<void> }) {
  return (
    <label
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium cursor-pointer transition ${busy ? "opacity-60 cursor-not-allowed" : "hover:bg-white/10"}`}
      style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.18)", color: "white" }}
    >
      {busy ? <Loader2 size={12} className="animate-spin" /> : null}
      {label}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        disabled={busy}
        className="sr-only"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) await onFile(f);
        }}
      />
    </label>
  );
}
