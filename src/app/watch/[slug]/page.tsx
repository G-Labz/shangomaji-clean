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
import { PageTitle } from "@/components/util/PageTitle";

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

        // Phase 4 — light-touch "last watched" beacon. Bunny's iframe
        // doesn't expose a reliable, dependency-free time signal in this
        // build, so we don't claim precise resume position: we record a
        // session-started row (position=0) and let the title page surface
        // a Resume CTA only when meaningful progress is later present.
        // Tokens / signed URLs are never sent to the progress endpoint.
        try {
          await fetch("/api/members/progress", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ slug, position_seconds: 0 }),
            cache:   "no-store",
          });
        } catch { /* non-fatal */ }
      } else {
        setStage({ kind: "denied", reason: data.reason, title: data.title ?? null });
      }
    })();
    return () => {
      cancelledRef.current = true;
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [fetchSession, scheduleRefresh, slug]);

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
    <PlayingFrame
      url={stage.url}
      title={stage.title}
      onBack={handleBack}
      onStreamError={() => setStage({ kind: "stream_error", title: stage.title })}
    />
  );
}

// Phase 5 watch-entry brand beat.
//
// Renders the ShangoMaji-owned chrome (back arrow + title bar, black
// canvas, centered 16:9 player container) and a deliberate brand-entry
// overlay that holds the ShangoMaji mark for ~2.2s before revealing the
// Bunny iframe. This is the one place in the product where a forced
// delay is intentional — modeled on streaming-platform watch-entry beats.
//
// Architecture:
//   • iframe mounts immediately and begins preloading underneath the
//     overlay, so the brand beat is the only thing visible while the
//     player gets ready.
//   • The overlay covers the player canvas only (not the top bar), so
//     a user who changed their mind can still click Back during the
//     beat. No UX trap.
//   • Fade-out triggers when both:
//       (a) MIN_BEAT_MS has elapsed, and
//       (b) iframe.onLoad has fired.
//     A FALLBACK_MS safety timer also forces fade-out so the screen can
//     never hang forever.
//   • After fade-out completes the overlay unmounts so it cannot
//     intercept clicks.
//
// Bunny's native controls (speed, quality, fullscreen, AirPlay/cast,
// PiP) remain owned by Bunny. We do not layer custom controls.
const MIN_BEAT_MS  = 2200;
const FALLBACK_MS  = 8000;
const FADE_OUT_MS  = 600;

function PlayingFrame({
  url,
  title,
  onBack,
  onStreamError,
}: {
  url:    string;
  title:  PlaybackTitle;
  onBack: () => void;
  onStreamError: () => void;
}) {
  const [iframeLoaded,  setIframeLoaded]  = useState(false);
  const [minBeatPassed, setMinBeatPassed] = useState(false);
  const [revealPlayer,  setRevealPlayer]  = useState(false);
  const [beatMounted,   setBeatMounted]   = useState(true);

  // Min hold + safety fallback timers. Both clean up on unmount.
  useEffect(() => {
    const minT = setTimeout(() => setMinBeatPassed(true), MIN_BEAT_MS);
    const safT = setTimeout(() => setRevealPlayer(true),  FALLBACK_MS);
    return () => {
      clearTimeout(minT);
      clearTimeout(safT);
    };
  }, []);

  // Reveal the player once both gates are open.
  useEffect(() => {
    if (revealPlayer) return;
    if (iframeLoaded && minBeatPassed) setRevealPlayer(true);
  }, [iframeLoaded, minBeatPassed, revealPlayer]);

  // After the fade-out completes, fully unmount the overlay so it cannot
  // intercept pointer events on the player.
  useEffect(() => {
    if (!revealPlayer) return;
    const t = setTimeout(() => setBeatMounted(false), FADE_OUT_MS + 100);
    return () => clearTimeout(t);
  }, [revealPlayer]);

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col">
      <PageTitle title={`${title.title} · Watch`} />
      <div className="flex items-center gap-4 px-5 py-4 bg-black/90 z-20">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/70 hover:text-white text-sm transition"
          aria-label="Back to title"
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

      {/* Player canvas — iframe mounts immediately so the Bunny session
          can preload behind the brand-entry overlay. */}
      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
        <div
          className="relative w-full h-full max-h-[100vh]"
          style={{ aspectRatio: "16 / 9" }}
        >
          <iframe
            src={url}
            title={title.title}
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full border-0"
            onLoad={() => setIframeLoaded(true)}
            onError={onStreamError}
          />

          {/* Brand-entry overlay — covers the player canvas only,
              leaving the top bar (Back arrow) reachable. */}
          {beatMounted && <BrandEntryBeat fadingOut={revealPlayer} />}
        </div>
      </div>
    </div>
  );
}

// Phase 5 watch-entry brand beat — cinematic logo overlay.
// Pure presentation: no timing logic here, parent owns the lifecycle.
function BrandEntryBeat({ fadingOut }: { fadingOut: boolean }) {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 flex items-center justify-center bg-black"
      style={{
        transition:    `opacity ${FADE_OUT_MS}ms ease`,
        opacity:       fadingOut ? 0 : 1,
        pointerEvents: fadingOut ? "none" : "auto",
        // Layer above the iframe within the player canvas only.
        zIndex: 5,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt=""
        aria-hidden="true"
        className="object-contain"
        style={{
          width:  "clamp(280px, 55vmin, 640px)",
          height: "clamp(280px, 55vmin, 640px)",
          // Two animations stacked:
          //   1. brand-entry — one-shot 1.4s entrance (fade + scale settle).
          //   2. ember-breathe-sm — slow infinite glow during the hold.
          // The ember pulse sits on `filter`, the entrance sits on
          // `opacity` + `transform`, so they coexist without conflict.
          animation:
            "brand-entry 1.4s cubic-bezier(0.22, 1, 0.36, 1) both, " +
            "ember-breathe-sm 5s ease-in-out 1.4s infinite",
        }}
      />
    </div>
  );
}

// Phase 5 brand correction — shared loading mark that uses the real
// ShangoMaji logo asset already shipped at /logo.png and surfaced in TopNav.
// We intentionally use a plain <img> (not next/image) because:
//   • this is a fixed-size UI element rendered briefly during a load gate,
//     so the next/image LCP/optimization layer adds no value;
//   • <img> matches the pattern TopNav uses for the same asset.
//
// Visual brief: cinematic, subtle, premium-streaming feel. The pulse is the
// only motion — no spinner, no caption, no "Loading…" text.
function BrandLoadingMark() {
  // Phase 5 — gate-fetch screen mark.
  //
  // Used only by CheckingState (the brief moment between mount and the
  // /api/playback/session response). Sized smaller than the watch-entry
  // brand beat so the gate fetch reads as quiet/system, not as the
  // premium watch-entry moment.
  //
  // Watch-entry brand beat is its own component (`BrandEntryBeat`) with
  // a larger logo and full cinematic timing.
  const dimension = "clamp(140px, 22vmin, 280px)";
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt=""
      aria-hidden="true"
      className="object-contain animate-pulse"
      style={{
        width:  dimension,
        height: dimension,
        filter: "drop-shadow(0 0 32px rgba(229,62,42,0.28))",
      }}
    />
  );
}

// ── Access-state screens ─────────────────────────────────────────────────

function CheckingState() {
  // Phase 5 brand correction — the loading plate now uses the real ShangoMaji
  // logo asset (/logo.png), not a synthesized "M". Silent black canvas for
  // fast checks; the logo pulse only fades in after ~400ms. No forced delay.
  const [showPlate, setShowPlate] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowPlate(true), 400);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="fixed inset-0 bg-black z-[100] flex items-center justify-center">
      <PageTitle title="Watch" />
      {showPlate && <BrandLoadingMark />}
    </div>
  );
}

// "Sign in to watch." — used both on the legacy mock-catalog signed-out
// path and (via DeniedState) on the Bunny path when the user is not auth'd.
function SignInToWatchState({ slug, mode }: { slug: string; mode: "signin" | "signup" }) {
  const returnPath = encodeURIComponent(`/watch/${slug}`);
  return (
    <FrameScreen>
      <PageTitle title="Sign in to watch · Watch" />
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
      <PageTitle title="Title unavailable · Watch" />
      <h1 className="text-white text-3xl md:text-4xl font-bold leading-tight">
        This title is no longer on the stage.
      </h1>
      <p className="text-white/70 text-sm md:text-base leading-relaxed">
        It is currently outside ShangoMaji playback access.
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
      <PageTitle title="Not ready · Watch" />
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
      <PageTitle title="Session ended · Watch" />
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
      <PageTitle title="Stream unavailable · Watch" />
      <h1 className="text-white text-3xl md:text-4xl font-bold leading-tight">
        This stream is temporarily unavailable.
      </h1>
      <p className="text-white/70 text-sm md:text-base leading-relaxed">
        Try again, or come back in a moment.
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

