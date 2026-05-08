"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageTitle } from "@/components/util/PageTitle";

// Phase 5 final correction — /account/settings.
//
// /account is now an overview-only surface (display name read-only).
// Editing display name lives here, behind a deliberate edit action,
// using the existing PUT /api/members/profile endpoint. No new
// endpoints, no new system, no modal.
//
// Email change, 2FA, and notification preferences are still deliberately
// not built. They belong post-launch.

type MemberProfile = {
  email:        string;
  display_name: string | null;
  avatar_url:   string | null;
  created_at:   string;
  updated_at:   string;
};

export default function AccountSettingsPage() {
  const [profile, setProfile]     = useState<MemberProfile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading]     = useState(true);
  const [editing, setEditing]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

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

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    setError(null);
    setSavedMessage(null);
    try {
      // Existing endpoint — same shape /account used to call. No changes
      // to /api/members/profile required for this pass.
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
      setEditing(false);
    } catch (e: any) {
      setError(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setDisplayName(profile?.display_name || "");
    setEditing(false);
    setError(null);
    setSavedMessage(null);
  }

  return (
    <div style={page}>
      <PageTitle title="Account settings" />
      <div style={card}>
        <Link href="/account" style={backLink}>
          ← Back to Account
        </Link>

        <p style={eyebrow}>Account</p>
        <h1 style={heading}>Settings</h1>
        <p style={lead}>Manage your Member account.</p>

        {error && <div style={errorBox}>{error}</div>}
        {savedMessage && <div style={infoBox}>{savedMessage}</div>}

        {/* ── Profile ─────────────────────────────────────────────── */}
        <section style={section}>
          <h2 style={sectionHeading}>Profile</h2>

          {loading ? (
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13 }}>Loading…</p>
          ) : !profile ? (
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13 }}>
              No account found.
            </p>
          ) : !editing ? (
            <div style={readOnlyRow}>
              <div style={{ minWidth: 0 }}>
                <p style={fieldLabel}>Display name</p>
                {profile.display_name && profile.display_name.trim() ? (
                  <p style={fieldValue}>{profile.display_name}</p>
                ) : (
                  <p style={{ ...fieldValue, color: "rgba(255,255,255,0.35)", fontStyle: "italic" }}>
                    No display name set.
                  </p>
                )}
              </div>
              <button onClick={() => setEditing(true)} style={editBtn}>
                Edit
              </button>
            </div>
          ) : (
            <div style={editFormCard}>
              <label style={fieldLabel}>Display name</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={80}
                style={input}
                placeholder="What should we call you?"
                autoFocus
              />
              <div style={editActions}>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  style={secondaryBtn}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{ ...primaryBtn, opacity: saving ? 0.6 : 1 }}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ── Sign-in & Security ─────────────────────────────────── */}
        <section style={section}>
          <h2 style={sectionHeading}>Sign-in &amp; Security</h2>
          <Link href="/reset-password" style={row}>
            <span style={rowLabel}>Change password</span>
            <span style={rowChevron}>→</span>
          </Link>
        </section>

        <p style={footerNote}>
          Watchlist, watch history, and notification preferences are not yet available.
        </p>
      </div>
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────

const backLink: React.CSSProperties = {
  display: "inline-block",
  fontSize: 12,
  color: "rgba(255,255,255,0.55)",
  textDecoration: "none",
  marginBottom: 14,
  letterSpacing: "0.02em",
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
};
const lead: React.CSSProperties = {
  fontSize: 13,
  color: "rgba(255,255,255,0.55)",
  margin: "8px 0 0",
};
const section: React.CSSProperties = {
  marginTop: 28,
  paddingTop: 22,
  borderTop: "1px solid rgba(255,255,255,0.06)",
};
const sectionHeading: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.45)",
  margin: "0 0 14px",
};
const row: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "14px 16px",
  borderRadius: 10,
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  textDecoration: "none",
  marginBottom: 10,
};
const rowLabel: React.CSSProperties = { color: "white", fontSize: 14 };
const rowChevron: React.CSSProperties = { color: "rgba(255,255,255,0.4)", fontSize: 14 };
const footerNote: React.CSSProperties = {
  marginTop: 28,
  paddingTop: 22,
  borderTop: "1px solid rgba(255,255,255,0.06)",
  fontSize: 12,
  color: "rgba(255,255,255,0.35)",
};
const readOnlyRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
  padding: "14px 16px",
  borderRadius: 10,
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  marginBottom: 10,
};
const fieldLabel: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.45)",
  margin: "0 0 4px",
};
const fieldValue: React.CSSProperties = {
  margin: 0,
  fontSize: 14,
  color: "white",
  lineHeight: 1.4,
};
const editBtn: React.CSSProperties = {
  flexShrink: 0,
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "transparent",
  color: "rgba(255,255,255,0.85)",
  fontSize: 13,
  cursor: "pointer",
};
const editFormCard: React.CSSProperties = {
  padding: "14px 16px",
  borderRadius: 10,
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  marginBottom: 10,
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
  marginTop: 6,
};
const editActions: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
  marginTop: 12,
};
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
