"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function UpdatePasswordPage() {
  const supabase = createClient();
  const router   = useRouter();

  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [tokenReady, setTokenReady] = useState(false);

  // Supabase sends the token as a hash fragment (#access_token=...).
  // The SSR client handles it via the PKCE flow; we just need to wait for
  // onAuthStateChange to fire with SIGNED_IN / PASSWORD_RECOVERY before the
  // update form is usable.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setTokenReady(true);
      }
    });

    return () => subscription.unsubscribe();
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

  // Token not yet processed — show a brief wait state
  if (!tokenReady) {
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
          <p style={{ color: "#666" }}>Verifying your ShangoMaji reset link…</p>
          <p style={{ marginTop: "1.5rem", fontSize: "0.875rem" }}>
            If nothing happens,{" "}
            <a href="/creators/reset-password" style={{ color: "#888" }}>
              request a new reset link
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

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
        <h1 style={{ marginBottom: "0.5rem" }}>Set a new password</h1>
        <p style={{ marginBottom: "1.5rem", color: "#666" }}>
          Choose a new password for your ShangoMaji creator account.
        </p>

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
            Your ShangoMaji password has been updated.
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
                New Password
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
              {loading ? "Updating…" : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
