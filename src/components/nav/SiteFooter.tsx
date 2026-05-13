import Link from "next/link";

// Public-facing footer. Mounted manually on public pages (home, browse,
// creators, creators/apply, help) to keep workspace and admin chrome
// uncluttered. Routes listed here are all real and verified to exist.
const FOOTER_LINKS: { label: string; href: string }[] = [
  { label: "Browse",          href: "/browse" },
  { label: "Creators",        href: "/creators" },
  { label: "Apply",           href: "/creators/apply" },
  { label: "Help / FAQ",      href: "/help" },
  { label: "Creator Studio",  href: "/creators/login" },
];

export function SiteFooter() {
  return (
    <footer
      className="mt-24"
      style={{
        background:
          "linear-gradient(to bottom, rgba(255,255,255,0.025), rgba(7,6,8,0.65) 40%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      <div className="max-w-5xl mx-auto px-6 md:px-10 py-14">
        {/* Top row — brand identity left, site links right. Stacks on
            mobile so the brand reads first, then the link group. */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div>
            <p
              className="text-white text-base font-semibold tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              ShangoMaji<span className="align-top text-[0.55em] ml-0.5" aria-hidden="true">™</span>
              <span className="sr-only">™</span>
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
              Curated anime distribution label.
            </p>
          </div>

          <nav
            aria-label="Site"
            className="flex flex-wrap gap-x-5 gap-y-2 md:justify-end"
          >
            {FOOTER_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-[13px] transition-colors hover:text-white"
                style={{ color: "rgba(255,255,255,0.65)" }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Bottom row — approved trademark + copyright notice. Two
            stacked lines act as the footer's closing signature. */}
        <div
          className="mt-10 pt-5 text-[11px] leading-relaxed space-y-1"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.45)" }}
        >
          <p>
            ShangoMaji<span className="align-top text-[0.65em] ml-0.5" aria-hidden="true">™</span> is a claimed mark of GeneUs Labz<span className="align-top text-[0.65em] ml-0.5" aria-hidden="true">™</span>.
            <span className="sr-only">™</span>
          </p>
          <p>
            © 2026 GeneUs Labz<span className="align-top text-[0.65em] ml-0.5" aria-hidden="true">™</span>. All rights reserved.
            <span className="sr-only">™</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
