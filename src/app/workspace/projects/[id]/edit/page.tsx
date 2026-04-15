"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Save, Loader2, Send } from "lucide-react";
import {
  Card,
  SectionHeading,
  GradientButton,
  StatusBadge,
  ItemActions,
  useConfirm,
} from "../../../components";

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
const GENRES = ["Afrofuturism", "Mythic", "Folklore", "Sci-Fi", "Drama", "Spiritual"];

interface PageProps {
  params: { id: string };
}

export default function EditProjectPage({ params }: PageProps) {
  const { id }   = params;
  const router   = useRouter();

  const [draft, setDraft]                   = useState<ProjectDraft | null>(null);
  const [projectStatus, setProjectStatus]   = useState<string>("draft");
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [removalRequested, setRemovalRequested] = useState(false);
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
        setDraft({
          title:      project.title || "",
          type:       project.project_type || "",
          logline:    project.logline || "",
          synopsis:   project.description || "",
          genre:      (project.genres || [])[0] || "",
          runtime:    "",
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
    setSubmitting(true);
    try {
      // Step 1: Save current edits
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
        }),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData?.error || "Save failed");

      // Step 2: Submit (draft → pending)
      const submitRes  = await fetch("/api/creators/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "pending" }),
      });
      const submitData = await submitRes.json();
      if (!submitRes.ok) throw new Error(submitData?.error || "Submit failed");

      setProjectStatus("pending");
      showFeedback("Project submitted for review.");
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
      <div className="space-y-6 pb-12">
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
                background: "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)",
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

  // ── Normal edit form ─────────────────────────────────────────────────────
  const canDelete   = projectStatus === "draft" || projectStatus === "rejected";
  const isLive      = projectStatus === "live";
  const isBlocked   = !canDelete && !isLive;

  return (
    <div className="space-y-6 pb-12">
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

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h1
            className="font-bold text-2xl text-white tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Edit Project
          </h1>
          <StatusBadge status={projectStatus} />
          {isLive && removalRequested && (
            <span className="text-[11px] px-2.5 py-1 rounded-full border bg-yellow-500/10 text-yellow-300 border-yellow-500/30">
              Removal Requested
            </span>
          )}
        </div>
        <ItemActions
          onDelete={canDelete ? handleDelete : undefined}
          onDeleteBlocked={isBlocked ? (reason) => showError(reason) : undefined}
          deleteBlockedReason={
            isBlocked
              ? projectStatus === "live"
                ? "Live projects cannot be deleted. Submit a removal request instead."
                : projectStatus === "pending" || projectStatus === "in_review"
                ? "Projects under review cannot be deleted."
                : projectStatus === "approved"
                ? "Approved projects cannot be deleted."
                : "This project cannot be deleted."
              : undefined
          }
          onRequestRemoval={
            isLive && !removalRequested ? () => setRemovalModalOpen(true) : undefined
          }
        />
      </div>

      {/* Edit form */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 space-y-6">
          <SectionHeading title="Project Details" />
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Title" error={errors.title}>
              <input
                value={draft.title}
                onChange={(e) => set("title")(e.target.value)}
                placeholder="Project title"
              />
            </Field>
            <Field label="Type" error={errors.type}>
              <div className="grid grid-cols-3 gap-2">
                {TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => set("type")(t)}
                    type="button"
                    className={`py-2.5 px-3 rounded-lg border text-sm transition ${
                      draft.type === t
                        ? "border-transparent text-black"
                        : "border-white/10 text-ink-faint hover:border-white/20 hover:text-white"
                    }`}
                    style={
                      draft.type === t
                        ? { background: "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)" }
                        : {}
                    }
                  >
                    {t}
                  </button>
                ))}
              </div>
            </Field>
          </div>
          <Field label="Logline" error={errors.logline} hint="One to two sentences.">
            <input
              value={draft.logline}
              onChange={(e) => set("logline")(e.target.value)}
              placeholder="A young warrior..."
            />
          </Field>
          <Field label="Synopsis" hint="Optional detailed description.">
            <textarea
              value={draft.synopsis}
              onChange={(e) => set("synopsis")(e.target.value)}
              placeholder="Tell the full story..."
              rows={4}
            />
          </Field>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Genre" error={errors.genre}>
              <div className="flex flex-wrap gap-2">
                {GENRES.map((g) => (
                  <button
                    key={g}
                    onClick={() => set("genre")(g)}
                    type="button"
                    className={`px-3 py-1.5 rounded-lg text-xs border transition ${
                      draft.genre === g
                        ? "border-transparent text-black"
                        : "border-white/10 text-ink-faint hover:border-white/20 hover:text-white"
                    }`}
                    style={
                      draft.genre === g
                        ? { background: "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)" }
                        : {}
                    }
                  >
                    {g}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Trailer URL" hint="Paste a link — direct video upload is not supported.">
              <input
                value={draft.trailerUrl}
                onChange={(e) => set("trailerUrl")(e.target.value)}
                placeholder="https://youtube.com/..."
              />
            </Field>
          </div>
        </Card>

        <Card className="space-y-6">
          <SectionHeading title="Media" />
          <div className="space-y-3">
            <Field label="Poster / Thumbnail">
              {draft.thumbUrl && (
                <img
                  src={draft.thumbUrl}
                  alt="Poster"
                  className="h-24 w-auto rounded-lg object-cover mb-2"
                />
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                disabled={uploading["poster"]}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    try {
                      const url = await uploadFile(f, "poster");
                      set("thumbUrl")(url);
                    } catch (err: any) {
                      setErrors((p) => ({ ...p, thumbUrl: err.message }));
                    }
                  }
                }}
                className="w-full text-sm text-ink-faint file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-white/10 file:text-white"
              />
              {uploading["poster"] && <p className="text-xs text-ink-faint">Uploading…</p>}
            </Field>
            <Field label="Banner">
              {draft.bannerUrl && (
                <img
                  src={draft.bannerUrl}
                  alt="Banner"
                  className="h-16 w-full rounded-lg object-cover mb-2"
                />
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                disabled={uploading["banner"]}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    try {
                      const url = await uploadFile(f, "banner");
                      set("bannerUrl")(url);
                    } catch (err: any) {
                      setErrors((p) => ({ ...p, bannerUrl: err.message }));
                    }
                  }
                }}
                className="w-full text-sm text-ink-faint file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-white/10 file:text-white"
              />
              {uploading["banner"] && <p className="text-xs text-ink-faint">Uploading…</p>}
            </Field>
            <Field label="Sample / Screener URL" hint="Paste a link — direct video upload is not supported.">
              <input
                value={draft.sampleUrl}
                onChange={(e) => set("sampleUrl")(e.target.value)}
                placeholder="https://..."
              />
            </Field>
          </div>
        </Card>
      </div>

      {/* Action bar */}
      <div className="flex justify-end gap-3">
        <GradientButton
          onClick={saveProject}
          disabled={saving || submitting}
          className="min-w-[140px]"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? "Saving..." : saved ? "Saved" : "Save Changes"}
        </GradientButton>

        {projectStatus === "draft" && (
          <button
            onClick={handleSubmit}
            disabled={submitting || saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
            style={{
              background: "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)",
              color: "black",
            }}
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {submitting ? "Submitting..." : "Submit for Review"}
          </button>
        )}
      </div>

      {errors.save && <p className="text-brand-red text-sm">{errors.save}</p>}

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
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="workspace-field space-y-1.5">
      <label className="block text-sm font-medium text-white">{label}</label>
      {hint && <p className="text-xs text-ink-faint">{hint}</p>}
      <div className="space-y-2">{children}</div>
      {error && <p className="text-xs text-brand-red">{error}</p>}
      <style jsx global>{`
        .workspace-field input,
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
        .workspace-field input:focus,
        .workspace-field textarea:focus {
          border-color: rgba(240, 112, 48, 0.5);
        }
        .workspace-field input::placeholder,
        .workspace-field textarea::placeholder {
          color: rgba(120, 120, 120, 1);
        }
      `}</style>
    </div>
  );
}
