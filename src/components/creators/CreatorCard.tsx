"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { BadgeCheck, Play } from "lucide-react";
import type { Creator } from "@/data/creatorData";

interface CreatorCardProps {
  creator: Creator;
  variant?: "default" | "featured";
}

export function CreatorCard({ creator, variant = "default" }: CreatorCardProps) {
  const isFeatured = variant === "featured";

  return (
    <motion.div
      className={`group relative flex-shrink-0 cursor-pointer ${
        isFeatured ? "w-full" : "w-[clamp(200px,20vw,260px)]"
      }`}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Link href={`/creators/${creator.handle}`} className="block">
        {/* Banner / backdrop */}
        <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden bg-surface-elevated">
          <Image
            src={creator.bannerUrl}
            alt={creator.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes={isFeatured ? "600px" : "260px"}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

          {/* Genres */}
          <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
            {creator.genres.slice(0, 2).map((g) => (
              <span
                key={g}
                className="text-[9px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full glass-dark text-white/80"
              >
                {g}
              </span>
            ))}
          </div>

          {/* Avatar + name anchored to bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end gap-3">
            <div className="relative flex-shrink-0">
              <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-white/20">
                <Image
                  src={creator.avatarUrl}
                  alt={creator.name}
                  width={48}
                  height={48}
                  className="object-cover"
                />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-white font-semibold text-sm truncate leading-tight">
                  {creator.name}
                </p>
                {creator.isVerified && (
                  <BadgeCheck size={13} className="text-brand-yellow flex-shrink-0" />
                )}
              </div>
              <p className="text-white/50 text-[11px] truncate mt-0.5">
                {creator.origin}
              </p>
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                <Play size={10} fill="#000" className="ml-0.5" />
              </div>
            </div>
          </div>
        </div>

        {/* Tagline below card */}
        <p className="mt-2.5 px-0.5 text-xs text-ink-muted leading-relaxed line-clamp-2 group-hover:text-white/70 transition-colors italic">
          "{creator.tagline}"
        </p>

        {/* Stats row */}
        <div className="mt-2 px-0.5 flex gap-4">
          {creator.stats.slice(0, 2).map((s) => (
            <div key={s.label}>
              <p className="text-white text-xs font-semibold">{s.value}</p>
              <p className="text-ink-faint text-[10px]">{s.label}</p>
            </div>
          ))}
        </div>
      </Link>
    </motion.div>
  );
}
