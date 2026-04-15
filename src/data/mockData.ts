export type Genre =
  | "Afro Cyberpunk"
  | "Mythology & Gods"
  | "Diaspora Stories"
  | "Folklore & the Ancient"
  | "Martial Worlds"
  | "Futures & Sci-Fi"
  | "Spirits & the Unseen"
  | "Coming of Age"
  | "Short Films";

export type ContentType = "movie" | "series";

export interface Title {
  id: string; slug: string; title: string; tagline: string;
  description: string; year: number; rating: string; score: number;
  runtime?: string; seasons?: number; genres: Genre[]; type: ContentType;
  backdropUrl: string; posterUrl: string; cast: string[];
  director?: string; studio: string;
  creatorHandle?: string;  // links to /creators/[handle]
  creatorName?: string;    // display name on cards
  isTrending?: boolean; isNew?: boolean; progress?: number;
}

// All images are locally hosted Firefly AI originals
const local = (name: string) => `/images/${name}.png`;

const IMG = {
  // ── All 15 titles now have Firefly AI originals ───────────────────
  ironHorizon:       { b: local("iron-horizon"),        p: local("iron-horizon") },
  luminara:          { b: local("luminara"),             p: local("luminara") },
  kingdomOfAsh:      { b: local("kingdom-of-ash"),      p: local("kingdom-of-ash") },
  ghostFrequency:    { b: local("ghost-frequency"),     p: local("ghost-frequency") },
  sovereign:         { b: local("sovereign"),            p: local("sovereign") },
  patientOnes:       { b: local("the-patient-ones"),    p: local("the-patient-ones") },
  brightRuin:        { b: local("bright-ruin"),          p: local("bright-ruin") },
  velvetUnderground: { b: local("velvet-underground"),   p: local("velvet-underground") },
  echoValley:        { b: local("echo-valley"),          p: local("echo-valley") },
  neonAtlas:         { b: local("neon-atlas"),           p: local("neon-atlas") },
  saltSea:           { b: local("the-salt-sea"),         p: local("the-salt-sea") },
  deepAtlas:         { b: local("deep-atlas"),           p: local("deep-atlas") },
  theLongDark:       { b: local("the-long-dark"),        p: local("the-long-dark") },
  parallelBurns:     { b: local("parallel-burns"),       p: local("parallel-burns") },
  duskRunners:       { b: local("dusk-runners"),         p: local("dusk-runners") },
};

export const titles: Title[] = [
  { id:"t001", slug:"iron-horizon", title:"Iron Horizon", tagline:"The future was always theirs to take.", description:"In a world fragmented by corporate wars, a disillusioned soldier discovers a conspiracy that reaches the highest echelons of power. Loyalty or survival. He can't have both.", year:2024, rating:"TV-MA", score:94, seasons:2, genres:["Afro Cyberpunk","Futures & Sci-Fi","Martial Worlds"], type:"series", backdropUrl:IMG.ironHorizon.b, posterUrl:IMG.ironHorizon.p, cast:["Idris Elba","Zendaya","Oscar Isaac"], director:"Nia DaCosta", studio:"ShangoMaji Originals", creatorHandle:"kofi-asante", creatorName:"Kofi Asante", isTrending:true },
  { id:"t002", slug:"the-salt-sea", title:"The Salt Sea", tagline:"Nothing stays buried forever.", description:"A tenacious detective returns to her coastal hometown to investigate a drowning, only to uncover secrets that have poisoned the community for decades.", year:2024, rating:"TV-MA", score:91, seasons:1, genres:["Diaspora Stories","Spirits & the Unseen"], type:"series", backdropUrl:IMG.saltSea.b, posterUrl:IMG.saltSea.p, cast:["Cate Blanchett","Mahershala Ali"], director:"Park Chan-wook", studio:"ShangoMaji Originals", creatorHandle:"amara-diallo", creatorName:"Amara Diallo", isTrending:true, isNew:true },
  { id:"t003", slug:"luminara", title:"Luminara", tagline:"Every star has a story.", description:"An astronaut on a solo deep-space mission starts receiving transmissions from a version of herself that shouldn't exist.", year:2023, rating:"PG-13", score:88, runtime:"2h 7m", genres:["Futures & Sci-Fi","Diaspora Stories"], type:"movie", backdropUrl:IMG.luminara.b, posterUrl:IMG.luminara.p, cast:["Florence Pugh","André Holland"], director:"Denis Villeneuve", studio:"ShangoMaji Films", creatorHandle:"nadia-osei", creatorName:"Nadia Osei", isTrending:true },
  { id:"t004", slug:"kingdom-of-ash", title:"Kingdom of Ash", tagline:"Empires rise and fall in a single night.", description:"A sweeping historical epic following three rival dynasties across three generations as they battle for dominance of the continent of Edara.", year:2024, rating:"TV-MA", score:97, seasons:3, genres:["Mythology & Gods","Martial Worlds"], type:"series", backdropUrl:IMG.kingdomOfAsh.b, posterUrl:IMG.kingdomOfAsh.p, cast:["Ncuti Gatwa","Anya Taylor-Joy","Pedro Pascal"], director:"Ridley Scott", studio:"ShangoMaji Originals", creatorHandle:"kofi-asante", creatorName:"Kofi Asante", isTrending:true },
  { id:"t005", slug:"ghost-frequency", title:"Ghost Frequency", tagline:"Tune in. Drop out. Wake up.", description:"A reclusive sound engineer picks up an impossible radio frequency that seems to broadcast from the near future.", year:2024, rating:"TV-14", score:86, seasons:1, genres:["Spirits & the Unseen","Futures & Sci-Fi"], type:"series", backdropUrl:IMG.ghostFrequency.b, posterUrl:IMG.ghostFrequency.p, cast:["Jodie Turner-Smith","Dev Patel"], director:"Jordan Peele", studio:"ShangoMaji Originals", creatorHandle:"zion-campbell", creatorName:"Zion Campbell", isNew:true },
  { id:"t006", slug:"velvet-underground", title:"Velvet Underground", tagline:"Jazz, crime, and too much ambition.", description:"1970s New Orleans. A jazz prodigy gets entangled with a syndicate that runs the city's shadow economy.", year:2023, rating:"TV-MA", score:92, seasons:2, genres:["Diaspora Stories","Martial Worlds"], type:"series", backdropUrl:IMG.velvetUnderground.b, posterUrl:IMG.velvetUnderground.p, cast:["Jonathan Majors","Lupita Nyong'o"], director:"Barry Jenkins", studio:"ShangoMaji Originals", creatorHandle:"amara-diallo", creatorName:"Amara Diallo" },
  { id:"t007", slug:"bright-ruin", title:"Bright Ruin", tagline:"Love is the most dangerous thing.", description:"Two strangers meet on the last ferry out of a city under siege, and over 48 hours must decide whether what they feel for each other is worth surviving for.", year:2024, rating:"R", score:83, runtime:"1h 54m", genres:["Diaspora Stories","Coming of Age"], type:"movie", backdropUrl:IMG.brightRuin.b, posterUrl:IMG.brightRuin.p, cast:["Saoirse Ronan","Paul Mescal"], director:"Céline Sciamma", studio:"ShangoMaji Films", creatorHandle:"nadia-osei", creatorName:"Nadia Osei" },
  { id:"t008", slug:"deep-atlas", title:"Deep Atlas", tagline:"The ocean keeps its secrets.", description:"A landmark documentary series exploring the least-charted regions of Earth's oceans.", year:2024, rating:"G", score:98, seasons:1, genres:["Folklore & the Ancient","Futures & Sci-Fi"], type:"series", backdropUrl:IMG.deepAtlas.b, posterUrl:IMG.deepAtlas.p, cast:[], studio:"ShangoMaji Docs", isNew:true },
  { id:"t009", slug:"the-long-dark", title:"The Long Dark", tagline:"Winter has always been the enemy.", description:"When a small Arctic research station loses contact with the outside world, its crew must survive increasingly terrifying nights in total isolation.", year:2023, rating:"TV-MA", score:89, seasons:1, genres:["Spirits & the Unseen","Diaspora Stories"], type:"series", backdropUrl:IMG.theLongDark.b, posterUrl:IMG.theLongDark.p, cast:["Rebecca Ferguson","Rami Malek"], director:"Alex Garland", studio:"ShangoMaji Originals", creatorHandle:"zion-campbell", creatorName:"Zion Campbell" },
  { id:"t010", slug:"neon-atlas", title:"Neon Atlas", tagline:"The city never sleeps. Neither do they.", description:"An animated adult anthology set in a sprawling cyberpunk city. Each episode follows a different resident whose lives collide on one chaotic night.", year:2024, rating:"TV-MA", score:90, seasons:2, genres:["Afro Cyberpunk","Futures & Sci-Fi"], type:"series", backdropUrl:IMG.neonAtlas.b, posterUrl:IMG.neonAtlas.p, cast:[], studio:"ShangoMaji Animation", creatorHandle:"kofi-asante", creatorName:"Kofi Asante", isTrending:true },
  { id:"t011", slug:"sovereign", title:"Sovereign", tagline:"Power is inherited. Survival is earned.", description:"Following the sudden death of a beloved prime minister, his estranged children fight a ruthless succession war while a shadowy opposition circles.", year:2023, rating:"TV-MA", score:96, seasons:3, genres:["Mythology & Gods","Diaspora Stories"], type:"series", backdropUrl:IMG.sovereign.b, posterUrl:IMG.sovereign.p, cast:["Viola Davis","Chiwetel Ejiofor","Tilda Swinton"], director:"Steve McQueen", studio:"ShangoMaji Originals", creatorHandle:"amara-diallo", creatorName:"Amara Diallo", progress:65 },
  { id:"t012", slug:"echo-valley", title:"Echo Valley", tagline:"Small town. Massive secret.", description:"When a teenager in a quiet mountain town starts hearing voices from the local dam, she uncovers a 50-year-old cover-up.", year:2024, rating:"TV-14", score:85, seasons:1, genres:["Spirits & the Unseen","Coming of Age"], type:"series", backdropUrl:IMG.echoValley.b, posterUrl:IMG.echoValley.p, cast:["Storm Reid","Jeffrey Wright"], studio:"ShangoMaji Originals", creatorHandle:"nadia-osei", creatorName:"Nadia Osei", isNew:true, progress:30 },
  { id:"t013", slug:"parallel-burns", title:"Parallel Burns", tagline:"Two timelines. One impossible choice.", description:"A quantum physicist accidentally opens a channel to a parallel timeline and discovers her counterpart is asking for help to prevent a catastrophe.", year:2024, rating:"PG-13", score:87, runtime:"2h 22m", genres:["Futures & Sci-Fi","Diaspora Stories"], type:"movie", backdropUrl:IMG.parallelBurns.b, posterUrl:IMG.parallelBurns.p, cast:["Janelle Monáe","Himesh Patel"], director:"Taika Waititi", studio:"ShangoMaji Films", creatorHandle:"kofi-asante", creatorName:"Kofi Asante", progress:80 },
  { id:"t014", slug:"dusk-runners", title:"Dusk Runners", tagline:"Race like your life depends on it.", description:"An underdog crew enters the galaxy's most dangerous underground race across three planets, using a salvaged ship that shouldn't still be flying.", year:2023, rating:"PG", score:79, runtime:"1h 48m", genres:["Futures & Sci-Fi","Martial Worlds"], type:"movie", backdropUrl:IMG.duskRunners.b, posterUrl:IMG.duskRunners.p, cast:["John Boyega","Awkwafina","Stephan James"], director:"Boots Riley", studio:"ShangoMaji Films", creatorHandle:"zion-campbell", creatorName:"Zion Campbell" },
  { id:"t015", slug:"the-patient-ones", title:"The Patient Ones", tagline:"Justice waits for no one. Revenge waits forever.", description:"Five families, wronged by the same powerful man 20 years ago, silently reunite to finally make him pay. With devastating precision.", year:2024, rating:"TV-MA", score:93, seasons:1, genres:["Diaspora Stories","Martial Worlds"], type:"series", backdropUrl:IMG.patientOnes.b, posterUrl:IMG.patientOnes.p, cast:["Angela Bassett","Aldis Hodge","Gugu Mbatha-Raw"], director:"Antoine Fuqua", studio:"ShangoMaji Originals", creatorHandle:"amara-diallo", creatorName:"Amara Diallo", isTrending:true },
];

export const getTitleBySlug = (slug: string) => titles.find((t) => t.slug === slug);
export const getTrending = () => titles.filter((t) => t.isTrending);
export const getNewReleases = () => titles.filter((t) => t.isNew);
export const getContinueWatching = () => titles.filter((t) => t.progress !== undefined);
export const getMyList = () => titles.slice(3, 9);
export const getWatchHistory = () => titles.slice(6, 14);
export const getByGenre = (genre: Genre) => titles.filter((t) => t.genres.includes(genre));
export const getOriginals = () => titles.filter((t) => t.studio === "ShangoMaji Originals");
export const searchTitles = (query: string) => {
  const q = query.toLowerCase();
  return titles.filter((t) =>
    t.title.toLowerCase().includes(q) ||
    t.description.toLowerCase().includes(q) ||
    t.genres.some((g) => g.toLowerCase().includes(q)) ||
    t.cast.some((c) => c.toLowerCase().includes(q))
  );
};
export const allGenres: Genre[] = [
  "Afro Cyberpunk","Mythology & Gods","Diaspora Stories",
  "Folklore & the Ancient","Martial Worlds","Futures & Sci-Fi",
  "Spirits & the Unseen","Coming of Age","Short Films",
];
