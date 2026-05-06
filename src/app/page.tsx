"use client";

import { useEffect, useState } from "react";
import { HeroBanner } from "@/components/home/HeroBanner";
import { ContentRow } from "@/components/home/ContentRow";
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
        const res = await fetch("/api/public/titles");
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
    <>
      {heroTitles.length > 0 && <HeroBanner titles={heroTitles} />}

      <div className="pt-10">
        {trending.length > 0 && (
          <ContentRow label="Trending Now" titles={trending} variant="landscape" />
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

        {/* Empty-catalog state: only render after the creator-titles fetch
            has completed (avoids flashing the message before data arrives). */}
        {creatorTitlesLoaded && !hasAnyContent && !creatorTitlesError && (
          <div className="min-h-[60vh] flex items-center justify-center px-6 md:px-10">
            <div className="max-w-xl text-center">
              <p
                className="text-xs uppercase tracking-[0.25em] mb-4"
                style={{ color: "rgba(240,112,48,0.7)" }}
              >
                Catalog
              </p>
              <h1 className="text-display font-bold text-3xl md:text-4xl text-white tracking-tight mb-4">
                The catalog is being prepared.
              </h1>
              <p className="text-base leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
                Approved works will appear here once they are licensed and ready
                for distribution.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
