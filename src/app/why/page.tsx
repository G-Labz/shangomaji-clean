"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Sparkles,
  ScrollText,
  FileSearch,
  FilePen,
  Clapperboard,
  CircleCheck,
  Send,
  ArrowRight,
} from "lucide-react";
import { SiteFooter } from "@/components/nav/SiteFooter";

// ─── Trust page ────────────────────────────────────────────────────────────
// The /why route is the creator trust page. The architecture is desktop-
// first: a two-column hero pairs the trust thesis with a compact principles
// card; three signature callouts surface the load-bearing commitments
// (ownership, no AI training, revenue lives in the signed agreement); a
// horizontal process strip makes the submission → release pipeline
// legible; and trust sections are paired into a two-column reading grid
// so the page reads like a curated trust document rather than a long
// vertical memo. All Phase 10G trust substance is preserved verbatim
// in meaning — what creators keep, what ShangoMaji controls, AI handling,
// post-submission flow, rejection clarity, conservative payment stance,
// audience-signal stance, and why this is not open upload / YouTube /
// Webtoon / a generic feed.

type Principle = string;

const PRINCIPLES: Principle[] = [
  "You keep ownership of your work.",
  "Distribution rights only through a signed agreement.",
  "ShangoMaji will not train AI on creator-submitted materials.",
  "Submission is review, not publication.",
  "Catalog inclusion is editorial, not algorithmic.",
  "Revenue terms live in the signed agreement.",
];

type Callout = {
  icon: typeof ShieldCheck;
  eyebrow: string;
  title: string;
  body: string;
};

const CALLOUTS: Callout[] = [
  {
    icon: ShieldCheck,
    eyebrow: "Ownership",
    title: "You keep your work.",
    body:
      "Submitting does not transfer copyright. Approval does not transfer copyright. ShangoMaji does not claim ownership of creator IP as a condition of review.",
  },
  {
    icon: Sparkles,
    eyebrow: "AI",
    title: "No AI training on creator-submitted materials.",
    body:
      "ShangoMaji will not use creator-submitted materials to train generative AI models. That commitment applies to applications, samples, finished work, and anything else creators send through the platform.",
  },
  {
    icon: ScrollText,
    eyebrow: "Revenue",
    title: "Revenue terms live in the signed agreement.",
    body:
      "No promised payouts and no published revenue-share percentages at this stage. Where revenue applies, the terms are defined by the signed agreement, not by marketing copy.",
  },
];

type ProcessStep = {
  n: string;
  icon: typeof Send;
  title: string;
  body: string;
};

const PROCESS_STEPS: ProcessStep[] = [
  {
    n: "01",
    icon: Send,
    title: "Submission",
    body: "You submit project, identity, rights posture, and creative direction for review.",
  },
  {
    n: "02",
    icon: FileSearch,
    title: "Review",
    body: "Editorial review based on fit, originality, rights clarity, and content alignment.",
  },
  {
    n: "03",
    icon: FilePen,
    title: "License",
    body: "Distribution rights granted only through a signed agreement you read before signing.",
  },
  {
    n: "04",
    icon: Clapperboard,
    title: "Media Readiness",
    body: "Materials prepared, mastered, and aligned for catalog release.",
  },
  {
    n: "05",
    icon: CircleCheck,
    title: "Release Decision",
    body: "Editorial placement, timing, and public visibility decided by the label.",
  },
];

type TrustPair = {
  left: TrustBlock;
  right: TrustBlock;
};

type TrustBlock = {
  eyebrow: string;
  title: string;
  body: string[];
};

const TRUST_PAIRS: TrustPair[] = [
  {
    left: {
      eyebrow: "What ShangoMaji is",
      title: "A curated distribution label.",
      body: [
        "ShangoMaji is a curated label for creator-owned anime and anime-inspired work. Every title in the public catalog passes through review, licensing, and media readiness before release.",
        "Launch review priority is creator-owned video and animation-facing work: animated shorts, pilots, trailers, animatics, anime-inspired short films, and motion-comic style video where applicable.",
      ],
    },
    right: {
      eyebrow: "Why this is different",
      title: "Not open upload. Not a feed.",
      body: [
        "Open-upload platforms scale by accepting almost anything. ShangoMaji scales by accepting work that fits the catalog. The trade-off is intentional. It is what makes acceptance worth something to the creator and to the audience.",
        "If the goal is to publish anything to anyone immediately, ShangoMaji is the wrong tool. If the goal is a reviewed, licensed, intentional release inside a curated catalog, this is what ShangoMaji is for.",
      ],
    },
  },
  {
    left: {
      eyebrow: "What the creator keeps",
      title: "Ownership stays with you.",
      body: [
        "Creators retain ownership of their work by default. ShangoMaji does not take copyright as a condition of submission or approval.",
        "Where ShangoMaji distributes a work, the rights are acquired only through a signed agreement. The agreement spells out what rights are granted, for how long, on what terms, and what the creator keeps.",
        "You receive the agreement before you sign it. You have time to read it. You can ask process questions. ShangoMaji cannot give legal advice. For binding decisions, your lawyer is your lawyer. The document is written to be readable, and the process is not designed to rush you.",
      ],
    },
    right: {
      eyebrow: "What ShangoMaji controls",
      title: "Editorial authority over the catalog.",
      body: [
        "While a title is licensed and live on ShangoMaji, the label controls catalog placement, release timing, editorial framing, and public visibility for the term of the agreement. That is what makes the catalog a catalog rather than a feed.",
        "Editorial discretion is real. Submission does not guarantee acceptance. Acceptance does not guarantee immediate release. Release does not guarantee headline placement. These decisions are made in service of catalog trust and the audience the catalog is built for.",
      ],
    },
  },
  {
    left: {
      eyebrow: "How AI is handled",
      title: "Human authorship first.",
      body: [
        "Work made without AI is reviewed normally. AI-assisted work may be reviewed when the use is disclosed, human authorship is clear, and the rights posture is clean.",
        "Primarily or fully AI-generated submissions are not accepted at launch. Undisclosed AI use can block review, licensing, or release, and can trigger rejection or removal review depending on stage.",
        "The standard is not anti-tool. It is pro-creator. Human authorship, rights clarity, and creative responsibility are what the catalog is built on.",
      ],
    },
    right: {
      eyebrow: "Audience and signal",
      title: "Catalog trust over engagement metrics.",
      body: [
        "ShangoMaji is not an open social network. It is a controlled catalog. Audience response may inform future product and reporting decisions. Audience metrics do not decide catalog inclusion.",
        "Controlled creator-following or audience-signal mechanics may be considered in a future phase if they support catalog trust and do not replace editorial authority. They are not part of the launch product.",
      ],
    },
  },
  {
    left: {
      eyebrow: "What happens after submission",
      title: "Review is a process, not a moment.",
      body: [
        "Submission is review, not publication. Applications are reviewed in cycles. Early review windows may take several weeks. Incomplete submissions may be returned for completion. Complete submissions receive an outcome.",
        "Approval moves the work into licensing and media-readiness review, not into automatic public release. A title only joins the public catalog after license, materials, and release readiness are aligned. There is no same-day approval and no automated path from submit to public.",
      ],
    },
    right: {
      eyebrow: "What happens if rejected",
      title: "Rejection is not a verdict.",
      body: [
        "Rejection means the submitted project does not currently meet the standard or timing required for ShangoMaji review, licensing, or catalog consideration. It does not mean the creator does not matter, that the work is without value, or that the door is closed forever.",
        "Standards exist to protect the creators who do get in, the catalog they share, and the audience the catalog is being built for. A label that accepts everything protects no one.",
      ],
    },
  },
];

// ─── Reusable visual primitives ────────────────────────────────────────────

function SectionEyebrow({ label }: { label: string }) {
  return (
    <p
      className="text-[10px] uppercase tracking-[0.24em] font-semibold"
      style={{ color: "rgba(245,197,24,0.78)" }}
    >
      {label}
    </p>
  );
}

function TrustCard({ block }: { block: TrustBlock }) {
  return (
    <article
      className="h-full rounded-2xl border border-white/10 bg-white/[0.02] p-7 md:p-8 transition-colors hover:border-white/15"
      style={{
        backgroundImage:
          "linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0) 60%)",
      }}
    >
      <SectionEyebrow label={block.eyebrow} />
      <h3
        className="mt-3 text-white font-semibold tracking-tight text-[22px] md:text-[24px] leading-snug"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {block.title}
      </h3>
      <div
        className="mt-4 space-y-3.5 text-[14.5px] leading-relaxed"
        style={{ color: "rgba(255,255,255,0.78)" }}
      >
        {block.body.map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
    </article>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function TrustPage() {
  return (
    <div className="min-h-screen flex flex-col pt-20 pb-20">
      {/* Ambient background — single, restrained */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(229,62,42,0.05) 0%, transparent 60%)",
          }}
        />
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1100px] h-[360px]"
          style={{
            background:
              "radial-gradient(ellipse, rgba(245,197,24,0.03) 0%, transparent 65%)",
          }}
        />
      </div>

      <div className="relative z-10 flex-1 px-6 md:px-10">
        {/* ───────── HERO ───────── */}
        <section className="max-w-[1280px] mx-auto pt-12 md:pt-16">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] gap-12 lg:gap-16 items-start">
            {/* Left — thesis */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="h-px w-10 rounded-full"
                  style={{ background: "linear-gradient(90deg, #e53e2a, #f5c518)" }}
                />
                <span
                  className="text-xs uppercase tracking-[0.25em] font-mono"
                  style={{ color: "rgba(240,112,48,0.78)" }}
                >
                  Creator Trust
                </span>
              </div>

              <h1
                className="text-display font-bold tracking-tight text-white"
                style={{ fontSize: "clamp(40px, 5.6vw, 76px)", lineHeight: 0.95 }}
              >
                Why a creator
                <br />
                can trust <span className="brand-text">ShangoMaji</span>.
              </h1>

              <p
                className="mt-8 text-[16px] md:text-[17px] leading-relaxed max-w-xl"
                style={{ color: "rgba(255,255,255,0.78)" }}
              >
                ShangoMaji is a curated anime distribution label. This page
                explains what the platform protects, what creators keep, what
                ShangoMaji controls, and how the relationship between creator
                and label is structured. Read it before you apply. If the
                trade-offs here do not fit the work you want to release,
                ShangoMaji may not be the right home for it, and that is
                useful to know in advance.
              </p>
            </motion.div>

            {/* Right — Trust Principles card */}
            <motion.aside
              className="rounded-2xl border border-amber-500/20 p-7 md:p-8"
              style={{
                background:
                  "linear-gradient(180deg, rgba(245,197,24,0.05) 0%, rgba(229,62,42,0.03) 100%)",
                boxShadow:
                  "0 0 0 1px rgba(245,197,24,0.06) inset, 0 20px 60px -30px rgba(229,62,42,0.35)",
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.1 }}
              aria-label="Trust principles"
            >
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck size={16} className="text-brand-yellow" />
                <p
                  className="text-[10px] uppercase tracking-[0.22em] font-semibold"
                  style={{ color: "rgba(245,197,24,0.9)" }}
                >
                  Trust Principles
                </p>
              </div>
              <ul className="space-y-3.5">
                {PRINCIPLES.map((p) => (
                  <li
                    key={p}
                    className="flex gap-3 text-[14px] leading-snug"
                    style={{ color: "rgba(255,255,255,0.86)" }}
                  >
                    <span
                      className="mt-[7px] inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: "#f5c518" }}
                    />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 pt-5 border-t border-white/10">
                <Link
                  href="/creators/apply"
                  className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] transition-colors"
                  style={{ color: "rgba(245,197,24,0.95)" }}
                >
                  Apply to ShangoMaji
                  <ArrowRight size={13} />
                </Link>
              </div>
            </motion.aside>
          </div>
        </section>

        {/* ───────── SIGNATURE CALLOUTS ───────── */}
        <section className="max-w-[1280px] mx-auto mt-24 md:mt-28">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
            {CALLOUTS.map((c, i) => (
              <motion.div
                key={c.title}
                className="relative overflow-hidden rounded-2xl p-7 md:p-8 border border-white/10"
                style={{
                  background:
                    "linear-gradient(160deg, rgba(229,62,42,0.06) 0%, rgba(20,20,20,0.4) 60%, rgba(245,197,24,0.04) 100%)",
                }}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: i * 0.06 }}
              >
                <div
                  className="absolute -top-12 -right-10 w-44 h-44 rounded-full pointer-events-none"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(245,197,24,0.10) 0%, transparent 70%)",
                  }}
                />
                <div
                  className="relative w-10 h-10 rounded-xl flex items-center justify-center mb-5"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(229,62,42,0.18), rgba(245,197,24,0.18))",
                    border: "1px solid rgba(245,197,24,0.25)",
                  }}
                >
                  <c.icon size={18} className="brand-text" />
                </div>
                <p
                  className="relative text-[10px] uppercase tracking-[0.22em] font-semibold mb-2"
                  style={{ color: "rgba(245,197,24,0.8)" }}
                >
                  {c.eyebrow}
                </p>
                <h3
                  className="relative text-white font-semibold tracking-tight text-[20px] md:text-[22px] leading-snug"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {c.title}
                </h3>
                <p
                  className="relative mt-3.5 text-[14px] leading-relaxed"
                  style={{ color: "rgba(255,255,255,0.78)" }}
                >
                  {c.body}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ───────── PROCESS STRIP ───────── */}
        <section className="max-w-[1280px] mx-auto mt-24 md:mt-28">
          <motion.div
            className="mb-10"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
          >
            <SectionEyebrow label="From submission to release" />
            <h2
              className="mt-3 text-white font-semibold tracking-tight text-3xl md:text-4xl leading-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              How work moves through ShangoMaji.
            </h2>
            <p
              className="mt-3 text-[15px] leading-relaxed max-w-2xl"
              style={{ color: "rgba(255,255,255,0.72)" }}
            >
              Five distinct stages. No same-day approval. No automated path
              from submit to public. Each step exists to protect someone:
              the creator, the catalog, or the audience.
            </p>
          </motion.div>

          <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-5">
            {PROCESS_STEPS.map((s, i) => (
              <motion.li
                key={s.n}
                className="relative rounded-2xl border border-white/10 bg-white/[0.02] p-5 lg:p-6"
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
              >
                {/* connector dot/line on lg+ */}
                {i < PROCESS_STEPS.length - 1 && (
                  <div
                    className="hidden lg:block absolute top-1/2 -right-3 w-3 h-px"
                    style={{
                      background:
                        "linear-gradient(90deg, rgba(245,197,24,0.4), transparent)",
                    }}
                  />
                )}
                <div className="flex items-center justify-between mb-4">
                  <span
                    className="text-[11px] font-mono tracking-widest"
                    style={{ color: "rgba(245,197,24,0.7)" }}
                  >
                    {s.n}
                  </span>
                  <s.icon size={15} className="text-white/40" />
                </div>
                <p className="text-white font-semibold text-[15px] leading-tight mb-2">
                  {s.title}
                </p>
                <p
                  className="text-[13px] leading-relaxed"
                  style={{ color: "rgba(255,255,255,0.65)" }}
                >
                  {s.body}
                </p>
              </motion.li>
            ))}
          </ol>
        </section>

        {/* ───────── TRUST READING GRID ───────── */}
        <section className="max-w-[1280px] mx-auto mt-24 md:mt-28">
          <motion.div
            className="mb-10"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
          >
            <SectionEyebrow label="The trust document" />
            <h2
              className="mt-3 text-white font-semibold tracking-tight text-3xl md:text-4xl leading-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              What this is. What it is not. What you keep.
            </h2>
          </motion.div>

          <div className="space-y-5 lg:space-y-6">
            {TRUST_PAIRS.map((pair, i) => (
              <motion.div
                key={pair.left.eyebrow}
                className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: Math.min(i * 0.05, 0.2) }}
              >
                <TrustCard block={pair.left} />
                <TrustCard block={pair.right} />
              </motion.div>
            ))}
          </div>
        </section>

        {/* ───────── PAYMENT NOTE (full-width band) ───────── */}
        <section className="max-w-[1280px] mx-auto mt-24 md:mt-28">
          <motion.div
            className="rounded-2xl border border-white/10 p-8 md:p-10"
            style={{
              background:
                "linear-gradient(180deg, rgba(245,197,24,0.04), rgba(255,255,255,0.015) 60%)",
            }}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-[200px_minmax(0,1fr)] gap-6 lg:gap-12 items-start">
              <div>
                <SectionEyebrow label="Payment & revenue" />
                <h3
                  className="mt-3 text-white font-semibold tracking-tight text-2xl leading-snug"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Conservative. Honest. Written down.
                </h3>
              </div>
              <div
                className="space-y-3.5 text-[14.5px] leading-relaxed"
                style={{ color: "rgba(255,255,255,0.78)" }}
              >
                <p>
                  ShangoMaji is still defining its full creator economics
                  model. Accepted works will not enter public catalog
                  distribution without a signed agreement that explains the
                  applicable rights, term, revenue terms, reporting
                  expectations, and payment structure where revenue share
                  applies.
                </p>
                <p>
                  No creator should assume that submission or approval
                  creates immediate payment. There are no promised payouts,
                  no published revenue-share percentages, and no implied
                  monetization from acceptance alone at this stage.
                  Everything binding lives in the signed agreement.
                </p>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ───────── FINAL CTA ───────── */}
        <section className="max-w-[1280px] mx-auto mt-24 md:mt-28">
          <motion.div
            className="relative overflow-hidden rounded-3xl p-10 md:p-16 text-center border"
            style={{
              background:
                "linear-gradient(135deg, #1a0a08 0%, #0a0a0a 50%, #0d0d08 100%)",
              borderColor: "rgba(229,62,42,0.2)",
            }}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-brand-red/10 blur-[80px] pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-brand-yellow/5 blur-[80px] pointer-events-none" />
            <div className="relative">
              <SectionEyebrow label="If the standard fits the work" />
              <h2
                className="mt-4 text-display font-bold text-white tracking-tight"
                style={{ fontSize: "clamp(32px, 4.5vw, 56px)", lineHeight: 1 }}
              >
                Take the application
                <br className="hidden md:inline" />{" "}
                <span className="brand-text">seriously.</span>
              </h2>
              <p
                className="mt-6 max-w-xl mx-auto text-[15px] md:text-[16px] leading-relaxed"
                style={{ color: "rgba(255,255,255,0.78)" }}
              >
                Every answer is read. Submission is review, not publication.
                If the trade-offs above match the work you want to release,
                the next step is the creator application.
              </p>
              <div className="mt-10 flex flex-wrap gap-3 justify-center">
                <Link
                  href="/creators/apply"
                  className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl font-semibold text-black text-sm transition-all duration-200 active:scale-95"
                  style={{
                    background:
                      "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)",
                  }}
                >
                  Apply to ShangoMaji
                  <ArrowRight size={15} />
                </Link>
                <Link
                  href="/help"
                  className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl glass text-white font-medium text-sm hover:bg-white/10 transition-all duration-200"
                >
                  Read the FAQ
                </Link>
              </div>
              <p
                className="mt-8 text-xs"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                ShangoMaji is a curated label. Submission is review, not publication.
              </p>
            </div>
          </motion.div>
        </section>

        {/* Back link */}
        <div className="max-w-[1280px] mx-auto mt-16">
          <Link
            href="/"
            className="text-xs uppercase tracking-widest transition-colors"
            style={{ color: "rgba(255,255,255,0.3)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
          >
            ← Back to ShangoMaji
          </Link>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
