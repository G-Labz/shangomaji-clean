"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Globe,
  Layers,
  Users,
  Zap,
  BadgeCheck,
  ChevronRight,
} from "lucide-react";
import { CreatorCard } from "@/components/creators/CreatorCard";
import { getAllCreators } from "@/data/creatorData";

const PILLARS = [
  {
    icon: Globe,
    title: "A Global Stage",
    body: "Your work doesn't get buried. It gets placed in front of an audience ready to discover something new.",
  },
  {
    icon: Layers,
    title: "Perspective Matters",
    body: "Not everything needs to look the same, feel the same, or come from the same place. That's the point.",
  },
  {
    icon: Users,
    title: "Curated, Not Open",
    body: "Every title is reviewed. Every release is intentional. Quality over volume, always.",
  },
  {
    icon: Zap,
    title: "Creator First",
    body: "You own your work. We provide the stage.",
  },
];

const PROCESS_STEPS = [
  {
    number: "01",
    title: "Apply",
    body: "Tell us what you're building and why it matters.",
  },
  {
    number: "02",
    title: "Review",
    body: "We look for vision, originality, and voice. Not just polish.",
  },
  {
    number: "03",
    title: "Onboard",
    body: "Get your creator profile, direct access, and support to launch.",
  },
  {
    number: "04",
    title: "Live",
    body: "Your work joins the catalog. Your audience starts building.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

export default function CreatorsPage() {
  const creators = getAllCreators();

  return (
    <div className="min-h-screen">
      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center overflow-hidden pt-16">
        {/* Ambient background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-brand-red/8 blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-brand-yellow/5 blur-[100px]" />
          {/* Grid texture */}
          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        <div className="relative z-10 max-w-[1600px] mx-auto px-6 md:px-10 py-24 w-full">
          {/* Full text block — centered in the hero space left of the cards */}
          <div className="max-w-4xl xl:pl-[22%]">
            {/* Eyebrow */}
            <motion.div
              className="flex items-center gap-3 mb-8"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="h-px w-12 bg-brand-gradient" />
              <span className="text-xs uppercase tracking-[0.25em] text-ink-muted font-mono">
                For Creators
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              className="text-display font-bold leading-[0.88] tracking-tight text-white mb-8"
              style={{ fontSize: "clamp(52px, 8vw, 110px)" }}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              Your world
              <br />
              <span className="brand-text">deserves</span>
              <br />
              a stage.
            </motion.h1>

            {/* Body */}
            <motion.p
              className="text-ink-muted text-lg md:text-xl leading-relaxed max-w-xl mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              Whether you're building from culture, imagination, or something entirely new. ShangoMaji is where the next wave of anime takes form.
            </motion.p>
            <motion.p
              className="text-sm italic mb-10"
              style={{ color: "rgba(240,112,48,0.6)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              Rooted in perspective. Expanded by creators across the world.
            </motion.p>

            {/* Selectivity signal */}
            <motion.p
              className="text-sm mb-10 -mt-6"
              style={{ color: "rgba(255,255,255,0.35)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              For creators building with intention.
            </motion.p>

            {/* CTAs */}
            <motion.div
              className="flex flex-wrap gap-4"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.45 }}
            >
              <a
                href="#creators"
                className="group flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-black text-sm transition-all duration-200 active:scale-95"
                style={{ background: "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)" }}
              >
                Meet Our Creators
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </a>
              <Link
                href="/creators/apply"
                className="flex items-center gap-2.5 px-8 py-4 rounded-2xl glass text-white font-medium text-sm hover:bg-white/10 transition-all duration-200"
              >
                Apply to Join
              </Link>
            </motion.div>
          </div>

          {/* Floating creator cards — positioned to hover just right of the text block */}
          <div className="hidden xl:flex absolute flex-col gap-4 items-end" style={{ right: "18%", top: "50%", transform: "translateY(-50%)", maxWidth: "280px" }}>
            {creators.slice(0, 3).map((c, i) => (
              <motion.div
                key={c.id}
                className="flex items-center gap-3 glass rounded-2xl px-4 py-3"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.15, duration: 0.5 }}
              >
                <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
                  <Image
                    src={c.avatarUrl}
                    alt={c.name}
                    width={40}
                    height={40}
                    className="object-cover"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <p className="text-white text-xs font-semibold">{c.name}</p>
                    {c.isVerified && (
                      <BadgeCheck size={11} className="text-brand-yellow" />
                    )}
                  </div>
                  <p className="text-ink-faint text-[10px]">{c.origin}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Scroll indicator — well below the CTA area */}
        <motion.div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
        >
          <div className="w-px h-10 bg-gradient-to-b from-transparent to-white/20" />
          <span className="text-ink-faint text-[10px] uppercase tracking-widest">
            Scroll
          </span>
        </motion.div>
      </section>

      {/* ── MANIFESTO PULL QUOTE ── */}
      <section className="py-24 border-y border-white/5 bg-surface-raised">
        <div className="max-w-[1600px] mx-auto px-6 md:px-10">
          <motion.blockquote
            className="max-w-3xl mx-auto text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="brand-text text-display text-8xl font-bold leading-none mb-4 opacity-40">
              "
            </div>
            <p className="text-display text-2xl md:text-3xl font-medium text-white leading-relaxed italic -mt-8">
              Anime culture becomes richer when more voices, more worlds, and more imagination are allowed to take form within it.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <div className="h-px w-8 bg-brand-gradient" />
              <span className="text-ink-faint text-xs uppercase tracking-widest">
                ShangoMaji Founder's Manifesto
              </span>
              <div className="h-px w-8 bg-brand-gradient" />
            </div>
          </motion.blockquote>
        </div>
      </section>

      {/* ── WHY SHANGOMAJI ── */}
      <section className="py-24">
        <div className="max-w-[1600px] mx-auto px-6 md:px-10">
          <motion.div
            className="mb-14"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-xs uppercase tracking-[0.2em] text-ink-faint mb-3">
              Why ShangoMaji
            </p>
            <h2 className="text-display font-bold text-4xl md:text-5xl text-white tracking-tight">
              Built different.
              <br />
              <span className="brand-text">Intentionally.</span>
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PILLARS.map((p, i) => (
              <motion.div
                key={p.title}
                className="p-6 rounded-2xl bg-surface-raised border border-white/5 hover:border-white/10 transition-colors group"
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-5"
                  style={{
                    background: "linear-gradient(135deg, #e53e2a20, #f5c51820)",
                    border: "1px solid rgba(245,197,24,0.15)",
                  }}
                >
                  <p.icon size={18} className="brand-text" />
                </div>
                <h3 className="text-white font-semibold text-base mb-2">
                  {p.title}
                </h3>
                <p className="text-ink-muted text-sm leading-relaxed">{p.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURED CREATORS ── */}
      <section id="creators" className="py-24 bg-surface-raised border-y border-white/5">
        <div className="max-w-[1600px] mx-auto px-6 md:px-10">
          <div className="flex items-end justify-between mb-12">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <p className="text-xs uppercase tracking-[0.2em] text-ink-faint mb-3">
                The Roster
              </p>
              <h2 className="text-display font-bold text-4xl md:text-5xl text-white tracking-tight">
                Meet the creators
                <br />
                <span className="brand-text">shaping what's next.</span>
              </h2>
              <p className="text-ink-muted text-base mt-4">
                Different styles. Different origins. One shared direction forward.
              </p>
            </motion.div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {creators.map((c, i) => (
              <motion.div
                key={c.id}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
              >
                <CreatorCard creator={c} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-24">
        <div className="max-w-[1600px] mx-auto px-6 md:px-10">
          <motion.div
            className="mb-14"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-xs uppercase tracking-[0.2em] text-ink-faint mb-3">
              The Process
            </p>
            <h2 className="text-display font-bold text-4xl md:text-5xl text-white tracking-tight">
              How selection
              <br />
              <span className="brand-text">works.</span>
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PROCESS_STEPS.map((step, i) => (
              <motion.div
                key={step.number}
                className="relative"
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
              >
                {/* Connector line */}
                {i < PROCESS_STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-6 left-full w-full h-px bg-gradient-to-r from-white/10 to-transparent z-0 -translate-x-6" />
                )}

                <div className="relative z-10">
                  <p className="brand-text text-display font-bold text-5xl leading-none mb-4">
                    {step.number}
                  </p>
                  <h3 className="text-white font-semibold text-lg mb-2">
                    {step.title}
                  </h3>
                  <p className="text-ink-muted text-sm leading-relaxed">
                    {step.body}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-24 border-t border-white/5">
        <div className="max-w-[1600px] mx-auto px-6 md:px-10">
          <motion.div
            className="relative overflow-hidden rounded-3xl p-12 md:p-20 text-center"
            style={{
              background:
                "linear-gradient(135deg, #1a0a08 0%, #0a0a0a 50%, #0d0d08 100%)",
              border: "1px solid rgba(229,62,42,0.2)",
            }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {/* Ambient glows */}
            <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-brand-red/10 blur-[80px] pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-brand-yellow/5 blur-[80px] pointer-events-none" />

            <div className="relative z-10">
              <p className="text-xs uppercase tracking-[0.25em] text-ink-faint mb-6">
                Ready to build?
              </p>
              <h2 className="text-display font-bold text-white leading-[0.9] tracking-tight mb-6"
                style={{ fontSize: "clamp(40px, 6vw, 80px)" }}>
                The stage is
                <br />
                <span className="brand-text">waiting for you.</span>
              </h2>
              <p className="text-ink-muted text-lg max-w-xl mx-auto mb-10 leading-relaxed">
                Not for volume. Not for trends.<br />
                For creators with something to say.
              </p>
              <Link
                href="/creators/apply"
                className="group inline-flex items-center gap-3 px-10 py-5 rounded-2xl font-semibold text-black text-base transition-all duration-200 active:scale-95 hover:shadow-2xl"
                style={{
                  background:
                    "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)",
                }}
              >
                Apply Now
                <ChevronRight
                  size={18}
                  className="transition-transform group-hover:translate-x-1"
                />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
