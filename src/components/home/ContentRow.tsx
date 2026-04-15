"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TitleCard } from "@/components/cards/TitleCard";
import type { Title } from "@/data/mockData";

interface ContentRowProps {
  label: string;
  titles: Title[];
  variant?: "poster" | "landscape";
  showProgress?: boolean;
}

export function ContentRow({ label, titles, variant = "poster", showProgress = false }: ContentRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -el.clientWidth * 0.75 : el.clientWidth * 0.75, behavior: "smooth" });
  };

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  };

  return (
    <motion.section
      className="relative mb-12"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {/* Row header */}
      <div className="flex items-center justify-between px-6 md:px-10 mb-5">
        <div className="flex items-center gap-3">
          {/* Brand accent dot */}
          <div className="w-1.5 h-5 rounded-full flex-shrink-0"
            style={{ background: "linear-gradient(180deg, #e53e2a, #f5c518)" }} />
          <h2 className="text-white font-semibold text-lg tracking-tight">{label}</h2>
        </div>
        <span className="brand-text text-xs font-mono uppercase tracking-widest opacity-60">
          View all ↗
        </span>
      </div>

      {/* Scroll container */}
      <div className="relative group/row">
        {canScrollLeft && (
          <>
            <div className="absolute left-0 top-0 bottom-0 w-20 z-10 bg-gradient-to-r from-[#080808] to-transparent pointer-events-none" />
            <button onClick={() => scroll("left")}
              className="absolute left-2 top-1/3 -translate-y-1/2 z-20 p-2 glass rounded-lg text-white opacity-0 group-hover/row:opacity-100 hover:bg-white/10 transition-all duration-200"
              aria-label="Scroll left">
              <ChevronLeft size={18} />
            </button>
          </>
        )}
        {canScrollRight && (
          <>
            <div className="absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-[#080808] to-transparent pointer-events-none" />
            <button onClick={() => scroll("right")}
              className="absolute right-2 top-1/3 -translate-y-1/2 z-20 p-2 glass rounded-lg text-white opacity-0 group-hover/row:opacity-100 hover:bg-white/10 transition-all duration-200"
              aria-label="Scroll right">
              <ChevronRight size={18} />
            </button>
          </>
        )}

        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="flex gap-3 overflow-x-auto scrollbar-hide px-6 md:px-10 pb-3"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {titles.map((t) => (
            <div key={t.id} style={{ scrollSnapAlign: "start" }}>
              <TitleCard title={t} variant={variant} showProgress={showProgress} />
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
