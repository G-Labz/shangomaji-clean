"use client";

import {
  useRef,
  useState,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  SkipForward,
  SkipBack,
  Settings,
  Subtitles,
  RotateCcw,
} from "lucide-react";

// ─── Helpers ─────────────────────────────────
function formatTime(s: number): string {
  if (isNaN(s)) return "0:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

// ─── Types ────────────────────────────────────
export interface VideoPlayerProps {
  videoUrl: string;
  title: string;
  subtitle?: string;       // e.g. "S1 E1 · The Signal"
  backdropUrl?: string;
  onEnded?: () => void;
  onBack?: () => void;
  hasNext?: boolean;
  onNext?: () => void;
}

export interface VideoPlayerHandle {
  play: () => void;
  pause: () => void;
}

// ─── Progress bar ─────────────────────────────
function ProgressBar({
  current,
  duration,
  buffered,
  onSeek,
}: {
  current: number;
  duration: number;
  buffered: number;
  onSeek: (pct: number) => void;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);
  const [hoverPct, setHoverPct] = useState(0);
  const [hoverTime, setHoverTime] = useState(0);

  const getPct = (e: React.MouseEvent) => {
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  };

  const playedPct = duration > 0 ? (current / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={barRef}
      className="relative w-full group/bar cursor-pointer"
      style={{ height: hovering ? "20px" : "16px", transition: "height 0.15s" }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onMouseMove={(e) => {
        const p = getPct(e);
        setHoverPct(p * 100);
        setHoverTime(p * duration);
      }}
      onClick={(e) => onSeek(getPct(e))}
    >
      {/* Track */}
      <div className="absolute bottom-0 left-0 right-0 h-1 rounded-full bg-white/15 overflow-hidden transition-all duration-150"
        style={{ height: hovering ? "5px" : "3px" }}>
        {/* Buffered */}
        <div
          className="absolute inset-y-0 left-0 bg-white/25 rounded-full"
          style={{ width: `${bufferedPct}%` }}
        />
        {/* Played */}
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${playedPct}%`,
            background: "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)",
          }}
        />
      </div>

      {/* Scrubber thumb */}
      <div
        className="absolute bottom-0 w-3.5 h-3.5 rounded-full bg-white shadow-lg -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity"
        style={{
          left: `${playedPct}%`,
          bottom: hovering ? "3px" : "1px",
          transition: "bottom 0.15s, opacity 0.15s",
        }}
      />

      {/* Hover time tooltip */}
      <AnimatePresence>
        {hovering && (
          <motion.div
            className="absolute bottom-6 -translate-x-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded-lg pointer-events-none font-mono"
            style={{ left: `${hoverPct}%` }}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
          >
            {formatTime(hoverTime)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Volume slider ────────────────────────────
function VolumeSlider({
  volume,
  onVolumeChange,
}: {
  volume: number;
  onVolumeChange: (v: number) => void;
}) {
  const sliderRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent) => {
    const rect = sliderRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onVolumeChange(pct);
  };

  return (
    <div
      ref={sliderRef}
      className="w-20 h-1 rounded-full bg-white/20 relative cursor-pointer group"
      onClick={handleClick}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{
          width: `${volume * 100}%`,
          background: "linear-gradient(90deg, #f07030, #f5c518)",
        }}
      />
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white shadow opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ left: `${volume * 100}%` }}
      />
    </div>
  );
}

// ─── Main Player ──────────────────────────────
export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  function VideoPlayer(
    { videoUrl, title, subtitle, backdropUrl, onEnded, onBack, hasNext, onNext },
    ref
  ) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const hideTimer = useRef<ReturnType<typeof setTimeout>>();

    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [buffered, setBuffered] = useState(0);
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [showNextCard, setShowNextCard] = useState(false);
    // Big centre play/pause flash
    const [flashIcon, setFlashIcon] = useState<"play" | "pause" | null>(null);

    // Expose handle
    useImperativeHandle(ref, () => ({
      play: () => videoRef.current?.play(),
      pause: () => videoRef.current?.pause(),
    }));

    // Auto-hide controls
    const resetHideTimer = useCallback(() => {
      setShowControls(true);
      clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => {
        if (playing) setShowControls(false);
      }, 3000);
    }, [playing]);

    useEffect(() => {
      resetHideTimer();
      return () => clearTimeout(hideTimer.current);
    }, [playing, resetHideTimer]);

    // Keyboard shortcuts
    useEffect(() => {
      const onKey = (e: KeyboardEvent) => {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;

        switch (e.code) {
          case "Space":
          case "KeyK":
            e.preventDefault();
            togglePlay();
            break;
          case "ArrowLeft":
            e.preventDefault();
            seek(-10);
            break;
          case "ArrowRight":
            e.preventDefault();
            seek(10);
            break;
          case "ArrowUp":
            e.preventDefault();
            setVolume((v) => Math.min(1, v + 0.1));
            break;
          case "ArrowDown":
            e.preventDefault();
            setVolume((v) => Math.max(0, v - 0.1));
            break;
          case "KeyM":
            toggleMute();
            break;
          case "KeyF":
            toggleFullscreen();
            break;
        }
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    });

    // Fullscreen change listener
    useEffect(() => {
      const onFSChange = () => setFullscreen(!!document.fullscreenElement);
      document.addEventListener("fullscreenchange", onFSChange);
      return () => document.removeEventListener("fullscreenchange", onFSChange);
    }, []);

    // Sync volume to video
    useEffect(() => {
      if (videoRef.current) {
        videoRef.current.volume = volume;
        videoRef.current.muted = muted;
      }
    }, [volume, muted]);

    const flash = (icon: "play" | "pause") => {
      setFlashIcon(icon);
      setTimeout(() => setFlashIcon(null), 600);
    };

    const togglePlay = () => {
      const v = videoRef.current;
      if (!v) return;
      if (v.paused) {
        v.play();
        flash("play");
      } else {
        v.pause();
        flash("pause");
      }
    };

    const toggleMute = () => setMuted((m) => !m);

    const seek = (delta: number) => {
      const v = videoRef.current;
      if (!v) return;
      v.currentTime = Math.max(0, Math.min(duration, v.currentTime + delta));
    };

    const seekTo = (pct: number) => {
      const v = videoRef.current;
      if (!v) return;
      v.currentTime = pct * duration;
    };

    const toggleFullscreen = () => {
      if (!document.fullscreenElement) {
        containerRef.current?.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    };

    const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

    return (
      <div
        ref={containerRef}
        className="relative w-full h-full bg-black select-none"
        style={{ cursor: showControls ? "default" : "none" }}
        onMouseMove={resetHideTimer}
        onMouseLeave={() => playing && setShowControls(false)}
        onClick={togglePlay}
      >
        {/* ── Video element ── */}
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-contain"
          poster={backdropUrl}
          playsInline
          onPlay={() => { setPlaying(true); setLoading(false); }}
          onPause={() => setPlaying(false)}
          onTimeUpdate={() => {
            const v = videoRef.current;
            if (!v) return;
            setCurrentTime(v.currentTime);
            // Buffered
            if (v.buffered.length > 0) {
              setBuffered(v.buffered.end(v.buffered.length - 1));
            }
            // Show next card in last 30s
            if (hasNext && duration > 0 && v.currentTime > duration - 30) {
              setShowNextCard(true);
            }
          }}
          onDurationChange={() => setDuration(videoRef.current?.duration ?? 0)}
          onWaiting={() => setLoading(true)}
          onCanPlay={() => setLoading(false)}
          onEnded={() => { setPlaying(false); onEnded?.(); }}
          onError={() => { setError(true); setLoading(false); }}
        />

        {/* ── Loading spinner ── */}
        <AnimatePresence>
          {loading && !error && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="w-12 h-12 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Error state ── */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <p className="text-white/60 text-sm">Unable to load video</p>
            <button
              onClick={(e) => { e.stopPropagation(); setError(false); setLoading(true); videoRef.current?.load(); }}
              className="flex items-center gap-2 px-4 py-2 glass rounded-xl text-white text-sm hover:bg-white/10 transition-colors"
            >
              <RotateCcw size={14} />
              Retry
            </button>
          </div>
        )}

        {/* ── Centre flash icon ── */}
        <AnimatePresence>
          {flashIcon && (
            <motion.div
              key={flashIcon}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              initial={{ opacity: 0.9, scale: 0.8 }}
              animate={{ opacity: 0, scale: 1.3 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55 }}
            >
              <div className="w-20 h-20 rounded-full bg-black/50 flex items-center justify-center">
                {flashIcon === "play"
                  ? <Play size={32} fill="white" className="ml-1" />
                  : <Pause size={32} fill="white" />
                }
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Next episode card ── */}
        <AnimatePresence>
          {showNextCard && hasNext && (
            <motion.div
              className="absolute bottom-24 right-6 z-20"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="glass rounded-2xl p-4 w-64">
                <p className="text-xs text-ink-faint uppercase tracking-widest mb-1">Up Next</p>
                <p className="text-white text-sm font-semibold mb-3">Next Episode</p>
                <button
                  onClick={onNext}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-black text-sm font-semibold"
                  style={{ background: "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)" }}
                >
                  <Play size={14} fill="currentColor" />
                  Play Now
                </button>
                <button
                  onClick={() => setShowNextCard(false)}
                  className="w-full text-center mt-2 text-ink-faint text-xs hover:text-white transition-colors py-1"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Controls overlay ── */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              className="absolute inset-0 flex flex-col justify-between pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top bar */}
              <div
                className="px-6 pt-5 pb-16 flex items-center gap-4 pointer-events-auto"
                style={{
                  background: "linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, transparent 100%)",
                }}
              >
                {onBack && (
                  <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-white/80 hover:text-white text-sm transition-colors group"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="hidden sm:inline">Back</span>
                  </button>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm md:text-base truncate leading-tight">
                    {title}
                  </p>
                  {subtitle && (
                    <p className="text-white/50 text-xs mt-0.5 truncate">{subtitle}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button className="p-2 text-white/60 hover:text-white transition-colors hidden sm:flex">
                    <Subtitles size={18} />
                  </button>
                  <button className="p-2 text-white/60 hover:text-white transition-colors hidden sm:flex">
                    <Settings size={18} />
                  </button>
                </div>
              </div>

              {/* Bottom controls */}
              <div
                className="px-4 md:px-8 pb-5 pt-16 pointer-events-auto"
                style={{
                  background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)",
                }}
              >
                {/* Progress */}
                <div className="mb-3 px-1">
                  <ProgressBar
                    current={currentTime}
                    duration={duration}
                    buffered={buffered}
                    onSeek={seekTo}
                  />
                </div>

                {/* Control row */}
                <div className="flex items-center justify-between gap-2">
                  {/* Left */}
                  <div className="flex items-center gap-1 md:gap-2">
                    {/* Play/Pause */}
                    <button
                      onClick={togglePlay}
                      className="p-2.5 text-white hover:text-white/80 transition-colors"
                      aria-label={playing ? "Pause" : "Play"}
                    >
                      {playing
                        ? <Pause size={22} fill="white" />
                        : <Play size={22} fill="white" className="ml-0.5" />
                      }
                    </button>

                    {/* Skip back */}
                    <button
                      onClick={() => seek(-10)}
                      className="p-2.5 text-white/70 hover:text-white transition-colors"
                      aria-label="Skip back 10s"
                    >
                      <SkipBack size={18} />
                    </button>

                    {/* Skip forward */}
                    <button
                      onClick={() => seek(10)}
                      className="p-2.5 text-white/70 hover:text-white transition-colors"
                      aria-label="Skip forward 10s"
                    >
                      <SkipForward size={18} />
                    </button>

                    {/* Next episode */}
                    {hasNext && onNext && (
                      <button
                        onClick={onNext}
                        className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-white/70 hover:text-white glass rounded-lg text-xs transition-all"
                      >
                        <SkipForward size={13} fill="currentColor" />
                        Next
                      </button>
                    )}

                    {/* Volume */}
                    <div className="flex items-center gap-2 ml-1 group/vol">
                      <button
                        onClick={toggleMute}
                        className="p-2 text-white/70 hover:text-white transition-colors"
                      >
                        <VolumeIcon size={18} />
                      </button>
                      <div className="w-0 overflow-hidden group-hover/vol:w-20 transition-all duration-300">
                        <VolumeSlider volume={muted ? 0 : volume} onVolumeChange={(v) => { setVolume(v); setMuted(false); }} />
                      </div>
                    </div>

                    {/* Time */}
                    <span className="text-white/60 text-xs font-mono hidden sm:block ml-1">
                      {formatTime(currentTime)}{" "}
                      <span className="text-white/30">/</span>{" "}
                      {formatTime(duration)}
                    </span>
                  </div>

                  {/* Right */}
                  <div className="flex items-center gap-1">
                    {/* Fullscreen */}
                    <button
                      onClick={toggleFullscreen}
                      className="p-2.5 text-white/70 hover:text-white transition-colors"
                      aria-label="Toggle fullscreen"
                    >
                      {fullscreen
                        ? <Minimize size={18} />
                        : <Maximize size={18} />
                      }
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);
