"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { getSiteUrl } from "@/lib/site-url";
import { PageTitle } from "@/components/util/PageTitle";

// Phase 2 — Create your Member account.
//
// Strict scope:
//   - Calls /api/members/throttle (rate limit) before supabase.auth.signUp.
//   - On success, POSTs /api/members/profile to create the membership row
//     so the audience side has a Member marker as soon as the auth.users
//     row exists.
//   - Email verification follows whatever the project's Supabase auth
//     settings dictate. If confirmations are on, a verification email
//     is sent and the user lands on /login afterwards. If confirmations
//     are off, the user is signed in immediately.
//   - Never logs passwords. Never shares tokens with non-Supabase services.

export default function MemberSignupPage() {
  const router    = useRouter();
  const search    = useSearchParams();
  const supabase  = createClient();
  const redirect  = search.get("redirect") || "/account";

  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy]               = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [info, setInfo]               = useState<string | null>(null);
  const [resolving, setResolving]     = useState(true);

  // If already signed in as a member, forward to /account.
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

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setBusy(true);
    try {
      // Rate-limit pre-flight.
      const throttle = await fetch("/api/members/throttle", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "signup" }),
      });
      if (!throttle.ok) {
        const t = await throttle.json().catch(() => ({}));
        setError(t?.error || "Too many attempts. Please try again later.");
        return;
      }

      // Create the auth.users row. Verification email is sent automatically
      // by Supabase when email-confirm is on; otherwise the session is
      // available immediately.
      // account_type marks this user as a Member at confirmation time. The
      // /account gate and /api/members/session use this to lazily create the
      // member_profiles row after email confirmation, since data.session is
      // null when confirmation is required.
      const site = getSiteUrl();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email:    email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: site ? `${site}/account` : undefined,
          data: {
            account_type: "member",
            display_name: displayName.trim() || null,
          },
        },
      });

      if (signUpError) {
        // Generic message — do not reveal whether the email exists.
        setError("Sign-up failed. If you already have an account, sign in instead.");
        return;
      }

      // If the project requires email confirmation, `data.session` is null.
      // Tell the user to check their email.
      if (!data.session) {
        setInfo(
          "Check your email to confirm your account, then sign in to continue."
        );
        return;
      }

      // Session is live — create the membership row.
      const profileRes = await fetch("/api/members/profile", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ display_name: displayName.trim() }),
      });
      if (!profileRes.ok) {
        const p = await profileRes.json().catch(() => ({}));
        setError(p?.error || "Could not create your member profile.");
        return;
      }

      router.replace(redirect);
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
      <PageTitle title="Create account" />
      <div style={card}>
        <p style={eyebrow}>Member</p>
        <h1 style={heading}>Create your Member account</h1>
        <p style={lead}>
          A private account for the audience side of ShangoMaji.
        </p>

        {error && <div style={errorBox}>{error}</div>}
        {info  && <div style={infoBox}>{info}</div>}

        <form onSubmit={handleSignup} style={{ marginTop: 20 }}>
          <div style={row}>
            <label htmlFor="m-display" style={label}>Display name (optional)</label>
            <input
              id="m-display"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={80}
              style={input}
              placeholder="What should we call you?"
            />
          </div>

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
            <label htmlFor="m-password" style={label}>Password</label>
            <input
              id="m-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              style={input}
            />
            <p style={hint}>At least 8 characters.</p>
          </div>

          <button type="submit" disabled={busy} style={{ ...primaryBtn, width: "100%", opacity: busy ? 0.6 : 1 }}>
            {busy ? "Creating…" : "Create Member account"}
          </button>
        </form>

        <div style={footerRule} />
        <div style={footerLine}>
          Already have a Member account?{" "}
          <Link href="/login" style={inlineLink}>Sign in</Link>
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
  maxWidth: 460,
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
  lineHeight: 1.5,
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
const infoBox: React.CSSProperties = {
  padding: "10px 14px",
  marginTop: 18,
  background: "rgba(52,211,153,0.06)",
  border: "1px solid rgba(52,211,153,0.25)",
  borderRadius: 10,
  color: "rgba(110,231,183,0.95)",
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
