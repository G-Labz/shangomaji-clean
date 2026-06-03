"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Upload,
  AlertCircle,
  ShieldCheck,
  Flame,
  Sparkles,
  FileSearch,
  Timer,
  ScrollText,
  Coins,
} from "lucide-react";
import { SiteFooter } from "@/components/nav/SiteFooter";
import {
  validateNamePart,
  validateCreditedName,
  validateEmailAddress,
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
  creditedName: string;
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

// Project type values are persisted to the database and used downstream
// by admin review and license generation. We do not rename the `value`
// keys (that would be a backend/data change). We only update the visible
// labels so the public copy matches launch positioning: video-first /
// animation-facing work. The legacy "manga" value is presented as
// "Visual / Adaptation" with helper copy that clarifies ShangoMaji is
// not launching as a comic publishing platform or Webtoon-style reader.
const PROJECT_TYPES = [
  { value: "series", label: "Series" },
  { value: "movie", label: "Feature Film" },
  { value: "short", label: "Short Film" },
  { value: "manga", label: "Visual / Adaptation" },
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
  creditedName: "",
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

// Compact rule item used inside the Review Rules card at the top of the
// Before You Apply panel. The dot is gold-accented to read as a deliberate
// rule list rather than a generic bullet.
function RuleItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5 items-start text-[13px] text-white/85 leading-snug">
      <span
        className="mt-[7px] inline-block h-1 w-1 shrink-0 rounded-full"
        style={{ background: "rgba(245,197,24,0.8)" }}
      />
      <span>{children}</span>
    </li>
  );
}

// Policy card. Mirrors the visual language of the Why page trust system:
// rounded card surface, subtle gradient, icon glyph in a brand-tinted
// tile, gold eyebrow, white display heading, and readable body. Used
// inside the Before You Apply panel so each policy area reads as an
// intentional unit instead of a divider-stacked memo.
function PolicyCard({
  icon: Icon,
  eyebrow,
  title,
  children,
}: {
  icon: React.ElementType;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article
      className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-7 transition-colors hover:border-white/15"
      style={{
        backgroundImage:
          "linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0) 55%)",
      }}
    >
      <div className="flex items-start gap-3 mb-3.5">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(229,62,42,0.16), rgba(245,197,24,0.16))",
            border: "1px solid rgba(245,197,24,0.25)",
          }}
        >
          <Icon size={15} className="brand-text" />
        </div>
        <div className="min-w-0">
          <p
            className="text-[10px] uppercase tracking-[0.22em] font-semibold leading-none"
            style={{ color: "rgba(245,197,24,0.78)" }}
          >
            {eyebrow}
          </p>
          <h3 className="mt-1.5 text-white font-semibold text-[16px] tracking-tight leading-tight">
            {title}
          </h3>
        </div>
      </div>
      <div
        className="space-y-3 text-[13.5px] leading-relaxed"
        style={{ color: "rgba(255,255,255,0.82)" }}
      >
        {children}
      </div>
    </article>
  );
}

// Mini process strip rendered inside the Required Before Applying band.
// Communicates the path that follows a complete submission so creators
// see the full lifecycle alongside the rules: Review → License → Media
// Readiness → Release Decision.
const PANEL_PROCESS = [
  { n: "01", title: "Review", body: "Editorial review of fit, originality, and rights clarity." },
  { n: "02", title: "License", body: "Signed agreement granting distribution rights." },
  { n: "03", title: "Media Readiness", body: "Materials prepared and aligned for catalog release." },
  { n: "04", title: "Release Decision", body: "Editorial placement, timing, and public visibility." },
];

// Compact commitment card used in the side column of the application
// workspace. Surfaces the load-bearing trust commitments next to the
// form so a creator filling it out can glance at them without scrolling
// to the full policy section below. Intentionally tight — full policy
// substance still lives in the PolicyCards beneath the workspace.
type Commitment = {
  icon: React.ElementType;
  title: string;
  body: string;
};

const KEY_COMMITMENTS: Commitment[] = [
  {
    icon: ShieldCheck,
    title: "You keep your work",
    body: "Submitting does not transfer copyright. Approval does not transfer copyright.",
  },
  {
    icon: Sparkles,
    title: "No AI training",
    body: "ShangoMaji will not use creator-submitted materials to train generative AI models.",
  },
  {
    icon: FileSearch,
    title: "Review, not publication",
    body: "Submission is review. Approval moves into licensing and media readiness, not automatic release.",
  },
  {
    icon: Coins,
    title: "Revenue lives in the agreement",
    body: "No creator payment is promised at launch. If revenue ever applies, the terms live in a signed agreement. Never by default.",
  },
];

function CommitmentCard({ commitment }: { commitment: Commitment }) {
  const Icon = commitment.icon;
  return (
    <article
      className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"
      style={{
        backgroundImage:
          "linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0) 60%)",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(229,62,42,0.16), rgba(245,197,24,0.16))",
            border: "1px solid rgba(245,197,24,0.22)",
          }}
        >
          <Icon size={13} className="brand-text" />
        </div>
        <div className="min-w-0">
          <p className="text-white font-semibold text-[13.5px] leading-snug">
            {commitment.title}
          </p>
          <p
            className="mt-1.5 text-[12.5px] leading-relaxed"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            {commitment.body}
          </p>
        </div>
      </div>
    </article>
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

      const creditedRes = validateCreditedName(form.creditedName);
      if (!creditedRes.ok) e.creditedName = creditedRes.error.message;

      if (!form.handle.trim()) e.handle = "Handle is required.";

      const emailRes = validateEmailAddress(form.email);
      if (!emailRes.ok) e.email = emailRes.error.message;

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
      <div className="max-w-[1700px] mx-auto px-6 sm:px-8 lg:px-12 xl:px-12 2xl:px-10 py-12 flex-1 w-full">
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

        {/* ─────────────── REQUIRED BEFORE APPLYING BAND ───────────────
            Full-width orientation band at the top of the canvas. Carries
            the identity block, the Review Rules card, and the mini
            process strip. Strong but compact — does not contain the full
            six policy cards (those live in the dedicated Policy Details
            section below the workspace). */}
        <motion.section
          className="rounded-2xl border border-amber-500/15 bg-white/[0.02] p-6 sm:p-8 lg:p-10 mb-10"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(245,197,24,0.045), rgba(255,255,255,0.015) 25%, rgba(255,255,255,0) 55%)",
          }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          aria-label="Required before applying"
        >
          {/* Identity block — badge + heading + intro + launch-priority */}
          <div className="max-w-3xl">
            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/[0.08] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: "#f5c518" }}
            >
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: "#f5c518" }}
              />
              Required before applying
            </span>

            <h2
              className="mt-3 text-white text-[26px] sm:text-[30px] lg:text-[34px] font-semibold tracking-tight leading-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Before you apply
            </h2>
            <p className="mt-3 text-[14.5px] text-white/90 leading-relaxed">
              ShangoMaji<span className="align-top text-[0.55em] ml-0.5" aria-hidden="true">™</span> is a curated anime distribution label. This is not open upload, self-publishing, or instant public release. You are submitting your work for review.
            </p>
            <p className="mt-2 text-[13.5px] text-white/70 leading-relaxed">
              Launch review priority is video-first and animation-facing work: animated shorts, pilots, trailers, animatics, anime-inspired short films, and motion-comic style video where applicable.
            </p>
          </div>

          {/* Band interior — two-column on lg+: Review Rules left, process strip right. */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] gap-6 lg:gap-8 items-start">
            {/* Review Rules card */}
            <section
              className="rounded-2xl border border-amber-500/25 p-5 sm:p-6"
              style={{
                background:
                  "linear-gradient(180deg, rgba(245,197,24,0.06), rgba(255,255,255,0.015) 65%)",
              }}
              aria-label="Review rules"
            >
              <div className="flex items-center gap-2.5 mb-4">
                <ShieldCheck size={15} className="text-brand-yellow" />
                <p
                  className="text-[10px] uppercase tracking-[0.22em] font-semibold"
                  style={{ color: "rgba(245,197,24,0.9)" }}
                >
                  Review rules
                </p>
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                <RuleItem>Submitting for review, not publication.</RuleItem>
                <RuleItem>Approval is not automatic catalog placement.</RuleItem>
                <RuleItem>Distribution requires licensing, media readiness, and ShangoMaji review.</RuleItem>
                <RuleItem>Creators retain ownership of their work.</RuleItem>
                <RuleItem>ShangoMaji controls catalog inclusion and release readiness.</RuleItem>
                <RuleItem>
                  <span className="text-white font-medium">
                    ShangoMaji will not use creator-submitted materials to train generative AI models.
                  </span>
                </RuleItem>
                <RuleItem>Mature storytelling is allowed when it serves the work.</RuleItem>
                <RuleItem>Pornographic or sexually exploitative content is not accepted.</RuleItem>
                <RuleItem>Primarily or fully AI-generated submissions are not accepted at launch.</RuleItem>
                <RuleItem>Any AI-assisted use must be disclosed.</RuleItem>
              </ul>
            </section>

            {/* Mini process strip */}
            <section aria-label="After submission">
              <p
                className="text-[10px] uppercase tracking-[0.22em] font-semibold mb-3.5"
                style={{ color: "rgba(245,197,24,0.78)" }}
              >
                After a complete submission
              </p>
              <ol className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {PANEL_PROCESS.map((p) => (
                  <li
                    key={p.n}
                    className="relative rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3.5"
                  >
                    <div className="flex items-baseline gap-2.5">
                      <span
                        className="text-[10px] font-mono tracking-widest"
                        style={{ color: "rgba(245,197,24,0.7)" }}
                      >
                        {p.n}
                      </span>
                      <p className="text-white font-semibold text-[13px] leading-tight">
                        {p.title}
                      </p>
                    </div>
                    <p
                      className="mt-1.5 text-[12.5px] leading-snug"
                      style={{ color: "rgba(255,255,255,0.65)" }}
                    >
                      {p.body}
                    </p>
                  </li>
                ))}
              </ol>
              <p
                className="mt-3 text-[12px]"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                No same-day approval. No automated path from submit to public.
              </p>
            </section>
          </div>
        </motion.section>

        {/* ─────────────── APPLICATION WORKSPACE ───────────────
            Form column is primary; side column carries compact
            commitments so the creator can scan trust posture while
            filling out the form. On mobile this stacks form-first,
            commitments below. Full policy details live in their own
            section below this workspace. */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px] gap-8 lg:gap-10 items-start">

        {/* ─── Form column — primary ─── */}
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
                      Your legal name is used for review and licensing. Your public / credited name is how you want to be credited if accepted. Your legal name is not automatically shown publicly.
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
                    label="Public / Credited Name"
                    hint="The name you want associated with your work if accepted. This may be your creator name, studio name, pen name, brand name, or legal name. Your legal name is used for review and licensing and is not automatically shown publicly."
                    error={errors.creditedName}
                  >
                    <Input
                      value={form.creditedName}
                      onChange={set("creditedName")}
                      placeholder="e.g. Studio Kairo, Kay Boo, Marlon Merritt"
                    />
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
                  <Field
                    label="Project Type"
                    hint="Launch review priority is video-first and animation-facing work: animated shorts, pilots, trailers, animatics, anime-inspired short films, and motion-comic style video where applicable. Visual / Adaptation is for visual story projects with strong adaptation or video-development potential. ShangoMaji is not launching as a comic publishing platform or Webtoon-style reader."
                    error={errors.projectType}
                  >
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
                      Tell us how the work is built, why it matters, and how it fits ShangoMaji's review standard.
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
                    <p className="text-xs mb-3" style={{ color: "rgba(240,112,48,0.7)" }}>
                      Final step
                    </p>
                    <h2 className="text-white font-semibold text-xl mb-1">
                      Your Links
                    </h2>
                    <p className="text-ink-faint text-sm leading-relaxed">
                      All link fields are optional. Leave any blank if you
                      do not have them. Review the summary below, then click{" "}
                      <span className="text-white font-medium">Submit Application</span>{" "}
                      to send your application for review.
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
                      { label: "Legal Name", value: `${form.firstName} ${form.lastName}`.trim() },
                      { label: "Credited",   value: form.creditedName },
                      { label: "Handle",     value: form.handle ? `@${form.handle}` : "" },
                      { label: "Location",   value: [form.city, form.region, form.country].filter(Boolean).join(", ") },
                      { label: "Project",    value: form.projectTitle },
                      { label: "Type",       value: form.projectType },
                      { label: "Genres",     value: form.genres.join(", ") },
                    ].map(({ label, value }) => value ? (
                      <div key={label} className="flex justify-between text-sm gap-4">
                        <span className="text-ink-faint flex-shrink-0">{label}</span>
                        <span className="text-white text-right truncate">{value}</span>
                      </div>
                    ) : null)}
                  </div>

                  {/* Phase 10J-D — No Revenue Launch Phase disclosure (visible only; no stored ack). */}
                  <div className="mt-6 p-4 rounded-2xl border border-white/10 bg-white/[0.02]">
                    <p className="text-[11px] uppercase tracking-[0.18em] mb-2" style={{ color: "rgba(245,197,24,0.7)" }}>
                      Before you submit
                    </p>
                    <p className="text-ink-faint text-[13px] leading-relaxed">
                      ShangoMaji is in a disclosed No Revenue Launch Phase. No creator payment and no revenue share is promised or assumed. Submitting, review, approval, onboarding, catalog placement, visibility, follows, or audience signal do not create payment. You retain ownership of your work. Any future monetization would require a written agreement or executed addendum before it applies.
                    </p>
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
        {/* /form column */}

        {/* ─── Side column — Key Commitments ───
            Compact trust commitments visible alongside the form. Sticky
            on lg+ so the commitments stay in view while the creator
            scrolls through long form steps. Not a substitute for the
            full Policy Details section below — these are scan anchors,
            not detail. */}
        <aside className="lg:sticky lg:top-24" aria-label="Key commitments">
          <p
            className="text-[10px] uppercase tracking-[0.22em] font-semibold mb-3.5"
            style={{ color: "rgba(245,197,24,0.78)" }}
          >
            Key commitments
          </p>
          <div className="space-y-3">
            {KEY_COMMITMENTS.map((c) => (
              <CommitmentCard key={c.title} commitment={c} />
            ))}
          </div>
          <p className="mt-4 text-[12px] text-white/55 leading-relaxed">
            Full policy details below.{" "}
            <Link
              href="/help"
              className="text-white/85 underline decoration-white/25 underline-offset-2 hover:decoration-white/50 transition"
            >
              Read the FAQ
            </Link>
            .
          </p>
        </aside>

        </div>
        {/* /application workspace */}

        {/* ─────────────── FULL POLICY DETAILS ───────────────
            All six policy cards from 10G.4, placed in a wider section
            below the workspace so the policy content uses the canvas
            properly instead of being trapped in a skinny side rail.
            Two-column grid on lg+; stacks on mobile. No dropdowns. */}
        <section className="mt-20 lg:mt-24" aria-label="Full policy details">
          <div className="mb-8 lg:mb-10 max-w-3xl">
            <p
              className="text-[10px] uppercase tracking-[0.22em] font-semibold"
              style={{ color: "rgba(245,197,24,0.78)" }}
            >
              Full policy details
            </p>
            <h2
              className="mt-3 text-white text-3xl md:text-4xl font-semibold tracking-tight leading-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Read before you submit.
            </h2>
            <p
              className="mt-3 text-[14.5px] leading-relaxed"
              style={{ color: "rgba(255,255,255,0.72)" }}
            >
              The full policy substance behind each rule above. Nothing
              hidden, nothing in a dropdown. If a section here does not
              describe how you want to release your work, ShangoMaji may
              not be the right home for it.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6">
            <PolicyCard
              icon={Flame}
              eyebrow="Standard"
              title="Mature Storytelling"
            >
              <p>
                ShangoMaji accepts serious anime and anime-inspired works with mature themes when those themes serve the story. A project may include violence, horror, blood, grief, trauma, psychological intensity, strong language, dark fantasy, adult situations, or other R-rated material when handled with purpose and creative control.
              </p>
              <p>
                ShangoMaji is not a children&rsquo;s platform, and mature storytelling is not automatically disqualifying.
              </p>
              <p>
                ShangoMaji is also not a pornographic or sexually explicit content platform. Pornographic content, sexually exploitative material, and sexualized depictions of minors are not accepted.
              </p>
              <p>
                All mature content is reviewed in context. The question is not whether a work is intense. The question is whether the intensity belongs to the story, respects the audience, and fits the ShangoMaji catalog standard.
              </p>
            </PolicyCard>

            <PolicyCard
              icon={Sparkles}
              eyebrow="AI"
              title="AI and Human Authorship"
            >
              <p className="text-white font-medium">
                ShangoMaji will not use creator-submitted materials to train generative AI models.
              </p>
              <p>
                That commitment applies to applications, samples, finished work, and anything else creators send through the platform.
              </p>
              <p>
                At launch, ShangoMaji prioritizes human-created work. Primarily or fully AI-generated submissions are not accepted for catalog consideration at this stage.
              </p>
              <p>
                Limited AI-assisted work may be reviewed case by case when the use is disclosed, human authorship is clear, and the rights posture is clean. This includes AI used for images, animation, writing, voices, music, editing, reference generation, concept development, or any other material part of the project.
              </p>
              <p>
                Disclosure does not automatically disqualify a project. Hidden or undisclosed AI use may block review, licensing, or release, and may trigger rejection or removal review depending on stage.
              </p>
              <p>
                The standard is not anti-tool. It is pro-creator: clear human authorship, rights clarity, and creative responsibility.
              </p>
            </PolicyCard>

            <PolicyCard
              icon={FileSearch}
              eyebrow="Review"
              title="How Submissions Are Reviewed"
            >
              <p>
                Submitting a project does not guarantee acceptance. ShangoMaji reviews submissions based on project fit, originality, creative direction, quality of materials, completeness, rights clarity, content policy alignment, and whether the work can be responsibly reviewed, licensed, and prepared for distribution.
              </p>
              <p>
                A project may be rejected because it is incomplete, outside the platform&rsquo;s focus, unclear in rights ownership, not ready for review, not aligned with the catalog standard, or not suitable for distribution at this time.
              </p>
              <p>
                Rejection is not a judgment of the creator&rsquo;s worth. It means the submitted project does not currently meet the standard or timing required for ShangoMaji review, licensing, or catalog consideration.
              </p>
              <p>
                ShangoMaji reserves editorial discretion over review decisions, catalog fit, public visibility, and distribution readiness.
              </p>
            </PolicyCard>

            <PolicyCard
              icon={Timer}
              eyebrow="Timing"
              title="Review Timing"
            >
              <p>
                Applications are reviewed in cycles. Early review windows may take several weeks. There is no same-day or instant approval.
              </p>
              <p>
                Incomplete submissions may be returned for completion. Complete submissions receive an outcome. Submission is review, not publication. Approval moves the work into licensing and media-readiness review, not into automatic public release.
              </p>
            </PolicyCard>

            <PolicyCard
              icon={ScrollText}
              eyebrow="License"
              title="License and What You Keep"
            >
              <p>
                Creators retain ownership of their work. Submitting does not transfer copyright. Approval does not transfer copyright. ShangoMaji acquires distribution rights only through a signed agreement.
              </p>
              <p>
                The agreement spells out rights granted, term, removal process, revenue terms where applicable, and what the creator keeps. You receive the agreement before you sign it. You have time to review it. You may ask process questions.
              </p>
              <p>
                ShangoMaji cannot provide legal advice. For binding decisions about your work, consult your own lawyer. The agreement is written to be readable, and the process is not designed to rush you.
              </p>
            </PolicyCard>

            <PolicyCard
              icon={Coins}
              eyebrow="Revenue"
              title="No Revenue Launch Phase"
            >
              <p className="text-white font-medium">
                ShangoMaji is in a disclosed No Revenue Launch Phase. No creator payment and no revenue share is promised or assumed at launch.
              </p>
              <p>
                Submission, review, approval, onboarding, catalog placement, visibility, follows, or audience signal do not create payment. You retain ownership of your work.
              </p>
              <p>
                If a monetized phase is ever introduced, it requires a written agreement or executed addendum that defines the terms before they apply &mdash; nothing is automatic. Sponsorship or partner development is institutional revenue work and does not automatically create creator payment.
              </p>
            </PolicyCard>
          </div>
        </section>

        {/* ─── Closing strip ───
            Clean intentional close, sized to the canvas. */}
        <section
          className="mt-12 lg:mt-14 rounded-2xl border border-white/10 p-6 lg:p-8"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0) 70%)",
          }}
        >
          <p className="text-[13.5px] text-white/85 leading-relaxed max-w-3xl">
            Apply only if you are ready to present your work clearly, disclose rights and collaborators honestly, and move through a serious review process.
          </p>
          <p className="mt-3 text-[13px] text-white/70">
            Questions before applying?{" "}
            <Link
              href="/help"
              className="text-white underline decoration-white/30 underline-offset-2 hover:decoration-white/60 transition"
            >
              Read the creator FAQ
            </Link>
            .
          </p>
        </section>
      </div>
      <SiteFooter />
    </div>
  );
}
