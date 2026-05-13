"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Check, Upload, AlertCircle } from "lucide-react";
import { SiteFooter } from "@/components/nav/SiteFooter";
import {
  validateNamePart,
  validateCity,
  validateRegion,
  validateCountry,
  COUNTRY_LIST,
} from "@/lib/creator-identity";

// ─── Form state types ─────────────────────────
interface FormData {
  // Step 1 — About You (structured identity)
  firstName: string;
  lastName: string;
  handle: string;
  email: string;
  city: string;
  region: string;
  country: string;
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
  "Action",
  "Adventure",
  "Fantasy",
  "Sci-Fi",
  "Supernatural",
  "Drama",
  "Comedy",
  "Romance",
  "Horror",
  "Thriller",
  "Mystery",
  "Slice of Life",
  "Sports",
  "Martial Arts",
  "Mecha",
  "Afrofuturism",
  "Historical",
  "Coming-of-Age",
  "Psychological",
  "Mythology-Inspired",
  "Urban Fantasy",
  "Other",
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
  firstName: "",
  lastName: "",
  handle: "",
  email: "",
  city: "",
  region: "",
  country: "",
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

// Single Before You Apply policy card. Renders a visible heading + concise
// summary, with the full approved policy text behind a per-card collapsible
// so cards stay visually controlled when sitting side by side at lg+.
// Full-width policy section inside the Required Before Applying panel
// (left page of the notebook surface). Each section spans the panel
// width so the left page reads as a structured document rather than
// a grid of cramped cards. Sections are separated by a top rule and
// generous spacing; no dropdown, no card, no hidden content.
function PolicySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8 pt-6 border-t border-white/10">
      <h3 className="text-[16px] font-semibold text-white tracking-tight leading-snug">
        {title}
      </h3>
      <div className="mt-3 space-y-3 text-[13.5px] text-white/85 leading-relaxed">
        {children}
      </div>
    </section>
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
      const firstRes = validateNamePart(form.firstName, "first_name");
      if (!firstRes.ok) e.firstName = firstRes.error.message;

      const lastRes = validateNamePart(form.lastName, "last_name");
      if (!lastRes.ok) e.lastName = lastRes.error.message;

      if (!form.handle.trim()) e.handle = "Handle is required.";

      if (!form.email.trim()) e.email = "Email is required.";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email address.";

      const cityRes = validateCity(form.city);
      if (!cityRes.ok) e.city = cityRes.error.message;

      const regionRes = validateRegion(form.region);
      if (!regionRes.ok) e.region = regionRes.error.message;

      const countryRes = validateCountry(form.country);
      if (!countryRes.ok) e.country = countryRes.error.message;
    }

    if (step === 2) {
      if (!form.projectTitle.trim()) e.projectTitle = "Project title is required.";
      if (!form.projectType) e.projectType = "Choose a project type.";
      if (form.genres.length === 0) e.genres = "Select at least one genre.";
      if (!form.logline.trim()) e.logline = "A project description is required.";
    }

    if (step === 3) {
      if (!form.influences.trim()) e.influences = "Tell us at least one influence.";
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
            Application received.
          </h1>
          <p className="text-ink-muted leading-relaxed mb-3">
            Your creator application has been received. We'll review it and follow up if you're approved to move forward.
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
              Back to ShangoMaji
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 pb-20 flex flex-col">
      <div className="max-w-[1700px] mx-auto px-6 sm:px-8 lg:px-12 xl:px-12 2xl:px-14 py-12 flex-1 w-full">
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
            Apply to <span className="brand-text">ShangoMaji</span><span className="brand-text align-top text-[0.45em] ml-0.5" aria-hidden="true">™</span>
            <span className="sr-only">™</span>
          </h1>
          <p className="text-ink-muted text-sm leading-relaxed">
            This isn't for everyone. Take your
            time, every answer matters.
          </p>
        </motion.div>

        {/* ─────────────── NOTEBOOK SURFACE ───────────────
            At xl+ this becomes a two-page application packet:
              Left page: Required Before Applying policy panel.
              Right page: active application form.
            Below xl the grid collapses to a single column with DOM
            order preserved (policy first, then form), matching the
            required mobile read order. */}
        <div className="grid grid-cols-1 gap-10 xl:grid-cols-[minmax(620px,700px)_minmax(0,1fr)] xl:gap-10 2xl:grid-cols-[minmax(700px,780px)_minmax(0,1fr)] 2xl:gap-12 xl:items-start">

        {/* ─── LEFT PAGE — Required Before Applying ───
            Full visible policy substance, no dropdowns. On xl+ it is
            sticky against the top nav and scrolls within itself if the
            content is taller than the viewport, so it behaves like a
            real notebook left page beside the form. */}
        <motion.aside
          className="rounded-2xl border border-amber-500/15 bg-white/[0.02] p-6 sm:p-8"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(245,197,24,0.045), rgba(255,255,255,0.015) 25%, rgba(255,255,255,0) 50%)",
          }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          aria-label="Required before applying"
        >
          {/* Required-read badge */}
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/[0.08] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: "#f5c518" }}
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: "#f5c518" }} />
            Required before applying
          </span>

          <h2
            className="mt-3 text-white text-[24px] sm:text-[28px] font-semibold tracking-tight leading-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Before you apply
          </h2>
          <p className="mt-3 text-[14px] text-white/90 leading-relaxed">
            ShangoMaji<span className="align-top text-[0.55em] ml-0.5" aria-hidden="true">™</span> is a curated anime distribution label. This is not open upload, self-publishing, or instant public release. You are submitting your work for review.
          </p>

          {/* Expectations — compact rules in a 2-column grid at sm+ so
              the panel reads as a landscape page rather than a single
              vertical list, regardless of viewport size. */}
          <p className="mt-6 text-[10px] uppercase tracking-[0.18em] text-white/55 font-semibold">
            Expectations
          </p>
          <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-[13px] text-white/85 leading-snug">
            {[
              "You are submitting for review, not publication.",
              "Approval is not automatic public catalog placement.",
              "Distribution requires licensing, media readiness, and ShangoMaji review.",
              "Creators retain ownership of their work.",
              "ShangoMaji controls public catalog inclusion and release readiness.",
              "Mature storytelling is allowed when it serves the work.",
              "Pornographic or sexually exploitative content is not accepted.",
              "Fully AI-generated submissions are not accepted at launch.",
              "Any AI-assisted use must be disclosed.",
            ].map((line) => (
              <li key={line} className="flex gap-2.5 items-start">
                <span className="mt-[7px] inline-block h-1 w-1 shrink-0 rounded-full bg-white/60" />
                <span>{line}</span>
              </li>
            ))}
          </ul>

          {/* Policy sections — each section spans the full policy
              panel width so the left page reads as a structured
              document rather than a grid of cramped cards. */}
          <PolicySection title="Mature Storytelling Standard">
            <p>
              ShangoMaji accepts serious anime and anime-inspired works with mature themes when those themes serve the story. A project may include violence, horror, blood, grief, trauma, psychological intensity, strong language, dark fantasy, adult situations, or other R-rated material when handled with purpose and creative control.
            </p>
            <p>
              ShangoMaji is not a children’s platform, and mature storytelling is not automatically disqualifying.
            </p>
            <p>
              ShangoMaji is also not a pornographic or sexually explicit content platform. Pornographic content, sexually exploitative material, and sexualized depictions of minors are not accepted.
            </p>
            <p>
              All mature content is reviewed in context. The question is not whether a work is intense. The question is whether the intensity belongs to the story, respects the audience, and fits the ShangoMaji catalog standard.
            </p>
          </PolicySection>

          <PolicySection title="AI Use and Human Authorship">
            <p>
              At launch, ShangoMaji prioritizes human-created work. Fully AI-generated submissions are not accepted for catalog consideration at this stage.
            </p>
            <p>
              Limited AI-assisted work may be reviewed case by case, but creators must disclose how AI tools were used. This includes AI used for images, animation, writing, voices, music, editing, reference generation, concept development, or any other material part of the project.
            </p>
            <p>
              Disclosure does not automatically disqualify a project. Hidden AI use, unclear authorship, or work that cannot be responsibly credited or licensed may block review.
            </p>
            <p>
              The standard is simple: the work must have clear human authorship, rights clarity, and creative responsibility.
            </p>
          </PolicySection>

          <PolicySection title="How Submissions Are Reviewed">
            <p>
              Submitting a project does not guarantee acceptance. ShangoMaji reviews submissions based on project fit, originality, creative direction, quality of materials, completeness, rights clarity, content policy alignment, and whether the work can be responsibly reviewed, licensed, and prepared for distribution.
            </p>
            <p>
              A project may be rejected because it is incomplete, outside the platform’s focus, unclear in rights ownership, not ready for review, not aligned with the catalog standard, or not suitable for distribution at this time.
            </p>
            <p>
              Rejection is not a judgment of the creator’s worth. It means the submitted project does not currently meet the standard or timing required for ShangoMaji review, licensing, or catalog consideration.
            </p>
            <p>
              ShangoMaji reserves editorial discretion over review decisions, catalog fit, public visibility, and distribution readiness.
            </p>
          </PolicySection>

          <div className="mt-8 pt-5 border-t border-white/10 space-y-2.5">
            <p className="text-[12.5px] text-white/85 leading-relaxed">
              Apply only if you are ready to present your work clearly, disclose rights and collaborators honestly, and move through a serious review process.
            </p>
            <p className="text-[12.5px] text-white/75">
              Questions before applying?{" "}
              <Link href="/help" className="text-white underline decoration-white/30 underline-offset-2 hover:decoration-white/60 transition">
                Read the creator FAQ
              </Link>
              .
            </p>
          </div>
        </motion.aside>

        {/* ─── RIGHT PAGE — Application form ───
            Step indicator + active step form + Back/Continue. Sized to
            fill the right column of the notebook grid; on mobile this
            stacks naturally below the policy panel. */}
        <div className="min-w-0">

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
                      Use your real legal name. This identity is used on the distribution license you sign later.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="First Legal Name" error={errors.firstName}>
                      <Input
                        value={form.firstName}
                        onChange={set("firstName")}
                        placeholder="First name"
                      />
                    </Field>
                    <Field label="Last Legal Name" error={errors.lastName}>
                      <Input
                        value={form.lastName}
                        onChange={set("lastName")}
                        placeholder="Last name"
                      />
                    </Field>
                  </div>

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

                  <div className="space-y-1.5 pt-2">
                    <p className="text-xs uppercase tracking-widest text-ink-faint">
                      Location
                    </p>
                    <p className="text-xs text-ink-faint leading-relaxed">
                      Real city, region, and country. No "Earth" or "Internet".
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="City" error={errors.city}>
                      <Input
                        value={form.city}
                        onChange={set("city")}
                        placeholder="e.g. Lagos"
                      />
                    </Field>
                    <Field label="State / Province / Region" error={errors.region}>
                      <Input
                        value={form.region}
                        onChange={set("region")}
                        placeholder="e.g. Lagos State"
                      />
                    </Field>
                  </div>

                  <Field label="Country" error={errors.country}>
                    <div className="flex items-center bg-surface-raised border border-white/10 rounded-xl overflow-hidden focus-within:border-brand-orange/50 transition-colors">
                      <select
                        value={form.country}
                        onChange={(e) => set("country")(e.target.value)}
                        className="flex-1 bg-surface-raised px-4 py-3.5 text-white text-sm outline-none appearance-none cursor-pointer"
                        style={{ colorScheme: "dark" }}
                      >
                        <option value="" disabled style={{ background: "#1a1a1a", color: "rgba(255,255,255,0.55)" }}>
                          Select a country
                        </option>
                        {COUNTRY_LIST.map((c) => (
                          <option
                            key={c}
                            value={c}
                            style={{ background: "#1a1a1a", color: "#ffffff" }}
                          >
                            {c}
                          </option>
                        ))}
                      </select>
                      <span className="px-3 text-ink-faint pointer-events-none select-none" aria-hidden="true">
                        ▾
                      </span>
                    </div>
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
                    label="Project Description"
                    hint="Describe your project in detail, including the story concept, format, current stage, intended audience, tone, creative goals, and what kind of support or opportunity you are seeking."
                    error={errors.logline}
                  >
                    <Textarea
                      value={form.logline}
                      onChange={set("logline")}
                      placeholder="A young archivist discovers a forgotten god — a 6-episode animated series, currently in scripts and concept art. Aimed at adult anime fans drawn to mythic storytelling. Seeking distribution, audience, and creative partnership to finish production."
                      rows={14}
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
                        Add file
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
                    hint="Not a formal answer. Why does this feel like the right home for what you make?"
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
                      All optional.
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
                      { label: "Name",     value: `${form.firstName} ${form.lastName}`.trim() },
                      { label: "Handle",   value: form.handle ? `@${form.handle}` : "" },
                      { label: "Location", value: [form.city, form.region, form.country].filter(Boolean).join(", ") },
                      { label: "Project",  value: form.projectTitle },
                      { label: "Type",     value: form.projectType },
                      { label: "Genres",   value: form.genres.join(", ") },
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
        {/* /right page — application form */}

        </div>
        {/* /notebook surface */}
      </div>
      <SiteFooter />
    </div>
  );
}
