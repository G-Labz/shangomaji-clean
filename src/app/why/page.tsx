"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { SiteFooter } from "@/components/nav/SiteFooter";

// ─── Trust page ────────────────────────────────────────────────────────────
// The /why route is the creator trust page. It directly answers the
// questions a serious creator asks before submitting work: what does
// ShangoMaji protect, what does the creator keep, what does ShangoMaji
// control, what happens after submission, what happens if rejected,
// how is AI handled, what is and is not promised about payment, and
// why this is not open upload, YouTube, Webtoon, or a generic social
// platform. Tone is professional, creator-respecting, and grounded.

type Section = {
  eyebrow: string;
  title: string;
  body: string[];
};

const SECTIONS: Section[] = [
  {
    eyebrow: "What ShangoMaji is",
    title: "A curated distribution label, not an open upload service.",
    body: [
      "ShangoMaji is a curated label for creator-owned anime and anime-inspired work. Every title in the public catalog passes through review, licensing, and media readiness before release.",
      "ShangoMaji is not YouTube, not Webtoon, not a self-publishing tool, and not a generic social platform. It is a controlled catalog with editorial standards. The intent is intentional release, not volume.",
      "At launch, review priority is creator-owned anime-inspired video and animation-facing work — including animated shorts, pilots, trailers, animatics, anime-inspired short films, and motion-comic style video where applicable.",
    ],
  },
  {
    eyebrow: "What the creator keeps",
    title: "You keep your work. ShangoMaji does not take ownership.",
    body: [
      "Creators retain ownership of their work by default. Submitting an application does not transfer copyright. Approval does not transfer copyright. ShangoMaji does not claim ownership of creator IP as a condition of review.",
      "Where ShangoMaji distributes a work, distribution rights are acquired only through a signed agreement. The agreement spells out what rights are granted, for how long, on what terms, and what the creator keeps. Nothing goes public without that signature.",
      "You receive the agreement before you sign it. You have time to read it. You can ask process questions. ShangoMaji is not a substitute for legal counsel — for binding decisions, your lawyer is your lawyer. But the document is written to be readable, and the process is not designed to rush you.",
    ],
  },
  {
    eyebrow: "What ShangoMaji controls",
    title: "Editorial authority over catalog and release.",
    body: [
      "While a title is licensed and live on ShangoMaji, the label controls catalog placement, release timing, editorial framing, and public visibility for the term of the agreement. That is what makes the catalog a catalog rather than a feed.",
      "Editorial discretion is real. Submission does not guarantee acceptance. Acceptance does not guarantee immediate release. Release does not guarantee headline placement. These decisions are made in service of catalog trust and the audience that the catalog is built for.",
    ],
  },
  {
    eyebrow: "How AI is handled",
    title: "Human authorship first. No training on creator work.",
    body: [
      "ShangoMaji will not use creator-submitted materials to train generative AI models. That commitment applies to applications, samples, finished work, and anything else creators send through the platform.",
      "Work made without AI is reviewed normally. AI-assisted work may be reviewed when the use is disclosed, human authorship is clear, and the rights posture is clean. Primarily or fully AI-generated submissions are not accepted at launch. Undisclosed AI use can block review, licensing, or release, and can trigger rejection or removal review depending on stage.",
      "The standard is not anti-tool. It is pro-creator. Human authorship, rights clarity, and creative responsibility are what the catalog is built on.",
    ],
  },
  {
    eyebrow: "What happens after submission",
    title: "Review is a process, not a moment.",
    body: [
      "Submission is review, not publication. Applications are reviewed in cycles. Early review windows may take several weeks. Incomplete submissions may be returned for completion. Complete submissions receive an outcome.",
      "Approval moves the work into licensing and media readiness review — not into automatic public release. A title only joins the public catalog after license, materials, and release readiness are aligned.",
      "There is no same-day approval, no instant placement, and no automated path from submit to public. That is the point.",
    ],
  },
  {
    eyebrow: "What happens if rejected",
    title: "Rejection is not a verdict on the creator.",
    body: [
      "Rejection means the submitted project does not currently meet the standard or timing required for ShangoMaji review, licensing, or catalog consideration. It does not mean the creator does not matter, that the work is without value, or that the door is closed forever.",
      "Standards exist to protect creators who do get in, the catalog they share, and the audience the catalog is being built for. A label that accepts everything protects no one.",
    ],
  },
  {
    eyebrow: "Payment and revenue",
    title: "Conservative, honest, and handled in the agreement.",
    body: [
      "ShangoMaji is still defining its full creator economics model. Accepted works will not enter public catalog distribution without a signed agreement that explains the applicable rights, term, revenue terms, reporting expectations, and payment structure where revenue share applies.",
      "No creator should assume that submission or approval creates immediate payment. There are no promised payouts, no published revenue-share percentages, and no implied monetization from acceptance alone at this stage. Everything binding lives in the signed agreement.",
    ],
  },
  {
    eyebrow: "Audience and signal",
    title: "Catalog trust over engagement metrics.",
    body: [
      "ShangoMaji is not an open social network. It is a controlled catalog. Audience response may inform future product and reporting decisions. Audience metrics do not decide catalog inclusion.",
      "Controlled creator-following or audience-signal mechanics may be considered in a future phase if they support catalog trust and do not replace editorial authority. They are not part of the launch product.",
    ],
  },
  {
    eyebrow: "Why this is different",
    title: "Not open upload. Not YouTube. Not a feed.",
    body: [
      "Open-upload platforms scale by accepting almost anything. ShangoMaji scales by accepting work that fits the catalog. The trade-off is intentional. It is what makes acceptance worth something to the creator and to the audience.",
      "If the goal is to publish anything to anyone immediately, ShangoMaji is the wrong tool. If the goal is a reviewed, licensed, intentional release inside a curated catalog, this is what ShangoMaji exists to do.",
    ],
  },
];

export default function TrustPage() {
  return (
    <div className="min-h-screen flex flex-col pt-24 pb-20 px-6 md:px-10">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(229,62,42,0.06) 0%, transparent 65%)" }}
        />
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[900px] h-[300px]"
          style={{ background: "radial-gradient(ellipse, rgba(245,197,24,0.035) 0%, transparent 65%)" }}
        />
      </div>

      <div className="relative z-10 max-w-3xl w-full mx-auto flex-1">
        {/* Eyebrow */}
        <motion.div
          className="flex items-center gap-3 mb-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div
            className="h-px w-8 rounded-full"
            style={{ background: "linear-gradient(90deg, #e53e2a, #f5c518)" }}
          />
          <span
            className="text-xs uppercase tracking-[0.25em] font-mono"
            style={{ color: "rgba(240,112,48,0.7)" }}
          >
            Creator Trust
          </span>
        </motion.div>

        {/* Title */}
        <motion.h1
          className="text-display font-bold tracking-tight text-white"
          style={{ fontSize: "clamp(40px, 6vw, 72px)", lineHeight: 0.95 }}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          Why a creator
          <br />
          can trust ShangoMaji.
        </motion.h1>

        {/* Lede */}
        <motion.p
          className="mt-8 text-base md:text-lg leading-relaxed"
          style={{ color: "rgba(255,255,255,0.72)" }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.18 }}
        >
          ShangoMaji is a curated anime distribution label. This page explains
          what the platform protects, what creators keep, what ShangoMaji
          controls, and how the relationship between creator and label is
          structured. Read it before applying. If the trade-offs do not fit
          the work you are trying to release, ShangoMaji may not be the right
          home for it — and that is useful to know in advance.
        </motion.p>

        {/* Sections */}
        <div className="mt-14 space-y-12">
          {SECTIONS.map((section, i) => (
            <motion.section
              key={section.eyebrow}
              className="pt-8 border-t border-white/10"
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.45, delay: Math.min(i * 0.04, 0.2) }}
            >
              <p
                className="text-[10px] uppercase tracking-[0.22em] font-semibold mb-3"
                style={{ color: "rgba(245,197,24,0.75)" }}
              >
                {section.eyebrow}
              </p>
              <h2 className="text-display text-white font-semibold tracking-tight text-2xl md:text-[28px] leading-snug">
                {section.title}
              </h2>
              <div
                className="mt-4 space-y-4 text-[15px] leading-relaxed"
                style={{ color: "rgba(255,255,255,0.72)" }}
              >
                {section.body.map((para, j) => (
                  <p key={j}>{para}</p>
                ))}
              </div>
            </motion.section>
          ))}
        </div>

        {/* CTA / pointer */}
        <motion.div
          className="mt-16 pt-10 border-t border-white/10"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
        >
          <p
            className="text-[15px] leading-relaxed mb-8"
            style={{ color: "rgba(255,255,255,0.78)" }}
          >
            If the standard above matches the work you want to release,
            the next step is the creator application. Take the application
            seriously. Every answer is read.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/creators/apply"
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl font-semibold text-black text-sm transition-all duration-200 active:scale-95"
              style={{
                background: "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)",
              }}
            >
              Apply to ShangoMaji
            </Link>
            <Link
              href="/help"
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl glass text-white font-medium text-sm hover:bg-white/10 transition-all duration-200"
            >
              Read the FAQ
            </Link>
          </div>
          <p
            className="mt-6 text-xs"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            ShangoMaji is a curated label. Submission is review, not publication.
          </p>
        </motion.div>

        {/* Back link */}
        <motion.div
          className="mt-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <Link
            href="/"
            className="text-xs uppercase tracking-widest transition-colors"
            style={{ color: "rgba(255,255,255,0.3)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
          >
            ← Back to ShangoMaji
          </Link>
        </motion.div>
      </div>

      <SiteFooter />
    </div>
  );
}
