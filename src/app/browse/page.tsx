"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { FilterBar } from "@/components/browse/FilterBar";
import { TitleCard } from "@/components/cards/TitleCard";
import { titles, allGenres } from "@/data/mockData";
import type { Genre, Title } from "@/data/mockData";

// Phase 6 Tier 1 — sort controls are hidden when the live catalog is
// smaller than this threshold. Sorting six items by score / year / A-Z
// is theatre, not utility.
const SORT_VISIBLE_THRESHOLD = 6;
import { PageTitle } from "@/components/util/PageTitle";

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

  // The "live catalog" — every title currently available to render on
  // Browse, regardless of active filters. Used both as the input to the
  // filter pipeline AND as the source-of-truth for honest UI gates
  // (genre chips, sort visibility) so we never expose an affordance
  // that leads to a zero-title lane.
  const liveCatalog = useMemo(
    () => [...titles, ...creatorTitles],
    [creatorTitles]
  );

  // Phase 6 Tier 1 — derive visible genre chips from the live catalog.
  // A chip is shown only when at least one live title carries that
  // genre. Chips that would lead to an empty lane never render.
  const visibleGenres = useMemo<Genre[]>(() => {
    const present = new Set<string>();
    for (const t of liveCatalog) {
      for (const g of t.genres) present.add(g);
    }
    return allGenres.filter((g) => present.has(g));
  }, [liveCatalog]);

  // If the active genre disappears from the live catalog (e.g. the only
  // title in that lane was removed), silently snap back to "All" so the
  // grid never renders an empty state for an invisible chip.
  useEffect(() => {
    if (activeGenre !== "All" && !visibleGenres.includes(activeGenre)) {
      setActiveGenre("All");
    }
  }, [activeGenre, visibleGenres]);

  const filtered = useMemo(() => {
    let list = [...liveCatalog];

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
  }, [activeGenre, activeType, sortBy, liveCatalog]);

  const showSort = liveCatalog.length >= SORT_VISIBLE_THRESHOLD;

  return (
    <div className="min-h-screen pt-16">
      <PageTitle title="Browse" />
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
        {/* Phase 6 Tier 1 — the public catalog count string ("N titles
            available") is hidden. Counts on a small live catalog read
            as a deficiency report, not a feature. */}
        <motion.div
          className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 mt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
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

      {/* Filter bar — only chips that map to live titles render.
          Sort controls hide entirely when the live catalog is small. */}
      <FilterBar
        genres={visibleGenres}
        activeGenre={activeGenre}
        onGenreChange={setActiveGenre}
        activeType={activeType}
        onTypeChange={setActiveType}
        sortBy={sortBy}
        onSortChange={setSortBy}
        showSort={showSort}
      />

      {/* Grid */}
      <div className="max-w-[1600px] mx-auto px-6 md:px-10 py-10">
        {filtered.length === 0 ? (
          // When zero titles exist at all (mock disabled in production AND
          // no creator titles yet), show the prepared-catalog empty state
          // instead of the "no filter match" message.
          titles.length + creatorTitles.length === 0 ? (
            <motion.div
              className="text-center py-24"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <p
                className="text-xs uppercase tracking-[0.25em] mb-4"
                style={{ color: "rgba(240,112,48,0.7)" }}
              >
                Catalog
              </p>
              <h2 className="text-display font-bold text-2xl md:text-3xl text-white tracking-tight mb-3">
                The catalog is being prepared.
              </h2>
              <p
                className="text-base leading-relaxed mx-auto max-w-xl"
                style={{ color: "rgba(255,255,255,0.55)" }}
              >
                Approved works will appear here once they are licensed and ready
                for distribution.
              </p>
            </motion.div>
          ) : (
            <motion.div
              className="text-center py-24"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <p className="text-ink-muted text-lg">
                Nothing in this lane yet.
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
          )
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
