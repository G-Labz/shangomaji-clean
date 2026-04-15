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
  const cyberpunk   = getByGenre("Afro Cyberpunk");
  const mythology   = getByGenre("Mythology & Gods");
  const diaspora    = getByGenre("Diaspora Stories");
  const spirits     = getByGenre("Spirits & the Unseen");
  const futures     = getByGenre("Futures & Sci-Fi");
  const martial     = getByGenre("Martial Worlds");

  const [creatorTitles, setCreatorTitles] = useState<Title[]>([]);

  useEffect(() => {
    fetch("/api/public/titles")
      .then((r) => r.json())
      .then((data) => {
        if (data.titles) {
          setCreatorTitles(
            data.titles.map((t: any) => ({
              ...t,
              score: t.score || 0,
              cast: t.cast || [],
              genres: t.genres || [],
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  return (
    <>
      <HeroBanner titles={trending} />

      <div className="pt-10">
        <ContentRow label="Trending Now"           titles={trending}    variant="landscape" />
        <ContentRow label="New Releases"           titles={newReleases} />
       {creatorTitles.length > 0 && (
  <ContentRow label="The Stage" titles={creatorTitles} />
)}
        <ContentRow label="ShangoMaji Originals"   titles={originals}   variant="landscape" />
        <ContentRow label="Afro Cyberpunk"         titles={cyberpunk}   variant="landscape" />
        <ContentRow label="Mythology & Gods"       titles={mythology} />
        <ContentRow label="Diaspora Stories"       titles={diaspora} />
        <ContentRow label="Spirits & the Unseen"   titles={spirits}     variant="landscape" />
        <ContentRow label="Futures & Sci-Fi"       titles={futures} />
        <ContentRow label="Martial Worlds"         titles={martial} />
      </div>
    </>
  );
}
