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

// ── Creator title playback fallback ──────────────────────
// Phase 1: Bunny Stream embed only. Sample/trailer fallbacks were removed —
// only playable, media-bound titles reach the public catalog now, so a creator
// title here either has an embed URL or it is unavailable.
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
        <p className="text-white/40 text-sm">Loading…</p>
      </div>
    );
  }

  // Title not found in the public (gated) catalog → render the unavailable state.
  // We do not fall back to raw sample/trailer URLs in Phase 1.
  if (!title || !title.playbackEmbedUrl) {
    return <UnavailableState onBack={handleBack} title={title} />;
  }

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col">
      <div className="flex items-center gap-4 px-5 py-4 bg-black/90 z-10">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-white/70 hover:text-white text-sm transition"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="hidden sm:inline">Back</span>
        </button>
        <p className="text-white font-semibold text-sm md:text-base truncate">
          {title.title}
        </p>
      </div>

      <div className="flex-1 relative bg-black">
        <iframe
          src={title.playbackEmbedUrl}
          title={title.title}
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full border-0"
        />
      </div>
    </div>
  );
}

function UnavailableState({
  onBack,
  title,
}: {
  onBack: () => void;
  title: any;
}) {
  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center gap-6 px-6 text-center">
      <button
        onClick={onBack}
        className="absolute top-6 left-6 text-white/50 hover:text-white text-sm transition flex items-center gap-1.5"
      >
        ← Back
      </button>

      {title?.backdropUrl && title.backdropUrl !== "/images/placeholder.png" && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-10 pointer-events-none"
          style={{ backgroundImage: `url(${title.backdropUrl})` }}
        />
      )}

      <div className="relative z-10 flex flex-col items-center gap-3 max-w-md">
        {title?.title && (
          <h1 className="text-white font-bold text-3xl md:text-4xl leading-tight">
            {title.title}
          </h1>
        )}
        <p className="text-white/60 text-sm">
          This title isn’t available right now.
        </p>
      </div>
    </div>
  );
}
