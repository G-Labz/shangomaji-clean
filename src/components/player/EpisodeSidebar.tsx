"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Play, X } from "lucide-react";
import type { Episode, Watchable } from "@/data/videoData";

interface EpisodeSidebarProps {
  watchable: Watchable;
  currentEpisodeId: string;
  onSelect: (ep: Episode) => void;
  onClose: () => void;
}

export function EpisodeSidebar({
  watchable,
  currentEpisodeId,
  onSelect,
  onClose,
}: EpisodeSidebarProps) {
  const episodes = watchable.episodes ?? [];
  const seasons = Array.from(new Set(episodes.map((e) => e.season)));

  return (
    <AnimatePresence>
      <motion.div
        className="absolute top-0 right-0 bottom-0 w-80 z-30 flex flex-col"
        style={{ background: "rgba(10,10,10,0.97)", backdropFilter: "blur(20px)" }}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <div>
            <p className="text-white font-semibold text-sm">{watchable.titleName}</p>
            <p className="text-ink-faint text-xs mt-0.5">Episodes</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-ink-faint hover:text-white transition-colors rounded-lg hover:bg-white/8"
          >
            <X size={16} />
          </button>
        </div>

        {/* Season tabs */}
        {seasons.length > 1 && (
          <div className="flex gap-1 px-5 py-3 border-b border-white/5">
            {seasons.map((s) => (
              <button
                key={s}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/8 text-white"
              >
                Season {s}
              </button>
            ))}
          </div>
        )}

        {/* Episode list */}
        <div className="flex-1 overflow-y-auto scrollbar-hide py-2">
          {episodes.map((ep) => {
            const active = ep.id === currentEpisodeId;
            return (
              <button
                key={ep.id}
                onClick={() => onSelect(ep)}
                className={`w-full flex gap-3 px-4 py-3 text-left transition-colors group ${
                  active
                    ? "bg-white/8"
                    : "hover:bg-white/5"
                }`}
              >
                {/* Thumbnail */}
                <div className="relative w-24 aspect-video rounded-lg overflow-hidden flex-shrink-0 bg-surface-elevated">
                  <Image
                    src={ep.thumbnailUrl}
                    alt={ep.title}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                  <div className={`absolute inset-0 flex items-center justify-center transition-colors ${
                    active ? "bg-black/40" : "bg-black/20 group-hover:bg-black/40"
                  }`}>
                    {active ? (
                      <div className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-black" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play size={10} fill="white" className="ml-0.5" />
                      </div>
                    )}
                  </div>
                  {/* Progress stub */}
                  {active && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20">
                      <div className="h-full w-1/3 bg-brand-gradient" />
                    </div>
                  )}
                </div>

                {/* Meta */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-start justify-between gap-1">
                    <p className={`text-xs font-semibold leading-tight truncate ${
                      active ? "text-white" : "text-white/80"
                    }`}>
                      {ep.number}. {ep.title}
                    </p>
                    <span className="text-ink-faint text-[10px] flex-shrink-0 font-mono">
                      {ep.runtime}
                    </span>
                  </div>
                  <p className="text-ink-faint text-[11px] mt-1 line-clamp-2 leading-relaxed">
                    {ep.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
