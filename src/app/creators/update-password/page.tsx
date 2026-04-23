"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase-browser";

type Stage = "verifying" | "ready" | "error";
type Flow  = "invite" | "recovery" | "unknown";

export default function UpdatePasswordPage() {
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [stage, setStage]       = useState<Stage>("verifying");
  const [flow, setFlow]         = useState<Flow>("unknown");

  // Ref mirror of stage for use inside setTimeout closures.
  const stageRef = useRef<Stage>("verifying");
  function goStage(s: Stage) {
    stageRef.current = s;
    setStage(s);
  }

  useEffect(() => {
    let cancelled = false;

    // 1. Detect intent from URL — for copy only. Do NOT gate behaviour on this.
    try {
      const q = new URLSearchParams(window.location.search);
      const h = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const t = q.get("type") || h.get("type");
      if (t === "invite" || t === "signup") setFlow("invite");
      else if (t === "recovery") setFlow("recovery");
    } catch { /* noop */ }

    // 2. Listen for auth events (covers hash-fragment implicit flow handled
    //    automatically by @supabase/ssr's detectSessionInUrl).
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (cancelled) return;
      if (
        event === "PASSWORD_RECOVERY" ||
        event === "SIGNED_IN" ||
        event === "USER_UPDATED"
      ) {
        setError(null);
        goStage("ready");
      }
    });

    // 3. Explicitly process URL tokens that will NOT fire through
    //    detectSessionInUrl — PKCE ?code=, and ?token_hash=&type= OTP links.
    async function processUrlToken() {
      try {
        const query = new URLSearchParams(window.location.search);
        const hash  = new URLSearchParams(window.location.hash.replace(/^#/, ""));

        // Supabase surfaces errors via URL fragments/params.
        const errorDesc = hash.get("error_description") || query.get("error_description");
        const errorCode = hash.get("error")             || query.get("error");
        if (errorDesc || errorCode) {
          if (cancelled) return;
          const looksExpired =
            errorCode === "access_denied" ||
            /expired|invalid|otp/i.test(errorDesc || "");
          setError(looksExpired
            ? "This link has expired or is no longer valid. Please request a new link."
            : (errorDesc || "Could not verify your link."));
          goStage("error");
          return;
        }

        // Preferred path: hashed-token OTP verification. This is what our
        // server-generated invite and recovery links use. It requires NO
        // client-side PKCE verifier, so it works when the email is opened in
        // a different browser or an in-app webview.
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
                ? "This link has expired or is no longer valid. Please request a new link."
                : (otpErr.message || "Could not verify your link."),
            );
            goStage("error");
          } else {
            window.history.replaceState({}, "", window.location.pathname);
            goStage("ready");
          }
          return;
        }

        // Legacy fallback: PKCE code exchange. Only reachable for stale links
        // issued before the token_hash flow was adopted. This will fail if the
        // code verifier isn't in this browser's storage (different device or
        // in-app webview) — we surface that truthfully.
        const code = query.get("code");
        if (code) {
          const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
          if (cancelled) return;
          if (exErr) {
            setError(
              /verifier|expired|invalid/i.test(exErr.message || "")
                ? "This link is no longer valid. Please request a new setup link."
                : (exErr.message || "Could not verify your link."),
            );
            goStage("error");
          } else {
            window.history.replaceState({}, "", window.location.pathname);
            goStage("ready");
          }
          return;
        }

        // No explicit token in URL — the hash-fragment implicit flow will fire
        // via onAuthStateChange. Fall through to the watchdog.
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || "Could not verify your link.");
        goStage("error");
      }
    }

    processUrlToken();

    // 4. Watchdog — never leave the page spinning forever.
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
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message || "Could not update password. The link may have expired.");
      return;
    }

    setSuccess(true);
  }

  // Copy varies by flow
  const headingCopy =
    flow === "invite" ? "Set your password" : "Set a new password";
  const introCopy =
    flow === "invite"
      ? "Choose a password to finish setting up your ShangoMaji creator account."
      : "Choose a new password for your ShangoMaji creator account.";
  const verifyingCopy =
    flow === "invite"
      ? "Setting up your ShangoMaji account…"
      : flow === "recovery"
      ? "Verifying your reset link…"
      : "Verifying your ShangoMaji link…";

  // --- VERIFYING ---
  if (stage === "verifying") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          padding: "2rem",
        }}
      >
        <div style={{ width: "100%", maxWidth: 400 }}>
          <p style={{ color: "#bbb" }}>{verifyingCopy}</p>
          <p style={{ marginTop: "1.5rem", fontSize: "0.875rem", color: "#888" }}>
            This should only take a moment.
          </p>
        </div>
      </div>
    );
  }

  // --- ERROR ---
  if (stage === "error") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          padding: "2rem",
        }}
      >
        <div style={{ width: "100%", maxWidth: 440 }}>
          <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.5rem", fontWeight: 700 }}>
            We couldn't verify that link.
          </h1>
          <p style={{ margin: "0 0 1.5rem", color: "#bbb", lineHeight: 1.6 }}>
            {error || "This link has expired or is no longer valid."}
          </p>
          {flow === "invite" ? (
            <p style={{ margin: 0, fontSize: "0.9rem", color: "#888", lineHeight: 1.6 }}>
              Please contact the ShangoMaji team to request a new account setup link.
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: "0.9rem", color: "#888", lineHeight: 1.6 }}>
              <a href="/creators/reset-password" style={{ color: "rgba(245,197,24,0.9)" }}>
                Request a new reset link
              </a>{" "}
              or{" "}
              <a href="/creators/login" style={{ color: "rgba(245,197,24,0.9)" }}>
                return to sign in
              </a>
              .
            </p>
          )}
        </div>
      </div>
    );
  }

  // --- READY / SUCCESS ---
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        padding: "2rem",
      }}
    >
      <div style={{ width: "100%", maxWidth: "400px" }}>
        <h1 style={{ marginBottom: "0.5rem" }}>{headingCopy}</h1>
        <p style={{ marginBottom: "1.5rem", color: "#bbb" }}>{introCopy}</p>

        {success ? (
          <div
            style={{
              padding: "1rem",
              backgroundColor: "#f0fdf4",
              color: "#166534",
              borderRadius: "6px",
              fontSize: "0.9rem",
              lineHeight: 1.5,
            }}
          >
            Your ShangoMaji password has been set.
            <br />
            <a
              href="/creators/login"
              style={{ display: "inline-block", marginTop: "1rem", color: "#555", fontSize: "0.875rem" }}
            >
              Sign in to your workspace →
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div
                style={{
                  padding: "0.75rem 1rem",
                  marginBottom: "1rem",
                  backgroundColor: "#fef2f2",
                  color: "#b91c1c",
                  borderRadius: "6px",
                  fontSize: "0.875rem",
                }}
              >
                {error}
              </div>
            )}

            <div style={{ marginBottom: "1rem" }}>
              <label
                htmlFor="new-password"
                style={{ display: "block", marginBottom: "0.375rem", fontSize: "0.875rem", fontWeight: 500 }}
              >
                {flow === "invite" ? "Password" : "New Password"}
              </label>
              <input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                style={{
                  width: "100%",
                  padding: "0.5rem 0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "1rem",
                  boxSizing: "border-box",
                  color: "#fff",
                  backgroundColor: "#111",
                  caretColor: "#fff",
                }}
              />
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label
                htmlFor="confirm-password"
                style={{ display: "block", marginBottom: "0.375rem", fontSize: "0.875rem", fontWeight: 500 }}
              >
                Confirm Password
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
                style={{
                  width: "100%",
                  padding: "0.5rem 0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "1rem",
                  boxSizing: "border-box",
                  color: "#fff",
                  backgroundColor: "#111",
                  caretColor: "#fff",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "0.625rem 1rem",
                backgroundColor: "#111",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                fontSize: "1rem",
                fontWeight: 500,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading
                ? (flow === "invite" ? "Setting…" : "Updating…")
                : (flow === "invite" ? "Set Password" : "Update Password")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
