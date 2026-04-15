"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import type { Title } from "@/data/mockData";
import { BLUR_PLACEHOLDER } from "@/lib/imageUtils";

interface ResultsGridProps {
  titles: Title[];
  query: string;
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

export function ResultsGrid({ titles, query }: ResultsGridProps) {
  if (titles.length === 0 && query.length > 1) {
    return (
      <motion.div
        className="text-center py-24"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <p className="text-4xl mb-4">🔍</p>
        <p className="text-ink-muted text-lg">
          No results for{" "}
          <span className="text-white">"{query}"</span>
        </p>
        <p className="text-ink-faint text-sm mt-2">
          Try a different title, genre, or actor name.
        </p>
      </motion.div>
    );
  }

  if (query.length === 0) {
    return (
      <motion.div
        className="text-center py-24"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <p className="text-ink-faint text-base">
          Start typing to search ShangoMaji…
        </p>
      </motion.div>
    );
  }

  return (
    <div>
      <p className="text-ink-faint text-sm mb-6 px-1">
        {titles.length} result{titles.length !== 1 ? "s" : ""} for{" "}
        <span className="text-white">"{query}"</span>
      </p>

      <motion.div
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
        variants={container}
        initial="hidden"
        animate="show"
        key={query}
      >
        {titles.map((title) => (
          <motion.div key={title.id} variants={item}>
            <Link href={`/title/${title.slug}`} className="group block">
              <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-surface-elevated mb-2">
                <Image
                  src={title.posterUrl}
                  alt={title.title}
                  fill
                  className="object-cover transition-transform duration-400 group-hover:scale-105"
                  sizes="180px"
                  placeholder="blur"
                  blurDataURL={BLUR_PLACEHOLDER}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                      <Play size={14} fill="#000" className="ml-0.5" />
                    </div>
                  </div>
                </div>
                {title.isNew && (
                  <div className="absolute top-2 left-2">
                    <span className="brand-text text-[9px] font-bold uppercase tracking-widest bg-black/60 rounded px-1.5 py-0.5">
                      New
                    </span>
                  </div>
                )}
              </div>
              <p className="text-sm font-medium text-white/90 truncate group-hover:text-white transition-colors">
                {title.title}
              </p>
              <p className="text-[11px] text-ink-faint truncate mt-0.5">
                {title.year} · {title.genres[0]}
              </p>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
