"use client";

import { useEffect, useState } from "react";
import { HeroBanner } from "@/components/home/HeroBanner";
import { ContentRow } from "@/components/home/ContentRow";
import { TitleCardIdent } from "@/components/home/TitleCardIdent";
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
      <TitleCardIdent />
      <PageTitle title="ShangoMaji" raw />
      {heroTitles.length > 0 && <HeroBanner titles={heroTitles} />}

      <div className={`flex-1 ${heroTitles.length > 0 ? "pt-10" : "pt-24 md:pt-28"}`}>
        {/* Arrival statement (Phase 10K-R4) — always-rendered editorial launch
            presence. Stronger than a banner; deliberately NOT a coming-soon
            wall, countdown, metrics block, or activity feed. Copy/context only.
            Colors are the exact ShangoMaji Ember Spectrum v1 brand-kit values.
            Sits below the hero when content exists; the container padding above
            clears the fixed nav when it does not. */}
        <section className="px-6 md:px-10 mb-14">
          <div
            className="relative overflow-hidden rounded-2xl border px-7 py-10 md:px-12 md:py-14"
            style={{
              background:
                "linear-gradient(120deg, rgba(200,10,46,0.12) 0%, rgba(17,17,17,0.40) 46%, rgba(255,213,0,0.06) 100%)",
              borderColor: "rgba(217,38,28,0.20)",
            }}
          >
            {/* A single disciplined ember wash on the left — the stage lit from
                one side. No bloom stack (brand kit §07). */}
            <div
              className="absolute inset-y-0 left-0 w-1/2 pointer-events-none"
              style={{ background: "radial-gradient(60% 80% at 0% 50%, rgba(217,38,28,0.10), transparent 70%)" }}
            />

            <div className="relative z-10 max-w-3xl">
              {/* Status eyebrow */}
              <div className="flex items-center gap-3 mb-6">
                <span
                  className="h-px w-10 flex-shrink-0"
                  style={{ background: "linear-gradient(90deg, #C80A2E, #FFD500)" }}
                />
                <span
                  className="text-[11px] md:text-xs uppercase tracking-[0.28em] font-mono"
                  style={{ color: "#B5B5B5" }}
                >
                  The label is active · In launch preparation
                </span>
              </div>

              {/* Primary statement */}
              <h2
                className="text-display font-bold tracking-tight mb-5"
                style={{ color: "#F2F2F2", fontSize: "clamp(30px, 5vw, 60px)", lineHeight: 1.02 }}
              >
                The first worlds are being prepared.
              </h2>

              {/* Supporting */}
              <p className="text-base md:text-lg leading-relaxed mb-8" style={{ color: "#B5B5B5" }}>
                The collection is forming. Chosen, not uploaded.
              </p>

              {/* Graphite rule */}
              <div className="h-px w-full mb-8" style={{ background: "#2A2A2A" }} />

              {/* Signature + static status pill */}
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
                <p
                  className="text-display italic font-semibold"
                  style={{
                    fontSize: "clamp(22px, 3vw, 34px)",
                    background:
                      "linear-gradient(90deg, #C80A2E 0%, #D9261C 20%, #EA731B 50%, #F6A31A 75%, #FFD500 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  You are early.
                </p>

                {/* "Dropping soon" — static cultural status phrase, not a time
                    promise: no date, no countdown, no metric. */}
                <span
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-widest flex-shrink-0"
                  style={{
                    color: "#F2F2F2",
                    background: "rgba(200,10,46,0.12)",
                    border: "1px solid rgba(217,38,28,0.30)",
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#FFD500" }} />
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
            has completed (avoids flashing before data arrives). The Arrival
            Statement above carries the launch message, so this stays a single
            quiet, distinct line about the empty catalog grid (no duplicated
            copy). Soft Ash (brand-kit secondary copy). */}
        {creatorTitlesLoaded && !hasAnyContent && !creatorTitlesError && (
          <div className="min-h-[24vh] flex items-center justify-center px-6 md:px-10">
            <p
              className="text-base leading-relaxed text-center max-w-xl"
              style={{ color: "#B5B5B5" }}
            >
              Worlds will appear here as they&rsquo;re prepared for release.
            </p>
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
