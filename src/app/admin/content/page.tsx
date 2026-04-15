"use client";

import { useState } from "react";
import {
  ChevronDown,
  ExternalLink,
  Film,
  ImageIcon,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";

// ─── Mock data (replace with Supabase when backend connects) ─────
interface ContentSubmission {
  id: string;
  submittedAt: string;
  status: "pending" | "approved" | "needs-revision";
  projectTitle: string;
  projectType: string;
  genres: string[];
  logline: string;
  synopsis: string;
  language: string;
  region: string;
  posterFile: string;
  bannerFile: string;
  trailerUrl: string;
  videoUrl: string;
  episodeCount: string;
  creatorName: string;
  publicHandle: string;
  creatorBio: string;
  instagram: string;
  twitter: string;
  youtube: string;
  website: string;
  releaseStatus: string;
  releaseYear: string;
  matureContent: boolean;
}

const MOCK_SUBMISSIONS: ContentSubmission[] = [
  {
    id: "1",
    submittedAt: "2025-03-24T18:00:00Z",
    status: "pending",
    projectTitle: "Orisha Protocol",
    projectType: "series",
    genres: ["Afro Cyberpunk", "Mythology", "Sci-Fi"],
    logline: "In a Lagos rebuilt by AI gods, a rogue priestess must hack the divine network before it rewrites humanity.",
    synopsis: "Set in 2087 Lagos, the Orisha Protocol follows Adaeze, a former temple coder who discovers that the AI entities governing West Africa's megacities are corrupted versions of Yoruba deities...",
    language: "English, Yoruba",
    region: "Nigeria",
    posterFile: "orisha-protocol-poster.jpg",
    bannerFile: "orisha-protocol-banner.jpg",
    trailerUrl: "https://youtube.com/watch?v=example",
    videoUrl: "",
    episodeCount: "12 episodes",
    creatorName: "Chidi Okonkwo",
    publicHandle: "chidi_creates",
    creatorBio: "Lagos-based animator and storyteller. Former lead at Studio Kugali.",
    instagram: "chidi_creates",
    twitter: "chidi_creates",
    youtube: "",
    website: "https://chidiokonkwo.com",
    releaseStatus: "in-production",
    releaseYear: "2025",
    matureContent: true,
  },
  {
    id: "2",
    submittedAt: "2025-03-22T10:00:00Z",
    status: "approved",
    projectTitle: "Carnival Spirits",
    projectType: "short",
    genres: ["Caribbean Folklore", "Fantasy", "Coming of Age"],
    logline: "During Trinidad Carnival, a teen discovers she can see the jumbie spirits hiding inside the masquerade costumes.",
    synopsis: "Sixteen-year-old Kezia has always felt out of place at Carnival. But this year, after her grandmother passes, she begins seeing the real spirits...",
    language: "English, Trinidadian Creole",
    region: "Trinidad & Tobago",
    posterFile: "carnival-spirits-poster.png",
    bannerFile: "carnival-spirits-banner.png",
    trailerUrl: "https://vimeo.com/example",
    videoUrl: "https://vimeo.com/example-full",
    episodeCount: "22 min",
    creatorName: "Ayanna Pierre",
    publicHandle: "ayanna_p",
    creatorBio: "Trinidadian filmmaker. Sundance '24 short film lab alumna.",
    instagram: "ayanna_p",
    twitter: "",
    youtube: "ayannapierre",
    website: "",
    releaseStatus: "completed",
    releaseYear: "2024",
    matureContent: false,
  },
  {
    id: "3",
    submittedAt: "2025-03-20T14:30:00Z",
    status: "needs-revision",
    projectTitle: "Dust Walker",
    projectType: "manga",
    genres: ["Historical", "Action", "Spiritual"],
    logline: "A Saharan nomad discovers an ancient sword that binds him to a dying war god.",
    synopsis: "In pre-colonial West Africa, Issa is a trader's son who stumbles into the tomb of Ogun's last champion...",
    language: "English",
    region: "Mali / USA",
    posterFile: "",
    bannerFile: "",
    trailerUrl: "",
    videoUrl: "",
    episodeCount: "48 chapters",
    creatorName: "Marcus Diallo",
    publicHandle: "dustwalker_art",
    creatorBio: "Malian-American manga artist based in Atlanta.",
    instagram: "dustwalker_art",
    twitter: "dustwalker_art",
    youtube: "",
    website: "https://dustwalker.art",
    releaseStatus: "in-production",
    releaseYear: "2025",
    matureContent: true,
  },
];

export default function AdminContentPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [submissions, setSubmissions] = useState<ContentSubmission[]>(MOCK_SUBMISSIONS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "needs-revision">("all");

  // TODO: Replace with real auth when backend is connected
  function login() {
    setLoading(true);
    setTimeout(() => {
      if (password === "preview") {
        setAuthed(true);
      } else {
        setError("Wrong password. Use 'preview' for demo access.");
      }
      setLoading(false);
    }, 500);
  }

  function updateStatus(id: string, status: ContentSubmission["status"]) {
    setSubmissions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s))
    );
  }

  const filtered =
    filter === "all" ? submissions : submissions.filter((s) => s.status === filter);

  const counts = {
    all: submissions.length,
    pending: submissions.filter((s) => s.status === "pending").length,
    approved: submissions.filter((s) => s.status === "approved").length,
    "needs-revision": submissions.filter((s) => s.status === "needs-revision").length,
  };

  const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    pending: {
      color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      icon: <Clock size={11} />,
      label: "Pending",
    },
    approved: {
      color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      icon: <CheckCircle2 size={11} />,
      label: "Approved",
    },
    "needs-revision": {
      color: "bg-orange-500/20 text-orange-400 border-orange-500/30",
      icon: <AlertTriangle size={11} />,
      label: "Needs Revision",
    },
  };

  // ── Password gate ──
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <h1
              className="text-2xl font-semibold text-white tracking-wide"
              style={{ fontFamily: "var(--font-display)" }}
            >
              SHANGOMAJI
            </h1>
            <p className="text-sm text-neutral-500 mt-1">Content Review</p>
          </div>
          <div className="space-y-3">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && login()}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500/50 transition"
            />
            <button
              onClick={login}
              disabled={loading || !password}
              className="w-full py-3 rounded-lg font-medium text-sm transition"
              style={{
                background: "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)",
                color: "#000",
                opacity: loading || !password ? 0.5 : 1,
              }}
            >
              {loading ? "Checking..." : "Enter"}
            </button>
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          </div>
        </div>
      </div>
    );
  }

  // ── Dashboard ──
  return (
    <div className="min-h-screen px-4 py-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            className="text-2xl font-semibold text-white tracking-wide"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Content Review
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            {submissions.length} project submissions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/admin"
            className="text-xs text-neutral-500 hover:text-white transition px-3 py-1.5 rounded-md hover:bg-white/5"
          >
            Applications
          </a>
          <button
            onClick={() => { setAuthed(false); setPassword(""); }}
            className="text-xs text-neutral-500 hover:text-white transition"
          >
            Lock
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(["all", "pending", "approved", "needs-revision"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
              filter === f
                ? "bg-white/10 text-white"
                : "text-neutral-500 hover:text-white hover:bg-white/5"
            }`}
          >
            {f === "needs-revision" ? "Needs Revision" : f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
          </button>
        ))}
      </div>

      {/* Content cards */}
      {filtered.length === 0 ? (
        <p className="text-neutral-500 text-sm">No submissions found.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((sub) => {
            const sc = statusConfig[sub.status];
            return (
              <div
                key={sub.id}
                className="border border-white/8 rounded-lg bg-white/[0.02] overflow-hidden"
              >
                {/* Summary row */}
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-white/[0.03] transition"
                  onClick={() => setExpanded(expanded === sub.id ? null : sub.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="text-white font-medium text-sm">{sub.projectTitle}</span>
                      <span className="text-neutral-500 text-xs">{sub.projectType}</span>
                      {sub.matureContent && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/20">
                          18+
                        </span>
                      )}
                    </div>
                    <p className="text-neutral-400 text-xs mt-0.5 truncate">
                      {sub.creatorName} · @{sub.publicHandle}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded border ${sc.color}`}>
                      {sc.icon}
                      {sc.label}
                    </span>
                    <span className="text-neutral-600 text-xs">
                      {new Date(sub.submittedAt).toLocaleDateString()}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-neutral-500 transition-transform ${
                        expanded === sub.id ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </div>

                {/* Expanded detail */}
                {expanded === sub.id && (
                  <div className="px-5 pb-5 border-t border-white/5 pt-4">
                    {/* Logline callout */}
                    <div className="p-4 rounded-xl bg-surface-raised border border-white/5 mb-5">
                      <p className="text-xs text-neutral-500 mb-1">Logline</p>
                      <p className="text-white text-sm leading-relaxed">{sub.logline}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <DetailField label="Genres" value={sub.genres.join(", ")} />
                      <DetailField label="Language" value={sub.language} />
                      <DetailField label="Region" value={sub.region} />
                      <DetailField label="Episodes / Runtime" value={sub.episodeCount} />
                      <DetailField label="Release Status" value={sub.releaseStatus} />
                      <DetailField label="Release Year" value={sub.releaseYear} />
                      <DetailField label="Synopsis" value={sub.synopsis} full />

                      {/* Media assets section */}
                      <div className="md:col-span-2 mt-2">
                        <p className="text-xs text-neutral-500 mb-3 uppercase tracking-wider">Media Assets</p>
                        <div className="flex flex-wrap gap-3">
                          <AssetBadge icon={<ImageIcon size={12} />} label="Poster" value={sub.posterFile} />
                          <AssetBadge icon={<ImageIcon size={12} />} label="Banner" value={sub.bannerFile} />
                          <AssetBadge icon={<Film size={12} />} label="Trailer" value={sub.trailerUrl} link />
                          <AssetBadge icon={<Film size={12} />} label="Video" value={sub.videoUrl} link />
                        </div>
                      </div>

                      {/* Creator info */}
                      <div className="md:col-span-2 mt-2">
                        <p className="text-xs text-neutral-500 mb-3 uppercase tracking-wider">Creator</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <DetailField label="Bio" value={sub.creatorBio} full />
                          {sub.instagram && (
                            <DetailField label="Instagram" value={`instagram.com/${sub.instagram}`} link />
                          )}
                          {sub.twitter && (
                            <DetailField label="X / Twitter" value={`x.com/${sub.twitter}`} link />
                          )}
                          {sub.youtube && (
                            <DetailField label="YouTube" value={`youtube.com/${sub.youtube}`} link />
                          )}
                          {sub.website && <DetailField label="Website" value={sub.website} link />}
                        </div>
                      </div>
                    </div>

                    {/* Status controls */}
                    <div className="mt-5 pt-4 border-t border-white/5 flex items-center gap-2">
                      <span className="text-xs text-neutral-500 mr-2">Set status:</span>
                      {(["pending", "approved", "needs-revision"] as const).map((s) => {
                        const cfg = statusConfig[s];
                        return (
                          <button
                            key={s}
                            onClick={() => updateStatus(sub.id, s)}
                            className={`px-3 py-1.5 rounded text-xs font-medium border transition ${
                              sub.status === s
                                ? cfg.color
                                : "border-white/10 text-neutral-500 hover:text-white hover:border-white/20"
                            }`}
                          >
                            {cfg.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DetailField({
  label,
  value,
  full,
  link,
}: {
  label: string;
  value?: string;
  full?: boolean;
  link?: boolean;
}) {
  if (!value) return null;
  const href = link
    ? value.startsWith("http") ? value : `https://${value}`
    : undefined;

  return (
    <div className={full ? "md:col-span-2" : ""}>
      <p className="text-neutral-500 text-xs mb-0.5">{label}</p>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-orange-400 hover:text-orange-300 text-sm underline underline-offset-2 break-all inline-flex items-center gap-1"
        >
          {value}
          <ExternalLink size={10} />
        </a>
      ) : (
        <p className="text-white text-sm whitespace-pre-wrap">{value}</p>
      )}
    </div>
  );
}

function AssetBadge({
  icon,
  label,
  value,
  link,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  link?: boolean;
}) {
  const present = !!value;
  const content = (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition ${
        present
          ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
          : "border-white/8 bg-white/[0.02] text-neutral-500"
      }`}
    >
      {icon}
      <span>{label}</span>
      {present && link && <ExternalLink size={9} />}
      {!present && <XCircle size={10} className="text-neutral-600" />}
    </div>
  );

  if (present && link) {
    const href = value.startsWith("http") ? value : `https://${value}`;
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }

  return content;
}
