"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import type { TitleSummary } from "@/lib/title-summaries";
import { PosterArt } from "@/components/artwork/Artwork";
import { PageTitle } from "@/components/util/PageTitle";

// Phase 4 — Member Account page.
//
// Heading: "Member Account". No "Private Account" eyebrow, no "only you can
// see this page" privacy lecture — there are no public Member profiles, so
// the privacy framing is implicit. We add a compact saved-titles preview
// and a single last-watched item where data exists; both are honest empty
// states when not.

type MemberProfile = {
  email:        string;
  display_name: string | null;
  avatar_url:   string | null;
  created_at:   string;
  updated_at:   string;
};

type RecentProgress = {
  title:            TitleSummary;
  position_seconds: number;
  duration_seconds: number | null;
  completed:        boolean;
  last_watched_at:  string;
} | null;

export default function AccountPage() {
  const router   = useRouter();
  const supabase = createClient();

  // Phase 5 final correction — display name editing has been moved off this
  // page entirely, so `saving` / `displayName` / `savedMessage` are no longer
  // needed here. The overview just reads the profile.
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const [savedTitles, setSavedTitles] = useState<TitleSummary[] | null>(null);
  const [recent, setRecent]           = useState<RecentProgress>(null);

  async function loadProfile() {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/members/profile", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not load account");
      const p: MemberProfile | null = data.profile ?? null;
      setProfile(p);
    } catch (e: any) {
      setError(e?.message || "Could not load account");
    } finally {
      setLoading(false);
    }
  }

  async function loadSavedPreview() {
    try {
      const res = await fetch("/api/members/my-list", { cache: "no-store" });
      if (!res.ok) { setSavedTitles([]); return; }
      const data = await res.json();
      setSavedTitles(Array.isArray(data?.titles) ? data.titles.slice(0, 4) : []);
    } catch {
      setSavedTitles([]);
    }
  }

  async function loadRecent() {
    try {
      const res = await fetch("/api/members/progress?recent=1", { cache: "no-store" });
      if (!res.ok) { setRecent(null); return; }
      const data = await res.json();
      setRecent(data?.recent ?? null);
    } catch {
      setRecent(null);
    }
  }

  useEffect(() => {
    loadProfile();
    loadSavedPreview();
    loadRecent();
  }, []);

  // handleSaveName removed — display-name editing now lives on /account/settings.

  async function handleSignOut() {
    // Phase 5 fix — sign-out hygiene.
    //
    // signOut clears the Supabase session in memory and rewrites cookies.
    // Following up with a Next.js client-side router.replace can leave
    // hydrated state from this page mounted in memory, which contributed
    // to the "sign out → sign back in same tab" race the founder
    // observed. A full window.location nav guarantees:
    //   • the singleton supabase browser client is re-initialized,
    //   • cookies are committed before the next request,
    //   • the next /login mount starts from a clean slate.
    await supabase.auth.signOut();
    if (typeof window !== "undefined") {
      window.location.assign("/");
    } else {
      router.replace("/");
    }
  }

  if (loading) {
    return (
      <div style={center}>
        <p style={{ color: "rgba(255,255,255,0.45)" }}>Loading your account…</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={center}>
        <p style={{ color: "rgba(255,255,255,0.6)" }}>No account found.</p>
      </div>
    );
  }

  const memberSince = new Date(profile.created_at).toLocaleDateString("en-US", {
    year:  "numeric",
    month: "long",
  });

  return (
    <div style={page}>
      <PageTitle title="Account" />
      <div style={card}>
        <h1 style={heading}>Member Account</h1>
        <p style={lead}>Your saved titles live here.</p>

        {error && <div style={errorBox}>{error}</div>}
        {/* savedMessage banner removed in Phase 5 final correction —
            display-name save lives on /account/settings now. */}

        {/* Phase 5 — "Last watched" row hidden in this build.
            Honest playback time is not yet captured from Bunny; the
            current /api/members/progress beacon only proves a session
            was opened (position 0). Surfacing "Resume" or "Last watched"
            here would lie about engagement. The fetch + state are kept
            in place (loadRecent + recent) so the row can be revived
            once real position data is available. */}
        {false && recent && <></>}

        {/* ── My List preview ──────────────────────────────────────── */}
        <section style={section}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <h2 style={sectionHeading}>My List</h2>
            <Link href="/my-list" style={{ fontSize: 12, color: "rgba(245,197,24,0.85)", textDecoration: "none", fontWeight: 600 }}>
              See all →
            </Link>
          </div>
          {savedTitles && savedTitles.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
              {savedTitles.map((t) => (
                <Link key={t.titleId} href={`/title/${t.slug}`} style={{ display: "block", textDecoration: "none" }}>
                  <div style={{ position: "relative", aspectRatio: "2/3", borderRadius: 10, overflow: "hidden", background: "rgba(255,255,255,0.04)" }}>
                    <PosterArt
                      src={t.posterUrl}
                      alt={t.title}
                      title={t.title}
                      sizes="160px"
                    />
                  </div>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", margin: "6px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {t.title}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div
              style={{
                padding:      "16px 14px",
                borderRadius: 12,
                background:   "rgba(20,16,16,0.45)",
                border:       "1px solid rgba(255,255,255,0.06)",
                color:        "rgba(255,255,255,0.55)",
                fontSize:     13,
                lineHeight:   1.55,
              }}
            >
              Nothing saved yet.{" "}
              <Link href="/browse" style={{ color: "rgba(245,197,24,0.9)", textDecoration: "none", fontWeight: 600 }}>
                Browse Catalog →
              </Link>
            </div>
          )}
        </section>

        {/* ── Member profile ──────────────────────────────────────── */}
        {/* Phase 5 final correction — overview-only, not a form.
            Display name is read-only here; editing happens on
            /account/settings via the existing "Account settings" entry. */}
        <section style={section}>
          <h2 style={sectionHeading}>Member profile</h2>

          <div style={row}>
            <label style={label}>Email</label>
            <p style={readOnlyValue}>{profile.email}</p>
          </div>

          <div style={row}>
            <label style={label}>Display name</label>
            {profile.display_name && profile.display_name.trim() ? (
              <p style={readOnlyValue}>{profile.display_name}</p>
            ) : (
              <p style={{ ...readOnlyValue, color: "rgba(255,255,255,0.35)", fontStyle: "italic" }}>
                No display name set.
              </p>
            )}
          </div>
        </section>

        <section style={section}>
          <h2 style={sectionHeading}>Account</h2>
          <div style={kv}>
            <span style={kLabel}>Active Member since</span>
            <span style={kValue}>{memberSince}</span>
          </div>
        </section>

        <section style={section}>
          <h2 style={sectionHeading}>Settings</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <Link href="/account/settings" style={secondaryBtn}>Account settings</Link>
            <Link href="/reset-password" style={secondaryBtn}>Change password</Link>
            <button onClick={handleSignOut} style={signOutBtn}>Sign out</button>
          </div>
        </section>
      </div>
    </div>
  );
}

const center: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "60vh",
};
const page: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  minHeight: "75vh",
  padding: "3rem 1rem 4rem",
};
const card: React.CSSProperties = {
  width: "100%",
  maxWidth: 640,
  padding: "32px 28px 24px",
  borderRadius: 18,
  background: "rgba(20,16,16,0.85)",
  border: "1px solid rgba(255,255,255,0.08)",
};
const heading: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
  color: "white",
  margin: 0,
  lineHeight: 1.15,
};
const lead: React.CSSProperties = {
  fontSize: 13,
  color: "rgba(255,255,255,0.55)",
  margin: "8px 0 0",
};
const section: React.CSSProperties = {
  marginTop: 28,
  paddingTop: 24,
  borderTop: "1px solid rgba(255,255,255,0.06)",
};
const sectionHeading: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.45)",
  margin: "0 0 16px",
};
const row: React.CSSProperties = { marginBottom: 14 };
const label: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.55)",
  marginBottom: 6,
};
const input: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(0,0,0,0.4)",
  color: "white",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};
const readOnlyValue: React.CSSProperties = {
  // Phase 5 final correction — read-only display values on /account.
  // Visually flush with the form-field surface but with no border,
  // no caret, and no input affordance, so it reads as "this is your
  // current value" rather than "edit me here".
  margin: 0,
  padding: "11px 14px",
  borderRadius: 10,
  background: "rgba(255,255,255,0.03)",
  color: "white",
  fontSize: 14,
  lineHeight: 1.4,
  wordBreak: "break-word",
};
const kv: React.CSSProperties = { display: "flex", justifyContent: "space-between" };
const kLabel: React.CSSProperties = { fontSize: 13, color: "rgba(255,255,255,0.55)" };
const kValue: React.CSSProperties = { fontSize: 13, color: "white" };
const primaryBtn: React.CSSProperties = {
  padding: "10px 18px",
  borderRadius: 10,
  border: "none",
  background: "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)",
  color: "black",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
};
const secondaryBtn: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.15)",
  background: "transparent",
  color: "rgba(255,255,255,0.85)",
  fontSize: 13,
  textDecoration: "none",
};
const signOutBtn: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: 10,
  border: "1px solid rgba(220,38,38,0.4)",
  background: "transparent",
  color: "rgba(252,165,165,0.85)",
  fontSize: 13,
  cursor: "pointer",
};
const errorBox: React.CSSProperties = {
  padding: "10px 14px",
  marginTop: 18,
  background: "rgba(220,38,38,0.08)",
  border: "1px solid rgba(220,38,38,0.25)",
  borderRadius: 10,
  color: "rgba(252,165,165,0.9)",
  fontSize: 13,
};
const infoBox: React.CSSProperties = {
  padding: "10px 14px",
  marginTop: 18,
  background: "rgba(52,211,153,0.06)",
  border: "1px solid rgba(52,211,153,0.25)",
  borderRadius: 10,
  color: "rgba(110,231,183,0.95)",
  fontSize: 13,
};
