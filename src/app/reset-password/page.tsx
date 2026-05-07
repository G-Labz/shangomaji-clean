"use client";

// Phase 2 — Member password reset request.
//
// Lives at top-level /reset-password (NOT under /account/*) because the
// /account layout requires an active Member session and password reset
// must work for users who are signed out. The Creator equivalent lives
// at /creators/reset-password and is unchanged.

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { getSiteUrl } from "@/lib/site-url";

export default function MemberResetPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [busy, setBusy]   = useState(false);
  const [info, setInfo]   = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const throttle = await fetch("/api/members/throttle", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "reset" }),
      });
      if (!throttle.ok) {
        const t = await throttle.json().catch(() => ({}));
        setError(t?.error || "Too many attempts. Please try again later.");
        return;
      }

      // Supabase sends the recovery email. We do not surface whether the
      // email exists in our system to avoid enumeration.
      const site = getSiteUrl();
      await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: site ? `${site}/update-password` : undefined,
        }
      );

      setInfo(
        "If a Member account exists for that email, a reset link is on its way. Check your inbox."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={page}>
      <div style={card}>
        <p style={eyebrow}>Member</p>
        <h1 style={heading}>Reset your password</h1>
        <p style={lead}>
          Enter the email tied to your Member account. We&apos;ll send a reset link.
        </p>

        {error && <div style={errorBox}>{error}</div>}
        {info  && <div style={infoBox}>{info}</div>}

        <form onSubmit={handleRequest} style={{ marginTop: 20 }}>
          <div style={{ marginBottom: 14 }}>
            <label htmlFor="reset-email" style={label}>Email</label>
            <input
              id="reset-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={input}
            />
          </div>

          <button type="submit" disabled={busy} style={{ ...primaryBtn, width: "100%", opacity: busy ? 0.6 : 1 }}>
            {busy ? "Sending…" : "Send reset link"}
          </button>
        </form>

        <div style={footerRule} />
        <div style={footerLine}>
          <Link href="/login" style={inlineLink}>Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}

const page: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "75vh",
  padding: "2.5rem 1rem",
};
const card: React.CSSProperties = {
  width: "100%",
  maxWidth: 440,
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
const heading: React.CSSProperties = { fontSize: 28, fontWeight: 700, color: "white", margin: 0 };
const lead: React.CSSProperties = { fontSize: 14, color: "rgba(255,255,255,0.7)", margin: "10px 0 0" };
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
const primaryBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "11px 18px",
  borderRadius: 10,
  border: "none",
  background: "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)",
  color: "black",
  fontWeight: 600,
  fontSize: 14,
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
const footerRule: React.CSSProperties = { height: 1, background: "rgba(255,255,255,0.08)", margin: "22px 0 14px" };
const footerLine: React.CSSProperties = { fontSize: 13, color: "rgba(255,255,255,0.5)", textAlign: "center" };
const inlineLink: React.CSSProperties = { color: "rgba(240,112,48,0.95)", textDecoration: "none", fontWeight: 600 };
