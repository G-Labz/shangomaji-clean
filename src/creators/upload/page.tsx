"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle,
} from "lucide-react";

// ─── Types ─────────────────────────
interface ProjectForm {
  title: string;
  type: string;
  logline: string;
  description: string;
  thumbnailUrl: string;
  bannerUrl: string;
  trailerUrl: string;
  videoUrl: string;
  creatorName: string;
  creatorBio: string;
  genre: string;
}

const GENRE_OPTIONS = [
  "Afro Cyberpunk",
  "Mythology",
  "Folklore",
  "Action",
  "Drama",
  "Spiritual",
  "Sci-Fi",
  "Coming of Age",
  "Caribbean Folklore",
  "Historical",
  "Fantasy",
  "Thriller",
];

const PROJECT_TYPES = [
  { value: "series", label: "Series" },
  { value: "film", label: "Film" },
  { value: "short", label: "Short" },
];

const STEPS = [
  { number: 1, label: "Project" },
  { number: 2, label: "Media" },
  { number: 3, label: "Creator" },
  { number: 4, label: "Review" },
];

const emptyForm: ProjectForm = {
  title: "",
  type: "",
  logline: "",
  description: "",
  thumbnailUrl: "",
  bannerUrl: "",
  trailerUrl: "",
  videoUrl: "",
  creatorName: "",
  creatorBio: "",
  genre: "",
};

// ─── Field components ─────────────────────────
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
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-white">{label}</label>
      {hint && <p className="text-xs text-ink-faint leading-relaxed">{hint}</p>}
      {children}
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-brand-red mt-1">
          <AlertCircle size={11} />
          {error}
        </p>
      )}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  prefix,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  prefix?: string;
}) {
  return (
    <div className="flex items-center bg-surface-raised border border-white/10 rounded-xl overflow-hidden focus-within:border-brand-orange/50 transition-colors">
      {prefix && (
        <span className="px-3 text-ink-faint text-sm border-r border-white/10 py-3.5 flex-shrink-0">
          {prefix}
        </span>
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent px-4 py-3.5 text-white text-sm placeholder-ink-faint outline-none"
      />
    </div>
  );
}

function Textarea({
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full bg-surface-raised border border-white/10 rounded-xl px-4 py-3.5 text-white text-sm placeholder-ink-faint outline-none resize-none focus:border-brand-orange/50 transition-colors"
    />
  );
}

// ─── Main page ─────────────────────────
export default function CreatorUploadPage() {
  const router = useRouter();

  // ─── Access gate ─────────────────────────
  const [accessEmail, setAccessEmail] = useState("");
  const [accessGranted, setAccessGranted] = useState(false);
  const [accessChecking, setAccessChecking] = useState(false);
  const [accessError, setAccessError] = useState("");
  const [creatorInfo, setCreatorInfo] = useState<{ name: string; handle: string } | null>(null);

  async function checkAccess() {
    if (!accessEmail.trim()) {
      setAccessError("Enter your email address.");
      return;
    }
    setAccessChecking(true);
    setAccessError("");
    try {
      const res = await fetch("/api/creators/check-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: accessEmail }),
      });
      const data = await res.json();
      if (data.approved) {
        setCreatorInfo(data.creator);
        setAccessGranted(true);
        if (data.creator?.name) {
          setForm((f) => ({ ...f, creatorName: data.creator.name }));
        }
      } else {
        setAccessError("No accepted application found for this email.");
      }
    } catch {
      setAccessError("Something went wrong. Please try again.");
    } finally {
      setAccessChecking(false);
    }
  }

  // ─── Form state ─────────────────────────
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<ProjectForm>(emptyForm);
  const [direction, setDirection] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const set = (key: keyof ProjectForm) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  // ─── Validation ─────────────────────────
  function validateStep(): boolean {
    const e: Record<string, string> = {};

    if (step === 1) {
      if (!form.title.trim()) e.title = "Project title is required.";
      if (!form.type) e.type = "Choose a project type.";
      if (!form.logline.trim()) e.logline = "A logline is required.";
      if (!form.description.trim()) e.description = "Please include a description.";
    }

    if (step === 2) {
      if (!form.thumbnailUrl.trim()) e.thumbnailUrl = "Thumbnail URL is required.";
      if (!form.bannerUrl.trim()) e.bannerUrl = "Banner URL is required.";
    }

    if (step === 3) {
      if (!form.creatorName.trim()) e.creatorName = "Creator name is required.";
      if (!form.genre) e.genre = "Select a genre.";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const goNext = async () => {
    if (!validateStep()) return;
    setDirection(1);
    if (step < 4) {
      setStep((s) => s + 1);
    } else {
      setIsSubmitting(true);
      setSubmitError("");
      try {
        const res = await fetch("/api/creators/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            creatorEmail: accessEmail,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Submission failed");
        router.push("/creators/upload/success");
      } catch (err: any) {
        setSubmitError(err.message || "Something went wrong. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const goPrev = () => {
    setDirection(-1);
    setErrors({});
    setStep((s) => Math.max(1, s - 1));
  };

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? "5%" : "-5%", opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? "-5%" : "5%", opacity: 0 }),
  };

  // ─── Access gate screen ─────────────────────────
  if (!accessGranted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 pt-16">
        <motion.div
          className="w-full max-w-md text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="text-center mb-8">
            <p className="text-xs uppercase tracking-[0.25em] text-ink-faint mb-3">
              Creator Portal
            </p>
            <h1 className="text-display font-bold text-3xl text-white tracking-tight mb-3">
              Verify Access
            </h1>
            <p className="text-ink-faint text-sm max-w-sm mx-auto">
              Enter the email you applied with. Only accepted creators can upload content.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center bg-surface-raised border border-white/10 rounded-xl overflow-hidden focus-within:border-brand-orange/50 transition-colors">
              <input
                type="email"
                value={accessEmail}
                onChange={(e) => setAccessEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && checkAccess()}
                placeholder="you@example.com"
                className="flex-1 bg-transparent px-4 py-3.5 text-white text-sm placeholder-ink-faint outline-none"
              />
            </div>

            <button
              onClick={checkAccess}
              disabled={accessChecking || !accessEmail.trim()}
              className="w-full py-3.5 rounded-xl text-black font-semibold text-sm transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
              style={{ background: "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)" }}
            >
              {accessChecking ? "Checking..." : "Continue"}
            </button>

            {accessError && (
              <div className="p-4 rounded-xl bg-surface-raised border border-white/8 text-center">
                <p className="flex items-center justify-center gap-2 text-sm text-ink-muted">
                  <AlertCircle size={14} className="text-brand-red" />
                  {accessError}
                </p>
                <p className="text-xs text-ink-faint mt-2">
                  Haven't applied yet?{" "}
                  <a href="/creators/apply" className="text-brand-orange hover:text-white transition underline underline-offset-2">
                    Apply here
                  </a>
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── Upload form ─────────────────────────
  return (
    <div className="min-h-screen flex items-start justify-center px-6 pt-24 pb-20">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.25em] text-ink-faint mb-3">
            Creator Portal
          </p>
          <h1 className="text-display font-bold text-4xl md:text-5xl text-white tracking-tight mb-3">
            Upload Your Project
          </h1>
          <p className="text-ink-faint text-sm max-w-md mx-auto">
            Everything we need to review, list, and publish your work on ShangoMaji.
          </p>
          {creatorInfo && (
            <p className="text-xs text-ink-faint mt-3">
              Submitting as <span className="text-white">{creatorInfo.name}</span>
            </p>
          )}
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-0 mb-12">
          {STEPS.map((s, i) => (
            <div key={s.number} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
                    step > s.number
                      ? "text-black"
                      : step === s.number
                      ? "text-black"
                      : "border border-white/15 text-ink-faint"
                  }`}
                  style={
                    step >= s.number
                      ? { background: "linear-gradient(135deg, #e53e2a, #f5c518)" }
                      : undefined
                  }
                >
                  {step > s.number ? <Check size={14} strokeWidth={2.5} /> : s.number}
                </div>
                <span className="text-[10px] mt-2 text-ink-faint whitespace-nowrap">
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`w-12 md:w-20 h-px mx-1 transition-colors duration-300 -translate-y-2 ${
                    step > s.number ? "bg-brand-orange/60" : "bg-white/10"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Form steps */}
        <div className="relative overflow-hidden min-h-[400px]">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              {/* ── Step 1: Project ── */}
              {step === 1 && (
                <div className="space-y-6">
                  <div className="mb-6">
                    <p className="text-xs mb-3" style={{ color: "rgba(240,112,48,0.6)" }}>
                      Start with the foundation.
                    </p>
                    <h2 className="text-white font-semibold text-xl mb-1">Project</h2>
                    <p className="text-ink-faint text-sm">What are you bringing to the platform?</p>
                  </div>
                  <Field label="Project Title" error={errors.title}>
                    <Input value={form.title} onChange={set("title")} placeholder="The title of your work" />
                  </Field>
                  <Field label="Project Type" error={errors.type}>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      {PROJECT_TYPES.map((pt) => (
                        <button
                          key={pt.value}
                          onClick={() => set("type")(pt.value)}
                          className={`py-3 px-3 rounded-xl text-xs font-medium border transition-all duration-200 ${
                            form.type === pt.value
                              ? "border-transparent text-black"
                              : "border-white/10 text-ink-muted hover:border-white/20 hover:text-white"
                          }`}
                          style={
                            form.type === pt.value
                              ? { background: "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)" }
                              : undefined
                          }
                        >
                          {pt.label}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label="Logline" hint="One or two sentences. The elevator pitch." error={errors.logline}>
                    <Textarea value={form.logline} onChange={set("logline")} placeholder="A young warrior must..." rows={3} />
                  </Field>
                  <Field label="Full Description" hint="The full story and context. This is for our review team." error={errors.description}>
                    <Textarea value={form.description} onChange={set("description")} placeholder="Give us the full picture..." rows={6} />
                  </Field>
                </div>
              )}

              {/* ── Step 2: Media ── */}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="mb-6">
                    <p className="text-xs mb-3" style={{ color: "rgba(240,112,48,0.6)" }}>
                      Show us what it looks like.
                    </p>
                    <h2 className="text-white font-semibold text-xl mb-1">Media</h2>
                    <p className="text-ink-faint text-sm">Artwork and video links. Direct URLs only — file upload coming soon.</p>
                  </div>
                  <Field label="Thumbnail URL" hint="Portrait poster image. Direct link to hosted image." error={errors.thumbnailUrl}>
                    <Input value={form.thumbnailUrl} onChange={set("thumbnailUrl")} placeholder="https://..." />
                  </Field>
                  <Field label="Banner URL" hint="Landscape banner. At least 1920×600px." error={errors.bannerUrl}>
                    <Input value={form.bannerUrl} onChange={set("bannerUrl")} placeholder="https://..." />
                  </Field>
                  <Field label="Trailer URL" hint="YouTube, Vimeo, or a direct link.">
                    <Input value={form.trailerUrl} onChange={set("trailerUrl")} placeholder="https://..." />
                  </Field>
                  <Field label="Video URL" hint="Optional. Link to the full episode, film, or pilot.">
                    <Input value={form.videoUrl} onChange={set("videoUrl")} placeholder="https://..." />
                  </Field>
                </div>
              )}

              {/* ── Step 3: Creator + Genre ── */}
              {step === 3 && (
                <div className="space-y-6">
                  <div className="mb-6">
                    <p className="text-xs mb-3" style={{ color: "rgba(240,112,48,0.6)" }}>
                      Who's behind the work.
                    </p>
                    <h2 className="text-white font-semibold text-xl mb-1">Creator & Genre</h2>
                    <p className="text-ink-faint text-sm">This is what viewers will see alongside your project.</p>
                  </div>
                  <Field label="Creator / Studio Name" error={errors.creatorName}>
                    <Input value={form.creatorName} onChange={set("creatorName")} placeholder="Your name or studio" />
                  </Field>
                  <Field label="Creator Bio" hint="A few lines about you or your studio.">
                    <Textarea value={form.creatorBio} onChange={set("creatorBio")} placeholder="Tell viewers who you are..." rows={4} />
                  </Field>
                  <Field label="Genre" hint="Primary genre for this project." error={errors.genre}>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {GENRE_OPTIONS.map((g) => (
                        <button
                          key={g}
                          onClick={() => set("genre")(g)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
                            form.genre === g
                              ? "border-transparent text-black"
                              : "border-white/10 text-ink-muted hover:border-white/20 hover:text-white"
                          }`}
                          style={
                            form.genre === g
                              ? { background: "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)" }
                              : undefined
                          }
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </Field>
                </div>
              )}

              {/* ── Step 4: Review ── */}
              {step === 4 && (
                <div className="space-y-6">
                  <div className="mb-6">
                    <p className="text-xs mb-3" style={{ color: "rgba(240,112,48,0.6)" }}>
                      Almost there.
                    </p>
                    <h2 className="text-white font-semibold text-xl mb-1">Review & Submit</h2>
                    <p className="text-ink-faint text-sm">Confirm everything looks right before submitting.</p>
                  </div>

                  <div className="p-5 rounded-2xl bg-surface-raised border border-white/8 space-y-3">
                    <p className="text-xs uppercase tracking-widest text-ink-faint">Project</p>
                    {[
                      { label: "Title", value: form.title },
                      { label: "Type", value: form.type },
                      { label: "Genre", value: form.genre },
                      { label: "Logline", value: form.logline },
                    ].map(({ label, value }) =>
                      value ? (
                        <div key={label} className="flex justify-between text-sm gap-4">
                          <span className="text-ink-faint flex-shrink-0">{label}</span>
                          <span className="text-white text-right truncate">{value}</span>
                        </div>
                      ) : null
                    )}
                  </div>

                  <div className="p-5 rounded-2xl bg-surface-raised border border-white/8 space-y-3">
                    <p className="text-xs uppercase tracking-widest text-ink-faint">Media</p>
                    {[
                      { label: "Thumbnail", value: form.thumbnailUrl },
                      { label: "Banner", value: form.bannerUrl },
                      { label: "Trailer", value: form.trailerUrl },
                      { label: "Video", value: form.videoUrl },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between text-sm gap-4">
                        <span className="text-ink-faint flex-shrink-0">{label}</span>
                        <span className={`text-right ${value ? "text-emerald-400" : "text-ink-faint"}`}>
                          {value ? "Provided" : "—"}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="p-5 rounded-2xl bg-surface-raised border border-white/8 space-y-3">
                    <p className="text-xs uppercase tracking-widest text-ink-faint">Creator</p>
                    {[
                      { label: "Name", value: form.creatorName },
                      { label: "Bio", value: form.creatorBio ? "Provided" : "—" },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between text-sm gap-4">
                        <span className="text-ink-faint flex-shrink-0">{label}</span>
                        <span className="text-white text-right truncate">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-10 pt-8 border-t border-white/5">
          <button
            onClick={goPrev}
            disabled={step === 1}
            className="flex items-center gap-2 px-5 py-3 glass rounded-xl text-sm font-medium text-ink-muted hover:text-white transition-all disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronLeft size={15} />
            Back
          </button>

          <button
            onClick={goNext}
            disabled={isSubmitting}
            className="group flex items-center gap-2.5 px-7 py-3 rounded-xl text-black font-semibold text-sm transition-all active:scale-95 disabled:opacity-70 disabled:pointer-events-none"
            style={{ background: "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)" }}
          >
            {isSubmitting ? "Submitting..." : step === 4 ? "Submit for Review" : "Continue"}
            {!isSubmitting && (
              <ChevronRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            )}
          </button>
        </div>

        {submitError && (
          <p className="text-center text-sm mt-4" style={{ color: "rgba(229,62,42,0.9)" }}>
            {submitError}
          </p>
        )}
      </div>
    </div>
  );
}
