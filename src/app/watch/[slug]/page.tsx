"use client";

// Phase 3 — Member-gated playback surface.
//
// Public browse / title pages remain anonymous. /watch is the single point
// where Member identity is required and signed playback URLs are issued.
//
// Architecture:
//   1. On mount, POST /api/playback/session with the page slug.
//   2. The server runs auth + member + license + media gates and either
//      returns a signed/expiring Bunny embed URL or a structured `reason`.
//   3. We render one of the approved access-state screens based on the
//      reason. Reasons map to copy here; we never display raw category
//      strings, HTTP codes, "token expired", or other technical text.
//   4. ~60s before expiry we silently re-POST to refresh. If refresh
//      fails, we surface the "Sign in to keep watching." screen.
//
// Legacy mock catalog (data/videoData) still flows through the local
// VideoPlayer component, but only after the same Member gate has passed.

import {
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { List, Play } from "lucide-react";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { EpisodeSidebar } from "@/components/player/EpisodeSidebar";
import {
  getWatchable,
  getFirstEpisode,
  getNextEpisode,
} from "@/data/videoData";
import type { Episode } from "@/data/videoData";

interface PageProps {
  params:       { slug: string };
  searchParams: { ep?: string };
}

// ── Types mirroring /api/playback/session response ───────────────────────
type PlaybackTitle = {
  id:            string;
  title:         string;
  type:          "movie" | "series";
  backdropUrl:   string | null;
  creatorHandle: string | null;
  creatorName:   string | null;
};

type PlaybackReason =
  | "allowed"
  | "not_authenticated"
  | "not_member"
  | "title_not_found"
  | "title_unavailable"
  | "media_not_ready"
  | "license_out_of_term"
  | "rate_limited"
  | "playback_not_configured";

type SessionResponse =
  | {
      ok:          true;
      playbackUrl: string;
      expiresAt:   number; // unix seconds
      title:       PlaybackTitle;
    }
  | {
      ok:     false;
      reason: Exclude<PlaybackReason, "allowed">;
      title?: PlaybackTitle | null;
    };

// ── Page ─────────────────────────────────────────────────────────────────
export default function WatchPage({ params, searchParams }: PageProps) {
  const { slug } = params;
  const { ep: epId } = searchParams;
  const router = useRouter();

  // Legacy mock catalog has its own playback shape. Identify it once.
  const watchable = getWatchable(slug);

  // The Member gate runs for both legacy mock and creator-Bunny titles.
  // For mock titles we need the gate to pass before showing the local
  // <VideoPlayer>. For creator titles we additionally need a signed URL.
  return watchable
    ? <MemberGatedMockPlayer slug={slug} epId={epId} watchable={watchable} router={router} />
    : <CreatorBunnyPlayer  slug={slug} router={router} />;
}

// ── Member-gated wrapper for legacy mock catalog player ─────────────────
function MemberGatedMockPlayer({
  slug, epId, watchable, router,
}: {
  slug: string;
  epId?: string;
  watchable: NonNullable<ReturnType<typeof getWatchable>>;
  router: ReturnType<typeof useRouter>;
}) {
  const [memberStatus, setMemberStatus] = useState<"checking" | "member" | "anon" | "creator_only">("checking");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res  = await fetch("/api/members/session", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (data?.authenticated && data?.isMember) {
          setMemberStatus("member");
        } else if (data?.authenticated) {
          setMemberStatus("creator_only");
        } else {
          setMemberStatus("anon");
        }
      } catch {
        if (!cancelled) setMemberStatus("anon");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (memberStatus === "checking") return <CheckingState />;
  if (memberStatus === "anon")     return <SignInToWatchState slug={slug} mode="signin" />;
  if (memberStatus === "creator_only") return <SignInToWatchState slug={slug} mode="signup" />;

  // Member confirmed — render the existing mock-catalog player.
  return <MockPlayerInner slug={slug} epId={epId} watchable={watchable} router={router} />;
}

function MockPlayerInner({
  slug, epId, watchable, router,
}: {
  slug: string;
  epId?: string;
  watchable: NonNullable<ReturnType<typeof getWatchable>>;
  router: ReturnType<typeof useRouter>;
}) {
  const firstEp = getFirstEpisode(slug);
  const initialEp = epId
    ? watchable.episodes?.find((e) => e.id === epId) ?? firstEp
    : firstEp;

  const [currentEp, setCurrentEp] = useState<Episode | null>(
    watchable.type === "series" ? (initialEp ?? null) : null
  );
  const [showSidebar, setShowSidebar] = useState(false);

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
    if (nextEp) setCurrentEp(nextEp);
  }, [nextEp]);

  const handleBack = () => router.push(`/title/${slug}`);

  return (
    <div className="fixed inset-0 bg-black z-[100] flex items-center justify-center">
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

// ── Creator/Bunny Member-gated player ────────────────────────────────────
function CreatorBunnyPlayer({
  slug, router,
}: {
  slug: string;
  router: ReturnType<typeof useRouter>;
}) {
  // Single state machine for the access decision + signed URL lifecycle.
  // `session_ended` is the post-playback recovery state: the user successfully
  // watched at least once, then a silent refresh failed. We surface the
  // approved "Sign in to keep watching." copy instead of a fresh denial.
  type Stage =
    | { kind: "checking" }
    | { kind: "denied"; reason: Exclude<PlaybackReason, "allowed">; title: PlaybackTitle | null }
    | { kind: "playing"; url: string; expiresAt: number; title: PlaybackTitle }
    | { kind: "session_ended" }
    | { kind: "stream_error"; title: PlaybackTitle };
  const [stage, setStage] = useState<Stage>({ kind: "checking" });

  // Refresh / abort plumbing.
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);
  // Tracks whether we ever reached "playing" — used to choose between the
  // first-load denial states and the post-playback session_ended state.
  const everPlayedRef = useRef(false);

  const fetchSession = useCallback(async (): Promise<SessionResponse | null> => {
    try {
      const res = await fetch("/api/playback/session", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ slug }),
        cache:   "no-store",
      });
      const data = await res.json();
      return data as SessionResponse;
    } catch {
      return null;
    }
  }, [slug]);

  const scheduleRefresh = useCallback((expiresAt: number) => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    const refreshAt = expiresAt * 1000 - 60_000; // 60s before expiry
    const delay = Math.max(15_000, refreshAt - Date.now());
    refreshTimer.current = setTimeout(async () => {
      if (cancelledRef.current) return;
      const next = await fetchSession();
      if (cancelledRef.current) return;
      if (!next) {
        // Silent refresh network failure after a prior successful play —
        // route to the approved "Sign in to keep watching." state.
        setStage({ kind: "session_ended" });
        return;
      }
      if (next.ok) {
        setStage({ kind: "playing", url: next.playbackUrl, expiresAt: next.expiresAt, title: next.title });
        scheduleRefresh(next.expiresAt);
      } else {
        // Refresh denied. If the user had already started watching, the
        // session_ended copy is correct (we don't surface raw reasons).
        // For an unauthenticated reason specifically, the same state holds.
        if (everPlayedRef.current && (next.reason === "not_authenticated" || next.reason === "not_member")) {
          setStage({ kind: "session_ended" });
        } else {
          setStage({ kind: "denied", reason: next.reason, title: next.title ?? null });
        }
      }
    }, delay);
  }, [fetchSession]);

  // Initial fetch.
  useEffect(() => {
    cancelledRef.current = false;
    (async () => {
      const data = await fetchSession();
      if (cancelledRef.current) return;
      if (!data) {
        setStage({ kind: "denied", reason: "title_not_found", title: null });
        return;
      }
      if (data.ok) {
        everPlayedRef.current = true;
        setStage({ kind: "playing", url: data.playbackUrl, expiresAt: data.expiresAt, title: data.title });
        scheduleRefresh(data.expiresAt);
      } else {
        setStage({ kind: "denied", reason: data.reason, title: data.title ?? null });
      }
    })();
    return () => {
      cancelledRef.current = true;
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [fetchSession, scheduleRefresh]);

  const handleBack = () => router.push(`/title/${slug}`);

  if (stage.kind === "checking") return <CheckingState />;

  if (stage.kind === "denied") {
    return <DeniedState reason={stage.reason} title={stage.title} slug={slug} />;
  }

  if (stage.kind === "session_ended") {
    return <SessionEndedState slug={slug} />;
  }

  if (stage.kind === "stream_error") {
    return (
      <PlaybackErrorState
        onRetry={() => {
          setStage({ kind: "checking" });
          (async () => {
            const data = await fetchSession();
            if (!data) {
              setStage({ kind: "denied", reason: "title_not_found", title: null });
              return;
            }
            if (data.ok) {
              setStage({ kind: "playing", url: data.playbackUrl, expiresAt: data.expiresAt, title: data.title });
              scheduleRefresh(data.expiresAt);
            } else {
              setStage({ kind: "denied", reason: data.reason, title: data.title ?? null });
            }
          })();
        }}
        onBack={handleBack}
      />
    );
  }

  // playing — render Bunny iframe with signed URL.
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
          {stage.title.title}
        </p>
      </div>

      <div className="flex-1 relative bg-black">
        <iframe
          src={stage.url}
          title={stage.title.title}
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full border-0"
          onError={() => setStage({ kind: "stream_error", title: stage.title })}
        />
      </div>
    </div>
  );
}

// ── Access-state screens ─────────────────────────────────────────────────

function CheckingState() {
  return (
    <div className="fixed inset-0 bg-black z-[100] flex items-center justify-center">
      <p className="text-white/45 text-sm">Loading…</p>
    </div>
  );
}

// "Sign in to watch." — used both on the legacy mock-catalog signed-out
// path and (via DeniedState) on the Bunny path when the user is not auth'd.
function SignInToWatchState({ slug, mode }: { slug: string; mode: "signin" | "signup" }) {
  const returnPath = encodeURIComponent(`/watch/${slug}`);
  return (
    <FrameScreen>
      <h1 className="text-white text-3xl md:text-4xl font-bold leading-tight">
        Sign in to watch.
      </h1>
      <p className="text-white/70 text-sm md:text-base leading-relaxed">
        Full playback is available to ShangoMaji Members. Create a Member
        account or sign in to continue.
      </p>
      <div className="flex flex-wrap gap-3 mt-2">
        <Link
          href={mode === "signup" ? `/signup?redirect=${returnPath}` : `/login?redirect=${returnPath}`}
          className="px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-white/90 transition"
        >
          Sign in
        </Link>
        <Link
          href={`/signup?redirect=${returnPath}`}
          className="px-5 py-2.5 rounded-xl glass text-white text-sm font-medium hover:bg-white/10 transition"
        >
          Create Member account
        </Link>
      </div>
    </FrameScreen>
  );
}

function TitleUnavailableState({ slug, title }: { slug: string; title: PlaybackTitle | null }) {
  const visitCreator = title?.creatorHandle
    ? { label: "Visit Creator", href: `/creators/${title.creatorHandle}` }
    : null;
  return (
    <FrameScreen>
      <h1 className="text-white text-3xl md:text-4xl font-bold leading-tight">
        This title is not available right now.
      </h1>
      <p className="text-white/70 text-sm md:text-base leading-relaxed">
        This work is currently outside ShangoMaji playback access.
      </p>
      <div className="flex flex-wrap gap-3 mt-2">
        {visitCreator ? (
          <Link
            href={visitCreator.href}
            className="px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-white/90 transition"
          >
            {visitCreator.label}
          </Link>
        ) : (
          <Link
            href="/browse"
            className="px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-white/90 transition"
          >
            Browse Catalog
          </Link>
        )}
        <Link
          href="/browse"
          className="px-5 py-2.5 rounded-xl glass text-white text-sm font-medium hover:bg-white/10 transition"
        >
          Browse
        </Link>
      </div>
      <div className="text-white/35 text-xs pt-2">
        <Link href={`/title/${slug}`} className="hover:text-white/60 transition">
          ← Back to title
        </Link>
      </div>
    </FrameScreen>
  );
}

function MediaNotReadyState({ slug }: { slug: string }) {
  return (
    <FrameScreen>
      <h1 className="text-white text-3xl md:text-4xl font-bold leading-tight">
        Not yet.
      </h1>
      <p className="text-white/70 text-sm md:text-base leading-relaxed">
        This title is still being prepared for the screen.
      </p>
      <div className="flex flex-wrap gap-3 mt-2">
        <Link
          href="/browse"
          className="px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-white/90 transition"
        >
          Browse
        </Link>
      </div>
      <div className="text-white/35 text-xs pt-2">
        <Link href={`/title/${slug}`} className="hover:text-white/60 transition">
          ← Back to title
        </Link>
      </div>
    </FrameScreen>
  );
}

function SessionEndedState({ slug }: { slug: string }) {
  const returnPath = encodeURIComponent(`/watch/${slug}`);
  return (
    <FrameScreen>
      <h1 className="text-white text-3xl md:text-4xl font-bold leading-tight">
        Sign in to keep watching.
      </h1>
      <p className="text-white/70 text-sm md:text-base leading-relaxed">
        Your viewing session ended.
      </p>
      <div className="flex flex-wrap gap-3 mt-2">
        <Link
          href={`/login?redirect=${returnPath}`}
          className="px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-white/90 transition"
        >
          Sign in
        </Link>
        <Link
          href={`/title/${slug}`}
          className="px-5 py-2.5 rounded-xl glass text-white text-sm font-medium hover:bg-white/10 transition"
        >
          Back
        </Link>
      </div>
    </FrameScreen>
  );
}

function PlaybackErrorState({ onRetry, onBack }: { onRetry: () => void; onBack: () => void }) {
  return (
    <FrameScreen>
      <h1 className="text-white text-3xl md:text-4xl font-bold leading-tight">
        Something interrupted this.
      </h1>
      <p className="text-white/70 text-sm md:text-base leading-relaxed">
        The stream could not load.
      </p>
      <div className="flex flex-wrap gap-3 mt-2">
        <button
          onClick={onRetry}
          className="px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-white/90 transition"
        >
          Retry
        </button>
        <button
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl glass text-white text-sm font-medium hover:bg-white/10 transition"
        >
          Back
        </button>
      </div>
    </FrameScreen>
  );
}

// Map a denial reason to the right approved screen. Centralized so the copy
// + CTA logic stays consistent across mock and Bunny entry points.
function DeniedState({
  reason, title, slug,
}: {
  reason: Exclude<PlaybackReason, "allowed">;
  title: PlaybackTitle | null;
  slug: string;
}) {
  if (reason === "not_authenticated") return <SignInToWatchState slug={slug} mode="signin" />;
  if (reason === "not_member")        return <SignInToWatchState slug={slug} mode="signup" />;
  if (reason === "media_not_ready")   return <MediaNotReadyState slug={slug} />;
  if (reason === "rate_limited" || reason === "title_not_found")
    return <TitleUnavailableState slug={slug} title={title} />;
  // license_out_of_term, title_unavailable, playback_not_configured.
  return <TitleUnavailableState slug={slug} title={title} />;
}

// Shared chrome for every access-state screen — gives the page a premium,
// consistent feel and a single "back" affordance.
function FrameScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center px-6">
      <div className="relative max-w-xl w-full flex flex-col gap-4">
        {children}
      </div>
    </div>
  );
}

