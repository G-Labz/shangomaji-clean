"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, Send, Lock } from "lucide-react";
import { Card, SectionHeading, ReadinessChip, UploadField } from "../../components";
import SubmissionIntegrityForm, {
  emptyIntegrity,
  integrityToPayload,
  checkIntegrity,
  type IntegrityState,
} from "../SubmissionIntegrityForm";

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
  const [integrity, setIntegrity] = useState<IntegrityState>(emptyIntegrity);
  const [integrityError, setIntegrityError] = useState<string | null>(null);
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
      // Phase 6 Tier 2 — runtime is now persisted. The form already
      // collected it; we just stopped dropping it on the floor.
      runtime: draft.runtime.trim() || null,
      ...integrityToPayload(integrity),
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

    // Submission Integrity gate (client). Server still validates the same.
    const integrityErr = checkIntegrity(integrity);
    if (integrityErr) {
      setIntegrityError(integrityErr.message);
      setErrors((prev) => ({ ...prev, save: integrityErr.message }));
      return;
    }
    setIntegrityError(null);

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

      if (createRes.status === 422) {
        const msg = createData?.error || "Submission required declaration is incomplete.";
        setIntegrityError(msg);
        setErrors((prev) => ({ ...prev, save: msg }));
        setSubmitting(false);
        return;
      }

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

  // Phase 7.3 Layer 2: derived readiness signal. Mirrors the existing
  // validate() required-field set + the existing checkIntegrity() gate.
  // No new validation, no new fields — pure UI surfacing of state the
  // submit handler already enforces.
  const coreComplete =
    draft.title.trim().length > 0 &&
    !!draft.type &&
    draft.logline.trim().length > 0 &&
    !!draft.genre;
  const declarationComplete = checkIntegrity(integrity) === null;
  const readyForReview = coreComplete && declarationComplete;

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* Header band */}
      <div>
        <h1
          className="font-bold text-2xl text-white tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          New Work
        </h1>
        <p className="text-ink-faint text-sm mt-1 max-w-2xl leading-relaxed">
          Submit a new work for ShangoMaji review. Save as draft anytime; submission requires a complete declaration.
        </p>
      </div>

      {/* Compact readiness strip — derived from existing validation gates */}
      <div
        className={`mt-4 inline-flex items-center gap-3 rounded-full border px-3 py-1.5 ${
          readyForReview
            ? "border-emerald-500/30 bg-emerald-500/5"
            : "border-amber-500/30 bg-amber-500/5"
        }`}
      >
        <ReadinessChip
          tone={readyForReview ? "emerald" : "amber"}
          label={readyForReview ? "Ready" : "Draft mode"}
        />
        <p className="text-[11px] text-ink-faint leading-snug">
          {readyForReview
            ? "Ready for review — declaration complete."
            : "Draft mode — save anytime. Review requires a complete declaration."}
        </p>
      </div>

      {feedback && (
        <div
          className="mt-4"
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

      {/* Studio Desk — two-column on desktop, stacked on mobile.
          Mobile source order: Identity → Release Assets → Declaration → Actions.
          Desktop visual: Identity (top-left) | Release Assets (top-right);
                          Declaration (bottom-left) | Actions (bottom-right, sticky). */}
      <div className="mt-6 lg:flex lg:items-start lg:gap-6">
        {/* Left/main column — Work Identity + Submission Declaration */}
        <div className="lg:flex-1 min-w-0 space-y-6">
          {/* Section 1 — Work Identity */}
          <Card className="space-y-5">
            <SectionHeading title="Work Identity" />
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

          {/* Section 3 (left bottom) — Submission Declaration */}
          <Card className="space-y-4">
            <SectionHeading
              title="Submission Declaration"
              description="Required for review. Drafts may be saved without it."
            />
            <SubmissionIntegrityForm
              value={integrity}
              onChange={setIntegrity}
              fieldError={integrityError}
            />
          </Card>

          {errors.save && <p className="text-brand-red text-sm">{errors.save}</p>}
        </div>

        {/* Right rail — Release Assets + Submission Actions.
            On desktop the rail stretches to match the left column height;
            the Actions panel pins via sticky positioning. On mobile this
            block stacks below the left column with no sticky. */}
        <aside className="mt-6 lg:mt-0 lg:w-[340px] lg:shrink-0 space-y-6">
          {/* Section 2 — Release Assets (with private sample subsection) */}
          <Card className="space-y-6">
            <SectionHeading
              title="Release Assets"
              description="These ship with your release. Add what you have; remaining items can come later."
            />

            <UploadField
              label="Poster / Thumbnail"
              hint="Square or 2:3 portrait recommended."
              accept="image/jpeg,image/png,image/webp,image/gif"
              uploading={uploading["poster"]}
              preview={
                draft.thumbUrl ? (
                  <img src={draft.thumbUrl} alt="Poster preview" className="h-24 w-auto rounded-lg object-cover" />
                ) : null
              }
              onFile={async (file) => {
                try {
                  const url = await uploadFile(file, "poster");
                  set("thumbUrl")(url);
                } catch (err: any) {
                  setErrors((prev) => ({ ...prev, thumbUrl: err.message }));
                }
              }}
              onRemove={draft.thumbUrl ? () => set("thumbUrl")("") : undefined}
            />
            {errors.thumbUrl && <p className="text-xs text-brand-red">{errors.thumbUrl}</p>}

            <UploadField
              label="Banner"
              hint="Wide cinematic image used in hero contexts."
              accept="image/jpeg,image/png,image/webp,image/gif"
              uploading={uploading["banner"]}
              preview={
                draft.bannerUrl ? (
                  <img src={draft.bannerUrl} alt="Banner preview" className="h-16 w-full rounded-lg object-cover" />
                ) : null
              }
              onFile={async (file) => {
                try {
                  const url = await uploadFile(file, "banner");
                  set("bannerUrl")(url);
                } catch (err: any) {
                  setErrors((prev) => ({ ...prev, bannerUrl: err.message }));
                }
              }}
              onRemove={draft.bannerUrl ? () => set("bannerUrl")("") : undefined}
            />
            {errors.bannerUrl && <p className="text-xs text-brand-red">{errors.bannerUrl}</p>}

            <UploadField
              label="Stills"
              hint="Two or more stills appear as a release gallery on your public title page."
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              uploading={uploading["still"]}
              preview={
                draft.stillsUrls.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
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
                ) : null
              }
              onFile={async (file) => {
                try {
                  const url = await uploadFile(file, "still");
                  setDraft((d) => ({ ...d, stillsUrls: [...d.stillsUrls, url] }));
                } catch (err: any) {
                  setErrors((prev) => ({ ...prev, stills: err.message }));
                }
              }}
            />
            {errors.stills && <p className="text-xs text-brand-red">{errors.stills}</p>}

            <Field label="Trailer URL" hint="An outbound link. Your public title page renders this as a single “Watch trailer” button.">
              <input value={draft.trailerUrl} onChange={(e) => set("trailerUrl")(e.target.value)} placeholder="https://youtube.com/... or direct link" />
            </Field>

            <div>
              <p className="text-sm font-medium text-white mb-2">Deliverables</p>
              <p className="text-xs text-ink-faint mb-3">These assets ship with your release.</p>
              <div className="space-y-2">
                {DELIVERABLES.map((item) => {
                  const on = draft.deliverables.includes(item);
                  return (
                    <label
                      key={item}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg border cursor-pointer ${
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
            </div>

            {/* Private subsection — visually separated. Server still
                treats sample_url as creator/admin-private (no public
                exposure). Field name and payload key unchanged. */}
            <div className="border-t border-white/8 pt-5 space-y-2">
              <p className="text-[11px] uppercase tracking-widest text-ink-faint inline-flex items-center gap-1.5">
                <Lock size={11} className="opacity-70" aria-hidden="true" />
                Private — admin reference only
              </p>
              <p className="text-xs text-ink-muted leading-relaxed">
                Private reference shared with ShangoMaji review only. Not part of your public release.
              </p>
              <Field label="Sample / Screener URL" hint="Paste a link. Direct file submissions are not supported.">
                <input value={draft.sampleUrl} onChange={(e) => set("sampleUrl")(e.target.value)} placeholder="https://..." />
              </Field>
            </div>
          </Card>

          {/* Submission Actions panel — pinned on desktop via sticky so
              the creator can submit without scrolling back up. The aside
              parent stretches to the left column's height (lg:flex
              align-stretch default), so the sticky element stays in
              view through the entire scroll until the column ends. */}
          <div className="lg:sticky lg:top-[140px]">
            <Card className="space-y-4">
              <SectionHeading title="Submission Actions" />
              <div
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
                  readyForReview
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-amber-500/30 bg-amber-500/5"
                }`}
              >
                <ReadinessChip
                  tone={readyForReview ? "emerald" : "amber"}
                  label={readyForReview ? "Ready" : "Draft mode"}
                />
                <p className="text-[11px] text-ink-faint leading-snug">
                  {readyForReview
                    ? "Declaration complete."
                    : "Declaration incomplete."}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={submitForReview}
                  disabled={saving || submitting}
                  style={{
                    width: "100%",
                    padding: "10px 18px",
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
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  {submitting ? "Submitting..." : "Submit for Review"}
                </button>
                <button
                  onClick={saveDraft}
                  disabled={saving || submitting}
                  style={{
                    width: "100%",
                    padding: "10px 18px",
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
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {saving ? "Saving..." : saved ? "Saved" : "Save Draft"}
                </button>
              </div>
              <p className="text-[11px] text-ink-muted leading-relaxed">
                Save as draft to continue later, or submit when the required declaration is complete.
              </p>
            </Card>
          </div>
        </aside>
      </div>
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
