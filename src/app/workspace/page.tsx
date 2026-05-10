"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const sections = [
  {
    title: "Profile",
    text: "Your public creator identity.",
    href: "/workspace/profile",
  },
  {
    title: "Works",
    text: "Submit, track, and manage your catalog.",
    href: "/workspace/projects",
  },
  {
    title: "Media",
    text: "Distribution assets across your works.",
    href: "/workspace/media",
  },
  {
    title: "Settings",
    text: "Account preferences and session.",
    href: "/workspace/settings",
  },
];

type CatalogCounts = { inReview: number; live: number; drafts: number };

export default function WorkspacePage() {
  // Phase 7.3 Layer 2: lightweight catalog context strip — single fetch
  // against the existing creator projects endpoint, no new APIs, no
  // analytics. Quietly fails closed if the request errors so the
  // landing always renders.
  const [counts, setCounts] = useState<CatalogCounts | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res  = await fetch("/api/creators/projects");
        const data = await res.json();
        if (!alive || !res.ok) return;
        const projects: { status: string }[] = data.projects ?? [];
        setCounts({
          inReview: projects.filter((p) => p.status === "pending" || p.status === "in_review").length,
          live:     projects.filter((p) => p.status === "live").length,
          drafts:   projects.filter((p) => p.status === "draft").length,
        });
      } catch {
        /* silent — strip just stays empty */
      }
    })();
    return () => { alive = false; };
  }, []);

  const contextLine = (() => {
    if (!counts) return null;
    const total = counts.inReview + counts.live + counts.drafts;
    if (total === 0) return "Welcome. Start a new work whenever you're ready.";
    return `${counts.inReview} in review · ${counts.live} live · ${counts.drafts} drafts`;
  })();

  return (
    <div>
      <h1
        style={{
          fontSize: 32,
          fontWeight: 700,
          marginBottom: 8,
          fontFamily: "var(--font-display)",
        }}
      >
        Creator Studio
      </h1>
      <p style={{ opacity: 0.55, fontSize: 14, marginBottom: contextLine ? 14 : 32 }}>
        Manage your works, distribution assets, and account.
      </p>
      {contextLine && (
        <p
          style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.5)",
            marginBottom: 32,
            letterSpacing: "0.01em",
          }}
        >
          {contextLine}
        </p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        {sections.map((item) => (
          <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
            <div
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 16,
                padding: 20,
                background: "rgba(255,255,255,0.03)",
                cursor: "pointer",
                transition: "border-color 0.2s, background 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                e.currentTarget.style.background = "rgba(255,255,255,0.03)";
              }}
            >
              <h3 style={{ margin: 0, color: "white", fontSize: 16, fontWeight: 600 }}>
                {item.title}
              </h3>
              <p style={{ opacity: 0.55, color: "white", marginTop: 8, fontSize: 13 }}>
                {item.text}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
