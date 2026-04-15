"use client";

import { useState } from "react";

interface Application {
  id: string;
  submitted_at: string;
  status: string;
  name: string;
  handle: string;
  email: string;
  origin: string;
  project_title: string;
  project_type: string;
  genres: string[];
  logline: string;
  sample_url: string;
  influences: string;
  why_shangomaji: string;
  what_you_need: string;
  instagram: string;
  twitter: string;
  youtube: string;
  website: string;
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "accepted" | "rejected">("all");

  const headers = { "x-admin-password": password };

  async function login() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/applications", { headers });
      if (!res.ok) throw new Error("Wrong password");
      const data = await res.json();
      setApplications(data.applications);
      setAuthed(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    try {
      const res = await fetch("/api/admin/applications", {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error("Update failed");
      setApplications((prev) =>
        prev.map((app) => (app.id === id ? { ...app, status } : app))
      );
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function deleteApplication(id: string) {
    if (!confirm("Delete this application permanently?")) return;
    try {
      const res = await fetch("/api/admin/applications", {
        method: "DELETE",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Delete failed");
      setApplications((prev) => prev.filter((app) => app.id !== id));
      setExpanded(null);
    } catch (e: any) {
      alert(e.message);
    }
  }

  const filtered = filter === "all" ? applications : applications.filter((a) => a.status === filter);

  const counts = {
    all: applications.length,
    pending: applications.filter((a) => a.status === "pending").length,
    accepted: applications.filter((a) => a.status === "accepted").length,
    rejected: applications.filter((a) => a.status === "rejected").length,
  };

  const statusColor: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    accepted: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    rejected: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  // ── Password gate ──
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-white tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
              SHANGOMAJI
            </h1>
            <p className="text-sm text-neutral-500 mt-1">Admin</p>
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
          <h1 className="text-2xl font-semibold text-white tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
            Creator Applications
          </h1>
          <p className="text-sm text-neutral-500 mt-1">{applications.length} total submissions</p>
        </div>
        <button
          onClick={() => { setAuthed(false); setPassword(""); }}
          className="text-xs text-neutral-500 hover:text-white transition"
        >
          Lock
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(["all", "pending", "accepted", "rejected"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
              filter === f
                ? "bg-white/10 text-white"
                : "text-neutral-500 hover:text-white hover:bg-white/5"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
          </button>
        ))}
      </div>

      {/* Applications */}
      {filtered.length === 0 ? (
        <p className="text-neutral-500 text-sm">No applications found.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((app) => (
            <div
              key={app.id}
              className="border border-white/8 rounded-lg bg-white/[0.02] overflow-hidden"
            >
              {/* Row summary */}
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-white/[0.03] transition"
                onClick={() => setExpanded(expanded === app.id ? null : app.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="text-white font-medium text-sm">{app.name || "—"}</span>
                    {app.handle && (
                      <span className="text-neutral-500 text-xs">@{app.handle}</span>
                    )}
                  </div>
                  <p className="text-neutral-400 text-xs mt-0.5 truncate">
                    {app.project_title || "No project title"} · {app.project_type || "—"}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-[11px] px-2 py-0.5 rounded border ${statusColor[app.status] || "text-neutral-400"}`}>
                    {app.status}
                  </span>
                  <span className="text-neutral-600 text-xs">
                    {new Date(app.submitted_at).toLocaleDateString()}
                  </span>
                  <svg
                    className={`w-4 h-4 text-neutral-500 transition-transform ${expanded === app.id ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Expanded detail */}
              {expanded === app.id && (
                <div className="px-5 pb-5 border-t border-white/5 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <Field label="Email" value={app.email} />
                    <Field label="Origin" value={app.origin} />
                    <Field label="Project Type" value={app.project_type} />
                    <Field label="Genres" value={app.genres?.join(", ")} />
                    <Field label="Logline" value={app.logline} full />
                    <Field label="Sample URL" value={app.sample_url} link />
                    <Field label="Influences" value={app.influences} full />
                    <Field label="Why ShangoMaji" value={app.why_shangomaji} full />
                    <Field label="What They Need" value={app.what_you_need} full />
                    <Field label="Instagram" value={app.instagram ? `instagram.com/${app.instagram}` : undefined} link />
                    <Field label="X / Twitter" value={app.twitter ? `x.com/${app.twitter}` : undefined} link />
                    <Field label="YouTube" value={app.youtube ? `youtube.com/${app.youtube}` : undefined} link />
                    <Field label="Website" value={app.website} link />
                  </div>

                  {/* Status controls */}
                  <div className="mt-5 pt-4 border-t border-white/5 flex items-center gap-2">
                    <span className="text-xs text-neutral-500 mr-2">Set status:</span>
                    {["pending", "accepted", "rejected"].map((s) => (
                      <button
                        key={s}
                        onClick={() => updateStatus(app.id, s)}
                        className={`px-3 py-1.5 rounded text-xs font-medium border transition ${
                          app.status === s
                            ? statusColor[s]
                            : "border-white/10 text-neutral-500 hover:text-white hover:border-white/20"
                        }`}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                    <div className="flex-1" />
                    <button
                      onClick={() => deleteApplication(app.id)}
                      className="px-3 py-1.5 rounded text-xs font-medium border border-red-500/20 text-red-400/60 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/10 transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, full, link }: { label: string; value?: string; full?: boolean; link?: boolean }) {
  if (!value) return null;
  const href = link
    ? value.startsWith("http") ? value : `https://${value}`
    : undefined;

  return (
    <div className={full ? "md:col-span-2" : ""}>
      <p className="text-neutral-500 text-xs mb-0.5">{label}</p>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 text-sm underline underline-offset-2 break-all">
          {value}
        </a>
      ) : (
        <p className="text-white text-sm whitespace-pre-wrap">{value}</p>
      )}
    </div>
  );
}
