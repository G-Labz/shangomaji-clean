"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Save, Loader2, Send, Lock, ImagePlus } from "lucide-react";
import {
  Card,
  GradientButton,
  StatusBadge,
  ItemActions,
  useConfirm,
} from "../../../components";
import SubmissionIntegrityForm, {
  emptyIntegrity,
  integrityFromProject,
  integrityToPayload,
  checkIntegrity,
  type IntegrityState,
} from "../../SubmissionIntegrityForm";

interface ProjectDraft {
  title: string;
  type: string;
  logline: string;
  synopsis: string;
  genre: string;
  runtime: string;
  deliverables: string[];
  thumbUrl: string;
  bannerUrl: string;
  trailerUrl: string;
  sampleUrl: string;
  stillsUrls: string[];
}

const TYPES  = ["Series", "Film", "Short"];
const GENRES = ["Mythic", "Sci-Fi", "Drama", "Spiritual", "Action", "Coming of Age"];
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

interface PageProps {
  params: { id: string };
}

export default function EditProjectPage({ params }: PageProps) {
  const { id }   = params;
  const router   = useRouter();

  const [draft, setDraft]                   = useState<ProjectDraft | null>(null);
  const [integrity, setIntegrity]           = useState<IntegrityState>(emptyIntegrity);
  const [integrityError, setIntegrityError] = useState<string | null>(null);
  const [projectStatus, setProjectStatus]   = useState<string>("draft");
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [removalRequested, setRemovalRequested] = useState(false);
  const [licenseStatus, setLicenseStatus]   = useState<"executed" | "none">("none");
  const [loading, setLoading]               = useState(true);
  const [saving, setSaving]                 = useState(false);
  const [saved, setSaved]                   = useState(false);
  const [submitting, setSubmitting]         = useState(false);
  const [reviseBusy, setReviseBusy]         = useState(false);
  const [errors, setErrors]                 = useState<Record<string, string>>({});
  const [uploading, setUploading]           = useState<Record<string, boolean>>({});
  const [feedback, setFeedback]             = useState("");
  const [removalModalOpen, setRemovalModalOpen] = useState(false);
  const [removalReason, setRemovalReason]   = useState("");
  const [removalBusy, setRemovalBusy]       = useState(false);
  const { confirm, dialog }                 = useConfirm();

  function showFeedback(msg: string) {
    setFeedback(msg);
    setTimeout(() => setFeedback(""), 2500);
  }

  function showError(msg: string) {
    setErrors((prev) => ({ ...prev, save: msg }));
  }

  useEffect(() => {
    async function loadProject() {
      try {
        const res  = await fetch("/api/creators/projects");
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Could not load projects");
        const project = (data.projects ?? []).find((p: any) => p.id === id);
        if (!project) {
          setErrors({ load: "Project not found" });
          setLoading(false);
          return;
        }
        setProjectStatus(project.status || "draft");
        setRejectionReason(project.rejection_reason || "");
        setRemovalRequested(project.removal_requested ?? false);
        setLicenseStatus(project.license_status === "executed" ? "executed" : "none");
        setIntegrity(integrityFromProject(project));
        setDraft({
          title:      project.title || "",
          type:       project.project_type || "",
          logline:    project.logline || "",
          synopsis:   project.description || "",
          genre:      (project.genres || [])[0] || "",
          // Phase 6 Tier 2 — runtime is now persisted, so the edit form
          // hydrates from the saved value instead of resetting to "".
          runtime:    project.runtime || "",
          deliverables: project.deliverables || [],
          thumbUrl:   project.cover_image_url || "",
          bannerUrl:  project.banner_url || "",
          trailerUrl: project.trailer_url || "",
          sampleUrl:  project.sample_url || "",
          stillsUrls: project.stills_urls || [],
        });
      } catch (err: any) {
        setErrors({ load: err.message });
      } finally {
        setLoading(false);
      }
    }
    loadProject();
  }, [id]);

  async function uploadFile(file: File, assetType: string): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("asset_type", assetType);
    setUploading((u) => ({ ...u, [assetType]: true }));
    try {
      const res  = await fetch("/api/creators/upload/asset", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Upload failed");
      return data.url as string;
    } finally {
      setUploading((u) => ({ ...u, [assetType]: false }));
    }
  }

  function validate() {
    if (!draft) return false;
    const nextErrors: Record<string, string> = {};
    if (!draft.title.trim())  nextErrors.title  = "Title is required.";
    if (!draft.type)          nextErrors.type   = "Select a type.";
    if (!draft.logline.trim()) nextErrors.logline = "Logline is required.";
    if (!draft.genre)         nextErrors.genre  = "Select a genre.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function saveProject() {
    if (!draft || !validate()) return;
    setSaving(true);
    setSaved(false);
    try {
      const res  = await fetch("/api/creators/projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          title:          draft.title.trim(),
          project_type:   draft.type || null,
          logline:        draft.logline.trim() || null,
          description:    draft.synopsis.trim() || null,
          genres:         draft.genre ? [draft.genre] : [],
          cover_image_url: draft.thumbUrl.trim() || null,
          banner_url:     draft.bannerUrl.trim() || null,
          trailer_url:    draft.trailerUrl.trim() || null,
          sample_url:     draft.sampleUrl.trim() || null,
          stills_urls:    draft.stillsUrls,
          deliverables:   draft.deliverables,
          // Phase 6 Tier 2 — runtime is now editable on drafts.
          runtime:        draft.runtime.trim() || null,
          ...integrityToPayload(integrity),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      showError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const ok = await confirm({
      title:        "Delete Project",
      description:  `This will permanently delete "${draft?.title || "this project"}" and all its associated data. This cannot be undone.`,
      confirmLabel: "Delete Project",
      destructive:  true,
    });
    if (!ok) return;
    try {
      const res  = await fetch("/api/creators/projects", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Delete failed");
      router.push("/workspace/projects");
    } catch (err: any) {
      showError(err.message || "Delete failed");
    }
  }

  async function handleSubmit() {
    if (!draft || !validate()) return;

    // Submission Integrity gate (client). Server is still authoritative.
    const integrityErr = checkIntegrity(integrity);
    if (integrityErr) {
      setIntegrityError(integrityErr.message);
      showError(integrityErr.message);
      return;
    }
    setIntegrityError(null);

    setSubmitting(true);
    try {
      // Step 1: Save current edits + integrity record
      const saveRes  = await fetch("/api/creators/projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          title:          draft.title.trim(),
          project_type:   draft.type || null,
          logline:        draft.logline.trim() || null,
          description:    draft.synopsis.trim() || null,
          genres:         draft.genre ? [draft.genre] : [],
          cover_image_url: draft.thumbUrl.trim() || null,
          banner_url:     draft.bannerUrl.trim() || null,
          trailer_url:    draft.trailerUrl.trim() || null,
          sample_url:     draft.sampleUrl.trim() || null,
          stills_urls:    draft.stillsUrls,
          deliverables:   draft.deliverables,
          // Phase 6 Tier 2 — runtime persists through Save-and-Submit too.
          runtime:        draft.runtime.trim() || null,
          ...integrityToPayload(integrity),
        }),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData?.error || "Save failed");

      // Step 2: Submit (draft → pending). Integrity payload also passed so
      // the server gate sees the latest values without depending on the
      // PUT happening first.
      const submitRes  = await fetch("/api/creators/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          status: "pending",
          ...integrityToPayload(integrity),
        }),
      });
      const submitData = await submitRes.json();

      if (submitRes.status === 422) {
        const msg = submitData?.error || "Submission required declaration is incomplete.";
        setIntegrityError(msg);
        showError(msg);
        return;
      }
      if (!submitRes.ok) throw new Error(submitData?.error || "Submit failed");

      setProjectStatus("pending");
      showFeedback("Work submitted for editorial review.");
    } catch (err: any) {
      showError(err.message || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevise() {
    setReviseBusy(true);
    try {
      const res  = await fetch("/api/creators/projects/revise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Revise failed");
      router.push(`/workspace/projects/${data.id}/edit`);
    } catch (err: any) {
      showError(err.message || "Revise failed");
      setReviseBusy(false);
    }
  }

  async function handleRemovalSubmit() {
    if (!removalReason.trim()) {
      showError("A reason is required for removal requests.");
      return;
    }
    setRemovalBusy(true);
    try {
      const res  = await fetch("/api/creators/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "requestRemoval", reason: removalReason.trim() }),
      });
      const data = await res.json();
      if (res.status === 409) throw new Error("A removal request has already been submitted.");
      if (!res.ok) throw new Error(data?.error || "Request failed");
      setRemovalRequested(true);
      setProjectStatus("removal_requested");
      setRemovalModalOpen(false);
      setRemovalReason("");
      showFeedback("Removal request submitted.");
    } catch (err: any) {
      showError(err.message || "Request failed");
    } finally {
      setRemovalBusy(false);
    }
  }

  const set = (key: keyof ProjectDraft) => (value: string) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-ink-faint">Loading project...</p>
      </div>
    );
  }

  if (errors.load || !draft) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-brand-red text-sm mb-4">{errors.load || "Project not found"}</p>
          <Link href="/workspace/projects" className="text-sm text-brand-orange hover:text-white transition">
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  // ── REJECTION MOMENT ─────────────────────────────────────────────────────
  // When rejected: all form fields hidden, only rejection info + two actions shown
  if (projectStatus === "rejected") {
    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-12">
        {dialog}

        {errors.save && (
          <div
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              background: "rgba(220,38,38,0.08)",
              border: "1px solid rgba(220,38,38,0.25)",
              fontSize: 13,
              color: "rgba(252,165,165,0.9)",
            }}
          >
            {errors.save}
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/workspace/projects" className="text-sm text-ink-faint hover:text-white transition">
            ← Projects
          </Link>
        </div>

        <Card className="space-y-6">
          <div className="flex items-center gap-3">
            <StatusBadge status="rejected" />
            <h2
              className="text-white font-semibold text-lg"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {draft.title}
            </h2>
          </div>

          <div
            style={{
              padding: "16px 20px",
              borderRadius: 12,
              background: "rgba(220,38,38,0.06)",
              border: "1px solid rgba(220,38,38,0.2)",
            }}
          >
            <p
              style={{ margin: 0, fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", color: "rgba(252,165,165,0.7)", textTransform: "uppercase", marginBottom: 8 }}
            >
              Rejection Reason
            </p>
            <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.8)", lineHeight: 1.6 }}>
              {rejectionReason || "No reason provided."}
            </p>
          </div>

          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: 0 }}>
            This project is locked. To make changes, create a revised draft below.
          </p>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleRevise}
              disabled={reviseBusy}
              style={{
                padding: "11px 22px",
                borderRadius: 10,
                border: "none",
                background: "#E0763A",
                color: "black",
                fontWeight: 600,
                fontSize: 14,
                cursor: reviseBusy ? "not-allowed" : "pointer",
                opacity: reviseBusy ? 0.6 : 1,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {reviseBusy ? <Loader2 size={14} className="animate-spin" /> : null}
              {reviseBusy ? "Creating draft…" : "Revise Project"}
            </button>

            <button
              onClick={handleDelete}
              style={{
                padding: "11px 22px",
                borderRadius: 10,
                border: "1px solid rgba(220,38,38,0.4)",
                background: "transparent",
                color: "rgba(252,165,165,0.8)",
                fontWeight: 500,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Delete Project
            </button>
          </div>
        </Card>
      </div>
    );
  }

  // ── World Room ─────────────────────────────────────────────────────────────
  // Container collapse: the title is the page. No outer card frames the world —
  // an ambient ember wash bleeds behind a title-led masthead, the world's body
  // flows as prose, the thesis reads as an editorial argument, and trust is
  // demoted to "the standing of this title." Actions live in a quiet sticky
  // support bar. Inputs are editable only on a draft; every other state renders
  // the title at rest. The server PUT gate stays authoritative regardless.
  const isDraft     = projectStatus === "draft";
  const canDelete   = projectStatus === "draft" || projectStatus === "rejected";
  const isLive      = projectStatus === "live";
  const isBlocked   = !canDelete && !isLive;
  const showBlockedDelete = isBlocked && projectStatus !== "removed";
  const trailer     = draft.trailerUrl.trim();
  const factLine    = [draft.type, draft.genre, draft.runtime].map((v) => v && v.trim()).filter(Boolean).join("  ·  ");

  return (
    <div className="world-room space-y-14 pb-32">
      {dialog}

      {/* Removal request modal */}
      {removalModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => { setRemovalModalOpen(false); setRemovalReason(""); }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 440,
              margin: "0 16px",
              padding: "28px 24px 20px",
              borderRadius: 16,
              background: "#1a1210",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "white" }}>
              Request Removal
            </h3>
            <p style={{ margin: "10px 0 16px", fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
              "{draft.title}" will remain live while this request is reviewed.
            </p>
            <textarea
              value={removalReason}
              onChange={(e) => setRemovalReason(e.target.value)}
              placeholder="Reason for removal request…"
              rows={3}
              style={{
                width: "100%",
                background: "rgba(26,26,26,1)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10,
                padding: "10px 12px",
                color: "white",
                fontSize: 14,
                outline: "none",
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
              <button
                onClick={() => { setRemovalModalOpen(false); setRemovalReason(""); }}
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "transparent",
                  color: "rgba(255,255,255,0.6)",
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRemovalSubmit}
                disabled={removalBusy}
                style={{
                  padding: "10px 20px",
                  borderRadius: 10,
                  border: "none",
                  background: "rgba(234,179,8,0.9)",
                  color: "black",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: removalBusy ? "not-allowed" : "pointer",
                  opacity: removalBusy ? 0.6 : 1,
                }}
              >
                {removalBusy ? "Submitting…" : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Masthead / Stage — the title is the page ── */}
      <section className="relative">
        {/* Ambient ember wash + (when present) the hero image as a faint
            backdrop — bleeds off the masthead, never frames it. */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-12 -bottom-6 -z-10 overflow-hidden">
          {draft.bannerUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={draft.bannerUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              style={{
                opacity: 0.22,
                maskImage: "linear-gradient(180deg, rgba(0,0,0,0.9) 0%, transparent 82%)",
                WebkitMaskImage: "linear-gradient(180deg, rgba(0,0,0,0.9) 0%, transparent 82%)",
              }}
            />
          )}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(115% 75% at 6% 8%, rgba(200,10,46,0.16) 0%, rgba(234,115,27,0.06) 40%, transparent 72%)",
            }}
          />
        </div>

        {/* Room label · standing · actions — quiet chrome, not the headline */}
        <div className="flex items-center justify-between gap-3 flex-wrap mb-9">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[11px] uppercase tracking-[0.26em]" style={{ color: "rgba(255,255,255,0.42)" }}>
              World Room
            </span>
            <StatusBadge status={projectStatus} />
            {projectStatus === "removal_requested" && (
              <span className="text-[11px] px-2.5 py-1 rounded-full border bg-[#E0763A]/[0.1] text-[#E0763A] border-[#E0763A]/[0.3]">
                Removal Requested
              </span>
            )}
            {projectStatus === "removed" && (
              <span className="text-[11px] px-2.5 py-1 rounded-full border bg-red-900/30 text-red-300 border-red-500/40">
                Removed
              </span>
            )}
          </div>
          <ItemActions
            onDelete={canDelete ? handleDelete : undefined}
            onDeleteBlocked={showBlockedDelete ? (reason) => showError(reason) : undefined}
            deleteBlockedReason={
              showBlockedDelete
                ? projectStatus === "live"
                  ? "Live projects cannot be deleted. Submit a removal request instead."
                  : projectStatus === "pending" || projectStatus === "in_review"
                  ? "Projects under review cannot be deleted."
                  : projectStatus === "approved"
                  ? "Approved projects cannot be deleted."
                  : "This work cannot be deleted."
                : undefined
            }
            onRequestRemoval={
              isLive && !removalRequested ? () => setRemovalModalOpen(true) : undefined
            }
          />
        </div>

        {/* Title-in-the-making — the world's face beside its name */}
        <div className="grid gap-7 sm:grid-cols-[minmax(140px,190px)_1fr] items-start">
          {/* The title's face (key art) */}
          <div className="w-full max-w-[190px]">
            <div
              className="relative aspect-[2/3] w-full rounded-lg overflow-hidden border"
              style={{ borderColor: "rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.45)" }}
            >
              {draft.thumbUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={draft.thumbUrl} alt={draft.title || "Key art"} className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center p-3 text-center">
                  <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {isDraft ? "The title’s face" : "No key art"}
                  </span>
                </div>
              )}
              {isDraft && (
                <label
                  className="absolute inset-0 flex items-end justify-center pb-3 cursor-pointer opacity-0 hover:opacity-100 focus-within:opacity-100 transition"
                  style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.72), transparent 62%)" }}
                >
                  <span
                    className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg text-white"
                    style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.2)" }}
                  >
                    {uploading.poster ? <Loader2 size={12} className="animate-spin" /> : <ImagePlus size={12} />}
                    {draft.thumbUrl ? "Replace" : "Add key art"}
                  </span>
                  <input
                    type="file"
                    accept={ACCEPT}
                    disabled={uploading.poster}
                    className="sr-only"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (!f) return;
                      try { const url = await uploadFile(f, "poster"); set("thumbUrl")(url); }
                      catch (err: any) { setErrors((p) => ({ ...p, thumbUrl: err.message })); }
                    }}
                  />
                </label>
              )}
            </div>
            {errors.thumbUrl && <p className="text-xs text-brand-red mt-1.5">{errors.thumbUrl}</p>}

            {/* Hero image — folds the title's wide presentation into the face,
                not a separate upload field. */}
            {isDraft && (
              <div className="mt-3 flex items-center gap-3 flex-wrap">
                <label className="inline-flex items-center gap-1.5 text-[11px] cursor-pointer transition hover:text-white" style={{ color: "rgba(255,255,255,0.5)" }}>
                  {uploading.banner ? <Loader2 size={11} className="animate-spin" /> : <ImagePlus size={11} />}
                  <span className="underline-offset-2 hover:underline">{draft.bannerUrl ? "Replace hero" : "Add hero image"}</span>
                  <input
                    type="file"
                    accept={ACCEPT}
                    disabled={uploading.banner}
                    className="sr-only"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (!f) return;
                      try { const url = await uploadFile(f, "banner"); set("bannerUrl")(url); }
                      catch (err: any) { setErrors((p) => ({ ...p, bannerUrl: err.message })); }
                    }}
                  />
                </label>
                {draft.bannerUrl && (
                  <button type="button" onClick={() => set("bannerUrl")("")} className="text-[11px] transition hover:text-white" style={{ color: "rgba(255,255,255,0.35)" }}>
                    Remove
                  </button>
                )}
              </div>
            )}
            {errors.bannerUrl && <p className="text-xs text-brand-red mt-1.5">{errors.bannerUrl}</p>}
          </div>

          {/* The name + premise headline */}
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.28em] mb-3" style={{ color: "#F6A31A" }}>
              Title in the making
            </p>

            {isDraft ? (
              <input
                value={draft.title}
                onChange={(e) => set("title")(e.target.value)}
                placeholder="Name your world"
                aria-label="Title"
                className="title-input w-full bg-transparent border-0 outline-none text-white font-bold tracking-tight"
                style={{ fontFamily: "var(--font-display)", fontSize: "clamp(30px, 5vw, 52px)", lineHeight: 1.04 }}
              />
            ) : (
              <h1 className="text-white font-bold tracking-tight" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(30px, 5vw, 52px)", lineHeight: 1.04 }}>
                {draft.title.trim() || "Untitled world"}
              </h1>
            )}
            {errors.title && <p className="text-xs text-brand-red mt-1">{errors.title}</p>}

            {isDraft ? (
              <input
                value={draft.logline}
                onChange={(e) => set("logline")(e.target.value)}
                placeholder="One line that captures it"
                aria-label="Logline"
                className="logline-input mt-3 w-full max-w-2xl bg-transparent border-0 outline-none italic"
                style={{ fontFamily: "var(--font-display)", fontSize: "clamp(15px, 2vw, 20px)", color: "rgba(255,255,255,0.78)" }}
              />
            ) : (
              draft.logline.trim() && (
                <p className="mt-3 italic max-w-2xl" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(15px, 2vw, 20px)", color: "rgba(255,255,255,0.78)" }}>
                  {draft.logline.trim()}
                </p>
              )
            )}
            {errors.logline && <p className="text-xs text-brand-red mt-1">{errors.logline}</p>}

            {/* Facts — type, genre, runtime as a quiet strip, not stacked fields */}
            {isDraft ? (
              <div className="mt-7 space-y-3.5">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="w-[58px] shrink-0 text-[11px] uppercase tracking-[0.16em]" style={{ color: "rgba(255,255,255,0.4)" }}>Type</span>
                  <div className="flex gap-2 flex-wrap">
                    {TYPES.map((t) => (
                      <button key={t} type="button" onClick={() => set("type")(t)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs border transition ${draft.type === t ? "border-transparent text-black" : "border-white/10 text-ink-faint hover:border-white/25 hover:text-white"}`}
                        style={draft.type === t ? { background: "#E0763A" } : {}}>
                        {t}
                      </button>
                    ))}
                  </div>
                  {errors.type && <span className="text-xs text-brand-red">{errors.type}</span>}
                </div>
                <div className="flex items-start gap-3 flex-wrap">
                  <span className="w-[58px] shrink-0 pt-1.5 text-[11px] uppercase tracking-[0.16em]" style={{ color: "rgba(255,255,255,0.4)" }}>Genre</span>
                  <div className="flex gap-2 flex-wrap">
                    {GENRES.map((g) => (
                      <button key={g} type="button" onClick={() => set("genre")(g)}
                        className={`px-3 py-1.5 rounded-lg text-xs border transition ${draft.genre === g ? "border-transparent text-black" : "border-white/10 text-ink-faint hover:border-white/25 hover:text-white"}`}
                        style={draft.genre === g ? { background: "#E0763A" } : {}}>
                        {g}
                      </button>
                    ))}
                  </div>
                  {errors.genre && <span className="text-xs text-brand-red">{errors.genre}</span>}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="w-[58px] shrink-0 text-[11px] uppercase tracking-[0.16em]" style={{ color: "rgba(255,255,255,0.4)" }}>Runtime</span>
                  <input
                    value={draft.runtime}
                    onChange={(e) => set("runtime")(e.target.value)}
                    placeholder="e.g., 6 x 22min  ·  optional"
                    aria-label="Runtime or episodes"
                    className="inline-line bg-transparent border-0 border-b outline-none text-sm py-1"
                    style={{ borderColor: "rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.85)", minWidth: 200 }}
                  />
                </div>
              </div>
            ) : (
              factLine && (
                <p className="mt-6 text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>{factLine}</p>
              )
            )}

            {/* Trailer — the single Watch-trailer action */}
            <div className="mt-6">
              {trailer && (
                <a href={trailer} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-lg text-black" style={{ background: "#E0763A" }}>
                  ▷ Watch trailer
                </a>
              )}
              {isDraft && (
                <div className={`flex items-center gap-3 flex-wrap ${trailer ? "mt-2" : ""}`}>
                  <span className="text-[11px] uppercase tracking-[0.16em]" style={{ color: "rgba(255,255,255,0.4)" }}>Trailer</span>
                  <input
                    value={draft.trailerUrl}
                    onChange={(e) => set("trailerUrl")(e.target.value)}
                    placeholder="https://…  ·  optional"
                    aria-label="Trailer link"
                    className="inline-line bg-transparent border-0 border-b outline-none text-sm py-1"
                    style={{ borderColor: "rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.85)", minWidth: 260 }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Approved → license is the next move (informational; the bar carries the CTA). */}
      {projectStatus === "approved" && (
        <div
          className="flex flex-col md:flex-row md:items-center gap-3 px-4 py-3 rounded-lg border"
          style={{
            borderColor: licenseStatus === "executed" ? "rgba(52,211,153,0.25)" : "rgba(245,197,24,0.3)",
            background: licenseStatus === "executed" ? "rgba(52,211,153,0.06)" : "rgba(245,197,24,0.06)",
          }}
        >
          <div className="flex-1 text-sm">
            <p className="text-white font-medium">
              {licenseStatus === "executed"
                ? "License executed. Distribution is pending ShangoMaji activation."
                : "Selected for distribution consideration."}
            </p>
            <p className="text-ink-faint text-xs mt-0.5">
              {licenseStatus === "executed"
                ? "Your selected term begins when activation occurs."
                : "Review and sign the Standard Distribution License — this is the required next step before activation."}
            </p>
          </div>
          <Link
            href={`/license/${id}`}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-black transition active:scale-95 self-start md:self-auto"
            style={{ background: licenseStatus === "executed" ? "rgba(255,255,255,0.85)" : "#E0763A" }}
          >
            {licenseStatus === "executed" ? "View License" : "Review and Sign License"}
          </Link>
        </div>
      )}

      {/* State note for non-draft, non-approved (the page is at rest). */}
      {!isDraft && projectStatus !== "approved" && (
        <p className="text-xs text-ink-faint italic max-w-2xl">
          {projectStatus === "pending"
            ? "Submitted for review. The world is settled while it’s with our editorial team."
            : projectStatus === "in_review"
            ? "Under editorial evaluation. The world is settled — no changes while it’s with us."
            : projectStatus === "live"
            ? "Under active distribution license. Core identity is managed by ShangoMaji; refine the release in the Release Room."
            : projectStatus === "removal_requested"
            ? "Your work remains live while ShangoMaji reviews this removal request. Editing is closed while it’s under review."
            : projectStatus === "removed"
            ? "This work has been removed from distribution and is no longer editable here."
            : projectStatus === "archived"
            ? "Removed from active catalog."
            : ""}
        </p>
      )}

      {/* ── The world's body — premise flows as the world's text ── */}
      <section>
        <p className="text-[11px] uppercase tracking-[0.22em] mb-3" style={{ color: "rgba(255,255,255,0.4)" }}>Premise</p>
        {isDraft ? (
          <textarea
            value={draft.synopsis}
            onChange={(e) => set("synopsis")(e.target.value)}
            placeholder="What is this world, and what unfolds in it? Write it the way you'd want it read."
            rows={6}
            aria-label="Synopsis"
            className="premise-input w-full max-w-3xl bg-transparent border-0 outline-none"
            style={{ color: "rgba(255,255,255,0.82)", fontSize: "1.02rem", lineHeight: 1.75, resize: "vertical" }}
          />
        ) : draft.synopsis.trim() ? (
          <p className="max-w-3xl whitespace-pre-line" style={{ color: "rgba(255,255,255,0.78)", fontSize: "1.02rem", lineHeight: 1.75 }}>
            {draft.synopsis.trim()}
          </p>
        ) : (
          <p className="text-sm text-ink-faint">—</p>
        )}
      </section>

      {/* ── The editorial argument — why this world belongs ── */}
      <section className="border-t border-white/10 pt-10">
        <SubmissionIntegrityForm
          value={integrity}
          onChange={setIntegrity}
          disabled={!isDraft}
          zone="thesis"
        />
      </section>

      {/* ── The standing of this title — trust & provenance (secondary) ── */}
      <section className="border-t border-white/10 pt-10">
        <p className="text-[11px] uppercase tracking-[0.26em] mb-1" style={{ color: "#E0763A" }}>
          The standing of this title
        </p>
        <p className="text-sm mb-7 max-w-xl" style={{ color: "rgba(255,255,255,0.5)" }}>
          Ownership, collaborators, AI, and prior distribution — the title’s trust posture.
          Required before review; save as you go.
        </p>
        <SubmissionIntegrityForm
          value={integrity}
          onChange={setIntegrity}
          disabled={!isDraft}
          fieldError={integrityError}
          zone="trust"
        />

        {/* Private review screener — an internal declaration, not a boxed field. */}
        <div className="mt-9">
          <p className="text-[11px] uppercase tracking-widest inline-flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>
            <Lock size={11} className="opacity-70" aria-hidden="true" />
            Private review screener
          </p>
          <p className="text-xs mt-1 mb-2.5" style={{ color: "rgba(255,255,255,0.4)" }}>
            Shared with ShangoMaji review only. Never part of your public release.
          </p>
          {isDraft ? (
            <input
              value={draft.sampleUrl}
              onChange={(e) => set("sampleUrl")(e.target.value)}
              placeholder="Screener link (https://…)"
              aria-label="Sample or screener URL"
              className="inline-line bg-transparent border-0 border-b outline-none text-sm py-1 w-full max-w-md"
              style={{ borderColor: "rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.85)" }}
            />
          ) : (
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>
              {draft.sampleUrl.trim() ? draft.sampleUrl.trim() : "— none provided"}
            </p>
          )}
        </div>
      </section>

      {feedback && (
        <div
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            background: "rgba(52,211,153,0.1)",
            border: "1px solid rgba(52,211,153,0.3)",
            fontSize: 13,
            color: "rgba(52,211,153,0.9)",
          }}
        >
          {feedback}
        </div>
      )}

      {/* ── Sticky support bar — the submission actions sit beneath the work,
            never as a dominant panel beside it. Draft only; approved uses the
            license banner above. ── */}
      {isDraft && (
        <div
          className="sticky bottom-0 z-30 -mx-6 px-6 py-3.5 flex items-center justify-between gap-4 flex-wrap"
          style={{ background: "rgba(8,8,11,0.9)", backdropFilter: "blur(12px)", borderTop: "1px solid rgba(255,255,255,0.08)" }}
        >
          <p className="text-[11px] max-w-md leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
            {errors.save
              ? <span className="text-brand-red">{errors.save}</span>
              : "Save to keep shaping later, or submit when the title’s standing is complete."}
          </p>
          <div className="flex items-center gap-2.5">
            <button
              onClick={saveProject}
              disabled={saving || submitting}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition active:scale-95 disabled:opacity-50"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", color: "white" }}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? "Saving…" : saved ? "Saved" : "Save"}
            </button>
            <GradientButton onClick={handleSubmit} disabled={submitting || saving}>
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {submitting ? "Submitting…" : "Submit for Review"}
            </GradientButton>
          </div>
        </div>
      )}

      <style jsx global>{`
        .world-room .title-input::placeholder { color: rgba(255, 255, 255, 0.24); font-style: normal; }
        .world-room .logline-input::placeholder { color: rgba(255, 255, 255, 0.3); }
        .world-room .premise-input::placeholder { color: rgba(255, 255, 255, 0.3); }
        .world-room .inline-line::placeholder { color: rgba(255, 255, 255, 0.32); }
        .world-room .inline-line:focus { border-color: rgba(224, 118, 58, 0.6) !important; }
      `}</style>
    </div>
  );
}
