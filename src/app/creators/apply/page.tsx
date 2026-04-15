"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Check, Upload, AlertCircle } from "lucide-react";

// ─── Form state types ─────────────────────────
interface FormData {
  // Step 1 — About You
  name: string;
  handle: string;
  email: string;
  origin: string;
  // Step 2 — Your Work
  projectTitle: string;
  projectType: string;
  genres: string[];
  logline: string;
  sampleUrl: string;
  // Step 3 — Your Vision
  influences: string;
  whyShangoMaji: string;
  whatYouNeed: string;
  // Step 4 — Links
  instagram: string;
  twitter: string;
  youtube: string;
  website: string;
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
  { value: "movie", label: "Feature Film" },
  { value: "short", label: "Short Film" },
  { value: "manga", label: "Manga / Graphic Novel" },
  { value: "concept", label: "Concept / Pitch" },
];

const STEPS = [
  { number: 1, label: "About You" },
  { number: 2, label: "Your Work" },
  { number: 3, label: "Your Vision" },
  { number: 4, label: "Links" },
];

const emptyForm: FormData = {
  name: "",
  handle: "",
  email: "",
  origin: "",
  projectTitle: "",
  projectType: "",
  genres: [],
  logline: "",
  sampleUrl: "",
  influences: "",
  whyShangoMaji: "",
  whatYouNeed: "",
  instagram: "",
  twitter: "",
  youtube: "",
  website: "",
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

export default function ApplyPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [submitted, setSubmitted] = useState(false);
  const [direction, setDirection] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: keyof FormData) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleGenre = (g: string) => {
    setForm((f) => ({
      ...f,
      genres: f.genres.includes(g)
        ? f.genres.filter((x) => x !== g)
        : [...f.genres, g],
    }));
  };

  const validateStep = (): boolean => {
    const e: Record<string, string> = {};

    if (step === 1) {
      if (!form.name.trim()) e.name = "Name is required.";
      if (!form.handle.trim()) e.handle = "Handle is required.";
      if (!form.email.trim()) e.email = "Email is required.";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email address.";
      if (!form.origin.trim()) e.origin = "Tell us where you're from.";
    }

    if (step === 2) {
      if (!form.projectTitle.trim()) e.projectTitle = "Project title is required.";
      if (!form.projectType) e.projectType = "Choose a project type.";
      if (form.genres.length === 0) e.genres = "Select at least one genre.";
      if (!form.logline.trim()) e.logline = "A logline is required.";
    }

    if (step === 3) {
      if (!form.influences.trim()) e.influences = "Share at least one influence.";
      if (!form.whyShangoMaji.trim()) e.whyShangoMaji = "Tell us why ShangoMaji.";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goNext = async () => {
    if (!validateStep()) return;
    setDirection(1);
    if (step < 4) {
      setStep((s) => s + 1);
    } else {
      // Final step — submit to Supabase
      setIsSubmitting(true);
      setSubmitError("");
      try {
        const res = await fetch("/api/apply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Submission failed");
        setSubmitted(true);
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

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 pt-16">
        <motion.div
          className="text-center max-w-lg"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Check mark */}
          <div className="w-20 h-20 rounded-full mx-auto mb-8 flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #e53e2a, #f5c518)" }}>
            <Check size={32} className="text-black" strokeWidth={2.5} />
          </div>
          <h1 className="text-display font-bold text-4xl text-white mb-4 tracking-tight">
            You're in.
          </h1>
          <p className="text-ink-muted leading-relaxed mb-3">
            We review every creator personally. If it's a fit, you'll hear from us.
          </p>
          <p className="text-sm mb-8" style={{ color: "rgba(255,255,255,0.4)" }}>
            In the meantime, keep building.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/creators"
              className="px-6 py-3 glass rounded-xl text-white text-sm font-medium hover:bg-white/10 transition-all"
            >
              Meet the Creators
            </Link>
            <Link
              href="/"
              className="px-6 py-3 rounded-xl text-black text-sm font-semibold transition-all active:scale-95"
              style={{
                background: "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)",
              }}
            >
              Back to Platform
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 pb-20">
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Back */}
        <Link
          href="/creators"
          className="inline-flex items-center gap-1.5 text-ink-muted hover:text-white text-sm mb-10 group transition-colors"
        >
          <ChevronLeft size={15} className="transition-transform group-hover:-translate-x-0.5" />
          Back to Creators
        </Link>

        {/* Header */}
        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <h1 className="text-display font-bold text-4xl md:text-5xl text-white tracking-tight mb-3">
            Apply to <span className="brand-text">ShangoMaji</span>
          </h1>
          <p className="text-ink-muted text-sm leading-relaxed">
            This isn't for everyone. Take your
            time, every answer matters.
          </p>
        </motion.div>

        {/* Step indicator */}
        <div className="flex items-center gap-0 mb-12">
          {STEPS.map((s, i) => (
            <div key={s.number} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
                    step > s.number
                      ? "bg-brand-gradient text-black"
                      : step === s.number
                      ? "border-2 border-brand-orange text-white"
                      : "border border-white/15 text-ink-faint"
                  }`}
                  style={
                    step > s.number
                      ? {
                          background:
                            "linear-gradient(135deg, #e53e2a, #f5c518)",
                        }
                      : undefined
                  }
                >
                  {step > s.number ? <Check size={13} strokeWidth={2.5} /> : s.number}
                </div>
                <span
                  className={`text-[10px] mt-1.5 whitespace-nowrap transition-colors ${
                    step >= s.number ? "text-ink-muted" : "text-ink-faint"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className="flex-1 h-px mx-2 mb-4 transition-all duration-500"
                  style={{
                    background:
                      step > s.number
                        ? "linear-gradient(90deg, #e53e2a, #f5c518)"
                        : "rgba(255,255,255,0.08)",
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Form steps */}
        <div className="relative overflow-hidden">
          <AnimatePresence custom={direction} mode="wait">
            <motion.div
              key={step}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {/* ── Step 1: About You ── */}
              {step === 1 && (
                <div className="space-y-6">
                  <div className="mb-6">
                    <h2 className="text-white font-semibold text-xl mb-1">
                      About You
                    </h2>
                    <p className="text-ink-faint text-sm">
                      Tell us who you are and where you're from.
                    </p>
                  </div>
                  <Field label="Full Name" error={errors.name}>
                    <Input value={form.name} onChange={set("name")} placeholder="Your name" />
                  </Field>
                  <Field
                    label="Creator Handle"
                    hint="This becomes your public URL on ShangoMaji: shangomaji.com/creators/your-handle"
                    error={errors.handle}
                  >
                    <Input
                      value={form.handle}
                      onChange={set("handle")}
                      placeholder="your-handle"
                      prefix="@"
                    />
                  </Field>
                  <Field label="Email Address" error={errors.email}>
                    <Input value={form.email} onChange={set("email")} placeholder="you@example.com" />
                  </Field>
                  <Field
                    label="Where Are You From?"
                    hint="City, country or diaspora context. Whatever feels true."
                    error={errors.origin}
                  >
                    <Input value={form.origin} onChange={set("origin")} placeholder="e.g. Lagos, Nigeria / London, UK" />
                  </Field>
                </div>
              )}

              {/* ── Step 2: Your Work ── */}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="mb-6">
                    <h2 className="text-white font-semibold text-xl mb-1">
                      Your Work
                    </h2>
                    <p className="text-ink-faint text-sm">
                      Tell us about the project you want to bring to ShangoMaji.
                    </p>
                  </div>
                  <Field label="Project Title" error={errors.projectTitle}>
                    <Input value={form.projectTitle} onChange={set("projectTitle")} placeholder="What is your project called?" />
                  </Field>
                  <Field label="Project Type" error={errors.projectType}>
                    <div className="grid grid-cols-3 gap-2">
                      {PROJECT_TYPES.map((pt) => (
                        <button
                          key={pt.value}
                          onClick={() => set("projectType")(pt.value)}
                          className={`py-3 px-3 rounded-xl text-xs font-medium border transition-all duration-200 ${
                            form.projectType === pt.value
                              ? "border-transparent text-black"
                              : "border-white/10 text-ink-muted hover:border-white/20 hover:text-white"
                          }`}
                          style={
                            form.projectType === pt.value
                              ? {
                                  background:
                                    "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)",
                                }
                              : undefined
                          }
                        >
                          {pt.label}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label="Genres" hint="Select all that apply." error={errors.genres}>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {GENRE_OPTIONS.map((g) => (
                        <button
                          key={g}
                          onClick={() => toggleGenre(g)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
                            form.genres.includes(g)
                              ? "border-transparent text-black"
                              : "border-white/10 text-ink-muted hover:border-white/20 hover:text-white"
                          }`}
                          style={
                            form.genres.includes(g)
                              ? {
                                  background:
                                    "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)",
                                }
                              : undefined
                          }
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field
                    label="Logline"
                    hint="One or two sentences. What is your story about?"
                    error={errors.logline}
                  >
                    <Textarea
                      value={form.logline}
                      onChange={set("logline")}
                      placeholder="A young archivist discovers…"
                      rows={3}
                    />
                  </Field>
                  <Field
                    label="Sample Work URL"
                    hint="Link to a reel, trailer, episode, or portfolio. YouTube, Vimeo, or a direct link."
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <Input
                          value={form.sampleUrl}
                          onChange={set("sampleUrl")}
                          placeholder="https://"
                        />
                      </div>
                      <button className="flex items-center gap-2 px-4 py-3.5 glass rounded-xl text-ink-muted hover:text-white text-xs transition-colors flex-shrink-0">
                        <Upload size={13} />
                        Upload
                      </button>
                    </div>
                  </Field>
                </div>
              )}

              {/* ── Step 3: Your Vision ── */}
              {step === 3 && (
                <div className="space-y-6">
                  <div className="mb-6">
                    <p className="text-xs mb-3" style={{ color: "rgba(240,112,48,0.6)" }}>
                      There are no right answers here. Just clarity.
                    </p>
                    <h2 className="text-white font-semibold text-xl mb-1">
                      Your Vision
                    </h2>
                    <p className="text-ink-faint text-sm">
                      This is the part that actually matters to us.
                    </p>
                  </div>
                  <Field
                    label="Creative Influences"
                    hint="Who shaped how you see and make? Directors, artists, writers, musicians. Anything that built your eye."
                    error={errors.influences}
                  >
                    <Textarea
                      value={form.influences}
                      onChange={set("influences")}
                      placeholder="Hayao Miyazaki's sense of visual wonder, the emotional scale of Berserk, Basquiat's relationship with text and image…"
                      rows={4}
                    />
                  </Field>
                  <Field
                    label="Why ShangoMaji?"
                    hint="Not a formal answer. Why does this platform feel like the right home for what you make?"
                    error={errors.whyShangoMaji}
                  >
                    <Textarea
                      value={form.whyShangoMaji}
                      onChange={set("whyShangoMaji")}
                      placeholder="Tell us what drew you here specifically…"
                      rows={5}
                    />
                  </Field>
                  <Field
                    label="What Do You Need?"
                    hint="Visibility, community, resources, creative support. Be honest about what would actually help you build."
                  >
                    <Textarea
                      value={form.whatYouNeed}
                      onChange={set("whatYouNeed")}
                      placeholder="I need an audience that understands…"
                      rows={4}
                    />
                  </Field>
                </div>
              )}

              {/* ── Step 4: Links ── */}
              {step === 4 && (
                <div className="space-y-6">
                  <div className="mb-6">
                    <h2 className="text-white font-semibold text-xl mb-1">
                      Your Links
                    </h2>
                    <p className="text-ink-faint text-sm">
                      All optional. Share what's relevant.
                    </p>
                  </div>
                  <Field label="Instagram">
                    <Input
                      value={form.instagram}
                      onChange={set("instagram")}
                      placeholder="username"
                      prefix="instagram.com/"
                    />
                  </Field>
                  <Field label="X / Twitter">
                    <Input
                      value={form.twitter}
                      onChange={set("twitter")}
                      placeholder="username"
                      prefix="x.com/"
                    />
                  </Field>
                  <Field label="YouTube">
                    <Input
                      value={form.youtube}
                      onChange={set("youtube")}
                      placeholder="channel link"
                      prefix="youtube.com/"
                    />
                  </Field>
                  <Field label="Website / Portfolio">
                    <Input
                      value={form.website}
                      onChange={set("website")}
                      placeholder="https://yoursite.com"
                    />
                  </Field>

                  {/* Review summary */}
                  <div className="mt-8 p-5 rounded-2xl bg-surface-raised border border-white/8 space-y-3">
                    <p className="text-xs uppercase tracking-widest text-ink-faint">
                      Review
                    </p>
                    {[
                      { label: "Name", value: form.name },
                      { label: "Handle", value: `@${form.handle}` },
                      { label: "Project", value: form.projectTitle },
                      { label: "Type", value: form.projectType },
                      { label: "Genres", value: form.genres.join(", ") },
                    ].map(({ label, value }) => value ? (
                      <div key={label} className="flex justify-between text-sm gap-4">
                        <span className="text-ink-faint flex-shrink-0">{label}</span>
                        <span className="text-white text-right truncate">{value}</span>
                      </div>
                    ) : null)}
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
            {isSubmitting ? "Submitting..." : step === 4 ? "Submit Application" : "Continue"}
            {!isSubmitting && (
              <ChevronRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            )}
          </button>
        </div>

        {/* Submission error */}
        {submitError && (
          <p className="text-center text-sm mt-4" style={{ color: "rgba(229,62,42,0.9)" }}>
            {submitError}
          </p>
        )}
      </div>
    </div>
  );
}
