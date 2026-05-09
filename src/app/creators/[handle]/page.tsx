"use client";

import { useState, useEffect } from "react";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  Globe,
  Instagram,
  Youtube,
  Twitter,
  Play,
  ChevronLeft,
  Film,
  Tv,
} from "lucide-react";
import { PageTitle } from "@/components/util/PageTitle";
import { PosterArt, BackdropArt } from "@/components/artwork/Artwork";

// Phase 1 — Public Creator Profile page.
//
// This page renders ONLY data returned by /api/public/creator. The mock
// dataset (src/data/creatorData.ts) is no longer consulted — placeholder
// handles like `kofi-asante` no longer produce a reachable production page.
//
// `/api/public/creator` enforces the reachability gate (published + not
// quarantined + not force-unpublished + accepted application). On any
// failure this page renders Next's notFound().

type ExternalLink = { label: string; url: string };

type PublicTitle = {
  id: string;
  slug: string;
  title: string;
  description: string;
  year: number;
  type: "series" | "movie";
  genres: string[];
  // Phase 5: API returns null when no real artwork. Consumers render a
  // typographic fallback via <PosterArt> / <BackdropArt>.
  posterUrl: string | null;
  backdropUrl: string | null;
};

type PublicCreator = {
  id: string;
  handle: string;
  name: string;
  bio: string;
  origin: string;
  avatarUrl: string;
  bannerUrl: string;
  titles: PublicTitle[];
  socialLinks: {
    website?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
  };
  externalLinks: ExternalLink[];
  isVerified: boolean;
  // Phase 6 Tier 2 — true when the creator's application is accepted
  // AND their profile passes the public reachability gate. The API
  // only returns reachable creators, so this is effectively always
  // true here, but it is shaped explicitly so the page can render a
  // small institutional indicator without re-deriving the bit.
  isApprovedCreator?: boolean;
  joinedYear: number;
};

interface PageProps {
  params: { handle: string };
}

export default function CreatorProfilePage({ params }: PageProps) {
  const { handle } = params;
  const [creator, setCreator] = useState<PublicCreator | null>(null);
  const [status, setStatus]   = useState<"loading" | "ok" | "missing">("loading");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/public/creator?handle=${encodeURIComponent(handle)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (cancelled) return;
        if (data?.creator) {
          setCreator(data.creator as PublicCreator);
          setStatus("ok");
        } else {
          setStatus("missing");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("missing");
      });
    return () => {
      cancelled = true;
    };
  }, [handle]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-ink-faint">Loading…</p>
      </div>
    );
  }

  if (status === "missing" || !creator) return notFound();

  return <CreatorProfileContent creator={creator} />;
}

function TitleTile({ title }: { title: PublicTitle }) {
  const TypeIcon = title.type === "series" ? Tv : Film;
  return (
    <motion.div
      className="group cursor-pointer"
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Link href={`/title/${title.slug}`} className="block">
        <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-surface-elevated mb-3">
          <PosterArt
            src={title.posterUrl}
            alt={title.title}
            title={title.title}
            sizes="240px"
            className="transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
                <Play size={16} fill="#000" className="ml-0.5" />
              </div>
            </div>
          </div>
          <div className="absolute top-2.5 left-2.5">
            <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md glass-dark text-white">
              {title.type}
            </span>
          </div>
        </div>

        <h3 className="text-white font-semibold text-sm leading-tight mb-1 group-hover:text-white transition-colors">
          {title.title}
        </h3>
        <div className="flex items-center gap-2 text-[11px] text-ink-faint">
          <span>{title.year}</span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <TypeIcon size={10} />
            {title.type === "series" ? "Series" : "Film"}
          </span>
        </div>
        {title.description && (
          <p className="text-ink-faint text-xs mt-2 leading-relaxed line-clamp-3">
            {title.description}
          </p>
        )}
      </Link>
    </motion.div>
  );
}

function CreatorProfileContent({ creator }: { creator: PublicCreator }) {
  const socialIcons: Record<string, React.ReactNode> = {
    instagram: <Instagram size={16} />,
    twitter:   <Twitter size={16} />,
    youtube:   <Youtube size={16} />,
    website:   <Globe size={16} />,
  };

  const validSocialLinks = Object.entries(creator.socialLinks).filter(([, url]) => {
    if (!url || typeof url !== "string") return false;
    try {
      // eslint-disable-next-line no-new
      new URL(url);
      return true;
    } catch {
      return false;
    }
  });

  const hasTitles       = creator.titles.length > 0;
  const featuredTitle   = hasTitles ? creator.titles[0] : null;
  const remainingTitles = hasTitles ? creator.titles.slice(1) : [];

  return (
    <div className="min-h-screen">
      <PageTitle title={creator.name} />
      {/* ── Banner ── */}
      <div className="relative w-full h-[50vh] min-h-[380px] max-h-[520px] overflow-hidden">
        {creator.bannerUrl ? (
          <Image
            src={creator.bannerUrl}
            alt={creator.name}
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, #0d0d0d 0%, #1a0f0a 30%, #1f1510 50%, #0f1015 70%, #0a0a0f 100%)",
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/60 to-transparent" />

        <motion.div
          className="absolute top-20 left-6 md:left-10 z-10"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Link
            href="/creators"
            className="flex items-center gap-1.5 text-white/60 hover:text-white text-sm transition-colors group"
          >
            <ChevronLeft size={15} className="transition-transform group-hover:-translate-x-0.5" />
            Creators
          </Link>
        </motion.div>
      </div>

      {/* ── Profile Header ── */}
      <div className="max-w-[1600px] mx-auto px-6 md:px-10 -mt-24 relative z-10">
        <motion.div
          className="flex flex-col md:flex-row md:items-end gap-6 pb-8 border-b border-white/8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div
              className="w-28 h-28 md:w-32 md:h-32 rounded-2xl overflow-hidden border-2 border-white/15 shadow-2xl"
              style={{ background: "rgba(255,255,255,0.04)" }}
            >
              {creator.avatarUrl ? (
                <Image
                  src={creator.avatarUrl}
                  alt={creator.name}
                  width={128}
                  height={128}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/20 text-3xl">
                  {creator.name.slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-1 flex-wrap">
              <h1 className="text-display font-bold text-3xl md:text-4xl text-white tracking-tight leading-tight">
                {creator.name}
              </h1>
              {creator.isVerified && (
                <BadgeCheck size={22} className="text-brand-yellow flex-shrink-0" />
              )}
            </div>
            <p className="text-ink-faint text-[11px] tracking-wider uppercase mt-1">
              @{creator.handle} · ShangoMaji Collective
            </p>
            {/* Phase 6 Tier 2 — Approved Creator indicator. Restrained,
                muted, institutional. No checkmark, no badge economy, no
                follower-style phrasing. Anchored under the handle so it
                reads as a status of record, not a vanity decoration. */}
            {creator.isApprovedCreator && (
              <p
                className="text-[10px] tracking-[0.18em] uppercase mt-1.5"
                style={{ color: "rgba(245,197,24,0.55)" }}
              >
                Approved Creator
              </p>
            )}
            {creator.origin && (
              <p className="text-ink-muted text-sm mt-2">{creator.origin}</p>
            )}
          </div>

          {/* Social + URL */}
          <div className="flex-shrink-0 flex flex-col gap-3 items-start md:items-end">
            <span className="text-[11px] text-ink-faint tracking-wide px-3 py-1.5 rounded-lg border border-white/6 select-all">
              shangomaji.com/creators/{creator.handle}
            </span>

            {validSocialLinks.length > 0 && (
              <div className="flex gap-2">
                {validSocialLinks.map(([platform, url]) => (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 glass rounded-xl text-ink-muted hover:text-white transition-colors"
                    aria-label={platform}
                  >
                    {socialIcons[platform]}
                  </a>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Meta Strip ──
            Phase 6 Tier 2 — work-count copy ("N titles") is removed.
            Founder explicit: do not add work counts on creator profile.
            The remaining metadata is institutional: when joined, plus
            a "New Creator" tag while the portfolio is empty. The body
            of work itself is rendered below; counting it here would
            duplicate that signal as a metric. */}
        <motion.div
          className="flex items-center gap-3 py-4 border-b border-white/5 text-xs text-ink-faint tracking-wide"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <span>Joined {creator.joinedYear}</span>
          {!hasTitles && (
            <>
              <span className="text-white/10">·</span>
              <span>New Creator</span>
            </>
          )}
        </motion.div>

        {/* ── Featured Work ── */}
        {/* Phase 6 Tier 2 — when the creator has no live works, the
            entire featured-tile block is hidden cleanly. The previous
            "Coming Soon — This creator is building something." copy
            implied a promise we cannot keep on the creator's behalf
            and conflicted with the founder copy standard ("no Coming
            Soon language"). The meta strip above already reads
            "New Creator" in this state, which is enough. */}
        {featuredTitle && (
          <motion.div
            className="py-10 border-b border-white/5"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
          >
            <Link href={`/title/${featuredTitle.slug}`} className="group block">
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-surface-elevated">
                <BackdropArt
                  src={featuredTitle.backdropUrl}
                  alt={featuredTitle.title}
                  title={featuredTitle.title}
                  sizes="(max-width: 1600px) 100vw, 1600px"
                  className="transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md glass-dark text-white mb-3 inline-block">
                    {featuredTitle.type}
                  </span>
                  <h3 className="text-white font-bold text-2xl md:text-3xl leading-tight">
                    {featuredTitle.title}
                  </h3>
                  {featuredTitle.description && (
                    <p className="text-white/60 text-sm mt-2 max-w-xl line-clamp-2">
                      {featuredTitle.description}
                    </p>
                  )}
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-2xl">
                    <Play size={24} fill="#000" className="ml-1" />
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        )}

        {/* ── Other titles ── */}
        {remainingTitles.length > 0 && (
          <motion.div
            className="py-10 border-b border-white/5"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <h2 className="text-white font-semibold text-xl mb-8">
              More from {creator.name}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {remainingTitles.map((t) => (
                <TitleTile key={t.id} title={t} />
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Bio ── */}
        {creator.bio && (
          <motion.div
            className="py-10 border-b border-white/5"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
          >
            <blockquote className="text-ink-muted text-base md:text-lg leading-relaxed max-w-3xl italic">
              {`“${creator.bio}”`}
            </blockquote>
          </motion.div>
        )}

        {/* ── External links ── */}
        {creator.externalLinks?.length > 0 && (
          <motion.div
            className="py-10 border-b border-white/5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="text-xs uppercase tracking-widest text-ink-faint mb-4">Links</h3>
            <div className="flex flex-col gap-2">
              {creator.externalLinks.map((l, idx) => (
                <a
                  key={`${l.url}-${idx}`}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-orange-400 hover:text-orange-300 underline underline-offset-2 break-all"
                >
                  {l.label || l.url}
                </a>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Collective Footer ── */}
        <div className="py-10 text-center">
          <p
            className="text-[11px] tracking-widest uppercase"
            style={{ color: "rgba(255,255,255,0.15)" }}
          >
            Part of the ShangoMaji Creator Collective
          </p>
        </div>
      </div>
    </div>
  );
}
