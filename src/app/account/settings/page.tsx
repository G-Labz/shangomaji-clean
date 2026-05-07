"use client";

import Link from "next/link";

// Phase 2 — /account/settings.
//
// Minimal settings landing. Most actions live elsewhere:
//   - Change password → /account/reset-password (request reset email).
//   - Edit display name → /account.
//
// Email change, 2FA, and notification preferences are deliberately not built
// in Phase 2. They belong post-launch.

export default function AccountSettingsPage() {
  return (
    <div style={page}>
      <div style={card}>
        <p style={eyebrow}>Account</p>
        <h1 style={heading}>Settings</h1>
        <p style={lead}>Manage your private Member account.</p>

        <section style={section}>
          <h2 style={sectionHeading}>Sign-in &amp; Security</h2>
          <Link href="/reset-password" style={row}>
            <span style={rowLabel}>Change password</span>
            <span style={rowChevron}>→</span>
          </Link>
        </section>

        <section style={section}>
          <h2 style={sectionHeading}>Profile</h2>
          <Link href="/account" style={row}>
            <span style={rowLabel}>Edit display name</span>
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
