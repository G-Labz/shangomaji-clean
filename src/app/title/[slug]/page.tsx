"use client";

import { notFound } from "next/navigation";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Play,
  Plus,
  ThumbsUp,
  Share2,
  Star,
  Clock,
  Tv,
  Film,
  ChevronLeft,
} from "lucide-react";
import { getTitleBySlug, titles } from "@/data/mockData";
import { ContentRow } from "@/components/home/ContentRow";
import { CulturalContextPanel } from "@/components/title/CulturalContextPanel";
interface PageProps {
  params: { slug: string };
}

export default function TitlePage({ params }: PageProps) {
  const { slug } = params;
  const title = getTitleBySlug(slug);

  if (!title) {
    return <CreatorTitleFallback slug={slug} />;
  }

  // Related: same genres, exclude this title, exclude creator projects (no mockData entry)
  const related = titles
    .filter(
      (t) =>
        t.id !== title.id &&
        t.genres.some((g) => title.genres.includes(g))
    )
    .slice(0, 10);

  const TypeIcon = title.type === "movie" ? Film : Tv;

  return (
    <div className="min-h-screen">
      {/* ── Cinematic Hero ── */}
      <div className="relative w-full h-[70vh] min-h-[500px] max-h-[780px] overflow-hidden">
        <Image
          src={title.backdropUrl}
          alt={title.title}
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/20 to-transparent" />

        {/* Back button */}
        <motion.div
          className="absolute top-20 left-6 md:left-10 z-10"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Link
            href="/browse"
            className="flex items-center gap-1.5 text-ink-muted hover:text-white text-sm transition-colors group"
          >
            <ChevronLeft
              size={16}
              className="transition-transform group-hover:-translate-x-0.5"
            />
            Back
          </Link>
        </motion.div>

        {/* Poster (visible on lg+) */}
        <motion.div
          className="absolute bottom-0 right-8 hidden lg:block z-10"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 0.15, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="w-48 aspect-[2/3] rounded-2xl overflow-hidden">
            <Image
              src={title.posterUrl}
              alt=""
              fill
              className="object-cover"
              sizes="192px"
            />
          </div>
        </motion.div>
      </div>

      {/* ── Meta + CTA ── */}
      <div className="max-w-[1600px] mx-auto px-6 md:px-10 -mt-32 relative z-10">
        <motion.div
          className="max-w-2xl"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {/* Badges */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-ink-muted">
              <TypeIcon size={12} />
              {title.type === "series" ? "Series" : "Movie"}
            </span>
            {title.isNew && (
              <span className="brand-text text-xs font-bold uppercase tracking-widest">
                · New
              </span>
            )}
            {title.isTrending && (
              <span className="text-ink-muted text-xs">· Trending</span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-display font-bold text-5xl md:text-7xl leading-[0.9] tracking-tight text-white mb-4">
            {title.title}
          </h1>

          {/* Tagline */}
          <p className="text-display italic text-ink-muted text-xl mb-5">
            "{title.tagline}"
          </p>

          {/* Stats row */}
          <div className="flex items-center gap-4 flex-wrap text-sm mb-5">
            <div className="flex items-center gap-1.5">
              <Star size={14} className="text-brand-yellow fill-brand-yellow" />
              <span className="brand-text font-semibold">{title.score}%</span>
              <span className="text-ink-faint">Match</span>
            </div>
            <span className="text-ink-faint">·</span>
            <span className="text-ink-muted">{title.year}</span>
            <span className="text-ink-faint">·</span>
            <span className="border border-white/20 px-1.5 py-0.5 text-xs rounded text-ink-muted">
              {title.rating}
            </span>
            <span className="text-ink-faint">·</span>
            {title.type === "movie" ? (
              <span className="flex items-center gap-1 text-ink-muted">
                <Clock size={13} />
                {title.runtime}
              </span>
            ) : (
              <span className="text-ink-muted">
                {title.seasons} Season{title.seasons !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Genres */}
          <div className="flex gap-2 flex-wrap mb-6">
            {title.genres.map((g) => (
              <Link
                key={g}
                href={`/browse?genre=${g}`}
                className="px-3 py-1 rounded-full bg-surface-raised border border-white/8 text-xs text-ink-muted hover:border-white/20 hover:text-white transition-all duration-200"
              >
                {g}
              </Link>
            ))}
          </div>

          {/* CTA */}
          <div className="flex items-center gap-3 flex-wrap mb-8">
            <Link
              href={`/watch/${title.slug}`}
              className="flex items-center gap-2.5 bg-white text-black font-semibold px-7 py-3.5 rounded-xl hover:bg-white/90 active:scale-95 transition-all duration-200 text-sm"
            >
              <Play size={16} fill="currentColor" />
              {title.type === "movie" ? "Play Movie" : "Play S1 E1"}
            </Link>
            <button className="flex items-center gap-2.5 glass text-white font-medium px-5 py-3.5 rounded-xl hover:bg-white/10 active:scale-95 transition-all duration-200 text-sm">
              <Plus size={16} />
              My List
            </button>
            <button className="p-3.5 glass rounded-xl text-ink-muted hover:text-white hover:bg-white/10 transition-all duration-200">
              <ThumbsUp size={16} />
            </button>
            <button className="p-3.5 glass rounded-xl text-ink-muted hover:text-white hover:bg-white/10 transition-all duration-200">
              <Share2 size={16} />
            </button>
          </div>
        </motion.div>

        {/* ── Creator presence banner ── */}
        {title.creatorHandle && title.creatorName && (
          <motion.div
            className="py-5 border-t border-white/5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            <Link
              href={`/creators/${title.creatorHandle}`}
              className="group inline-flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-200"
              style={{ background: "rgba(229,62,42,0.07)", border: "1px solid rgba(229,62,42,0.18)" }}
            >
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-[0.2em] mb-0.5" style={{ color: "rgba(240,112,48,0.7)" }}>
                  {title.studio === "ShangoMaji Originals" ? "ShangoMaji Original · " : ""}Created by
                </span>
                <span className="text-white font-semibold text-sm group-hover:text-white/80 transition-colors">
                  {title.creatorName}
                </span>
              </div>
              <span className="ml-auto text-xs flex items-center gap-1.5 transition-all duration-200 group-hover:gap-2.5"
                style={{ color: "rgba(245,197,24,0.8)" }}>
                Explore this creator
                <span>→</span>
              </span>
            </Link>
          </motion.div>
        )}

        {/* ── Info Grid ── */}
        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 py-10 border-t border-white/5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          {/* Description */}
          <div className="lg:col-span-2">
            <h2 className="text-xs uppercase tracking-widest text-ink-faint mb-3">
              About
            </h2>
            <p className="text-ink-muted leading-relaxed text-sm md:text-base">
              {title.description}
            </p>
          </div>

          {/* Details */}
          <div className="space-y-4">
            {title.director && (
              <div>
                <p className="text-xs uppercase tracking-widest text-ink-faint mb-1">
                  Director
                </p>
                <p className="text-white text-sm">{title.director}</p>
              </div>
            )}
            {title.cast.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-widest text-ink-faint mb-1">
                  Cast
                </p>
                <p className="text-ink-muted text-sm leading-relaxed">
                  {title.cast.join(", ")}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs uppercase tracking-widest text-ink-faint mb-1">
                Studio
              </p>
              <p className="text-ink-muted text-sm">{title.studio}</p>
            </div>
          </div>
        </motion.div>

        {/* ── Episodes stub (series only) ── */}
        {title.type === "series" && (
          <motion.div
            className="py-8 border-t border-white/5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-white font-semibold text-lg mb-5">Episodes</h2>
            <div className="flex gap-2 mb-6">
              {Array.from({ length: title.seasons ?? 1 }, (_, i) => (
                <button
                  key={i}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    i === 0
                      ? "bg-white text-black"
                      : "glass text-ink-muted hover:text-white"
                  }`}
                >
                  Season {i + 1}
                </button>
              ))}
            </div>

            {/* Episode list stub */}
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((ep) => (
                <Link
                  key={ep}
                  href={`/watch/${title.slug}?ep=${title.slug.substring(0,2)}-s1e${ep}`}
                  className="flex items-center gap-4 p-4 rounded-xl bg-surface-raised hover:bg-surface-elevated transition-colors group cursor-pointer"
                >
                  <span className="text-ink-faint font-mono text-sm w-6 text-center">
                    {ep}
                  </span>
                  <div className="w-28 aspect-video rounded-lg overflow-hidden bg-surface-elevated flex-shrink-0">
                    <Image
                      src={title.backdropUrl}
                      alt={`Episode ${ep}`}
                      width={112}
                      height={63}
                      className="object-cover w-full h-full opacity-70 group-hover:opacity-100 transition-opacity"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      Episode {ep}
                    </p>
                    <p className="text-ink-faint text-xs mt-0.5">
                      44 min · Available now
                    </p>
                  </div>
                  <Play
                    size={16}
                    className="text-ink-faint group-hover:text-white transition-colors flex-shrink-0"
                  />
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* ── Cultural Context ── */}
      <div className="max-w-[1600px] mx-auto px-6 md:px-10">
        <CulturalContextPanel />
      </div>

      {/* ── Related titles ── */}
      {related.length > 0 && (
        <div className="mt-10">
          <ContentRow label="More Like This" titles={related} />
        </div>
      )}
    </div>
  );
}

function CreatorTitleFallback({ slug }: { slug: string }) {
  const [title, setTitle] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/public/titles")
      .then((r) => r.json())
      .then((data) => {
        const found = (data.titles ?? []).find((t: any) => t.slug === slug);
        setTitle(found || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-ink-faint">Loading...</p>
      </div>
    );
  }

  if (!title) return notFound();

  return (
    <div className="min-h-screen">
      <div className="relative w-full h-[60vh] min-h-[400px] max-h-[700px] overflow-hidden">
        {title.backdropUrl && title.backdropUrl !== "/images/placeholder.png" && (
          <Image
            src={title.backdropUrl}
            alt={title.title}
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/20 to-transparent" />
        <motion.div
          className="absolute top-20 left-6 md:left-10 z-10"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Link href="/browse" className="flex items-center gap-1.5 text-ink-muted hover:text-white text-sm transition-colors group">
            <ChevronLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
            Back
          </Link>
        </motion.div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 md:px-10 -mt-32 relative z-10">
        <motion.div className="max-w-2xl" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-ink-muted">{title.type === "series" ? "Series" : "Movie"}</span>
          </div>

          <h1 className="text-display font-bold text-5xl md:text-7xl leading-[0.9] tracking-tight text-white mb-4">
            {title.title}
          </h1>

          {title.tagline && (
            <p className="text-display italic text-ink-muted text-xl mb-5">"{title.tagline}"</p>
          )}

          <div className="flex items-center gap-4 flex-wrap text-sm mb-5">
            <span className="text-ink-muted">{title.year}</span>
            <span className="border border-white/20 px-1.5 py-0.5 text-xs rounded text-ink-muted">{title.rating}</span>
          </div>

          {title.genres?.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-6">
              {title.genres.map((g: string) => (
                <span key={g} className="px-3 py-1 rounded-full bg-surface-raised border border-white/8 text-xs text-ink-muted">{g}</span>
              ))}
            </div>
          )}

          {title.creatorName ? (
            <motion.div
              className="py-5 border-t border-white/5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.4 }}
            >
              {title.creatorHandle ? (
                <Link
                  href={`/creators/${title.creatorHandle}`}
                  className="group inline-flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-200"
                  style={{ background: "rgba(229,62,42,0.07)", border: "1px solid rgba(229,62,42,0.18)" }}
                >
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-[0.2em] mb-0.5" style={{ color: "rgba(240,112,48,0.7)" }}>
                      Created by
                    </span>
                    <span className="text-white font-semibold text-sm group-hover:text-white/80 transition-colors">
                      {title.creatorName}
                    </span>
                  </div>
                  <span className="ml-auto text-xs flex items-center gap-1.5 transition-all duration-200 group-hover:gap-2.5"
                    style={{ color: "rgba(245,197,24,0.8)" }}>
                    Explore this creator <span>→</span>
                  </span>
                </Link>
              ) : (
                <div
                  className="inline-flex items-center gap-4 px-5 py-3.5 rounded-2xl"
                  style={{ background: "rgba(229,62,42,0.07)", border: "1px solid rgba(229,62,42,0.18)" }}
                >
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-[0.2em] mb-0.5" style={{ color: "rgba(240,112,48,0.7)" }}>
                      Created by
                    </span>
                    <span className="text-white font-semibold text-sm">{title.creatorName}</span>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="py-8 border-t border-white/5">
              <p className="text-xs text-ink-faint">Published by <span className="text-ink-muted">{title.studio}</span></p>
            </div>
          )}

          {title.description && (
            <div className="py-8 border-t border-white/5">
              <h2 className="text-xs uppercase tracking-widest text-ink-faint mb-3">About</h2>
              <p className="text-ink-muted leading-relaxed text-sm md:text-base">{title.description}</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
