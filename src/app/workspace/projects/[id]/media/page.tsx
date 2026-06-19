"use client";

// Phase 11D-R4A — Release Room = Assembly Table.
//
// A bounded workspace frame (hosted by the route-aware WorkspaceShell): a fixed
// top ribbon and ONE persistent central object — the title presentation as a
// visitor will see it (hero backdrop, poster in place, trailer play surface,
// gallery strip). No left rail: the parts are spatially distinct, so they are
// engaged by DIRECT in-place click. Each click summons the same single side
// stage (right entry, ~58%, presentation stays visible/live) carrying that
// region's picker; uploading happens inside the picker — there is no standing
// upload zone. Persistence is ambient (saved on stage close via the existing
// PUT). No media-manager grid, no Save bar, no page scroll. No backend change.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Lock, ChevronLeft, ChevronRight, Star, Plus, ImagePlus } from "lucide-react";
import { StatusBadge } from "../../../components";
import { RoomLayout, STUDIO_SIGNAL } from "../../../WorkspaceShell";

interface PageProps {
  params: { id: string };
}

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

type Region = "hero" | "poster" | "trailer" | "gallery";
const REGION_TITLE: Record<Region, string> = {
  hero: "Hero — the backdrop",
  poster: "Poster — the key art",
  trailer: "Trailer — the play surface",
  gallery: "Gallery — the stills strip",
};

export default function ReleaseRoomPage({ params }: PageProps) {
  const { id } = params;
  const router = useRouter();

  const [project, setProject] = useState<LoadedProject | null>(null);
  const [draft, setDraft] = useState<MediaDraft>(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  const [activeRegion, setActiveRegion] = useState<Region>("hero");
  const [stageOpen, setStageOpen] = useState(false);

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

  // Ambient persistence — placing a part is the commit; the PUT runs silently
  // on stage close. Reuses the existing media whitelist; no Save bar.
  async function ambientSave() {
    if (!project) return;
    try {
      await fetch("/api/creators/projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          cover_image_url: draft.thumbUrl.trim() || null,
          banner_url: draft.bannerUrl.trim() || null,
          trailer_url: draft.trailerUrl.trim() || null,
          stills_urls: draft.stillsUrls,
          deliverables: draft.deliverables,
        }),
      });
    } catch (err: any) {
      showError(err.message || "Save failed");
    }
  }

  function openRegion(r: Region) { setActiveRegion(r); setStageOpen(true); }
  async function closeStage() { setStageOpen(false); await ambientSave(); }

  if (loading) {
    return <div className="flex-1 flex items-center justify-center w-full"><Loader2 className="animate-spin text-ink-faint" size={20} /></div>;
  }

  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center w-full">
        <div className="text-center">
          <p className="text-sm text-red-300/80 mb-3">{error || "Title not found."}</p>
          <Link href="/workspace" className="text-sm" style={{ color: STUDIO_SIGNAL }}>Back to Studio</Link>
        </div>
      </div>
    );
  }

  const deskHref = `/workspace/projects/${id}`;
  if (!new Set(["approved", "live"]).has(project.status)) {
    return (
      <div className="flex-1 flex items-center justify-center w-full px-6">
        <div className="max-w-md text-center space-y-3">
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <p className="text-white font-semibold text-base">{project.title}</p>
            <StatusBadge status={project.status} />
          </div>
          <p className="text-sm text-ink-muted leading-relaxed inline-flex items-start gap-1.5">
            <Lock size={13} className="mt-[2px] shrink-0 opacity-70" aria-hidden="true" />
            <span>The Release Room opens after your title is approved. Until then, shape it in the World Room.</span>
          </p>
          <Link href={deskHref} className="inline-block text-sm" style={{ color: STUDIO_SIGNAL }}>Back to Studio Desk →</Link>
        </div>
      </div>
    );
  }

  const isLive = project.status === "live";
  const licenseExecuted = project.license_status === "executed";
  const trailer = draft.trailerUrl.trim();

  const ringFor = (r: Region) =>
    activeRegion === r && stageOpen ? "0 0 0 2px rgba(224,118,58,0.7)" : undefined;

  // Readiness reading — which positions are filled vs open (not a checklist).
  const readiness: { label: string; on: boolean }[] = [
    { label: "Hero", on: !!draft.bannerUrl.trim() },
    { label: "Poster", on: !!draft.thumbUrl.trim() },
    { label: "Trailer", on: !!trailer },
    { label: draft.stillsUrls.length ? `${draft.stillsUrls.length} still${draft.stillsUrls.length === 1 ? "" : "s"}` : "Gallery", on: draft.stillsUrls.length > 0 },
  ];

  // ── Ribbon ────────────────────────────────────────────────────────────────
  const ribbon = (
    <div className="flex items-center justify-between gap-4 px-6 py-3 border-b border-white/8" style={{ background: "rgba(8,5,6,0.4)" }}>
      <div className="min-w-0 flex items-center gap-3">
        <span className="text-[11px] uppercase tracking-[0.24em] shrink-0" style={{ color: "rgba(255,255,255,0.34)" }}>Title</span>
        <h1 className="truncate font-bold text-lg text-white tracking-tight" style={{ fontFamily: "var(--font-display)" }}>{project.title}</h1>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden md:flex items-center gap-2 text-[12px]">
          {readiness.map((r) => (
            <span key={r.label} className="inline-flex items-center gap-1" style={{ color: r.on ? "#F6A31A" : "rgba(255,255,255,0.4)" }}>
              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: r.on ? "#F6A31A" : "rgba(255,255,255,0.25)" }} />
              {r.label}
            </span>
          ))}
        </div>
        <span className="hidden md:block w-px h-4" style={{ background: "rgba(255,255,255,0.12)" }} />
        <StatusBadge status={project.status} />
        {project.status === "approved" && (
          <Link href={`/license/${id}`} className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold text-black transition active:scale-95"
            style={{ background: licenseExecuted ? "rgba(255,255,255,0.85)" : STUDIO_SIGNAL }}>
            {licenseExecuted ? "View license" : "Review & sign license"}
          </Link>
        )}
      </div>
    </div>
  );

  // ── Persistent center — the title presentation ───────────────────────────
  const center = (
    <div className="px-6 py-8">
      <div className="mx-auto" style={{ maxWidth: 880 }}>
        {/* The composition — hero backdrop with poster + trailer in place */}
        <div className="rounded-2xl overflow-hidden border" style={{ borderColor: "rgba(217,38,28,0.22)" }}>
          {/* Hero region */}
          <button type="button" onClick={(e) => { e.stopPropagation(); openRegion("hero"); }}
            className="group relative block w-full text-left" style={{ aspectRatio: "16 / 8", background: "rgba(0,0,0,0.45)", boxShadow: ringFor("hero") ? `inset ${ringFor("hero")}` : undefined }}>
            {draft.bannerUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={draft.bannerUrl} alt="Hero" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: "radial-gradient(120% 90% at 50% 0%, rgba(200,10,46,0.16), rgba(234,115,27,0.05) 45%, transparent 72%)" }}>
                <span className="text-[12px]" style={{ color: "rgba(255,255,255,0.4)" }}>Click to set the hero backdrop</span>
              </div>
            )}
            <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(8,5,6,0.05) 35%, rgba(8,5,6,0.9) 100%)" }} />
            <span className="absolute top-3 left-3 text-[10px] uppercase tracking-[0.18em] opacity-0 group-hover:opacity-100 transition" style={{ color: "#F6A31A" }}>Hero</span>

            {/* Trailer play surface — its own region over the hero */}
            <span
              role="button" tabIndex={0}
              onClick={(e) => { e.stopPropagation(); openRegion("trailer"); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); openRegion("trailer"); } }}
              className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold cursor-pointer transition"
              style={{ background: trailer ? STUDIO_SIGNAL : "rgba(0,0,0,0.55)", color: trailer ? "#000" : "rgba(255,255,255,0.85)", border: trailer ? "none" : "1px solid rgba(255,255,255,0.25)", boxShadow: ringFor("trailer") }}>
              ▷ {trailer ? "Trailer" : "Add trailer"}
            </span>

            {/* Title + poster anchored in the composition */}
            <div className="absolute left-5 right-5 bottom-4 flex items-end gap-4">
              <span
                role="button" tabIndex={0}
                onClick={(e) => { e.stopPropagation(); openRegion("poster"); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); openRegion("poster"); } }}
                className="block w-[92px] shrink-0 aspect-[2/3] rounded-lg overflow-hidden border cursor-pointer"
                style={{ borderColor: "rgba(255,255,255,0.2)", background: "rgba(0,0,0,0.6)", boxShadow: ringFor("poster") || "0 14px 30px -14px rgba(0,0,0,0.9)" }}>
                {draft.thumbUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={draft.thumbUrl} alt={project.title} className="h-full w-full object-cover" />
                ) : (
                  <span className="h-full w-full flex items-center justify-center text-center text-[10px] p-1" style={{ color: "rgba(255,255,255,0.45)" }}>Poster</span>
                )}
              </span>
              <div className="min-w-0 pb-1">
                <p className="text-[10px] uppercase tracking-[0.22em] mb-1" style={{ color: "#F6A31A" }}>ShangoMaji Title</p>
                <h2 className="text-white font-bold tracking-tight" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(20px, 3vw, 34px)", lineHeight: 1.05 }}>{project.title}</h2>
                {project.logline && project.logline.trim() && (
                  <p className="text-[13px] italic mt-1 line-clamp-2" style={{ color: "rgba(255,255,255,0.72)", fontFamily: "var(--font-display)" }}>{project.logline.trim()}</p>
                )}
              </div>
            </div>
          </button>

          {/* Gallery region — stills strip along the bottom (horizontal scroll) */}
          <button type="button" onClick={(e) => { e.stopPropagation(); openRegion("gallery"); }}
            className="group block w-full text-left px-4 py-4" style={{ background: "rgba(0,0,0,0.25)", boxShadow: ringFor("gallery") ? `inset ${ringFor("gallery")}` : undefined }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: "rgba(255,255,255,0.45)" }}>Gallery</p>
              <span className="text-[11px] opacity-0 group-hover:opacity-100 transition" style={{ color: STUDIO_SIGNAL }}>Assemble →</span>
            </div>
            {draft.stillsUrls.length ? (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {draft.stillsUrls.map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={`${url}-${i}`} src={url} alt="" className="h-16 w-28 shrink-0 rounded-md object-cover border" style={{ borderColor: "rgba(255,255,255,0.12)" }} />
                ))}
              </div>
            ) : (
              <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.4)" }}>Click to add the stills visitors will browse.</p>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  // ── Side-stage picker for the active region ───────────────────────────────
  const stageContent = (
    <div className="space-y-5">
      {activeRegion === "hero" && (
        <RegionPicker label="Hero backdrop" preview={draft.bannerUrl} ratio="16/9" busy={uploading.banner}
          onFile={async (f) => { try { const url = await uploadFile(f, "banner"); setDraft((d) => ({ ...d, bannerUrl: url })); } catch (e: any) { showError(e.message || "Upload failed"); } }}
          onClear={draft.bannerUrl ? () => setDraft((d) => ({ ...d, bannerUrl: "" })) : undefined} />
      )}

      {activeRegion === "poster" && (
        <RegionPicker label="Poster / key art" preview={draft.thumbUrl} ratio="2/3" busy={uploading.poster}
          onFile={async (f) => { try { const url = await uploadFile(f, "poster"); setDraft((d) => ({ ...d, thumbUrl: url })); } catch (e: any) { showError(e.message || "Upload failed"); } }}
          onClear={draft.thumbUrl ? () => setDraft((d) => ({ ...d, thumbUrl: "" })) : undefined} />
      )}

      {activeRegion === "trailer" && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-white">Trailer reference</p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>A link, shown as a single Watch-trailer action on the title.</p>
          <input value={draft.trailerUrl} onChange={(e) => setDraft((d) => ({ ...d, trailerUrl: e.target.value }))} placeholder="https://…"
            className="w-full rounded-lg px-3 py-2.5 text-sm text-white outline-none" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.14)" }} />
          {trailer && (
            <a href={trailer} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold px-3.5 py-2 rounded-lg text-black" style={{ background: STUDIO_SIGNAL }}>▷ Preview trailer</a>
          )}
        </div>
      )}

      {activeRegion === "gallery" && (
        <div className="space-y-4">
          <p className="text-sm font-medium text-white">Stills — assemble the gallery</p>
          <div className="space-y-2">
            {draft.stillsUrls.map((url, i) => (
              <div key={`${url}-${i}`} className="flex items-center gap-3 rounded-lg border p-2" style={{ borderColor: "rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.25)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-12 w-20 rounded object-cover shrink-0" />
                <div className="flex-1" />
                <button type="button" onClick={() => moveStill(i, "left")} disabled={i === 0} className="p-1.5 rounded text-white/70 hover:text-white disabled:opacity-30" aria-label="Move earlier"><ChevronLeft size={14} /></button>
                <button type="button" onClick={() => moveStill(i, "right")} disabled={i === draft.stillsUrls.length - 1} className="p-1.5 rounded text-white/70 hover:text-white disabled:opacity-30" aria-label="Move later"><ChevronRight size={14} /></button>
                <button type="button" onClick={() => { setDraft((d) => ({ ...d, thumbUrl: url })); showFeedback("Set as key art."); }} className="p-1.5 rounded text-white/70 hover:text-white" aria-label="Set as key art" title="Set as key art"><Star size={13} /></button>
                <button type="button" onClick={() => setDraft((d) => ({ ...d, stillsUrls: d.stillsUrls.filter((_, idx) => idx !== i) }))} className="px-2 py-1 rounded text-[11px] text-white/70 hover:text-white">Remove</button>
              </div>
            ))}
            <label className={`flex items-center justify-center gap-2 rounded-lg border border-dashed py-4 cursor-pointer transition ${uploading.still ? "opacity-60" : "hover:border-white/30"}`} style={{ borderColor: "rgba(255,255,255,0.18)", color: "rgba(255,255,255,0.55)" }}>
              {uploading.still ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              <span className="text-[12px]">{draft.stillsUrls.length ? "Add still" : "Add your first still"}</span>
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploading.still} className="sr-only"
                onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; try { const url = await uploadFile(f, "still"); setDraft((d) => ({ ...d, stillsUrls: [...d.stillsUrls, url] })); } catch (err: any) { showError(err.message || "Upload failed"); } }} />
            </label>
          </div>
        </div>
      )}

      <p className="inline-flex items-start gap-1.5 text-[11px] pt-2" style={{ color: "rgba(255,255,255,0.4)" }}>
        <Lock size={11} className="mt-[2px] opacity-70" />
        <span>{isLive ? "Live — the release stays updatable; core identity is locked under the license." : licenseExecuted ? "Core identity is locked under your executed license; ShangoMaji activates distribution after review." : "Core identity is locked. Media is required for activation."}</span>
      </p>
    </div>
  );

  return (
    <>
      {feedback && (
        <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 90, padding: "10px 18px", borderRadius: 10, background: "rgba(52,211,153,0.14)", border: "1px solid rgba(52,211,153,0.35)", fontSize: 13, color: "rgba(167,243,208,0.95)" }}>{feedback}</div>
      )}
      {error && (
        <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 90, padding: "10px 18px", borderRadius: 10, background: "rgba(220,38,38,0.12)", border: "1px solid rgba(220,38,38,0.3)", fontSize: 13, color: "rgba(252,165,165,0.95)" }}>{error}</div>
      )}

      <RoomLayout
        ribbon={ribbon}
        center={center}
        stage={{ open: stageOpen, title: REGION_TITLE[activeRegion], onClose: closeStage, children: stageContent }}
      />
    </>
  );
}

function RegionPicker({ label, preview, ratio, busy, onFile, onClear }: { label: string; preview: string; ratio: string; busy?: boolean; onFile: (f: File) => void | Promise<void>; onClear?: () => void }) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-white">{label}</p>
      <div className="rounded-lg overflow-hidden border" style={{ aspectRatio: ratio, maxWidth: ratio === "2/3" ? 220 : "100%", borderColor: "rgba(255,255,255,0.14)", background: "rgba(0,0,0,0.4)" }}>
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center"><ImagePlus size={20} style={{ color: "rgba(255,255,255,0.3)" }} /></div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold cursor-pointer text-black transition active:scale-95" style={{ background: STUDIO_SIGNAL }}>
          {busy ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={14} />}
          {preview ? "Replace" : "Upload"}
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy} className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) await onFile(f); }} />
        </label>
        {onClear && <button type="button" onClick={onClear} className="text-[12px] transition hover:text-white" style={{ color: "rgba(255,255,255,0.4)" }}>Remove</button>}
      </div>
    </div>
  );
}
