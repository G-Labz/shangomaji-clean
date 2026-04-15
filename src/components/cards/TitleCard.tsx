"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Play, Plus, ThumbsUp } from "lucide-react";
import type { Title } from "@/data/mockData";

interface TitleCardProps {
  title: Title;
  variant?: "poster" | "landscape";
  showProgress?: boolean;
}

export function TitleCard({ title, variant = "poster", showProgress = false }: TitleCardProps) {
  const isPoster = variant === "poster";
  const isOriginal = title.studio === "ShangoMaji Originals";

  return (
    <motion.div
      className="flex-shrink-0 group relative cursor-pointer"
      style={{ width: isPoster ? "clamp(130px, 14vw, 180px)" : "clamp(220px, 22vw, 320px)" }}
      whileHover={{ scale: 1.04, zIndex: 10 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Link href={`/title/${title.slug}`} className="block">
        {/* Thumbnail */}
        <div className={`relative overflow-hidden rounded-xl bg-surface-elevated ${isPoster ? "aspect-[2/3]" : "aspect-video"}`}>
          <Image
            src={isPoster ? title.posterUrl : title.backdropUrl}
            alt={title.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes={isPoster ? "180px" : "320px"}
          />

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/55 flex flex-col justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="flex gap-2 mb-2">
              <button
                className="flex-1 flex items-center justify-center gap-1.5 bg-white text-black text-xs font-semibold py-2 rounded-lg hover:bg-white/90 transition-colors"
                onClick={(e) => { e.preventDefault(); window.location.href = `/watch/${title.slug}`; }}
              >
                <Play size={12} fill="currentColor" />
                Play
              </button>
              <button className="p-2 glass rounded-lg text-white hover:bg-white/15 transition-colors" onClick={(e) => e.preventDefault()} aria-label="Add to My List">
                <Plus size={14} />
              </button>
              <button className="p-2 glass rounded-lg text-white hover:bg-white/15 transition-colors" onClick={(e) => e.preventDefault()} aria-label="Like">
                <ThumbsUp size={14} />
              </button>
            </div>
            <div className="flex items-center gap-2 text-[10px]" style={{ color: "rgba(255,255,255,0.6)" }}>
              <span style={{ background: "linear-gradient(90deg,#e53e2a,#f5c518)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text", fontWeight:700 }}>{title.score}%</span>
              <span>·</span>
              <span>{title.year}</span>
              {title.type === "series" && title.seasons && <><span>·</span><span>{title.seasons}S</span></>}
            </div>
          </div>

          {/* Top badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {isOriginal && (
              <span className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm"
                style={{ background: "linear-gradient(90deg,#e53e2a,#f07030,#f5c518)", color: "#000" }}>
                Original
              </span>
            )}
            {title.isNew && !isOriginal && (
              <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md backdrop-blur-sm"
                style={{ background: "rgba(0,0,0,0.6)", color: "#f5c518" }}>
                New
              </span>
            )}
          </div>

          {/* Progress bar */}
          {showProgress && title.progress !== undefined && (
            <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: "rgba(255,255,255,0.15)" }}>
              <div className="h-full" style={{ width:`${title.progress}%`, background:"linear-gradient(90deg,#e53e2a,#f07030,#f5c518)" }} />
            </div>
          )}
        </div>

        {/* Below card — title, creator, genres */}
        <div className="mt-2 px-0.5">
          <p className="text-sm font-medium text-white/90 truncate leading-tight group-hover:text-white transition-colors">
            {title.title}
          </p>
          {/* Creator attribution */}
          {title.creatorName && (
            <p className="text-[10px] mt-0.5 truncate"
              style={{ color: "rgba(240,112,48,0.8)" }}>
              By {title.creatorName}
            </p>
          )}
          <p className="text-[11px] mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.3)" }}>
            {title.genres.slice(0, 2).join(" · ")}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}
