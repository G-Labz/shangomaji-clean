import type { Metadata } from "next";
import "../styles/globals.css";
import { TopNav } from "@/components/nav/TopNav";

// Phase 5 — Root metadata.
//
// The `template` lets per-page titles render as `[PAGE] · ShangoMaji`
// without each page repeating the suffix. `default` is what shows up when
// a page doesn't declare a title. Open Graph defaults are restrained — no
// SEO spam, no claims about catalog scale, no fabricated descriptions.
//
// Favicon assets:
//   /logo.png  — present (used as the icon).
//   A dedicated /icon.png (32px square) and /apple-icon.png are recommended
//   future additions; the docs in /readme.txt list this as outstanding.
//   Until those exist we point the favicon link at /logo.png so production
//   does not show the framework default.
export const metadata: Metadata = {
  title: {
    default:  "ShangoMaji",
    template: "%s · ShangoMaji",
  },
  description: "ShangoMaji — anime's next wave.",
  icons: {
    icon: [{ url: "/logo.png" }],
    shortcut: [{ url: "/logo.png" }],
    apple: [{ url: "/logo.png" }],
  },
  openGraph: {
    title:       "ShangoMaji",
    description: "ShangoMaji — anime's next wave.",
    siteName:    "ShangoMaji",
    type:        "website",
  },
  twitter: {
    card:  "summary",
    title: "ShangoMaji",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <TopNav />
        {children}
      </body>
    </html>
  );
}
