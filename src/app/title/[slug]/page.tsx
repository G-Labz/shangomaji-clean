"use client";

import { notFound } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Play,
  Plus,
  Check,
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
import { PosterArt, BackdropArt } from "@/components/artwork/Artwork";
import { PageTitle } from "@/components/util/PageTitle";
import { isWithinNewWindow } from "@/lib/new-badge";
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
      <PageTitle title={title.title} />
      {/* ── Cinematic Hero ── */}
      <div className="relative w-full h-[70vh] min-h-[500px] max-h-[780px] overflow-hidden">
        <BackdropArt
          src={title.backdropUrl}
          alt={title.title}
          title={title.title}
          priority
          sizes="100vw"
          className="object-center"
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
          <div className="w-48 aspect-[2/3] rounded-2xl overflow-hidden relative">
            <PosterArt
              src={title.posterUrl}
              alt=""
              title={title.title}
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
          {/* Badges — NEW gated by activation date when present */}
          {(() => {
            const titleDate = (title as any).activatedAt as string | undefined;
            const showNew = titleDate
              ? isWithinNewWindow(titleDate)
              : !!title.isNew &&
                typeof title.year === "number" &&
                Math.abs(new Date().getFullYear() - title.year) <= 1;
            return (
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="flex items-center gap-1 text-xs text-ink-muted">
                  <TypeIcon size={12} />
                  {title.type === "series" ? "Series" : "Movie"}
                </span>
                {showNew && (
                  <span className="brand-text text-xs font-bold uppercase tracking-widest">
                    · New
                  </span>
                )}
                {title.isTrending && (
                  <span className="text-ink-muted text-xs">· Trending</span>
                )}
              </div>
            );
          })()}

          {/* Title */}
          <h1 className="text-display font-bold text-5xl md:text-7xl leading-[0.9] tracking-tight text-white mb-4">
            {title.title}
          </h1>

          {/* Tagline — only when present */}
          {title.tagline && title.tagline.trim() && (
            <p className="text-display italic text-ink-muted text-xl mb-5">
              &ldquo;{title.tagline.trim()}&rdquo;
            </p>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-4 flex-wrap text-sm mb-5">
            {typeof title.score === "number" && title.score > 0 && (
              <>
                <div className="flex items-center gap-1.5">
                  <Star size={14} className="text-brand-yellow fill-brand-yellow" />
                  <span className="brand-text font-semibold">{title.score}</span>
                </div>
                <span className="text-ink-faint">·</span>
              </>
            )}
            <span className="text-ink-muted">{title.year}</span>
            {title.rating ? (
              <>
                <span className="text-ink-faint">·</span>
                <span className="border border-white/20 px-1.5 py-0.5 text-xs rounded text-ink-muted">
                  {title.rating}
                </span>
              </>
            ) : null}
            {title.type === "movie" && title.runtime ? (
              <>
                <span className="text-ink-faint">·</span>
                <span className="flex items-center gap-1 text-ink-muted">
                  <Clock size={13} />
                  {title.runtime}
                </span>
              </>
            ) : null}
            {title.type === "series" && typeof title.seasons === "number" && title.seasons > 0 ? (
              <>
                <span className="text-ink-faint">·</span>
                <span className="text-ink-muted">
                  {title.seasons} Season{title.seasons !== 1 ? "s" : ""}
                </span>
              </>
            ) : null}
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
            <TitlePlayCta slug={title.slug} type={title.type} />
            <SaveButton slug={title.slug} />
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
          {/* About — only when real description exists */}
          <div className="lg:col-span-2">
            {title.description && title.description.trim() && (
              <>
                <h2 className="text-xs uppercase tracking-widest text-ink-faint mb-3">
                  About
                </h2>
                <p className="text-ink-muted leading-relaxed text-sm md:text-base">
                  {title.description}
                </p>
              </>
            )}
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

        {/* ── Phase 5 — Episodes section retired until real episode data exists.
              The previous stub fabricated S1·E1 → S1·E5 entries with the
              title's backdrop. Per the founder copy standard ("Do not render
              fake episode labels"), the section is hidden entirely. The
              data path can be revived in a later phase when seasons[].
              episodes[] is sourced from real metadata. */}
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
        <p className="text-ink-faint">Loading…</p>
      </div>
    );
  }

  if (!title) return notFound();

  return (
    <div className="min-h-screen">
      <PageTitle title={title.title} />
      <div className="relative w-full h-[60vh] min-h-[400px] max-h-[700px] overflow-hidden">
        <BackdropArt
          src={title.backdropUrl}
          alt={title.title}
          title={title.title}
          priority
          sizes="100vw"
          className="object-center"
        />
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

          {(() => {
            const hasYear = typeof title.year === "number" && title.year > 0;
            const hasRating = typeof title.rating === "string" && title.rating.trim().length > 0;
            if (!hasYear && !hasRating) return null;
            return (
              <div className="flex items-center gap-4 flex-wrap text-sm mb-5">
                {hasYear && <span className="text-ink-muted">{title.year}</span>}
                {hasRating && (
                  <span className="border border-white/20 px-1.5 py-0.5 text-xs rounded text-ink-muted">
                    {title.rating}
                  </span>
                )}
              </div>
            );
          })()}

          {title.genres?.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-6">
              {title.genres.map((g: string) => (
                <span key={g} className="px-3 py-1 rounded-full bg-surface-raised border border-white/8 text-xs text-ink-muted">{g}</span>
              ))}
            </div>
          )}

          {/* Watch CTA — only when playable media is bound to this title */}
          <div className="flex items-center gap-3 flex-wrap mb-8">
            {title.playable ? (
              <>
                <TitlePlayCta slug={title.slug} type={title.type === "series" ? "series" : "movie"} />
                <SaveButton slug={title.slug} />
              </>
            ) : (
              <span
                className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl text-xs uppercase tracking-widest"
                style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                Coming soon
              </span>
            )}
          </div>

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
            // Phase 5 — generic publisher line is plain text, never a link.
            // We use whatever real studio label exists; otherwise fall back
            // to "ShangoMaji" without appending "Creators".
            <div className="py-8 border-t border-white/5">
              <p className="text-xs text-ink-faint">
                Published by{" "}
                <span className="text-ink-muted">
                  {(typeof title.studio === "string" && title.studio.trim()) || "ShangoMaji"}
                </span>
              </p>
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

// ── Phase 4 — title-page action helpers ──────────────────────────────────
// Both helpers run client-side and call private Member endpoints. They
// gracefully redirect to /login or /signup with a return path on auth /
// member denials. No tokens, no permanent embed URLs leave the server.

function TitlePlayCta({ slug, type: _type }: { slug: string; type: "movie" | "series" }) {
  // Phase 5 — CTA defaults to "Play" everywhere.
  //
  //   • film:                     "Play"
  //   • series:                   "Play"  (no fake "S1 · E1" — Episode 1
  //                                metadata is not yet sourced from real data)
  //   • Resume label:             intentionally suppressed. Bunny playback
  //                                time is not yet captured honestly; the
  //                                /api/members/progress hook still records
  //                                a session-started beacon so the foundation
  //                                stays in place, but the CTA does not lie
  //                                about resume position.
  //
  // The progress probe is preserved as a no-op: we still hit the endpoint
  // so any caching / pre-warm behavior keeps working, but its result no
  // longer changes the CTA copy.
  void _type;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/members/progress?slug=${encodeURIComponent(slug)}`, { cache: "no-store" });
        if (!res.ok) return;
        await res.json().catch(() => null);
        if (cancelled) return;
        // Intentionally no setHasProgress — Resume UI is hidden in Phase 5.
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  return (
    <Link
      href={`/watch/${slug}`}
      className="flex items-center gap-2.5 bg-white text-black font-semibold px-7 py-3.5 rounded-xl hover:bg-white/90 active:scale-95 transition-all duration-200 text-sm"
    >
      <Play size={16} fill="currentColor" />
      Play
    </Link>
  );
}

function SaveButton({ slug }: { slug: string }) {
  const [saved, setSaved]     = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/members/my-list", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const titles: Array<{ slug?: string }> = Array.isArray(data?.titles) ? data.titles : [];
        if (titles.some((t) => t.slug === slug)) setSaved(true);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  async function toggle() {
    if (pending) return;
    setPending(true);
    try {
      const res = await fetch("/api/members/my-list", {
        method:  saved ? "DELETE" : "POST",
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
    } catch { /* noop */ }
    finally { setPending(false); }
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className="flex items-center gap-2.5 glass text-white font-medium px-5 py-3.5 rounded-xl hover:bg-white/10 active:scale-95 transition-all duration-200 text-sm"
      style={{ opacity: pending ? 0.6 : 1 }}
    >
      {saved ? <Check size={16} /> : <Plus size={16} />}
      {saved ? "Saved" : "Save"}
    </button>
  );
}
