"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function WhyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center pt-24 pb-20 px-6 md:px-10">

      {/* Ambient atmosphere for this page */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(229,62,42,0.07) 0%, transparent 65%)" }} />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[900px] h-[300px]"
          style={{ background: "radial-gradient(ellipse, rgba(245,197,24,0.04) 0%, transparent 65%)" }} />
      </div>

      <div className="relative z-10 max-w-2xl w-full mx-auto">

        {/* Label */}
        <motion.div
          className="flex items-center gap-3 mb-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="h-px w-8 rounded-full"
            style={{ background: "linear-gradient(90deg, #e53e2a, #f5c518)" }} />
          <span className="text-xs uppercase tracking-[0.25em] font-mono"
            style={{ color: "rgba(240,112,48,0.7)" }}>
            More than a catalog. A signal.
          </span>
        </motion.div>

        {/* Title */}
        <motion.h1
          className="text-display font-bold tracking-tight text-white mb-12"
          style={{ fontSize: "clamp(40px, 6vw, 72px)", lineHeight: 0.9 }}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          Why This Exists
        </motion.h1>

        {/* Body copy */}
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <p className="text-display font-semibold leading-snug"
            style={{ fontSize: "clamp(20px, 2.5vw, 28px)", color: "rgba(255,255,255,0.92)" }}>
            Anime didn't stay in one place.
          </p>

          <div className="space-y-3 text-base leading-relaxed"
            style={{ color: "rgba(255,255,255,0.55)" }}>
            <p>It moved. It spread. It evolved.</p>
            <p>
              Across the world, creators took what inspired them
              and began building something new.
            </p>
            <p>
              Not outside anime.{" "}
              <span style={{ color: "rgba(255,255,255,0.80)" }}>But through it.</span>
            </p>
          </div>

          {/* ShangoMaji statement */}
          <div className="pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            <p className="text-base font-semibold mb-3"
              style={{ color: "rgba(240,112,48,0.9)" }}>
              ShangoMaji exists to make that visible.
            </p>
            <div className="space-y-1 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
              <p>This is where creators build.</p>
              <p>Where ideas take form.</p>
              <p>Where the next wave lives.</p>
            </div>
          </div>

          {/* CTA block */}
          <div className="pt-10 mt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-base leading-relaxed mb-8"
              style={{ color: "rgba(255,255,255,0.60)" }}>
              This isn't something you watch from the outside.
              <br />
              <span style={{ color: "rgba(255,255,255,0.85)" }}>
                It's something you step into.
              </span>
            </p>

            <a
              href="https://discord.gg/egtY83MuGY"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl font-semibold text-black text-sm hover:opacity-90 active:scale-95 transition-all duration-200"
              style={{
                background: "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)",
                boxShadow: "0 0 40px rgba(229,62,42,0.25)",
              }}
            >
              Join the Wave
            </a>
          </div>
        </motion.div>

        {/* Back link */}
        <motion.div
          className="mt-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <Link href="/"
            className="text-xs uppercase tracking-widest transition-colors"
            style={{ color: "rgba(255,255,255,0.25)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}
          >
            ← Back to ShangoMaji
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
