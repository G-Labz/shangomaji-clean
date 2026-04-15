"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { SearchBar } from "@/components/search/SearchBar";
import { ResultsGrid } from "@/components/search/ResultsGrid";
import { ContentRow } from "@/components/home/ContentRow";
import { searchTitles, getTrending, allGenres } from "@/data/mockData";
import Link from "next/link";

export default function SearchPage() {
  const [query, setQuery] = useState("");

  const results = query.length > 1 ? searchTitles(query) : [];
  const trending = getTrending();

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-[1600px] mx-auto px-6 md:px-10">
        {/* Heading */}
        <motion.h1
          className="text-display font-bold text-4xl md:text-5xl text-white tracking-tight mb-8 text-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          Search <span className="brand-text">ShangoMaji</span>
        </motion.h1>

        {/* Search input */}
        <SearchBar
          value={query}
          onChange={setQuery}
          autoFocus
        />

        {/* Genre quick links — shown when no query */}
        {query.length === 0 && (
          <motion.div
            className="mt-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <p className="text-xs uppercase tracking-widest text-ink-faint mb-4 text-center">
              Browse by Genre
            </p>
            <div className="flex flex-wrap justify-center gap-2 mb-14">
              {allGenres.map((g) => (
                <Link
                  key={g}
                  href={`/browse?genre=${g}`}
                  className="px-4 py-2 rounded-full bg-surface-raised border border-white/8 text-sm text-ink-muted hover:border-white/20 hover:text-white transition-all duration-200"
                >
                  {g}
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {/* Results */}
        <div className="mt-8">
          {query.length > 1 ? (
            <ResultsGrid titles={results} query={query} />
          ) : (
            <div className="-mx-6 md:-mx-10">
              <ContentRow
                label="Trending Searches"
                titles={trending}
                variant="landscape"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
