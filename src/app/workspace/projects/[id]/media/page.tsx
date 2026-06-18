"use client";

// Phase 11C — Release Room.
//
// Release preparation, not an upload form. The center of the room is a live
// presentation preview of how the title will present under the ShangoMaji
// label; every change (add / replace / set key art / reorder) updates it
// immediately. Reuses the existing upload + PUT endpoints and the same
// server-enforced media whitelist (cover/banner/stills/trailer/deliverables).
// No backend, no schema, no new APIs.
//
// State rules (mirror the server gate in /api/creators/projects PUT):
//   draft           → redirected to the World Room (assets are shaped there)
//   approved | live  → editable release assets; core identity locked
//   all else         → read-only "locked" notice with the reason

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, Lock, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { Card, SectionHeading, GradientButton, StatusBadge, UploadField } from "../../../components";

interface PageProps {
  params: { id: string };
}

const DELIVERABLES = ["Poster", "Banner", "Trailer", "Full Episode", "Stills"];
const SIGNAL = "#E0763A";

type LoadedProject = {
  id: string;
  title: string;
  status: string;
  project_type?: string | null;
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

  // Drafts shape assets in the World Room (the full editor).
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

  function toggleDeliverable(item: string) {
    setDraft((d) => ({
      ...d,
      deliverables: d.deliverables.includes(item)
        ? d.deliverables.filter((x) => x !== item)
        : [...d.deliverables, item],
    }));
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
          deliverables: draft.deliverables,
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

  const licenseExecuted = project.license_status === "executed";
  const isLive = project.status === "live";
  const trailer = draft.trailerUrl.trim();

  return (
    <div className="space-y-8 pb-10">
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
        <p className="text-ink-faint text-sm mt-1">Prepare how {project.title} presents under the ShangoMaji label.</p>
      </div>

      {feedback && (
        <div style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)", fontSize: 13, color: "rgba(52,211,153,0.9)" }}>{feedback}</div>
      )}
      {error && (
        <div style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.25)", fontSize: 13, color: "rgba(252,165,165,0.9)" }}>{error}</div>
      )}

      {/* ── Presentation preview — the center of the room ── */}
      <section className="space-y-3">
        <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: "rgba(255,255,255,0.4)" }}>
          How your title will present
        </p>
        <div
          className="rounded-2xl border overflow-hidden"
          style={{ borderColor: "rgba(217,38,28,0.22)", background: "linear-gradient(135deg, rgba(200,10,46,0.12) 0%, rgba(17,17,17,0.6) 50%, rgba(234,115,27,0.07) 100%)" }}
        >
          <div className="grid gap-5 p-6 sm:grid-cols-[150px_1fr] items-start">
            {/* Key art (poster) */}
            <div className="w-full max-w-[150px]">
              <div className="relative aspect-[2/3] w-full rounded-lg overflow-hidden border" style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.4)" }}>
                {draft.thumbUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={draft.thumbUrl} alt={project.title} className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center p-3 text-center">
                    <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>Add key art below</span>
                  </div>
                )}
              </div>
            </div>
            {/* Title presentation */}
            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: "#F6A31A" }}>ShangoMaji Title</p>
              <h2 className="text-white font-bold tracking-tight" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(24px, 4vw, 40px)", lineHeight: 1.05 }}>
                {project.title}
              </h2>
              {project.logline && project.logline.trim() && (
                <p className="text-sm italic max-w-xl" style={{ color: "rgba(255,255,255,0.72)", fontFamily: "var(--font-display)" }}>
                  {project.logline.trim()}
                </p>
              )}
              {trailer ? (
                <a href={trailer} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-lg text-black" style={{ background: SIGNAL }}>
                  ▷ Watch trailer
                </a>
              ) : (
                <span className="inline-block text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>Add a trailer link below to enable the Watch action</span>
              )}
            </div>
          </div>
          {/* Gallery row */}
          {draft.stillsUrls.length > 0 && (
            <div className="flex gap-2 overflow-x-auto px-6 pb-6">
              {draft.stillsUrls.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={`${url}-${i}`} src={url} alt="" className="h-20 w-auto rounded-md object-cover border flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.1)" }} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Prepare the assets ── */}
      <Card className="space-y-6">
        <SectionHeading title="Key art & hero" description="What anchors your title page and the collection." />

        <UploadField
          label={draft.thumbUrl ? "Key art (poster)" : "Add your key art (poster)"}
          hint="2:3 portrait recommended. This is your title's primary image."
          accept="image/*"
          uploading={uploading.poster}
          preview={draft.thumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={draft.thumbUrl} alt="Key art" className="h-24 w-auto rounded-lg object-cover" />
          ) : null}
          onFile={async (file) => { try { const url = await uploadFile(file, "poster"); setDraft((d) => ({ ...d, thumbUrl: url })); } catch (err: any) { showError(err.message || "Upload failed"); } }}
          onRemove={draft.thumbUrl ? () => setDraft((d) => ({ ...d, thumbUrl: "" })) : undefined}
        />

        <UploadField
          label={draft.bannerUrl ? "Hero banner" : "Add your hero banner"}
          hint="Wide cinematic image used in hero contexts."
          accept="image/*"
          uploading={uploading.banner}
          preview={draft.bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={draft.bannerUrl} alt="Banner" className="h-24 w-auto rounded-lg object-cover" />
          ) : null}
          onFile={async (file) => { try { const url = await uploadFile(file, "banner"); setDraft((d) => ({ ...d, bannerUrl: url })); } catch (err: any) { showError(err.message || "Upload failed"); } }}
          onRemove={draft.bannerUrl ? () => setDraft((d) => ({ ...d, bannerUrl: "" })) : undefined}
        />
      </Card>

      <Card className="space-y-4">
        <SectionHeading title="Gallery" description="Stills become your release gallery. Order them and set any as key art." />
        <UploadField
          label={draft.stillsUrls.length ? "Add another still" : "Add your first still"}
          accept="image/*"
          uploading={uploading.still}
          onFile={async (file) => { try { const url = await uploadFile(file, "still"); setDraft((d) => ({ ...d, stillsUrls: [...d.stillsUrls, url] })); } catch (err: any) { showError(err.message || "Upload failed"); } }}
        />
        {draft.stillsUrls.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {draft.stillsUrls.map((url, i) => (
              <div key={`${url}-${i}`} className="relative aspect-video rounded-lg overflow-hidden border" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 p-1.5" style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.7), transparent)" }}>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => moveStill(i, "left")} disabled={i === 0} className="p-1 rounded bg-black/50 text-white disabled:opacity-30 hover:bg-black/70" aria-label="Move left"><ChevronLeft size={13} /></button>
                    <button type="button" onClick={() => moveStill(i, "right")} disabled={i === draft.stillsUrls.length - 1} className="p-1 rounded bg-black/50 text-white disabled:opacity-30 hover:bg-black/70" aria-label="Move right"><ChevronRight size={13} /></button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => { setDraft((d) => ({ ...d, thumbUrl: url })); showFeedback("Set as key art. Save to apply."); }} className="p-1 rounded bg-black/50 text-white hover:bg-black/70 inline-flex items-center gap-1" aria-label="Set as key art" title="Set as key art"><Star size={12} /></button>
                    <button type="button" onClick={() => setDraft((d) => ({ ...d, stillsUrls: d.stillsUrls.filter((_, idx) => idx !== i) }))} className="px-1.5 py-0.5 rounded bg-black/50 text-white text-[10px] hover:bg-black/70">Remove</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-6">
        <SectionHeading title="Trailer & release packet" />
        <Field label="Trailer link" hint="An outbound link. Your title page renders this as a single “Watch trailer” action.">
          <input value={draft.trailerUrl} onChange={(e) => setDraft((d) => ({ ...d, trailerUrl: e.target.value }))} placeholder="https://… direct or hosted link" />
        </Field>
        <Field label="Release packet" hint="What ships with your release.">
          <div className="space-y-2">
            {DELIVERABLES.map((item) => {
              const on = draft.deliverables.includes(item);
              return (
                <label key={item} className={`flex items-center justify-between px-3 py-2 rounded-lg border cursor-pointer ${on ? "border-white/20 bg-white/5" : "border-white/10"}`}>
                  <span className="text-sm text-white">{item}</span>
                  <input type="checkbox" checked={on} onChange={() => toggleDeliverable(item)} style={{ accentColor: SIGNAL }} />
                </label>
              );
            })}
          </div>
        </Field>
      </Card>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-[11px] text-ink-muted leading-relaxed max-w-md inline-flex items-start gap-1.5">
          <Lock size={12} className="mt-[2px] shrink-0 opacity-70" aria-hidden="true" />
          <span>
            {isLive
              ? "Your title is live. Release assets stay updatable; core identity (title, logline, synopsis, rights, license terms) remains locked under the license."
              : licenseExecuted
              ? "Release assets are yours to refine. Core identity is locked under your executed license. ShangoMaji activates distribution after review."
              : "Release assets are yours to refine. Core identity is locked. Media is required for activation."}
          </span>
        </p>
        <GradientButton onClick={saveRelease} disabled={saving}>
          {saving ? (<><Loader2 size={14} className="animate-spin" /> Saving…</>) : saved ? "Saved" : (<><Save size={14} /> Save release</>)}
        </GradientButton>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="workspace-field space-y-1.5">
      <label className="block text-sm font-medium text-white">{label}</label>
      {hint && <p className="text-xs text-ink-faint">{hint}</p>}
      <div className="space-y-2">{children}</div>
      <style jsx global>{`
        .workspace-field input[type="text"],
        .workspace-field input:not([type]),
        .workspace-field textarea {
          width: 100%;
          background: rgba(26, 26, 26, 1);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.75rem;
          padding: 0.75rem 1rem;
          color: white;
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .workspace-field input[type="text"]:focus,
        .workspace-field input:not([type]):focus,
        .workspace-field textarea:focus {
          border-color: rgba(224, 118, 58, 0.5);
        }
        .workspace-field input[type="text"]::placeholder,
        .workspace-field input:not([type])::placeholder,
        .workspace-field textarea::placeholder {
          color: rgba(120, 120, 120, 1);
        }
      `}</style>
    </div>
  );
}
