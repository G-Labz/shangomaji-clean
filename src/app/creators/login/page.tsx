"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { PageTitle } from "@/components/util/PageTitle";

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
  // The user is signed in but has an in-pipeline creator application
  // (pending / rejected / onboarding-required). The page frames their
  // status accurately because a real creator_applications row exists.
  | { kind: "session_pipeline"; email: string; destination: "/creators/pending" | "/creators/rejected" | "/creators/onboarding/required" }
  // The user is signed in but has NO creator_applications row at all.
  // This is the Member-only case (or any auth'd user without Creator
  // intent). The page shows separate-lane Member/Creator messaging and
  // does NOT frame the email as "almost there" or partly in the pipeline.
  | { kind: "session_no_application"; email: string; isMember: boolean }
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
        return;
      }

      const destination: string = data?.destination ?? "/creators/apply";

      // No creator_applications row → separate-lane view. Probe Member
      // status so the body copy reflects whether this is a Member account.
      // This does NOT promote the user, link identities, or create rows —
      // it is read-only.
      if (destination === "/creators/apply") {
        let isMember = false;
        try {
          const memberRes  = await fetch("/api/members/session", { cache: "no-store" });
          const memberData = await memberRes.json();
          isMember = !!memberData?.isMember;
        } catch { /* ignore — fall back to neutral copy */ }
        setState({ kind: "session_no_application", email: user.email, isMember });
        return;
      }

      // In-pipeline application (pending / rejected / onboarding-required).
      // Coerce to the narrowed destination union; anything else falls back
      // to no-application messaging.
      if (
        destination === "/creators/pending" ||
        destination === "/creators/rejected" ||
        destination === "/creators/onboarding/required"
      ) {
        setState({ kind: "session_pipeline", email: user.email, destination });
        return;
      }

      setState({ kind: "session_no_application", email: user.email, isMember: false });
    } catch {
      // If the status check fails, do not redirect blindly. Surface a safe
      // separate-lane view so the user can choose to sign out or apply.
      setState({ kind: "session_no_application", email: user.email, isMember: false });
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
        <PageTitle title="Creator Studio" />
        <p style={{ color: "rgba(255,255,255,0.45)" }}>Loading…</p>
      </div>
    );
  }

  // ── Signed in, in-pipeline creator application ─────────────────────────
  // Only reached when an actual creator_applications row exists. We frame
  // the email accurately as a creator-side state.
  if (state.kind === "session_pipeline") {
    const stateLabel =
      state.destination === "/creators/pending"
        ? "Your application is under review."
        : state.destination === "/creators/rejected"
        ? "Your application was not selected."
        : "Onboarding is required before you can enter the workspace.";

    const ctaPrimary =
      state.destination === "/creators/pending"
        ? { label: "View Application Status", href: "/creators/pending" }
        : state.destination === "/creators/rejected"
        ? { label: "View Application Status", href: "/creators/rejected" }
        : { label: "Continue Onboarding", href: "/creators/onboarding/required" };

    return (
      <div style={page}>
        <PageTitle title="Creator Studio" />
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

  // ── Signed in, but no creator_applications row at all ──────────────────
  // Member identity and Creator identity are separate lanes. We deliberately
  // do NOT frame this email as part of the Creator pipeline. We also do not
  // create or link any creator-side row from this view.
  if (state.kind === "session_no_application") {
    const bodyFirst = state.isMember
      ? "You are currently signed in with a Member account. Member accounts are for watching ShangoMaji."
      : "You are currently signed in with an account that has no Creator application on file.";

    return (
      <div style={page}>
        <PageTitle title="Creator Studio" />
        <div style={card}>
          <p style={eyebrow}>Creator Studio</p>
          <h1 style={heading}>Creator Studio is restricted.</h1>
          <p style={lead}>{bodyFirst}</p>
          <p style={lead}>
            Creator Studio is separate and only available to approved creators.
            Applying does not guarantee access.
          </p>
          <p style={leadMuted}>
            To continue, sign out and use an approved Creator account.
          </p>

          <div style={ctaRow}>
            <button onClick={handleSignOut} style={primaryBtn}>
              Sign out
            </button>
            <Link href="/creators/apply" style={{ ...secondaryBtn, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
              Apply for Creator Review
            </Link>
          </div>

          <div style={footer}>
            Signed in as <span style={emphasis}>{state.email}</span>
          </div>
        </div>
      </div>
    );
  }

  // ── No session — sign-in form ───────────────────────────────────────────
  return (
    <div style={page}>
      <PageTitle title="Creator Studio" />
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
