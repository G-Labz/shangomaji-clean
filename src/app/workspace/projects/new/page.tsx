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
    <div className="w-full mx-auto max-w-[1500px] px-5 sm:px-6 lg:px-10 xl:px-12 pb-16">

      {/* ───────────────────────── HEADER ZONE ─────────────────────────
          Eyebrow + display title + subtitle, then a wide horizontal
          readiness command strip across the same canvas width. */}
      <header className="pt-2">
        <p className="text-[11px] uppercase tracking-[0.22em] text-ink-muted">
          Studio submission dossier
        </p>
        <h1
          className="mt-2 font-bold text-3xl lg:text-[36px] text-white tracking-tight leading-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          New Work
        </h1>
        <p className="mt-3 text-ink-faint text-sm max-w-2xl leading-relaxed">
          Prepare the work, declaration, and release assets for ShangoMaji review.
        </p>
      </header>

      <div
        className={`mt-6 flex items-center gap-3 rounded-xl border px-4 py-3 ${
          readyForReview
            ? "border-emerald-500/30 bg-emerald-500/[0.05]"
            : "border-amber-500/30 bg-amber-500/[0.04]"
        }`}
      >
        <ReadinessChip
          tone={readyForReview ? "emerald" : "amber"}
          label={readyForReview ? "Ready" : "Draft mode"}
        />
        <p className="text-xs text-ink-faint leading-snug">
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

      {errors.save && (
        <p className="mt-4 text-brand-red text-sm">{errors.save}</p>
      )}

      {/* ─────────────────────────── TOP INTAKE GRID ───────────────────────────
          Two-column desk on lg+:
            LEFT  minmax(620px, 1fr)   — Work Identity (wide creative brief)
            RIGHT minmax(380px, 440px) — Release Assets (release checklist)

          Submission Actions live in the full-width Bottom Command Footer
          below the Submission Declaration; they are NOT in this grid.

          DOM source order = mobile order:
            Work Identity → Release Assets → Submission Declaration → Bottom Command Footer */}
      <div
        className="mt-8 flex flex-col gap-8 lg:grid lg:items-start lg:gap-10"
        style={{ gridTemplateColumns: "minmax(620px, 1fr) minmax(380px, 440px)" }}
      >
        {/* LEFT — Work Identity. Each field stacks vertically so nothing
            collides; Title, Type, Logline, Synopsis, Genre, Runtime each
            sit on their own row with comfortable breathing space. */}
        <Card className="space-y-6 min-w-0">
          <SectionHeading title="Work Identity" />

          <Field label="Title" error={errors.title}>
            <input
              value={draft.title}
              onChange={(e) => set("title")(e.target.value)}
              placeholder="Project title"
            />
          </Field>

          <Field label="Type" error={errors.type}>
            <div className="flex flex-wrap gap-2">
              {TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => set("type")(t)}
                  className={`min-w-[110px] py-2.5 px-5 rounded-lg border text-sm transition ${
                    draft.type === t
                      ? "border-transparent text-black"
                      : "border-white/10 text-ink-faint hover:border-white/20 hover:text-white"
                  }`}
                  style={
                    draft.type === t
                      ? { background: "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)" }
                      : {}
                  }
                  type="button"
                >
                  {t}
                </button>
              ))}
            </div>
          </Field>

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
              placeholder="Tell the full story, key beats, and what makes it special."
              rows={7}
            />
          </Field>

          <Field label="Genre" error={errors.genre}>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((g) => (
                <button
                  key={g}
                  onClick={() => set("genre")(g)}
                  className={`px-3.5 py-2 rounded-lg text-xs border transition ${
                    draft.genre === g
                      ? "border-transparent text-black"
                      : "border-white/10 text-ink-faint hover:border-white/20 hover:text-white"
                  }`}
                  style={
                    draft.genre === g
                      ? { background: "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)" }
                      : {}
                  }
                  type="button"
                >
                  {g}
                </button>
              ))}
            </div>
          </Field>

          <Field
            label="Runtime / Episode count"
            hint="Optional. e.g., 2h 7m, 22 min, 6 x 22min."
          >
            <input
              value={draft.runtime}
              onChange={(e) => set("runtime")(e.target.value)}
              placeholder="e.g., 6 x 22min"
            />
          </Field>
        </Card>

        {/* RIGHT — Release Assets only. Submission Actions live in the
            full-width command footer at the bottom of the page; no
            actions or readiness controls are duplicated here.
            Three groups: Artwork → Trailer & deliverables → Private
            subsection. sample_url stays creator/admin-private; field
            name and payload key unchanged. */}
        <Card className="space-y-6 min-w-0">
            <SectionHeading
              title="Release Assets"
              description="These ship with your release. Add what you have; remaining items can come later."
            />

            {/* Group 1 — Artwork */}
            <p className="text-[10px] uppercase tracking-[0.18em] text-ink-muted">
              Artwork
            </p>

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
                          onClick={() =>
                            setDraft((d) => ({
                              ...d,
                              stillsUrls: d.stillsUrls.filter((_, idx) => idx !== i),
                            }))
                          }
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

            {/* Group 2 — Trailer & deliverables */}
            <div className="border-t border-white/8 pt-5 space-y-5">
              <p className="text-[10px] uppercase tracking-[0.18em] text-ink-muted">
                Trailer & deliverables
              </p>
              <Field
                label="Trailer URL"
                hint="An outbound link. Your public title page renders this as a single “Watch trailer” button."
              >
                <input
                  value={draft.trailerUrl}
                  onChange={(e) => set("trailerUrl")(e.target.value)}
                  placeholder="https://youtube.com/... or direct link"
                />
              </Field>

              <div>
                <p className="text-sm font-medium text-white mb-1">Deliverables</p>
                <p className="text-xs text-ink-faint mb-3">
                  Mark every asset that will ship with this release.
                </p>
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
            </div>

            {/* Group 3 — Private subsection.
                Server still treats sample_url as creator/admin-private
                (no public exposure). Field name and payload key unchanged. */}
            <div className="border-t border-white/8 pt-5 space-y-2">
              <p className="text-[11px] uppercase tracking-widest text-ink-faint inline-flex items-center gap-1.5">
                <Lock size={11} className="opacity-70" aria-hidden="true" />
                Private — admin reference only
              </p>
              <p className="text-xs text-ink-muted leading-relaxed">
                Private reference shared with ShangoMaji review only. Not part of your public release.
              </p>
              <Field
                label="Sample / Screener URL"
                hint="Paste a link. Direct file submissions are not supported."
              >
                <input
                  value={draft.sampleUrl}
                  onChange={(e) => set("sampleUrl")(e.target.value)}
                  placeholder="https://..."
                />
              </Field>
            </div>
          </Card>
      </div>

      {/* ─────────────── SUBMISSION DECLARATION ZONE ───────────────
          Full-width institutional document below the top desk. The
          card spans the full canvas width (no narrow centering). The
          internal dossier renders as visually distinct blocks via its
          own divider/eyebrow system; on very wide canvases sections D
          and E pair side-by-side, otherwise they stack. */}
      <Card className="mt-10 px-5 py-6 sm:px-7 sm:py-8 lg:px-10 lg:py-10">
        <SectionHeading
          title="Submission Declaration"
          description="Required for review. Drafts may be saved without it."
        />
        <div className="mt-3">
          <SubmissionIntegrityForm
            value={integrity}
            onChange={setIntegrity}
            fieldError={integrityError}
          />
        </div>
      </Card>

      {/* ─────────────── BOTTOM COMMAND FOOTER ───────────────
          Full-width institutional final checkpoint. Single source of
          truth for Submit for Review and Save Draft on this page. No
          sticky, no floating, no duplicate action area. */}
      <Card className="mt-8 px-5 py-5 sm:px-7 sm:py-6 lg:px-8 lg:py-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          <div className="flex items-start gap-3 min-w-0">
            <ReadinessChip
              tone={readyForReview ? "emerald" : "amber"}
              label={readyForReview ? "Ready" : "Draft mode"}
            />
            <div className="min-w-0">
              <p className="text-sm text-white font-medium leading-snug">
                {readyForReview
                  ? "Ready for review — declaration complete."
                  : "Draft mode — declaration incomplete."}
              </p>
              <p className="text-xs text-ink-muted leading-relaxed mt-1 max-w-xl">
                Save as draft to continue later, or submit when the required declaration is complete.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 lg:shrink-0">
            <button
              onClick={saveDraft}
              disabled={saving || submitting}
              style={{
                padding: "12px 22px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "transparent",
                color: "rgba(255,255,255,0.78)",
                fontSize: 14,
                fontWeight: 500,
                cursor: saving || submitting ? "not-allowed" : "pointer",
                opacity: saving || submitting ? 0.5 : 1,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                minWidth: 160,
              }}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? "Saving..." : saved ? "Saved" : "Save Draft"}
            </button>
            <button
              onClick={submitForReview}
              disabled={saving || submitting}
              style={{
                padding: "12px 26px",
                borderRadius: 12,
                border: "none",
                background: "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)",
                color: "black",
                fontSize: 14,
                fontWeight: 700,
                cursor: saving || submitting ? "not-allowed" : "pointer",
                opacity: saving || submitting ? 0.6 : 1,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                minWidth: 200,
              }}
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {submitting ? "Submitting..." : "Submit for Review"}
            </button>
          </div>
        </div>
      </Card>
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
