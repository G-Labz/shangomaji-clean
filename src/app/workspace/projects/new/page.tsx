"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, Send } from "lucide-react";
import { Card, SectionHeading, GradientButton } from "../../components";

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

const emptyDraft: ProjectDraft = {
  title: "",
  type: "",
  logline: "",
  synopsis: "",
  genre: "",
  runtime: "",
  deliverables: [],
  thumbUrl: "",
  bannerUrl: "",
  trailerUrl: "",
  sampleUrl: "",
  stillsUrls: [],
};

const DELIVERABLES = ["Poster", "Banner", "Trailer", "Full Episode", "Stills"];
const TYPES = ["Series", "Film", "Short"];
const GENRES = ["Mythic", "Sci-Fi", "Drama", "Spiritual", "Action", "Coming of Age"];

export default function WorkspaceNewProject() {
  const router = useRouter();
  const [draft, setDraft] = useState<ProjectDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState("");
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  function showFeedback(msg: string) {
    setFeedback(msg);
    setTimeout(() => setFeedback(""), 3000);
  }

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
    setDraft((d) => {
      const exists = d.deliverables.includes(item);
      return {
        ...d,
        deliverables: exists ? d.deliverables.filter((x) => x !== item) : [...d.deliverables, item],
      };
    });
  }

  function validate() {
    const nextErrors: Record<string, string> = {};
    if (!draft.title.trim()) nextErrors.title = "Title is required.";
    if (!draft.type) nextErrors.type = "Select a type.";
    if (!draft.logline.trim()) nextErrors.logline = "Logline is required.";
    if (!draft.genre) nextErrors.genre = "Select a genre.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function buildPayload() {
    return {
      title: draft.title.trim(),
      project_type: draft.type || null,
      logline: draft.logline.trim() || null,
      description: draft.synopsis.trim() || null,
      genres: draft.genre ? [draft.genre] : [],
      cover_image_url: draft.thumbUrl.trim() || null,
      banner_url: draft.bannerUrl.trim() || null,
      trailer_url: draft.trailerUrl.trim() || null,
      sample_url: draft.sampleUrl.trim() || null,
      deliverables: draft.deliverables,
      stills_urls: draft.stillsUrls,
    };
  }

  async function saveDraft() {
    if (!validate()) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/creators/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save failed");
      setSaved(true);
      showFeedback("Draft saved.");
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setErrors((prev) => ({ ...prev, save: err.message || "Save failed" }));
    } finally {
      setSaving(false);
    }
  }

  async function submitForReview() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      // POST with submitImmediately: API creates draft then attempts draft → pending.
      // On partial success (draft saved, submission failed) the API returns HTTP 207.
      const createRes = await fetch("/api/creators/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...buildPayload(), submitImmediately: true }),
      });
      const createData = await createRes.json();

      if (createRes.status === 207) {
        // Draft saved, submission failed — no data loss
        showFeedback(createData.message || "Draft saved, but submission failed. You can retry.");
        setSubmitting(false);
        router.push(`/workspace/projects/${createData.id}/edit`);
        return;
      }

      if (!createRes.ok) throw new Error(createData?.error || "Save failed");

      // Success — project is now pending
      router.push("/workspace/projects");
    } catch (err: any) {
      setErrors((prev) => ({ ...prev, save: err.message || "Save failed" }));
    } finally {
      setSubmitting(false);
    }
  }

  const set = (key: keyof ProjectDraft) => (value: string) =>
    setDraft((d) => ({ ...d, [key]: value }));

  return (
    <div className="space-y-5 pb-12">
      <div>
        <h1
          className="font-bold text-2xl text-white tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          New Project
        </h1>
        <p className="text-ink-faint text-sm mt-1">
          Fill in the details, then save as draft or submit for review.
        </p>
      </div>

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

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 space-y-5">
          <SectionHeading title="Project Details" />
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Title" error={errors.title}>
              <input value={draft.title} onChange={(e) => set("title")(e.target.value)} placeholder="Project title" />
            </Field>
            <Field label="Type" error={errors.type}>
              <div className="grid grid-cols-3 gap-2">
                {TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => set("type")(t)}
                    className={`py-2 px-3 rounded-lg border text-sm transition ${
                      draft.type === t
                        ? "border-transparent text-black"
                        : "border-white/10 text-ink-faint hover:border-white/20 hover:text-white"
                    }`}
                    style={draft.type === t ? { background: "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)" } : {}}
                    type="button"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </Field>
          </div>
          <Field label="Logline" error={errors.logline} hint="One to two sentences.">
            <input value={draft.logline} onChange={(e) => set("logline")(e.target.value)} placeholder="A young warrior..." />
          </Field>
          <Field label="Synopsis" hint="Optional detailed description.">
            <textarea
              value={draft.synopsis}
              onChange={(e) => set("synopsis")(e.target.value)}
              placeholder="Tell the full story, key beats, and what makes it special."
              rows={3}
            />
          </Field>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Genre" error={errors.genre}>
              <div className="flex flex-wrap gap-2">
                {GENRES.map((g) => (
                  <button
                    key={g}
                    onClick={() => set("genre")(g)}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition ${
                      draft.genre === g
                        ? "border-transparent text-black"
                        : "border-white/10 text-ink-faint hover:border-white/20 hover:text-white"
                    }`}
                    style={draft.genre === g ? { background: "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)" } : {}}
                    type="button"
                  >
                    {g}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Runtime / Episode count">
              <input value={draft.runtime} onChange={(e) => set("runtime")(e.target.value)} placeholder="e.g., 6 x 22min" />
            </Field>
          </div>
        </Card>

        <Card className="space-y-5">
          <SectionHeading title="Media & Deliverables" />
          <div className="space-y-2">
            {DELIVERABLES.map((item) => {
              const on = draft.deliverables.includes(item);
              return (
                <label
                  key={item}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg border ${
                    on ? "border-white/20 bg-white/5" : "border-white/10"
                  }`}
                >
                  <span className="text-sm text-white">{item}</span>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggleDeliverable(item)}
                    className="h-4 w-4 rounded border-white/30 bg-black/40 text-brand-orange focus:ring-0"
                  />
                </label>
              );
            })}
          </div>
          <div className="space-y-3">
            <Field label="Poster / Thumbnail">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                disabled={uploading["poster"]}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const url = await uploadFile(file, "poster");
                    set("thumbUrl")(url);
                  } catch (err: any) {
                    setErrors((prev) => ({ ...prev, thumbUrl: err.message }));
                  }
                }}
                className="w-full text-sm text-ink-faint file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-white/10 file:text-white hover:file:bg-white/20"
              />
              {uploading["poster"] && <p className="text-xs text-ink-faint">Uploading…</p>}
              {draft.thumbUrl && (
                <img src={draft.thumbUrl} alt="Poster preview" className="mt-2 h-20 w-auto rounded-lg object-cover" />
              )}
              {errors.thumbUrl && <p className="text-xs text-brand-red">{errors.thumbUrl}</p>}
            </Field>
            <Field label="Banner Image">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                disabled={uploading["banner"]}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const url = await uploadFile(file, "banner");
                    set("bannerUrl")(url);
                  } catch (err: any) {
                    setErrors((prev) => ({ ...prev, bannerUrl: err.message }));
                  }
                }}
                className="w-full text-sm text-ink-faint file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-white/10 file:text-white hover:file:bg-white/20"
              />
              {uploading["banner"] && <p className="text-xs text-ink-faint">Uploading…</p>}
              {draft.bannerUrl && (
                <img src={draft.bannerUrl} alt="Banner preview" className="mt-2 h-14 w-full rounded-lg object-cover" />
              )}
              {errors.bannerUrl && <p className="text-xs text-brand-red">{errors.bannerUrl}</p>}
            </Field>
            <Field label="Stills">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                disabled={uploading["still"]}
                onChange={async (e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (!files.length) return;
                  try {
                    setUploading((u) => ({ ...u, still: true }));
                    const urls = await Promise.all(files.map((f) => uploadFile(f, "still")));
                    setDraft((d) => ({ ...d, stillsUrls: [...d.stillsUrls, ...urls] }));
                  } catch (err: any) {
                    setErrors((prev) => ({ ...prev, stills: err.message }));
                  } finally {
                    setUploading((u) => ({ ...u, still: false }));
                  }
                }}
                className="w-full text-sm text-ink-faint file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-white/10 file:text-white hover:file:bg-white/20"
              />
              {uploading["still"] && <p className="text-xs text-ink-faint">Uploading…</p>}
              {errors.stills && <p className="text-xs text-brand-red">{errors.stills}</p>}
              {draft.stillsUrls.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {draft.stillsUrls.map((url, i) => (
                    <div key={i} className="relative">
                      <img src={url} alt={`Still ${i + 1}`} className="h-14 w-20 rounded-lg object-cover" />
                      <button
                        type="button"
                        onClick={() => setDraft((d) => ({ ...d, stillsUrls: d.stillsUrls.filter((_, idx) => idx !== i) }))}
                        className="absolute -top-1 -right-1 bg-black/70 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center hover:bg-brand-red"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Field>
            <Field label="Trailer URL" hint="Paste a link. Direct file submissions are not supported.">
              <input value={draft.trailerUrl} onChange={(e) => set("trailerUrl")(e.target.value)} placeholder="https://youtube.com/... or direct link" />
            </Field>
            <Field label="Sample / Screener URL" hint="Paste a link. Direct file submissions are not supported.">
              <input value={draft.sampleUrl} onChange={(e) => set("sampleUrl")(e.target.value)} placeholder="https://..." />
            </Field>
          </div>
        </Card>
      </div>

      {/* Action bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          padding: "16px 20px",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <p className="text-xs text-ink-faint">
          Save as draft to continue later, or submit when ready for review.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={saveDraft}
            disabled={saving || submitting}
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "transparent",
              color: "rgba(255,255,255,0.7)",
              fontSize: 14,
              fontWeight: 500,
              cursor: saving || submitting ? "not-allowed" : "pointer",
              opacity: saving || submitting ? 0.5 : 1,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? "Saving..." : saved ? "Saved" : "Save Draft"}
          </button>
          <button
            onClick={submitForReview}
            disabled={saving || submitting}
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              border: "none",
              background: "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)",
              color: "black",
              fontSize: 14,
              fontWeight: 600,
              cursor: saving || submitting ? "not-allowed" : "pointer",
              opacity: saving || submitting ? 0.6 : 1,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {submitting ? "Submitting..." : "Submit for Review"}
          </button>
        </div>
      </div>

      {errors.save && <p className="text-brand-red text-sm">{errors.save}</p>}
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
      {error && <p className="text-xs text-brand-red flex items-center gap-1">{error}</p>}
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
