"use client";

import { useEffect, useState } from "react";
import { HeroBanner } from "@/components/home/HeroBanner";
import { ContentRow } from "@/components/home/ContentRow";
import { PageTitle } from "@/components/util/PageTitle";
import { SiteFooter } from "@/components/nav/SiteFooter";
import {
  getTrending,
  getNewReleases,
  getOriginals,
  getByGenre,
} from "@/data/mockData";
import type { Title } from "@/data/mockData";

export default function HomePage() {
  // Mock helpers return empty arrays in production (mockData.ts is gated by
  // NODE_ENV). Only real catalog (creator titles via /api/public/titles)
  // surfaces here when the platform launches with no fabricated inventory.
  const trending    = getTrending();
  const newReleases = getNewReleases();
  const originals   = getOriginals();
  const mythology   = getByGenre("Mythology & Gods");
  const spirits     = getByGenre("Spirits & the Unseen");
  const futures     = getByGenre("Futures & Sci-Fi");
  const martial     = getByGenre("Martial Worlds");

  const [creatorTitles, setCreatorTitles]     = useState<Title[]>([]);
  const [creatorTitlesError, setCreatorTitlesError] = useState<string | null>(null);
  const [creatorTitlesLoaded, setCreatorTitlesLoaded] = useState(false);

  useEffect(() => {
    async function loadCreatorTitles() {
      try {
        // Phase 6 Tier 2.5 Final Sync Fix — `cache: "no-store"` so the
        // browser never serves a stale snapshot of the public catalog
        // (creator media-package updates must surface on the next
        // refresh, not after a cache TTL).
        const res = await fetch("/api/public/titles", { cache: "no-store" });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || `Failed to load creator titles (HTTP ${res.status})`);
        }
        if (!data.titles) {
          throw new Error("Public titles API returned an unexpected response.");
        }

        setCreatorTitles(
          data.titles.map((t: any) => ({
            ...t,
            score:  t.score  || 0,
            cast:   t.cast   || [],
            genres: t.genres || [],
          }))
        );
      } catch (err: any) {
        console.error("[Home] Creator titles failed to load:", err.message);
        setCreatorTitlesError(err.message);
      } finally {
        setCreatorTitlesLoaded(true);
      }
    }

    loadCreatorTitles();
  }, []);

  // Aggregate all renderable content. When everything is empty (no real
  // catalog yet, no mock inventory in production), show a clean
  // "catalog being prepared" empty state instead of empty rows.
  const hasMockContent =
    trending.length > 0 ||
    newReleases.length > 0 ||
    originals.length > 0 ||
    mythology.length > 0 ||
    spirits.length > 0 ||
    futures.length > 0 ||
    martial.length > 0;
  const hasCreatorContent = creatorTitles.length > 0;
  const hasAnyContent     = hasMockContent || hasCreatorContent;

  // Hero source: prefer mock trending in dev (richer assets), fall back to
  // creator titles in production. The HeroBanner is only rendered when at
  // least one item exists — it crashes on empty arrays (titles[0]).
  const heroTitles = trending.length > 0 ? trending : creatorTitles;

  return (
    <div className="min-h-screen flex flex-col">
      <PageTitle title="ShangoMaji" raw />
      {heroTitles.length > 0 && <HeroBanner titles={heroTitles} />}

      <div className={`flex-1 ${heroTitles.length > 0 ? "pt-10" : "pt-24 md:pt-28"}`}>
        {/* Launch presence — always rendered so a first-time visitor
            immediately understands ShangoMaji is active and preparing to
            launch, whether or not catalog cards are present. Copy/context
            only: no countdown, no launch date, no metrics, no fabricated
            activity. Sits below the hero when content exists, and clears
            the fixed nav (container padding above) when it does not. */}
        <section className="px-6 md:px-10 mb-12">
          <div
            className="relative overflow-hidden rounded-2xl border px-6 py-7 md:px-10 md:py-9"
            style={{
              background:
                "linear-gradient(120deg, rgba(229,62,42,0.10) 0%, rgba(7,6,8,0.35) 48%, rgba(245,197,24,0.07) 100%)",
              borderColor: "rgba(229,62,42,0.18)",
            }}
          >
            {/* Ambient brand glow — same visual language as the hero/creators surfaces */}
            <div
              className="absolute -top-20 -right-12 w-72 h-72 rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle, rgba(245,197,24,0.10), transparent 70%)" }}
            />
            <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between md:gap-10">
              <div className="max-w-2xl">
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className="h-px w-8 flex-shrink-0"
                    style={{ background: "linear-gradient(90deg, #e53e2a, #f5c518)" }}
                  />
                  <span
                    className="text-xs uppercase tracking-[0.25em] font-mono"
                    style={{ color: "rgba(240,112,48,0.8)" }}
                  >
                    Launch preparation
                  </span>
                </div>
                <h2 className="text-display font-bold text-2xl md:text-3xl text-white tracking-tight mb-3">
                  ShangoMaji is getting ready to launch
                </h2>
                <p className="text-sm md:text-base leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
                  The first worlds are being prepared for release. The collection
                  is intentionally small while launch preparations continue.
                </p>
                <p className="text-sm md:text-base leading-relaxed mt-2" style={{ color: "rgba(255,255,255,0.45)" }}>
                  What arrives here is chosen, not uploaded. You&rsquo;re early to
                  something intentional.
                </p>
              </div>
              {/* "Dropping soon" — approved phrase, not a countdown (no date,
                  no timer, no metric). */}
              <div className="flex-shrink-0">
                <span
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-widest text-white"
                  style={{ background: "rgba(229,62,42,0.12)", border: "1px solid rgba(229,62,42,0.25)" }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: "linear-gradient(90deg, #e53e2a, #f5c518)" }}
                  />
                  Dropping soon
                </span>
              </div>
            </div>
          </div>
        </section>

        {trending.length > 0 && (
          <ContentRow label="In Rotation" titles={trending} variant="landscape" />
        )}
        {newReleases.length > 0 && (
          <ContentRow label="New Releases" titles={newReleases} />
        )}
        {creatorTitlesError ? (
          <div style={{ padding: "1rem 2.5rem", fontSize: "0.8rem", color: "rgba(255,255,255,0.25)" }}>
            Creator titles could not be loaded.
          </div>
        ) : hasCreatorContent ? (
          <ContentRow label="The Stage" titles={creatorTitles} />
        ) : null}
        {originals.length > 0 && (
          <ContentRow label="ShangoMaji Originals" titles={originals} variant="landscape" />
        )}
        {mythology.length > 0 && (
          <ContentRow label="Mythology & Gods" titles={mythology} />
        )}
        {spirits.length > 0 && (
          <ContentRow label="Spirits & the Unseen" titles={spirits} variant="landscape" />
        )}
        {futures.length > 0 && (
          <ContentRow label="Futures & Sci-Fi" titles={futures} />
        )}
        {martial.length > 0 && (
          <ContentRow label="Martial Worlds" titles={martial} />
        )}

        {/* Catalog placeholder — only render after the creator-titles fetch
            has completed (avoids flashing before data arrives). The
            always-on launch-status section above carries the full launch
            message, so this stays a short, distinct note about the catalog
            area itself (no duplicated headline). */}
        {creatorTitlesLoaded && !hasAnyContent && !creatorTitlesError && (
          <div className="min-h-[28vh] flex items-center justify-center px-6 md:px-10">
            <div className="max-w-xl text-center">
              <p
                className="text-xs uppercase tracking-[0.25em] mb-3"
                style={{ color: "rgba(240,112,48,0.7)" }}
              >
                The collection
              </p>
              <h2 className="text-display font-bold text-2xl md:text-3xl text-white tracking-tight mb-3">
                The collection is forming.
              </h2>
              <p className="text-base leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
                Worlds will appear here as they&rsquo;re prepared for release.
              </p>
            </div>
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
