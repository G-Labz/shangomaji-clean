"use client";

import Link from "next/link";

const sections = [
  {
    title: "Profile",
    text: "Manage your creator identity and public page.",
    href: "/workspace/profile",
  },
  {
    title: "Projects",
    text: "Create, edit, and submit your work.",
    href: "/workspace/projects",
  },
  {
    title: "Media",
    text: "View all assets across your projects.",
    href: "/workspace/media",
  },
  {
    title: "Settings",
    text: "Workspace preferences and session.",
    href: "/workspace/settings",
  },
];

export default function WorkspacePage() {
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
      <p style={{ opacity: 0.55, fontSize: 14, marginBottom: 32 }}>
        Choose a section to continue.
      </p>

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
