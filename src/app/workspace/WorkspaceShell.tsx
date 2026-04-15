"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";

type RouteConfig = {
  label: string;
  parent: string | null;
  parentLabel: string | null;
  primaryAction: { label: string; href: string } | null;
};

function resolveRoute(pathname: string): RouteConfig {
  // /workspace/projects/[id]/edit
  if (/^\/workspace\/projects\/[^/]+\/edit$/.test(pathname)) {
    return {
      label: "Edit Project",
      parent: "/workspace/projects",
      parentLabel: "Projects",
      primaryAction: null,
    };
  }
  // /workspace/projects/new
  if (pathname === "/workspace/projects/new") {
    return {
      label: "New Project",
      parent: "/workspace/projects",
      parentLabel: "Projects",
      primaryAction: null,
    };
  }

  const routes: Record<string, RouteConfig> = {
    "/workspace": {
      label: "Creator Studio",
      parent: null,
      parentLabel: null,
      primaryAction: null,
    },
    "/workspace/profile": {
      label: "Profile",
      parent: "/workspace",
      parentLabel: "Studio",
      primaryAction: null,
    },
    "/workspace/projects": {
      label: "Projects",
      parent: "/workspace",
      parentLabel: "Studio",
      primaryAction: { label: "+ New Project", href: "/workspace/projects/new" },
    },
    "/workspace/media": {
      label: "Media",
      parent: "/workspace",
      parentLabel: "Studio",
      primaryAction: { label: "Add Media via Project", href: "/workspace/projects/new" },
    },
    "/workspace/settings": {
      label: "Settings",
      parent: "/workspace",
      parentLabel: "Studio",
      primaryAction: null,
    },
  };

  return routes[pathname] || {
    label: "Workspace",
    parent: "/workspace",
    parentLabel: "Studio",
    primaryAction: null,
  };
}

export default function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const route = resolveRoute(pathname);

  return (
    <main
      style={{
        minHeight: "100vh",
        paddingTop: 68,
        background:
          "linear-gradient(135deg, #08080b 0%, #120b0b 35%, #1b0f08 65%, #09090b 100%)",
        color: "white",
      }}
    >
      {/* Shell Header — positioned below the 68px fixed TopNav */}
      <div
        style={{
          position: "sticky",
          top: 68,
          zIndex: 40,
          background: "rgba(8,8,11,0.92)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div
          style={{
            maxWidth: 1000,
            margin: "0 auto",
            padding: "12px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {route.parent && (
              <Link
                href={route.parent}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 14px 6px 10px",
                  fontSize: 14,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.7)",
                  textDecoration: "none",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.04)",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "white";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "rgba(255,255,255,0.7)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                }}
              >
                <ArrowLeft size={14} />
                {route.parentLabel}
              </Link>
            )}
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "rgba(255,255,255,0.5)",
                letterSpacing: "0.01em",
              }}
            >
              {route.label}
            </span>
          </div>

          {route.primaryAction && (
            <Link
              href={route.primaryAction.href}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                borderRadius: 10,
                background: "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)",
                color: "black",
                fontWeight: 600,
                fontSize: 13,
                textDecoration: "none",
                transition: "opacity 0.15s",
              }}
            >
              {route.primaryAction.label}
            </Link>
          )}
        </div>
      </div>

      {/* Page Content */}
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "48px 24px 24px" }}>
        {children}
      </div>
    </main>
  );
}
