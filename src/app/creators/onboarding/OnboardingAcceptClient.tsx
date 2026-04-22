"use client";

import { useState } from "react";

export default function OnboardingAcceptClient({
  token,
  version,
}: {
  token: string;
  version: string;
}) {
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [done, setDone]         = useState(false);
  const [email, setEmail]       = useState<string | null>(null);

  async function handleAccept() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/creators/onboarding/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, version }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || `Could not record acceptance (HTTP ${res.status}).`);
      }

      setEmail(data?.email || null);
      setDone(true);
    } catch (err: any) {
      setError(err?.message || "Could not record acceptance. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div
        style={{
          padding: "1.25rem 1.5rem",
          borderRadius: 12,
          background: "rgba(52,211,153,0.08)",
          border: "1px solid rgba(52,211,153,0.3)",
          color: "rgba(187,247,208,0.95)",
          lineHeight: 1.6,
          fontSize: "0.95rem",
        }}
      >
        <div style={{ fontWeight: 600, color: "rgba(134,239,172,1)", marginBottom: 6 }}>
          Terms accepted.
        </div>
        <p style={{ margin: 0 }}>
          A password setup email has been sent
          {email ? (
            <>
              {" "}
              to <span style={{ color: "#fff" }}>{email}</span>
            </>
          ) : null}
          . Check your inbox to finish creating your account.
        </p>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div
          style={{
            padding: "0.75rem 1rem",
            marginBottom: "0.75rem",
            background: "rgba(220,38,38,0.08)",
            border: "1px solid rgba(220,38,38,0.3)",
            borderRadius: 8,
            color: "rgba(252,165,165,0.95)",
            fontSize: "0.85rem",
          }}
        >
          {error}
        </div>
      )}

      <button
        onClick={handleAccept}
        disabled={busy}
        style={{
          width: "100%",
          padding: "0.85rem 1.25rem",
          borderRadius: 12,
          border: "none",
          background: "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)",
          color: "#000",
          fontWeight: 600,
          fontSize: "0.95rem",
          cursor: busy ? "not-allowed" : "pointer",
          opacity: busy ? 0.7 : 1,
        }}
      >
        {busy ? "Recording your acceptance…" : "Accept and Continue"}
      </button>
    </>
  );
}
