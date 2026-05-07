"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";

// Phase 1 patch — Creator Studio access page.
//
// This is the destination of the top-nav "Creator Studio" link. It is NOT
// the application form. The page handles three states:
//
//   1. No session              → Sign-in form + small "Apply to ShangoMaji"
//                                  link as the only path into the application.
//   2. Session, approved       → Forward to /workspace.
//   3. Session, not approved   → Show "Signed in, but no approved creator
//                                  application yet." with explicit Apply CTA.
//                                  We do NOT silently bounce the user into
//                                  the application form — that's the bug
//                                  this patch fixes.

type AccessState =
  | { kind: "loading" }
  | { kind: "no_session" }
  | { kind: "session_unapproved"; email: string; destination: string }
  | { kind: "session_approved" }; // transient: routing to /workspace

export default function CreatorAccessPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [state, setState] = useState<AccessState>({ kind: "loading" });
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Resolve session + approval status without delegating to the workspace
  // layout (which would redirect non-approved users into /creators/apply).
  async function resolveAccess() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      setState({ kind: "no_session" });
      return;
    }

    try {
      const res = await fetch("/api/creators/access-status", { cache: "no-store" });
      const data = await res.json();
      if (data?.approved) {
        setState({ kind: "session_approved" });
        router.replace("/workspace");
      } else {
        setState({
          kind:        "session_unapproved",
          email:       user.email,
          destination: data?.destination ?? "/creators/apply",
        });
      }
    } catch {
      // If the status check fails, do not redirect blindly. Surface the
      // signed-in-but-not-approved state so the user can choose.
      setState({
        kind:        "session_unapproved",
        email:       user.email,
        destination: "/creators/apply",
      });
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await resolveAccess();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !data.user) {
      setError(authError?.message ?? "Sign-in failed. Please try again.");
      setSubmitting(false);
      return;
    }

    // Re-resolve via the access-status endpoint instead of forwarding to
    // /workspace blindly — non-approved users should land on the
    // unapproved view here, not in /creators/apply.
    await resolveAccess();
    setSubmitting(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setState({ kind: "no_session" });
  }

  // ── Loading ────────────────────────────────────────────────────────────
  if (state.kind === "loading" || state.kind === "session_approved") {
    return (
      <div style={center}>
        <p style={{ color: "rgba(255,255,255,0.45)" }}>Loading…</p>
      </div>
    );
  }

  // ── Signed in, but no approved creator application ─────────────────────
  if (state.kind === "session_unapproved") {
    const stateLabel =
      state.destination === "/creators/pending"
        ? "Your application is under review."
        : state.destination === "/creators/rejected"
        ? "Your application was not selected."
        : state.destination === "/creators/onboarding/required"
        ? "Onboarding is required before you can enter the workspace."
        : "No creator application is on file for this account.";

    const ctaPrimary =
      state.destination === "/creators/pending"
        ? { label: "View Application Status", href: "/creators/pending" }
        : state.destination === "/creators/rejected"
        ? { label: "View Application Status", href: "/creators/rejected" }
        : state.destination === "/creators/onboarding/required"
        ? { label: "Continue Onboarding", href: "/creators/onboarding/required" }
        : { label: "Apply to ShangoMaji", href: "/creators/apply" };

    return (
      <div style={page}>
        <div style={card}>
          <p style={eyebrow}>Creator Studio</p>
          <h1 style={heading}>Almost there.</h1>
          <p style={lead}>
            You&apos;re signed in as <span style={emphasis}>{state.email}</span>, but
            you don&apos;t yet have access to the workspace.
          </p>
          <p style={leadMuted}>{stateLabel}</p>

          <div style={ctaRow}>
            <Link href={ctaPrimary.href} style={primaryBtn}>
              {ctaPrimary.label}
            </Link>
            <button onClick={handleSignOut} style={secondaryBtn}>
              Sign out
            </button>
          </div>

          <div style={footer}>
            Need a different account? <button onClick={handleSignOut} style={inlineLink}>Sign out</button> and sign in with the email that received your invite.
          </div>
        </div>
      </div>
    );
  }

  // ── No session — sign-in form ───────────────────────────────────────────
  return (
    <div style={page}>
      <div style={card}>
        <p style={eyebrow}>Creator Studio</p>
        <h1 style={heading}>Already accepted?</h1>
        <p style={lead}>Sign in to continue to your workspace.</p>

        {error && <div style={errorBox}>{error}</div>}

        <form onSubmit={handleLogin} style={{ marginTop: 24 }}>
          <div style={{ marginBottom: 14 }}>
            <label htmlFor="creator-email" style={label}>Email</label>
            <input
              id="creator-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={input}
            />
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
              <label htmlFor="creator-password" style={label}>Password</label>
              <Link href="/creators/reset-password" style={inlineLinkAnchor}>
                Forgot password?
              </Link>
            </div>
            <input
              id="creator-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={input}
            />
          </div>

          <button type="submit" disabled={submitting} style={{ ...primaryBtn, width: "100%", opacity: submitting ? 0.6 : 1 }}>
            {submitting ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div style={footerRule} />
        <div style={footerLine}>
          Not yet a creator?{" "}
          <Link href="/creators/apply" style={inlineLinkAnchor}>
            Apply to ShangoMaji
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ── styles ── */

const center: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "60vh",
};

const page: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "70vh",
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
  letterSpacing: "-0.01em",
};

const lead: React.CSSProperties = {
  fontSize: 14,
  color: "rgba(255,255,255,0.7)",
  margin: "10px 0 0",
  lineHeight: 1.55,
};

const leadMuted: React.CSSProperties = {
  fontSize: 13,
  color: "rgba(255,255,255,0.45)",
  margin: "8px 0 0",
  lineHeight: 1.55,
};

const emphasis: React.CSSProperties = {
  color: "white",
  fontWeight: 600,
};

const ctaRow: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 20,
};

const primaryBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "11px 20px",
  borderRadius: 10,
  border: "none",
  background: "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)",
  color: "black",
  fontWeight: 600,
  fontSize: 14,
  textDecoration: "none",
  cursor: "pointer",
};

const secondaryBtn: React.CSSProperties = {
  padding: "10px 18px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.15)",
  background: "transparent",
  color: "rgba(255,255,255,0.75)",
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
  lineHeight: 1.45,
};

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

const footer: React.CSSProperties = {
  fontSize: 12,
  color: "rgba(255,255,255,0.4)",
  marginTop: 18,
  lineHeight: 1.55,
};

const inlineLinkAnchor: React.CSSProperties = {
  color: "rgba(240,112,48,0.95)",
  textDecoration: "none",
  fontWeight: 600,
};

const inlineLink: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "rgba(240,112,48,0.95)",
  cursor: "pointer",
  fontSize: "inherit",
  fontWeight: 600,
  padding: 0,
};
