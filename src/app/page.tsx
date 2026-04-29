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
  const trending    = getTrending();
  const newReleases = getNewReleases();
  const originals   = getOriginals();
  const mythology   = getByGenre("Mythology & Gods");
  const spirits     = getByGenre("Spirits & the Unseen");
  const futures     = getByGenre("Futures & Sci-Fi");
  const martial     = getByGenre("Martial Worlds");

  const [creatorTitles, setCreatorTitles]     = useState<Title[]>([]);
  const [creatorTitlesError, setCreatorTitlesError] = useState<string | null>(null);

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
      }
    }

    loadCreatorTitles();
  }, []);

  return (
    <>
      <HeroBanner titles={trending} />

      <div className="pt-10">
        <ContentRow label="Trending Now"           titles={trending}    variant="landscape" />
        <ContentRow label="New Releases"           titles={newReleases} />
        {creatorTitlesError ? (
          <div style={{ padding: "1rem 2.5rem", fontSize: "0.8rem", color: "rgba(255,255,255,0.25)" }}>
            Creator titles could not be loaded.
          </div>
        ) : creatorTitles.length > 0 ? (
          <ContentRow label="The Stage" titles={creatorTitles} />
        ) : null}
        <ContentRow label="ShangoMaji Originals"   titles={originals}   variant="landscape" />
        <ContentRow label="Mythology & Gods"       titles={mythology} />
        <ContentRow label="Spirits & the Unseen"   titles={spirits}     variant="landscape" />
        <ContentRow label="Futures & Sci-Fi"       titles={futures} />
        <ContentRow label="Martial Worlds"         titles={martial} />
      </div>
    </>
  );
}
