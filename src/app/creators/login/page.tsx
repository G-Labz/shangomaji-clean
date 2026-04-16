"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function CreatorLoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function checkExistingSession() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (user) {
        router.replace("/workspace");
      } else {
        setLoading(false);
      }
    }

    checkExistingSession();

    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !data.user) {
      setError(authError?.message ?? "Login failed. Please try again.");
      setLoading(false);
      return;
    }

    router.replace("/workspace");
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <p>Loading…</p>
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
        <h1 style={{ marginBottom: "0.5rem" }}>Creator Login</h1>
        <p style={{ marginBottom: "1.5rem", color: "#666" }}>
          Sign in to access your creator workspace.
        </p>

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

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: "1rem" }}>
            <label
              htmlFor="creator-email"
              style={{ display: "block", marginBottom: "0.375rem", fontSize: "0.875rem", fontWeight: 500 }}
            >
              Email
            </label>
            <input
              id="creator-email"
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

          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.375rem" }}>
              <label
                htmlFor="creator-password"
                style={{ fontSize: "0.875rem", fontWeight: 500 }}
              >
                Password
              </label>
              <a
                href="/creators/reset-password"
                style={{ fontSize: "0.8rem", color: "#888", textDecoration: "none" }}
              >
                Forgot Password?
              </a>
            </div>
            <input
              id="creator-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
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
            style={{
              width: "100%",
              padding: "0.625rem 1rem",
              backgroundColor: "#111",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontSize: "1rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}