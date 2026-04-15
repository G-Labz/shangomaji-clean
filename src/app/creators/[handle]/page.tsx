"use client";

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
  Clock,
} from "lucide-react";
import { useState, useEffect } from "react";
import { getCreatorByHandle, getAllCreators } from "@/data/creatorData";
import type { Creator, CreatorTitle } from "@/data/creatorData";

function isPlaceholderUrl(url: string): boolean {
  if (!url) return true;
  return url.includes("picsum.photos");
}

function creatorNumber(handle: string): number {
  let hash = 0;
  for (let i = 0; i < handle.length; i++) {
    hash = ((hash << 5) - hash + handle.charCodeAt(i)) | 0;
  }
  return 1000 + Math.abs(hash % 9000);
}

interface PageProps {
  params: { handle: string };
}

function TitleTile({ title }: { title: CreatorTitle }) {
  const TypeIcon = title.type === "series" ? Tv : Film;

  return (
    <motion.div
      className="group cursor-pointer"
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Link href={`/title/${title.slug}`} className="block">
        <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-surface-elevated mb-3">
          <Image
            src={title.posterUrl}
            alt={title.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="240px"
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
            {title.type === "series" ? `${title.episodes} eps` : title.runtime}
          </span>
        </div>
        <p className="text-ink-faint text-xs mt-2 leading-relaxed line-clamp-3">
          {title.description}
        </p>
      </Link>
    </motion.div>
  );
}

export default function CreatorProfilePage({ params }: PageProps) {
  const { handle } = params;
  const creator = getCreatorByHandle(handle);

  if (!creator) return <LiveCreatorFallback handle={handle} />;

  const allCreators = getAllCreators();
  const otherCreators = allCreators.filter((c) => c.id !== creator.id).slice(0, 3);

  return <CreatorProfileContent creator={creator} otherCreators={otherCreators} />;
}

function CreatorProfileContent({ creator, otherCreators }: { creator: Creator; otherCreators: Creator[] }) {

  const socialIcons: Record<string, React.ReactNode> = {
    instagram: <Instagram size={16} />,
    twitter: <Twitter size={16} />,
    youtube: <Youtube size={16} />,
    website: <Globe size={16} />,
  };

  const hasTitles = creator.titles.length > 0;
  const featuredTitle = hasTitles ? creator.titles[0] : null;
  const remainingTitles = hasTitles ? creator.titles.slice(1) : [];

  // Collect only valid social links
  const validSocialLinks = Object.entries(creator.socialLinks).filter(([, url]) => {
    if (!url || typeof url !== "string") return false;
    try { new URL(url); return true; } catch { return false; }
  });

  return (
    <div className="min-h-screen">
      {/* ── Banner ── */}
      <div className="relative w-full h-[50vh] min-h-[380px] max-h-[520px] overflow-hidden">
        {isPlaceholderUrl(creator.bannerUrl) ? (
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, #0d0d0d 0%, #1a0f0a 30%, #1f1510 50%, #0f1015 70%, #0a0a0f 100%)",
            }}
          />
        ) : (
          <Image
            src={creator.bannerUrl}
            alt={creator.name}
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/60 to-transparent" />

        {/* Back */}
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
            <div className="w-28 h-28 md:w-32 md:h-32 rounded-2xl overflow-hidden border-2 border-white/15 shadow-2xl">
              <Image
                src={creator.avatarUrl}
                alt={creator.name}
                width={128}
                height={128}
                className="object-cover w-full h-full"
              />
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

            {/* Creator number */}
            <p className="text-ink-faint text-[11px] tracking-wider uppercase mt-1">
              Creator #{creatorNumber(creator.handle)} · ShangoMaji Collective
            </p>

            {/* Origin — only if non-empty */}
            {creator.origin && (
              <p className="text-ink-muted text-sm mt-2">{creator.origin}</p>
            )}

            {/* Genres */}
            {creator.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {creator.genres.map((g) => (
                  <span
                    key={g}
                    className="px-3 py-1 rounded-full bg-surface-raised border border-white/8 text-xs text-ink-muted"
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}

            {/* Tagline — only if non-empty */}
            {creator.tagline && (
              <p className="text-display italic text-white/70 text-lg mt-3">
                &ldquo;{creator.tagline}&rdquo;
              </p>
            )}
          </div>

          {/* Actions — real actions only */}
          <div className="flex-shrink-0 flex flex-col gap-3 items-start md:items-end">
            {/* Profile URL chip (non-interactive) */}
            <span className="text-[11px] text-ink-faint tracking-wide px-3 py-1.5 rounded-lg border border-white/6 select-all">
              shangomaji.com/creators/{creator.handle}
            </span>

            {/* Social links — only valid URLs */}
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

        {/* ── Meta Strip ── */}
        <motion.div
          className="flex items-center gap-3 py-4 border-b border-white/5 text-xs text-ink-faint tracking-wide"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <span>Joined {creator.joinedYear}</span>
          <span className="text-white/10">·</span>
          {hasTitles ? (
            <span>
              {creator.titles.length} title{creator.titles.length !== 1 ? "s" : ""}
            </span>
          ) : (
            <span>New Creator</span>
          )}
          {creator.genres.length > 0 && (
            <>
              <span className="text-white/10">·</span>
              <span>{creator.genres[0]}</span>
            </>
          )}
        </motion.div>

        {/* ── Featured Work ── */}
        <motion.div
          className="py-10 border-b border-white/5"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
        >
          {featuredTitle ? (
            <Link href={`/title/${featuredTitle.slug}`} className="group block">
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-surface-elevated">
                <Image
                  src={featuredTitle.backdropUrl || featuredTitle.posterUrl}
                  alt={featuredTitle.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 1600px) 100vw, 1600px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md glass-dark text-white mb-3 inline-block">
                    {featuredTitle.type}
                  </span>
                  <h3 className="text-white font-bold text-2xl md:text-3xl leading-tight">
                    {featuredTitle.title}
                  </h3>
                  <p className="text-white/60 text-sm mt-2 max-w-xl line-clamp-2">
                    {featuredTitle.description}
                  </p>
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-2xl">
                    <Play size={24} fill="#000" className="ml-1" />
                  </div>
                </div>
              </div>
            </Link>
          ) : (
            <div
              className="relative aspect-video rounded-2xl overflow-hidden flex flex-col items-center justify-center"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <p className="text-white font-semibold text-lg">Coming Soon</p>
              <p className="text-ink-faint text-sm mt-1">This creator is building something.</p>
            </div>
          )}
        </motion.div>

        {/* ── Content Grid (remaining titles) ── */}
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
        <motion.div
          className="py-10 border-b border-white/5"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
        >
          <blockquote
            className="text-ink-muted text-base md:text-lg leading-relaxed max-w-3xl"
            style={{ fontStyle: creator.bio ? "italic" : "normal" }}
          >
            {creator.bio ? `\u201C${creator.bio}\u201D` : "Creator on ShangoMaji"}
          </blockquote>

          {/* Influences — only if non-empty */}
          {creator.influences.length > 0 && (
            <div className="mt-8">
              <h3 className="text-xs uppercase tracking-widest text-ink-faint mb-4">
                Influences
              </h3>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {creator.influences.map((inf) => (
                  <div
                    key={inf}
                    className="flex items-center gap-2 text-sm text-ink-muted"
                  >
                    <span className="w-1 h-1 rounded-full bg-brand-orange flex-shrink-0" />
                    {inf}
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* ── Collective Footer ── */}
        <div className="py-10 text-center">
          <p
            className="text-[11px] tracking-widest uppercase"
            style={{ color: "rgba(255,255,255,0.15)" }}
          >
            Part of the ShangoMaji Creator Collective · Est. 2026
          </p>
        </div>

        {/* ── Other Creators ── */}
        {otherCreators.length > 0 && (
          <motion.div
            className="py-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-white font-semibold text-xl">
                More Creators
              </h2>
              <Link
                href="/creators"
                className="text-ink-muted hover:text-white text-sm transition-colors flex items-center gap-1 group"
              >
                View All
                <ChevronLeft size={14} className="rotate-180 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
              {otherCreators.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 + i * 0.1 }}
                >
                  <Link href={`/creators/${c.handle}`} className="group block">
                    <div className="relative aspect-video rounded-2xl overflow-hidden bg-surface-elevated mb-3">
                      {isPlaceholderUrl(c.bannerUrl) ? (
                        <div
                          className="absolute inset-0"
                          style={{
                            background:
                              "linear-gradient(135deg, #0d0d0d 0%, #1a0f0a 30%, #1f1510 50%, #0f1015 70%, #0a0a0f 100%)",
                          }}
                        />
                      ) : (
                        <Image
                          src={c.bannerUrl}
                          alt={c.name}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="400px"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      <div className="absolute bottom-3 left-4 flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg overflow-hidden border border-white/20">
                          <Image
                            src={c.avatarUrl}
                            alt={c.name}
                            width={36}
                            height={36}
                            className="object-cover"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-1">
                            <p className="text-white text-xs font-semibold">{c.name}</p>
                            {c.isVerified && <BadgeCheck size={11} className="text-brand-yellow" />}
                          </div>
                          <p className="text-white/50 text-[10px]">{c.origin}</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function LiveCreatorFallback({ handle }: { handle: string }) {
  const [creator, setCreator] = useState<Creator | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/public/creator?handle=${encodeURIComponent(handle)}`)
      .then((r) => r.json())
      .then((data) => setCreator(data.creator || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [handle]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-ink-faint">Loading...</p>
      </div>
    );
  }

  if (!creator) return notFound();

  return <CreatorProfileContent creator={creator} otherCreators={[]} />;
}
