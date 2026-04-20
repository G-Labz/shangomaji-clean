"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { FilterBar } from "@/components/browse/FilterBar";
import { TitleCard } from "@/components/cards/TitleCard";
import { titles, allGenres } from "@/data/mockData";
import type { Genre, Title } from "@/data/mockData";

type SortKey = "score" | "year" | "title";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

export default function BrowsePage() {
  const [creatorTitles, setCreatorTitles]     = useState<Title[]>([]);
  const [creatorTitlesError, setCreatorTitlesError] = useState<string | null>(null);
  const [activeGenre, setActiveGenre] = useState<Genre | "All">("All");
  const [activeType, setActiveType] = useState<"all" | "movie" | "series">("all");
  const [sortBy, setSortBy] = useState<SortKey>("score");

  useEffect(() => {
    async function loadCreatorTitles() {
      try {
        const res = await fetch("/api/public/titles");
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || `Failed to load creator titles (HTTP ${res.status})`);
        }
        if (!data.titles) {
          throw new Error("Public titles API returned an unexpected response.");
        }

        setCreatorTitles(
          data.titles.map((t: any) => ({
            ...t,
            score:  t.score  || 0,
            cast:   t.cast   || [],
            genres: t.genres || [],
          }))
        );
      } catch (err: any) {
        console.error("[Browse] Creator titles failed to load:", err.message);
        setCreatorTitlesError(err.message);
      }
    }

    loadCreatorTitles();
  }, []);

  const filtered = useMemo(() => {
    // Include all activated creator titles — the public titles API is the gate,
    // not the presence of a custom poster. Titles without custom covers will
    // render with the placeholder image, which is acceptable.
    let list = [...titles, ...creatorTitles];

    if (activeGenre !== "All") {
      list = list.filter((t) => t.genres.includes(activeGenre));
    }

    if (activeType !== "all") {
      list = list.filter((t) => t.type === activeType);
    }

    list.sort((a, b) => {
      if (sortBy === "score") return b.score - a.score;
      if (sortBy === "year") return b.year - a.year;
      return a.title.localeCompare(b.title);
    });

    return list;
  }, [activeGenre, activeType, sortBy, creatorTitles]);

  return (
    <div className="min-h-screen pt-16">
      {/* Page header */}
      <div className="max-w-[1600px] mx-auto px-6 md:px-10 pt-10 pb-6">
        <motion.h1
          className="text-display font-bold text-5xl md:text-6xl text-white tracking-tight"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Browse
        </motion.h1>
        <motion.div
          className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 mt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          <p className="text-white/40 text-base">
            {filtered.length} title{filtered.length !== 1 ? "s" : ""} available
          </p>
          {creatorTitlesError ? (
            <p className="text-xs" style={{ color: "rgba(255,100,80,0.55)" }}>
              Creator titles could not be loaded.
            </p>
          ) : (
            <p className="text-xs italic hidden sm:block" style={{ color: "rgba(240,112,48,0.5)" }}>
              New lanes. Not the same ones.
            </p>
          )}
        </motion.div>
      </div>

      {/* Filter bar */}
      <FilterBar
        genres={allGenres}
        activeGenre={activeGenre}
        onGenreChange={setActiveGenre}
        activeType={activeType}
        onTypeChange={setActiveType}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {/* Grid */}
      <div className="max-w-[1600px] mx-auto px-6 md:px-10 py-10">
        {filtered.length === 0 ? (
          <motion.div
            className="text-center py-24"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p className="text-ink-muted text-lg">
              No titles match your filters.
            </p>
            <button
              onClick={() => {
                setActiveGenre("All");
                setActiveType("all");
              }}
              className="mt-4 text-sm brand-text underline"
            >
              Reset filters
            </button>
          </motion.div>
        ) : (
          <motion.div
            key={`${activeGenre}-${activeType}-${sortBy}`}
            className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-x-3 gap-y-7"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {filtered.map((t) => (
              <motion.div key={t.id} variants={item}>
                <TitleCard title={t} variant="poster" />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
