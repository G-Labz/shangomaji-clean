"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { List } from "lucide-react";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { EpisodeSidebar } from "@/components/player/EpisodeSidebar";
import {
  getWatchable,
  getFirstEpisode,
  getNextEpisode,
} from "@/data/videoData";
import type { Episode } from "@/data/videoData";

interface PageProps {
  params: { slug: string };
  searchParams: { ep?: string };
}

export default function WatchPage({ params, searchParams }: PageProps) {
  const { slug } = params;
  const { ep: epId } = searchParams;

  const router = useRouter();
  const watchable = getWatchable(slug);

  if (!watchable) {
    return <CreatorWatchFallback slug={slug} />;
  }

  // ── Resolve initial episode / video ──────────
  const firstEp = getFirstEpisode(slug);
  const initialEp = epId
    ? watchable.episodes?.find((e) => e.id === epId) ?? firstEp
    : firstEp;

  const [currentEp, setCurrentEp] = useState<Episode | null>(
    watchable.type === "series" ? (initialEp ?? null) : null
  );
  const [showSidebar, setShowSidebar] = useState(false);

  // Derived video info
  const videoUrl =
    watchable.type === "movie"
      ? watchable.videoUrl!
      : currentEp?.videoUrl ?? "";

  const subtitle =
    watchable.type === "series" && currentEp
      ? `S${currentEp.season} E${currentEp.number} · ${currentEp.title}`
      : watchable.runtime;

  const nextEp =
    watchable.type === "series" && currentEp
      ? getNextEpisode(slug, currentEp.id)
      : undefined;

  const goNext = useCallback(() => {
    if (nextEp) setCurrentEp(nextEp);
  }, [nextEp]);

  const handleEnded = useCallback(() => {
    if (nextEp) {
      setCurrentEp(nextEp);
    }
  }, [nextEp]);

  const handleBack = () => {
    router.push(`/title/${slug}`);
  };

  return (
    <div className="fixed inset-0 bg-black z-[100] flex items-center justify-center">
      {/* ── Player ── */}
      <div className="relative w-full h-full">
        <VideoPlayer
          videoUrl={videoUrl}
          title={watchable.titleName}
          subtitle={subtitle}
          backdropUrl={watchable.backdropUrl}
          onEnded={handleEnded}
          onBack={handleBack}
          hasNext={!!nextEp}
          onNext={goNext}
        />

        {/* Episodes toggle button (series only) */}
        {watchable.type === "series" && (
          <motion.button
            className="absolute top-4 right-4 z-20 flex items-center gap-2 px-3.5 py-2.5 glass rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-all text-sm"
            onClick={(e) => {
              e.stopPropagation();
              setShowSidebar((s) => !s);
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <List size={16} />
            <span className="hidden sm:inline text-xs">Episodes</span>
          </motion.button>
        )}

        {/* Episode sidebar */}
        <AnimatePresence>
          {showSidebar && watchable.type === "series" && currentEp && (
            <EpisodeSidebar
              watchable={watchable}
              currentEpisodeId={currentEp.id}
              onSelect={(ep) => {
                setCurrentEp(ep);
                setShowSidebar(false);
              }}
              onClose={() => setShowSidebar(false)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Helper ────────────────────────────────────────────────
function isDirectVideo(url: string): boolean {
  return /\.(mp4|webm|mov)(\?.*)?$/i.test(url);
}

// ── Creator title playback fallback ──────────────────────
function CreatorWatchFallback({ slug }: { slug: string }) {
  const router = useRouter();
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

  const handleBack = () => router.push(`/title/${slug}`);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-[100]">
        <p className="text-white/40 text-sm">Loading...</p>
      </div>
    );
  }

  if (!title) return notFound();

  const sampleUrl: string | null = title.sampleUrl || null;
  const trailerUrl: string | null = title.trailerUrl || null;

  // CASE 1 — direct sample
  if (sampleUrl && isDirectVideo(sampleUrl)) {
    return (
      <div className="fixed inset-0 bg-black z-[100]">
        <VideoPlayer
          videoUrl={sampleUrl}
          title={title.title}
          subtitle="Sample"
          backdropUrl={title.backdropUrl}
          onBack={handleBack}
          hasNext={false}
        />
      </div>
    );
  }

  // CASE 2 — direct trailer
  if (trailerUrl && isDirectVideo(trailerUrl)) {
    return (
      <div className="fixed inset-0 bg-black z-[100]">
        <VideoPlayer
          videoUrl={trailerUrl}
          title={title.title}
          subtitle="Trailer"
          backdropUrl={title.backdropUrl}
          onBack={handleBack}
          hasNext={false}
        />
      </div>
    );
  }

  // CASE 3 & 4 — no direct playable media (external URL or nothing)
  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center gap-6 px-6 text-center">
      <button
        onClick={handleBack}
        className="absolute top-6 left-6 text-white/50 hover:text-white text-sm transition flex items-center gap-1.5"
      >
        ← Back
      </button>

      {title.backdropUrl && title.backdropUrl !== "/images/placeholder.png" && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-10 pointer-events-none"
          style={{ backgroundImage: `url(${title.backdropUrl})` }}
        />
      )}

      <div className="relative z-10 flex flex-col items-center gap-4 max-w-md">
        <p className="text-white/30 text-xs uppercase tracking-widest">
          {title.type === "series" ? "Series" : "Film"}
        </p>
        <h1 className="text-white font-bold text-3xl md:text-4xl leading-tight">
          {title.title}
        </h1>
        <p className="text-white/50 text-sm">
          Playback is not available on ShangoMaji yet.
        </p>
        <p className="text-white/25 text-xs">
          Trailers and previews must be uploaded directly to ShangoMaji.
        </p>
      </div>
    </div>
  );
}
