"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Info, ChevronLeft, ChevronRight } from "lucide-react";
import type { Title } from "@/data/mockData";

interface HeroBannerProps { titles: Title[]; }

export function HeroBanner({ titles }: HeroBannerProps) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    const timer = setInterval(() => {
      setDirection(1);
      setCurrent((c) => (c + 1) % titles.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [titles.length]);

  const go = (idx: number) => {
    setDirection(idx > current ? 1 : -1);
    setCurrent(idx);
  };

  const title = titles[current];

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? "5%" : "-5%", opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:   (d: number) => ({ x: d > 0 ? "-5%" : "5%", opacity: 0 }),
  };

  return (
    <section className="relative w-full h-[94vh] min-h-[640px] max-h-[1000px] overflow-hidden">
      {/* Backdrop */}
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={title.id}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="absolute inset-0"
        >
          <Image src={title.backdropUrl} alt={title.title} fill priority
            className="object-cover object-center" sizes="100vw" />

          {/* Deep cinematic overlays */}
          <div className="absolute inset-0"
            style={{ background: "linear-gradient(105deg, rgba(7,6,8,0.96) 0%, rgba(7,6,8,0.75) 45%, rgba(7,6,8,0.25) 75%, transparent 100%)" }} />
          <div className="absolute inset-0"
            style={{ background: "linear-gradient(to top, rgba(7,6,8,1) 0%, rgba(7,6,8,0.6) 25%, transparent 60%)" }} />
          <div className="absolute inset-0"
            style={{ background: "linear-gradient(to bottom, rgba(7,6,8,0.5) 0%, transparent 30%)" }} />

          {/* Brand color bleed — ember from bottom left */}
          <div className="absolute bottom-0 left-0 w-[900px] h-[500px] pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 0% 100%, rgba(229,62,42,0.22) 0%, rgba(180,30,15,0.10) 40%, transparent 70%)" }} />

          {/* Gold crown top right */}
          <div className="absolute top-0 right-0 w-[700px] h-[400px] pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 100% 0%, rgba(245,197,24,0.10) 0%, rgba(240,112,48,0.05) 45%, transparent 70%)" }} />

          {/* Orange mid-right pulse */}
          <div className="absolute top-1/2 right-0 w-[400px] h-[600px] -translate-y-1/2 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 100% 50%, rgba(240,112,48,0.08) 0%, transparent 65%)" }} />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="relative z-10 h-full flex items-end pb-20 md:pb-28">
        <div className="w-full max-w-[1600px] mx-auto px-6 md:px-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={title.id + "-content"}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="max-w-2xl"
            >
              {/* Studio badge */}
              {title.studio === "ShangoMaji Originals" && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-[2px] w-8 rounded-full"
                    style={{ background: "linear-gradient(90deg, #e53e2a, #f5c518)" }} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.25em] font-mono"
                    style={{
                      background: "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}>
                    ShangoMaji Original
                  </span>
                  <div className="h-[2px] w-8 rounded-full"
                    style={{ background: "linear-gradient(90deg, #f5c518, #e53e2a)" }} />
                </div>
              )}

              {/* Badges */}
              <div className="flex items-center gap-2.5 mb-5">
                {title.isNew && (
                  <span className="text-xs font-bold uppercase tracking-[0.2em] font-mono"
                    style={{
                      background: "linear-gradient(90deg, #e53e2a, #f5c518)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}>New</span>
                )}
                {title.isTrending && (
                  <span className="text-white/40 text-xs uppercase tracking-widest">
                    {title.isNew ? "·" : ""} Trending
                  </span>
                )}
                <span className="text-white/25 text-xs">
                  · {title.type === "series" ? `${title.seasons} Seasons` : title.runtime}
                </span>
              </div>

              {/* TITLE — max impact */}
              <h1
                className="text-display font-bold leading-[0.85] tracking-tight text-white mb-5"
                style={{
                  fontSize: "clamp(56px, 9vw, 120px)",
                  textShadow: "0 0 80px rgba(245,197,24,0.20), 0 0 160px rgba(229,62,42,0.12), 0 4px 40px rgba(0,0,0,0.8)",
                }}
              >
                {title.title}
              </h1>

              {/* Tagline */}
              <p className="text-display italic mb-5 leading-snug"
                style={{
                  fontSize: "clamp(15px, 1.8vw, 21px)",
                  color: "rgba(255,255,255,0.60)",
                }}>
                "{title.tagline}"
              </p>

              {/* Meta */}
              <div className="flex items-center gap-3 text-sm mb-5 flex-wrap">
                <span className="text-white/40">{title.year}</span>
                <span className="w-1 h-1 rounded-full" style={{ background: "rgba(229,62,42,0.6)" }} />
                <span className="border px-1.5 py-0.5 text-xs rounded text-white/40"
                  style={{ borderColor: "rgba(255,255,255,0.12)" }}>
                  {title.rating}
                </span>
                <span className="w-1 h-1 rounded-full" style={{ background: "rgba(245,197,24,0.6)" }} />
                <span className="font-bold"
                  style={{
                    background: "linear-gradient(90deg, #f07030, #f5c518)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}>
                  {title.score}%
                </span>
                <span className="text-white/30">Match</span>
              </div>

              {/* Genres */}
              <div className="flex gap-2 flex-wrap mb-7">
                {title.genres.slice(0, 2).map((g) => (
                  <span key={g} className="px-3 py-1 rounded-full text-xs font-medium text-white/50"
                    style={{
                      background: "rgba(229,62,42,0.10)",
                      border: "1px solid rgba(229,62,42,0.20)",
                    }}>
                    {g}
                  </span>
                ))}
              </div>

              {/* Description */}
              <p className="text-sm leading-relaxed line-clamp-2 mb-9 max-w-lg"
                style={{ color: "rgba(255,255,255,0.50)" }}>
                {title.description}
              </p>

              {/* CTAs */}
              <div className="flex items-center gap-3 flex-wrap">
                <Link href={`/watch/${title.slug}`}
                  className="group flex items-center gap-2.5 bg-white text-black font-bold px-8 py-3.5 rounded-xl hover:bg-white/92 active:scale-95 transition-all duration-200 text-sm"
                  style={{ boxShadow: "0 0 40px rgba(255,255,255,0.15)" }}>
                  <Play size={16} fill="currentColor" />
                  Play Now
                </Link>
                <Link href={`/title/${title.slug}`}
                  className="flex items-center gap-2.5 font-medium px-6 py-3.5 rounded-xl transition-all duration-200 text-sm text-white"
                  style={{
                    background: "rgba(229,62,42,0.10)",
                    border: "1px solid rgba(229,62,42,0.25)",
                    backdropFilter: "blur(12px)",
                  }}>
                  <Info size={16} />
                  More Info
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Arrow controls */}
      <div className="absolute right-6 md:right-10 top-1/2 -translate-y-1/2 z-10 flex-col gap-3 hidden md:flex">
        <button onClick={() => go((current - 1 + titles.length) % titles.length)}
          className="p-2 rounded-lg text-white transition-all duration-200"
          style={{ background: "rgba(229,62,42,0.12)", border: "1px solid rgba(229,62,42,0.2)" }}>
          <ChevronLeft size={18} />
        </button>
        <button onClick={() => go((current + 1) % titles.length)}
          className="p-2 rounded-lg text-white transition-all duration-200"
          style={{ background: "rgba(229,62,42,0.12)", border: "1px solid rgba(229,62,42,0.2)" }}>
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Dot indicators */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex gap-2">
        {titles.map((_, i) => (
          <button key={i} onClick={() => go(i)}
            className="rounded-full transition-all duration-300"
            style={i === current ? {
              width: "32px", height: "6px",
              background: "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)",
              boxShadow: "0 0 12px rgba(245,197,24,0.4)",
            } : {
              width: "6px", height: "6px",
              background: "rgba(255,255,255,0.20)",
            }}
          />
        ))}
      </div>

      {/* Bottom brand divider */}
      <div className="absolute bottom-0 left-0 right-0 brand-divider" />
    </section>
  );
}
