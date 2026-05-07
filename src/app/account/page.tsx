"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";

// Phase 2 — Member account page (private).
//
// Reads the member's own profile via /api/members/profile. Writes display_name
// via the same endpoint. Does not show creator workspace data, admin data, or
// any cross-role information.
//
// Watch history, watchlist, recommendations, payments are intentionally NOT
// here. They are post-launch parking lot items.

type MemberProfile = {
  email:        string;
  display_name: string | null;
  avatar_url:   string | null;
  created_at:   string;
  updated_at:   string;
};

export default function AccountPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [profile, setProfile]         = useState<MemberProfile | null>(null);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");

  async function loadProfile() {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/members/profile", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not load account");
      const p: MemberProfile | null = data.profile ?? null;
      setProfile(p);
      setDisplayName(p?.display_name || "");
    } catch (e: any) {
      setError(e?.message || "Could not load account");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadProfile(); }, []);

  async function handleSaveName() {
    setSaving(true);
    setError(null);
    setSavedMessage(null);
    try {
      const res = await fetch("/api/members/profile", {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ display_name: displayName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save failed");
      setSavedMessage("Saved.");
      setTimeout(() => setSavedMessage(null), 2000);
      await loadProfile();
    } catch (e: any) {
      setError(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/");
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
      <div style={card}>
        <p style={eyebrow}>Private Account</p>
        <h1 style={heading}>Your account</h1>
        <p style={lead}>This is your private Member account. Only you can see this page.</p>

        {error && <div style={errorBox}>{error}</div>}
        {savedMessage && <div style={infoBox}>{savedMessage}</div>}

        <section style={section}>
          <h2 style={sectionHeading}>Member profile</h2>

          <div style={row}>
            <label style={label}>Email</label>
            <input value={profile.email} readOnly style={{ ...input, opacity: 0.55 }} />
            <p style={hint}>Email is private and used only for sign-in and notifications.</p>
          </div>

          <div style={row}>
            <label style={label}>Display name</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={80}
              style={input}
              placeholder="What should we call you?"
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={handleSaveName} disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.6 : 1 }}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </section>

        <section style={section}>
          <h2 style={sectionHeading}>Account</h2>
          <div style={kv}>
            <span style={kLabel}>Member since</span>
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
const eyebrow: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: "rgba(245,197,24,0.85)",
  margin: 0,
  marginBottom: 8,
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
const hint: React.CSSProperties = {
  fontSize: 11,
  color: "rgba(255,255,255,0.35)",
  margin: "6px 0 0",
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
