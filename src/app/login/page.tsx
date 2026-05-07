"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";

// Phase 2 — Sign in as a Member.
//
// Auth pattern matches the existing creator login flow (client-side
// supabase.auth.signInWithPassword) plus a server-side rate-limit pre-flight.
// On success the page calls /api/members/profile to ensure the membership
// row exists, then forwards to /account.
//
// Members and Creators share Supabase auth.users. A user who signs in here
// receives a Member badge only if a member_profiles row exists. If their
// only role is Creator, they will be sent to /signup with a clear message
// instead of being silently promoted to Member.

export default function MemberLoginPage() {
  const router    = useRouter();
  const search    = useSearchParams();
  const supabase  = createClient();
  const redirect  = search.get("redirect") || "/account";

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [resolving, setResolving] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res  = await fetch("/api/members/session", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (data?.authenticated && data?.isMember) {
          router.replace(redirect);
          return;
        }
      } catch { /* ignore */ }
      if (!cancelled) setResolving(false);
    })();
    return () => { cancelled = true; };
  }, [redirect, router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const throttle = await fetch("/api/members/throttle", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "signin" }),
      });
      if (!throttle.ok) {
        const t = await throttle.json().catch(() => ({}));
        setError(t?.error || "Too many attempts. Please try again later.");
        return;
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email:    email.trim().toLowerCase(),
        password,
      });
      if (authError || !data.user) {
        setError("Invalid email or password.");
        return;
      }

      // Confirm the signed-in user is a Member. If they are only a Creator
      // (or neither), send them somewhere appropriate without promoting them.
      const sessionRes  = await fetch("/api/members/session", { cache: "no-store" });
      const sessionData = await sessionRes.json();
      if (sessionData?.isMember) {
        router.replace(redirect);
        return;
      }

      // Authenticated but not a Member. Sign them out so the session is not
      // ambiguous, and direct them to the right surface.
      await supabase.auth.signOut();
      if (sessionData?.isCreator) {
        setError(
          "This account is a Creator account. Sign in via Creator Studio instead."
        );
      } else {
        setError("No Member account exists for this email. Create one to continue.");
      }
    } finally {
      setBusy(false);
    }
  }

  if (resolving) {
    return (
      <div style={center}>
        <p style={{ color: "rgba(255,255,255,0.45)" }}>Loading…</p>
      </div>
    );
  }

  return (
    <div style={page}>
      <div style={card}>
        <p style={eyebrow}>Member</p>
        <h1 style={heading}>Sign in as a Member</h1>
        <p style={lead}>Continue to your private account.</p>

        {error && <div style={errorBox}>{error}</div>}

        <form onSubmit={handleLogin} style={{ marginTop: 20 }}>
          <div style={row}>
            <label htmlFor="m-email" style={label}>Email</label>
            <input
              id="m-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={input}
            />
          </div>

          <div style={row}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
              <label htmlFor="m-password" style={label}>Password</label>
              <Link href="/reset-password" style={inlineLink}>
                Forgot password?
              </Link>
            </div>
            <input
              id="m-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={input}
            />
          </div>

          <button type="submit" disabled={busy} style={{ ...primaryBtn, width: "100%", opacity: busy ? 0.6 : 1 }}>
            {busy ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div style={footerRule} />
        <div style={footerLine}>
          New to ShangoMaji?{" "}
          <Link href="/signup" style={inlineLink}>Create your Member account</Link>
        </div>
        <div style={{ ...footerLine, marginTop: 6 }}>
          Are you a creator?{" "}
          <Link href="/creators/login" style={inlineLink}>Creator Studio</Link>
        </div>
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
  boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
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
  fontSize: 14,
  color: "rgba(255,255,255,0.7)",
  margin: "10px 0 0",
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
  marginTop: 6,
};
const errorBox: React.CSSProperties = {
  padding: "10px 14px",
  marginTop: 18,
  background: "rgba(220,38,38,0.08)",
  border: "1px solid rgba(220,38,38,0.25)",
  borderRadius: 10,
  color: "rgba(252,165,165,0.9)",
  fontSize: 13,
  lineHeight: 1.45,
};
const footerRule: React.CSSProperties = {
  height: 1,
  background: "rgba(255,255,255,0.08)",
  margin: "22px 0 14px",
};
const footerLine: React.CSSProperties = {
  fontSize: 13,
  color: "rgba(255,255,255,0.5)",
  textAlign: "center",
};
const inlineLink: React.CSSProperties = {
  color: "rgba(240,112,48,0.95)",
  textDecoration: "none",
  fontWeight: 600,
};
