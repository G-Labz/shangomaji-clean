"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Play, Plus, Check } from "lucide-react";
import type { Title } from "@/data/mockData";
import { PosterArt, BackdropArt } from "@/components/artwork/Artwork";
import { isWithinNewWindow } from "@/lib/new-badge";

// Phase 4 — title card.
//   • The + button now toggles My List via /api/members/my-list.
//     - 401 → redirect to /login with return path.
//     - 403 → redirect to /signup with return path.
//   • Saved state shows a checkmark instead of plus.
//   • The legacy thumbs-up/like button has been removed from the
//     production surface per Phase 4 cleanup.
//   • "0% Match" / "null Seasons" production artifacts are removed —
//     score and seasons render only when meaningful.

interface TitleCardProps {
  title: Title;
  variant?: "poster" | "landscape";
  showProgress?: boolean;
  /** Optional initial saved hint (e.g. when rendered inside My List). */
  initialSaved?: boolean;
}

export function TitleCard({
  title, variant = "poster", showProgress = false, initialSaved = false,
}: TitleCardProps) {
  const isPoster = variant === "poster";
  const isOriginal = title.studio === "ShangoMaji Originals";
  const hasMeaningfulScore = typeof title.score === "number" && title.score > 0;
  const hasSeasons         = title.type === "series" && typeof title.seasons === "number" && title.seasons > 0;
  // Phase 5 — NEW badge driven by date, not the legacy hand-flag. The
  // mock catalog ships a few `isNew: true` rows; we still gate them by
  // (year ≈ current year) so the badge reads honestly even there.
  const titleDate = (title as any).activatedAt as string | undefined;
  const isNewByDate = titleDate
    ? isWithinNewWindow(titleDate)
    : !!title.isNew && typeof title.year === "number" && Math.abs(new Date().getFullYear() - title.year) <= 1;

  // The slug used by /api/members/my-list to resolve a real titles.id row.
  // Mock-catalog titles do not yet have a backing titles row, so save calls
  // for those titles return 404 — the button is rendered but the action is
  // a no-op for mock data. Real creator titles pass through cleanly.
  const slug = title.slug;

  const [saved, setSaved]     = useState<boolean>(initialSaved);
  const [pending, setPending] = useState(false);

  // Best-effort initial sync when the user is a Member: ask the API whether
  // this slug is in their list. A 401/403 leaves saved=false silently.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (initialSaved) return;
      try {
        const res = await fetch("/api/members/my-list", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const titles: Array<{ slug?: string }> = Array.isArray(data?.titles) ? data.titles : [];
        if (titles.some((t) => t.slug === slug)) setSaved(true);
      } catch { /* noop */ }
    })();
    return () => { cancelled = true; };
  }, [slug, initialSaved]);

  async function handleToggleSave(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;
    setPending(true);
    try {
      const method = saved ? "DELETE" : "POST";
      const res = await fetch("/api/members/my-list", {
        method,
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ slug }),
      });
      if (res.status === 401) {
        const r = encodeURIComponent(window.location.pathname);
        window.location.href = `/login?redirect=${r}`;
        return;
      }
      if (res.status === 403) {
        const r = encodeURIComponent(window.location.pathname);
        window.location.href = `/signup?redirect=${r}`;
        return;
      }
      if (res.ok) setSaved(!saved);
    } catch { /* noop — UX state stays as-is */ }
    finally { setPending(false); }
  }

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
          {isPoster ? (
            <PosterArt
              src={title.posterUrl}
              alt={title.title}
              title={title.title}
              className="transition-transform duration-500 group-hover:scale-105"
              sizes="180px"
            />
          ) : (
            <BackdropArt
              src={title.backdropUrl}
              alt={title.title}
              title={title.title}
              className="transition-transform duration-500 group-hover:scale-105"
              sizes="320px"
            />
          )}

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
              <button
                onClick={handleToggleSave}
                disabled={pending}
                aria-label={saved ? "Remove from My List" : "Add to My List"}
                className="p-2 glass rounded-lg text-white hover:bg-white/15 transition-colors"
                style={{ opacity: pending ? 0.6 : 1 }}
              >
                {saved ? <Check size={14} /> : <Plus size={14} />}
              </button>
            </div>
            {(hasMeaningfulScore || title.year || hasSeasons) && (
              <div className="flex items-center gap-2 text-[10px]" style={{ color: "rgba(255,255,255,0.6)" }}>
                {title.year ? <span>{title.year}</span> : null}
                {hasSeasons ? (
                  <>
                    {title.year ? <span>·</span> : null}
                    <span>{title.seasons}S</span>
                  </>
                ) : null}
                {hasMeaningfulScore ? (
                  <>
                    {(title.year || hasSeasons) ? <span>·</span> : null}
                    <span style={{ background: "linear-gradient(90deg,#e53e2a,#f5c518)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text", fontWeight:700 }}>
                      {title.score}
                    </span>
                  </>
                ) : null}
              </div>
            )}
          </div>

          {/* Top badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {isOriginal && (
              <span className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm"
                style={{ background: "linear-gradient(90deg,#e53e2a,#f07030,#f5c518)", color: "#000" }}>
                Original
              </span>
            )}
            {isNewByDate && !isOriginal && (
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
          {title.creatorName && (
            <p className="text-[10px] mt-0.5 truncate"
              style={{ color: "rgba(240,112,48,0.8)" }}>
              By {title.creatorName}
            </p>
          )}
          {title.genres.length > 0 && (
            <p className="text-[11px] mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.3)" }}>
              {title.genres.slice(0, 2).join(" · ")}
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
