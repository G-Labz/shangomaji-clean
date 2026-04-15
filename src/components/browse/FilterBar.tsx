"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Genre } from "@/data/mockData";

// ─── Genre descriptions — shown on hover ──────
const GENRE_DESCRIPTIONS: Record<Genre, string> = {
  "Afro Cyberpunk":         "Neo cities. Tech meets tradition. The future is African.",
  "Mythology & Gods":       "Orishas, ancestors, divine powers. Epic myth made cinematic.",
  "Diaspora Stories":       "Identity, belonging, dual worlds. The in-between.",
  "Folklore & the Ancient": "Griots, oral tradition, the old world retold at anime scale.",
  "Martial Worlds":         "Warrior epics. African samurai. Combat with cultural depth.",
  "Futures & Sci-Fi":       "Afrofuturism proper. Space, time, what comes after.",
  "Spirits & the Unseen":   "Rooted in real spiritual tradition. The veil between worlds.",
  "Coming of Age":          "Growing up across cultures. Finding yourself.",
  "Short Films":            "Compact, precise, powerful. The short form done right.",
};

interface FilterBarProps {
  genres: Genre[];
  activeGenre: Genre | "All";
  onGenreChange: (g: Genre | "All") => void;
  activeType: "all" | "movie" | "series";
  onTypeChange: (t: "all" | "movie" | "series") => void;
  sortBy: "score" | "year" | "title";
  onSortChange: (s: "score" | "year" | "title") => void;
}

const TYPE_OPTIONS = [
  { label: "All",     value: "all"    },
  { label: "Movies",  value: "movie"  },
  { label: "Series",  value: "series" },
] as const;

const SORT_OPTIONS = [
  { label: "Top Rated", value: "score" },
  { label: "Newest",    value: "year"  },
  { label: "A–Z",       value: "title" },
] as const;

function GenreChip({
  genre,
  active,
  onClick,
}: {
  genre: Genre | "All";
  active: boolean;
  onClick: () => void;
}) {
  const [hovering, setHovering] = useState(false);
  const desc = genre !== "All" ? GENRE_DESCRIPTIONS[genre] : null;

  return (
    <div
      className="relative flex-shrink-0"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <button
        onClick={onClick}
        className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
          active
            ? "border-transparent text-black"
            : "border-white/10 text-ink-muted hover:border-white/25 hover:text-white"
        }`}
        style={
          active
            ? { background: "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)" }
            : undefined
        }
      >
        {genre}
      </button>

      {/* Description tooltip */}
      <AnimatePresence>
        {hovering && desc && (
          <motion.div
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 z-50 pointer-events-none"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
          >
            <div className="glass-dark rounded-xl px-3 py-2 w-48 text-center">
              <p className="text-white/80 text-[11px] leading-relaxed">{desc}</p>
            </div>
            {/* Arrow */}
            <div className="flex justify-center mt-1">
              <div className="w-2 h-2 bg-black/70 rotate-45 -mt-1.5" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FilterBar({
  genres,
  activeGenre,
  onGenreChange,
  activeType,
  onTypeChange,
  sortBy,
  onSortChange,
}: FilterBarProps) {
  return (
    <div className="sticky top-16 z-30 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/5 py-4">
      <div className="max-w-[1600px] mx-auto px-6 md:px-10 space-y-3">

        {/* Type + Sort row */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Type toggle */}
          <div className="flex items-center gap-1 bg-surface-raised rounded-xl p-1">
            {TYPE_OPTIONS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => onTypeChange(value)}
                className="relative px-4 py-1.5 text-sm font-medium rounded-lg transition-colors duration-200"
              >
                <span className={activeType === value ? "text-white" : "text-ink-muted"}>
                  {label}
                </span>
                {activeType === value && (
                  <motion.span
                    layoutId="type-pill"
                    className="absolute inset-0 bg-white/10 rounded-lg"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-faint uppercase tracking-widest">Sort</span>
            <div className="flex gap-1 bg-surface-raised rounded-xl p-1">
              {SORT_OPTIONS.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => onSortChange(value)}
                  className={`relative px-3 py-1.5 text-xs font-medium rounded-lg transition-colors duration-200 ${
                    sortBy === value ? "text-white" : "text-ink-muted"
                  }`}
                >
                  {label}
                  {sortBy === value && (
                    <motion.span
                      layoutId="sort-pill"
                      className="absolute inset-0 bg-white/10 rounded-lg"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Genre chips with tooltips */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          <GenreChip
            genre="All"
            active={activeGenre === "All"}
            onClick={() => onGenreChange("All")}
          />
          {genres.map((g) => (
            <GenreChip
              key={g}
              genre={g}
              active={activeGenre === g}
              onClick={() => onGenreChange(g)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
