"use client";

// Phase 2 — Member password update (the destination of the recovery email).
//
// Mirrors the structure of /creators/update-password but renders Member copy.
// The actual auth handshake is identical: process token_hash via verifyOtp,
// fall back to PKCE code exchange, accept the implicit hash flow via
// onAuthStateChange. Watchdog times out after 8s.
//
// On success, sign out so the recovery session does not silently grant
// elevated access, then forward to /login.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { PageTitle } from "@/components/util/PageTitle";

type Stage = "verifying" | "ready" | "error";

export default function MemberUpdatePasswordPage() {
  const supabase = createClient();
  const router   = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [busy, setBusy]         = useState(false);
  const [success, setSuccess]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [stage, setStage]       = useState<Stage>("verifying");
  const stageRef = useRef<Stage>("verifying");
  function goStage(s: Stage) { stageRef.current = s; setStage(s); }

  useEffect(() => {
    let cancelled = false;

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (cancelled) return;
      // PASSWORD_RECOVERY: server confirmed a recovery session.
      // SIGNED_IN / USER_UPDATED: also fired by setSession / verifyOtp /
      //   exchangeCodeForSession success paths; treat as ready since the
      //   processUrlToken branch only reaches one of those after a positive
      //   token response.
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "USER_UPDATED") {
        setError(null);
        goStage("ready");
      }
    });

    async function processUrlToken() {
      try {
        const query = new URLSearchParams(window.location.search);
        const hash  = new URLSearchParams(window.location.hash.replace(/^#/, ""));

        const errorDesc = hash.get("error_description") || query.get("error_description");
        const errorCode = hash.get("error") || query.get("error");
        if (errorDesc || errorCode) {
          if (cancelled) return;
          setError(
            /expired|invalid|otp/i.test(errorDesc || "") || errorCode === "access_denied"
              ? "This link has expired or is no longer valid. Please request a new reset link."
              : (errorDesc || "Could not verify your link.")
          );
          goStage("error");
          return;
        }

        // Hash-fragment implicit flow. This is what Supabase's default
        // recovery email template produces after its /auth/v1/verify endpoint
        // redirects the browser back to this page. We set the session
        // explicitly instead of relying on detectSessionInUrl racing with the
        // 8s watchdog. Tokens are never logged.
        const accessToken  = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");
        if (accessToken && refreshToken) {
          const { error: setErr } = await supabase.auth.setSession({
            access_token:  accessToken,
            refresh_token: refreshToken,
          });
          if (cancelled) return;
          if (setErr) {
            setError(
              /expired|invalid/i.test(setErr.message || "")
                ? "This link has expired or is no longer valid. Please request a new reset link."
                : "Could not verify your link."
            );
            goStage("error");
          } else {
            window.history.replaceState({}, "", window.location.pathname);
            goStage("ready");
          }
          return;
        }

        const tokenHash = query.get("token_hash") || hash.get("token_hash");
        const typeParam = query.get("type")       || hash.get("type");
        if (tokenHash && typeParam) {
          const { error: otpErr } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: typeParam as any,
          });
          if (cancelled) return;
          if (otpErr) {
            setError(
              /expired|invalid|otp/i.test(otpErr.message || "")
                ? "This link has expired or is no longer valid. Please request a new reset link."
                : (otpErr.message || "Could not verify your link.")
            );
            goStage("error");
          } else {
            window.history.replaceState({}, "", window.location.pathname);
            goStage("ready");
          }
          return;
        }

        const code = query.get("code");
        if (code) {
          const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
          if (cancelled) return;
          if (exErr) {
            setError("This link is no longer valid. Please request a new reset link.");
            goStage("error");
          } else {
            window.history.replaceState({}, "", window.location.pathname);
            goStage("ready");
          }
          return;
        }

        // No explicit token in URL — fall through. detectSessionInUrl may
        // still fire onAuthStateChange asynchronously; the watchdog catches
        // the case where it never does.
      } catch {
        if (cancelled) return;
        setError("Could not verify your link.");
        goStage("error");
      }
    }

    processUrlToken();

    const timeoutId = setTimeout(() => {
      if (cancelled) return;
      if (stageRef.current === "verifying") {
        setError("We couldn't verify this link. It may have expired or already been used.");
        goStage("error");
      }
    }, 8000);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      setError(updateError.message || "Could not update password.");
      return;
    }
    // Sign out so the recovery-elevated session does not persist. The user
    // signs in fresh with the new password.
    await supabase.auth.signOut();
    setSuccess(true);
    setTimeout(() => router.replace("/login"), 1500);
  }

  if (stage === "verifying") {
    return (
      <div style={center}>
        <PageTitle title="Set a new password" />
        <p style={{ color: "rgba(255,255,255,0.55)" }}>Verifying your reset link…</p>
      </div>
    );
  }

  if (stage === "error") {
    return (
      <div style={page}>
        <PageTitle title="Set a new password" />
        <div style={card}>
          <p style={eyebrow}>Member</p>
          <h1 style={heading}>Link issue</h1>
          <p style={{ ...lead, color: "rgba(252,165,165,0.85)" }}>
            {error || "We couldn't verify this link."}
          </p>
          <div style={{ marginTop: 18 }}>
            <Link href="/reset-password" style={primaryBtn}>Request a new reset link</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={page}>
      <PageTitle title="Set a new password" />
      <div style={card}>
        <p style={eyebrow}>Member</p>
        <h1 style={heading}>Set a new password</h1>
        <p style={lead}>Choose a new password for your Member account.</p>

        {success ? (
          <div style={infoBox}>Password updated. Redirecting you to sign in…</div>
        ) : (
          <>
            {error && <div style={errorBox}>{error}</div>}
            <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
              <div style={{ marginBottom: 14 }}>
                <label htmlFor="np" style={label}>New password</label>
                <input
                  id="np"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  style={input}
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label htmlFor="cp" style={label}>Confirm new password</label>
                <input
                  id="cp"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  style={input}
                />
              </div>
              <button type="submit" disabled={busy} style={{ ...primaryBtn, width: "100%", opacity: busy ? 0.6 : 1 }}>
                {busy ? "Updating…" : "Update password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

const center: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" };
const page: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "75vh", padding: "2.5rem 1rem" };
const card: React.CSSProperties = {
  width: "100%",
  maxWidth: 440,
  padding: "32px 28px 24px",
  borderRadius: 18,
  background: "rgba(20,16,16,0.85)",
  border: "1px solid rgba(255,255,255,0.08)",
};
const eyebrow: React.CSSProperties = {
  fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase",
  color: "rgba(245,197,24,0.85)", margin: 0, marginBottom: 8,
};
const heading: React.CSSProperties = { fontSize: 28, fontWeight: 700, color: "white", margin: 0 };
const lead: React.CSSProperties = { fontSize: 14, color: "rgba(255,255,255,0.7)", margin: "10px 0 0" };
const label: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 600, letterSpacing: "0.06em",
  textTransform: "uppercase", color: "rgba(255,255,255,0.55)", marginBottom: 6,
};
const input: React.CSSProperties = {
  width: "100%", padding: "11px 14px", borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.15)", background: "rgba(0,0,0,0.4)",
  color: "white", fontSize: 14, outline: "none", boxSizing: "border-box",
};
const primaryBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  padding: "11px 18px", borderRadius: 10, border: "none",
  background: "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)",
  color: "black", fontWeight: 600, fontSize: 14, cursor: "pointer", textDecoration: "none",
};
const errorBox: React.CSSProperties = {
  padding: "10px 14px", marginTop: 18,
  background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.25)",
  borderRadius: 10, color: "rgba(252,165,165,0.9)", fontSize: 13,
};
const infoBox: React.CSSProperties = {
  padding: "10px 14px", marginTop: 18,
  background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.25)",
  borderRadius: 10, color: "rgba(110,231,183,0.95)", fontSize: 13,
};
