// ─────────────────────────────────────────────
//  ShangoMaji — Video / Player Mock Data
//  Swap video URLs for real CDN/Mux URLs when backend is ready
// ─────────────────────────────────────────────

// Public domain sample videos (Google CDN — stable, no auth needed)
const SAMPLE_VIDEOS = {
  a: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  b: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  c: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  d: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  e: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
  f: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
};

export interface Episode {
  id: string;
  number: number;
  season: number;
  title: string;
  description: string;
  runtime: string;          // "44 min"
  thumbnailUrl: string;
  videoUrl: string;
  stillUrl: string;
}

export interface Watchable {
  titleSlug: string;
  titleName: string;
  type: "movie" | "series";
  backdropUrl: string;
  posterUrl: string;
  // Movies — direct
  videoUrl?: string;
  runtime?: string;
  // Series — episodes
  episodes?: Episode[];
}

const thumb = (seed: number) =>
  `https://picsum.photos/seed/${seed}/480/270`;

const still = (seed: number) =>
  `https://picsum.photos/seed/${seed}/1920/1080`;

// ─── Watchable catalogue ──────────────────────
export const watchables: Watchable[] = [
  // ── Series ──
  {
    titleSlug: "iron-horizon",
    titleName: "Iron Horizon",
    type: "series",
    backdropUrl: still(100),
    posterUrl: `https://picsum.photos/seed/100/600/900`,
    episodes: [
      {
        id: "ih-s1e1", number: 1, season: 1,
        title: "Pilot: The Signal",
        description: "A routine recon mission goes wrong when Kael discovers a frequency no one was supposed to find.",
        runtime: "54 min", thumbnailUrl: thumb(1010), stillUrl: still(1010),
        videoUrl: SAMPLE_VIDEOS.a,
      },
      {
        id: "ih-s1e2", number: 2, season: 1,
        title: "Dead Air",
        description: "With the signal growing louder, Kael must choose between orders and truth.",
        runtime: "47 min", thumbnailUrl: thumb(1011), stillUrl: still(1011),
        videoUrl: SAMPLE_VIDEOS.b,
      },
      {
        id: "ih-s1e3", number: 3, season: 1,
        title: "The Architecture of Lies",
        description: "The corporation's real mission surfaces. Kael realizes he's been a pawn.",
        runtime: "51 min", thumbnailUrl: thumb(1012), stillUrl: still(1012),
        videoUrl: SAMPLE_VIDEOS.c,
      },
      {
        id: "ih-s1e4", number: 4, season: 1,
        title: "Horizon Protocol",
        description: "A fracture in the team forces a confrontation three years in the making.",
        runtime: "49 min", thumbnailUrl: thumb(1013), stillUrl: still(1013),
        videoUrl: SAMPLE_VIDEOS.d,
      },
      {
        id: "ih-s1e5", number: 5, season: 1,
        title: "Burn the Map",
        description: "Season finale. Nothing goes according to plan. Nothing ever does.",
        runtime: "62 min", thumbnailUrl: thumb(1014), stillUrl: still(1014),
        videoUrl: SAMPLE_VIDEOS.e,
      },
    ],
  },
  {
    titleSlug: "the-salt-sea",
    titleName: "The Salt Sea",
    type: "series",
    backdropUrl: still(200),
    posterUrl: `https://picsum.photos/seed/200/600/900`,
    episodes: [
      {
        id: "ss-s1e1", number: 1, season: 1,
        title: "The Drowning",
        description: "Detective Mara Osei returns home. The body in the harbour is only the beginning.",
        runtime: "48 min", thumbnailUrl: thumb(2010), stillUrl: still(2010),
        videoUrl: SAMPLE_VIDEOS.f,
      },
      {
        id: "ss-s1e2", number: 2, season: 1,
        title: "Salt and Silence",
        description: "Old rivalries surface. The town's silence has a shape.",
        runtime: "44 min", thumbnailUrl: thumb(2011), stillUrl: still(2011),
        videoUrl: SAMPLE_VIDEOS.a,
      },
      {
        id: "ss-s1e3", number: 3, season: 1,
        title: "Below the Tideline",
        description: "Evidence points to someone Mara trusts. She investigates anyway.",
        runtime: "46 min", thumbnailUrl: thumb(2012), stillUrl: still(2012),
        videoUrl: SAMPLE_VIDEOS.b,
      },
    ],
  },
  // ── Movies ──
  {
    titleSlug: "luminara",
    titleName: "Luminara",
    type: "movie",
    backdropUrl: still(300),
    posterUrl: `https://picsum.photos/seed/300/600/900`,
    videoUrl: SAMPLE_VIDEOS.f,
    runtime: "2h 7m",
  },
  {
    titleSlug: "bright-ruin",
    titleName: "Bright Ruin",
    type: "movie",
    backdropUrl: still(700),
    posterUrl: `https://picsum.photos/seed/700/600/900`,
    videoUrl: SAMPLE_VIDEOS.e,
    runtime: "1h 54m",
  },
  {
    titleSlug: "parallel-burns",
    titleName: "Parallel Burns",
    type: "movie",
    backdropUrl: still(410),
    posterUrl: `https://picsum.photos/seed/410/600/900`,
    videoUrl: SAMPLE_VIDEOS.a,
    runtime: "2h 22m",
  },
  {
    titleSlug: "dusk-runners",
    titleName: "Dusk Runners",
    type: "movie",
    backdropUrl: still(510),
    posterUrl: `https://picsum.photos/seed/510/600/900`,
    videoUrl: SAMPLE_VIDEOS.b,
    runtime: "1h 48m",
  },
  {
    titleSlug: "kingdom-of-ash",
    titleName: "Kingdom of Ash",
    type: "series",
    backdropUrl: still(400),
    posterUrl: `https://picsum.photos/seed/400/600/900`,
    episodes: [
      {
        id: "ka-s1e1", number: 1, season: 1,
        title: "The Three Thrones",
        description: "Three dynasties. One night. Everything changes.",
        runtime: "58 min", thumbnailUrl: thumb(4010), stillUrl: still(4010),
        videoUrl: SAMPLE_VIDEOS.c,
      },
      {
        id: "ka-s1e2", number: 2, season: 1,
        title: "Ash and Ambition",
        description: "The eldest heir makes a choice that cannot be undone.",
        runtime: "52 min", thumbnailUrl: thumb(4011), stillUrl: still(4011),
        videoUrl: SAMPLE_VIDEOS.d,
      },
    ],
  },
];

// ─── Helpers ──────────────────────────────────

export const getWatchable = (slug: string): Watchable | undefined =>
  watchables.find((w) => w.titleSlug === slug);

export const getEpisode = (slug: string, episodeId: string): Episode | undefined =>
  getWatchable(slug)?.episodes?.find((e) => e.id === episodeId);

export const getFirstEpisode = (slug: string): Episode | undefined =>
  getWatchable(slug)?.episodes?.[0];

export const getNextEpisode = (slug: string, currentId: string): Episode | undefined => {
  const episodes = getWatchable(slug)?.episodes;
  if (!episodes) return undefined;
  const idx = episodes.findIndex((e) => e.id === currentId);
  return idx >= 0 && idx < episodes.length - 1 ? episodes[idx + 1] : undefined;
};
