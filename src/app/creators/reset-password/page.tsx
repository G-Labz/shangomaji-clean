"use client";

import { useState } from "react";

export default function ResetPasswordPage() {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // We call our own server route rather than `supabase.auth.resetPasswordForEmail`.
    // The server generates a hashed-token recovery link (no PKCE verifier) and
    // sends a branded ShangoMaji email via Resend. The link works when opened
    // in a different browser/app from the one that requested the reset.
    try {
      const res = await fetch("/api/creators/reset-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Something went wrong. Please try again.");
      }

      setSent(true);
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
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
        <h1 style={{ marginBottom: "0.5rem" }}>Reset your password</h1>
        <p style={{ marginBottom: "1.5rem", color: "#666" }}>
          Enter the email address for your ShangoMaji creator account and we'll send you a reset link.
        </p>

        {sent ? (
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
            If an account exists for that email, a ShangoMaji password reset link has been sent. Check your inbox.
            <br />
            <a
              href="/creators/login"
              style={{ display: "inline-block", marginTop: "1rem", color: "#555", fontSize: "0.875rem" }}
            >
              ← Back to login
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

            <div style={{ marginBottom: "1.25rem" }}>
              <label
                htmlFor="reset-email"
                style={{ display: "block", marginBottom: "0.375rem", fontSize: "0.875rem", fontWeight: 500 }}
              >
                Email
              </label>
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
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
              {loading ? "Sending…" : "Send Reset Link"}
            </button>

            <div style={{ marginTop: "1rem", textAlign: "center" }}>
              <a href="/creators/login" style={{ fontSize: "0.875rem", color: "#888", textDecoration: "none" }}>
                ← Back to login
              </a>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
