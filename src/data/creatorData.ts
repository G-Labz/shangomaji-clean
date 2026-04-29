// ─────────────────────────────────────────────
//  ShangoMaji — Creator Mock Data
//  Replace with real DB queries when backend is ready
// ─────────────────────────────────────────────

export interface CreatorStat {
  label: string;
  value: string;
}

export interface CreatorTitle {
  id: string;
  slug: string;
  title: string;
  posterUrl: string;
  backdropUrl: string;
  year: number;
  type: "series" | "movie" | "short";
  genres: string[];
  description: string;
  episodes?: number;
  runtime?: string;
}

export interface Creator {
  id: string;
  handle: string;
  name: string;
  tagline: string;
  bio: string;
  origin: string; // city, country
  avatarUrl: string;
  bannerUrl: string;
  genres: string[];
  influences: string[];
  stats: CreatorStat[];
  titles: CreatorTitle[];
  socialLinks: {
    instagram?: string;
    twitter?: string;
    youtube?: string;
    website?: string;
  };
  isVerified: boolean;
  isFeatured: boolean;
  joinedYear: number;
}

// ─── Image helpers ────────────────────────────
const pic = (seed: number, w: number, h: number) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

// ─── Creator Profiles ─────────────────────────
export const creators: Creator[] = [
  {
    id: "c001",
    handle: "kofi-asante",
    name: "Kofi Asante",
    tagline: "Building worlds where ancestors become gods.",
    bio: "Kofi is an animator and director based in London whose work draws from mythology, oral history, and the visual grammar of classic shonen anime. His debut series Nkrumah Rising was ShangoMaji's first commissioned original, blending hand-drawn aesthetics with digital compositing to create a style entirely his own. He has been building the world of Aurum — a neo-cyberpunk universe set 400 years after the colonisation of Mars — for over six years.",
    origin: "Accra, Ghana / London, UK",
    avatarUrl: pic(1001, 400, 400),
    bannerUrl: pic(1001, 1920, 600),
    genres: ["Mythology & Gods", "Martial Worlds", "Futures & Sci-Fi"],
    influences: ["Osamu Tezuka", "Jean-Michel Basquiat", "Hayao Miyazaki"],
    stats: [
      { label: "Followers", value: "42.8K" },
      { label: "Total Views", value: "1.2M" },
      { label: "Titles", value: "3" },
      { label: "Member Since", value: "2022" },
    ],
    titles: [
      {
        id: "ct001",
        slug: "nkrumah-rising",
        title: "Nkrumah Rising",
        posterUrl: pic(2001, 600, 900),
        backdropUrl: pic(2001, 1920, 1080),
        year: 2023,
        type: "series",
        genres: ["Martial Worlds", "Mythology & Gods"],
        description:
          "A young archivist in a neo-Accra discovers he carries the encoded memory of Africa's greatest leaders — and must awaken them before a colonial AI erases history forever.",
        episodes: 8,
      },
      {
        id: "ct002",
        slug: "aurum-zero",
        title: "Aurum: Zero",
        posterUrl: pic(2002, 600, 900),
        backdropUrl: pic(2002, 1920, 1080),
        year: 2024,
        type: "short",
        genres: ["Futures & Sci-Fi"],
        description:
          "A prequel short film to the Aurum universe. One woman. One decision. The beginning of a 400-year war.",
        runtime: "22 min",
      },
    ],
    socialLinks: {
      instagram: "https://instagram.com",
      twitter: "https://twitter.com",
      website: "https://example.com",
    },
    isVerified: true,
    isFeatured: true,
    joinedYear: 2022,
  },
  {
    id: "c002",
    handle: "amara-diallo",
    name: "Amara Diallo",
    tagline: "Folklore is the original science fiction.",
    bio: "Amara is a writer and visual director from Atlanta whose creative practice sits at the intersection of oral tradition and contemporary anime narrative structure. Her anthology series Griots of the Infinite reimagines ancient storytelling as an interconnected mythological universe with the scope of a prestige drama. She is one of the most distinctive voices in the current wave of original animation.",
    origin: "Dakar, Senegal / Atlanta, USA",
    avatarUrl: pic(1002, 400, 400),
    bannerUrl: pic(1002, 1920, 600),
    genres: ["Mythology & Gods", "Spirits & the Unseen"],
    influences: ["Naoki Urasawa", "Toni Morrison", "Moebius"],
    stats: [
      { label: "Followers", value: "31.4K" },
      { label: "Total Views", value: "890K" },
      { label: "Titles", value: "2" },
      { label: "Member Since", value: "2023" },
    ],
    titles: [
      {
        id: "ct003",
        slug: "griots-of-the-infinite",
        title: "Griots of the Infinite",
        posterUrl: pic(2003, 600, 900),
        backdropUrl: pic(2003, 1920, 1080),
        year: 2023,
        type: "series",
        genres: ["Mythology & Gods", "Spirits & the Unseen"],
        description:
          "Six griots from across West Africa's mythological timeline each carry a piece of the universe's founding story — and must find each other before the void consumes the world.",
        episodes: 12,
      },
      {
        id: "ct004",
        slug: "sunu-gaal",
        title: "Sunu Gaal",
        posterUrl: pic(2004, 600, 900),
        backdropUrl: pic(2004, 1920, 1080),
        year: 2024,
        type: "short",
        genres: ["Spirits & the Unseen"],
        description:
          "A standalone short about a fishing village where the sea has begun speaking — and only the oldest woman knows what it is saying.",
        runtime: "18 min",
      },
    ],
    socialLinks: {
      instagram: "https://instagram.com",
      youtube: "https://youtube.com",
    },
    isVerified: true,
    isFeatured: true,
    joinedYear: 2023,
  },
  {
    id: "c003",
    handle: "zion-campbell",
    name: "Zion Campbell",
    tagline: "Kingston to the cosmos. No passport required.",
    bio: "Zion is an animator and composer from Kingston whose work fuses ritual music, the kinetic visual energy of classic action anime, and electronic production into something entirely unclassifiable. His series Duppy Wars broke through with hand-animated fight sequences and a score built from drum traditions reconstructed through digital synthesis. He scores everything he directs.",
    origin: "Kingston, Jamaica",
    avatarUrl: pic(1003, 400, 400),
    bannerUrl: pic(1003, 1920, 600),
    genres: ["Martial Worlds", "Spirits & the Unseen"],
    influences: ["Yoshiaki Kawajiri", "Lee 'Scratch' Perry", "Akira Toriyama"],
    stats: [
      { label: "Followers", value: "58.2K" },
      { label: "Total Views", value: "2.1M" },
      { label: "Titles", value: "2" },
      { label: "Member Since", value: "2022" },
    ],
    titles: [
      {
        id: "ct005",
        slug: "duppy-wars",
        title: "Duppy Wars",
        posterUrl: pic(2005, 600, 900),
        backdropUrl: pic(2005, 1920, 1080),
        year: 2023,
        type: "series",
        genres: ["Martial Worlds", "Spirits & the Unseen"],
        description:
          "When a Kingston teenager accidentally opens a portal to the realm of duppies, she must train under a rogue spirit warrior to prevent the dead from reclaiming the living world.",
        episodes: 10,
      },
      {
        id: "ct006",
        slug: "irie-protocol",
        title: "Irie Protocol",
        posterUrl: pic(2006, 600, 900),
        backdropUrl: pic(2006, 1920, 1080),
        year: 2024,
        type: "short",
        genres: ["Futures & Sci-Fi", "Martial Worlds"],
        description:
          "A near-future Kingston where Rastafari philosophy has become the governing code of the city's AI infrastructure — until someone tries to delete it.",
        runtime: "28 min",
      },
    ],
    socialLinks: {
      instagram: "https://instagram.com",
      twitter: "https://twitter.com",
      youtube: "https://youtube.com",
      website: "https://example.com",
    },
    isVerified: true,
    isFeatured: false,
    joinedYear: 2022,
  },
  {
    id: "c004",
    handle: "nadia-osei",
    name: "Nadia Osei",
    tagline: "Every scar is a story that survived.",
    bio: "Nadia is a director and graphic novelist from Toronto whose visual language draws from ancestral visual traditions, the aesthetics of 90s OVA anime, and the emotional depth of literary fiction. Her debut feature The Weight of Ori is considered one of the most striking pieces of animation on ShangoMaji — a deeply personal meditation on identity, spiritual inheritance, and belonging told through a visual style of extraordinary precision.",
    origin: "Lagos, Nigeria / Toronto, Canada",
    avatarUrl: pic(1004, 400, 400),
    bannerUrl: pic(1004, 1920, 600),
    genres: ["Spirits & the Unseen", "Coming of Age"],
    influences: ["Satoshi Kon", "Chimamanda Ngozi Adichie", "Katsuhiro Otomo"],
    stats: [
      { label: "Followers", value: "24.6K" },
      { label: "Total Views", value: "670K" },
      { label: "Titles", value: "1" },
      { label: "Member Since", value: "2023" },
    ],
    titles: [
      {
        id: "ct007",
        slug: "the-weight-of-ori",
        title: "The Weight of Ori",
        posterUrl: pic(2007, 600, 900),
        backdropUrl: pic(2007, 1920, 1080),
        year: 2024,
        type: "movie",
        genres: ["Spirits & the Unseen", "Coming of Age"],
        description:
          "A second-generation Nigerian-Canadian teenager begins receiving visions from her Ori — her spiritual self — demanding she confront the inherited trauma her family has never spoken aloud.",
        runtime: "1h 38m",
      },
    ],
    socialLinks: {
      instagram: "https://instagram.com",
      website: "https://example.com",
    },
    isVerified: true,
    isFeatured: false,
    joinedYear: 2023,
  },
];

// ─── Helpers ──────────────────────────────────

export const getCreatorByHandle = (handle: string): Creator | undefined =>
  creators.find((c) => c.handle === handle);

export const getFeaturedCreators = (): Creator[] =>
  creators.filter((c) => c.isFeatured);

export const getAllCreators = (): Creator[] => creators;
