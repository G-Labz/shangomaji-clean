export default function CareersPage() {
  const roles = ["Creators", "Designers", "Editors", "Community builders", "Developers"];
  return (
    <div className="min-h-screen pt-28 pb-20 px-6 md:px-10">
      <div className="max-w-2xl mx-auto">
        <p className="text-xs uppercase tracking-[0.25em] mb-4" style={{ color: "rgba(240,112,48,0.7)" }}>Join Us</p>
        <h1 className="text-display font-bold text-4xl md:text-5xl text-white mb-6 tracking-tight">Careers at ShangoMaji</h1>

        <div className="space-y-3 text-base leading-relaxed mb-12" style={{ color: "rgba(255,255,255,0.60)" }}>
          <p style={{ color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>We're building something bigger than a platform.</p>
          <p>We're building a new wave in anime culture.</p>
          <p>ShangoMaji is a growing network focused on creators, storytelling, and global cultural expansion. As we grow, we're looking for people who want to help shape the future of anime and creative media.</p>
        </div>

        <div className="pt-8 mb-12" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <h2 className="text-white font-semibold text-base mb-4">Current Opportunities</h2>
          <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.45)" }}>No open roles yet — but we're always looking for:</p>
          <ul className="space-y-2">
            {roles.map(r => (
              <li key={r} className="flex items-center gap-3 text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: "linear-gradient(90deg, #f07030, #f5c518)" }} />
                {r}
              </li>
            ))}
          </ul>
        </div>

        <div className="pt-8" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <h2 className="text-white font-semibold text-base mb-4">Join the Movement</h2>
          <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.55)" }}>If you're interested in building with us, start in the community.</p>
          <a href="https://discord.gg/egtY83MuGY" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-black text-sm font-semibold hover:opacity-90 active:scale-95 transition-all duration-200"
            style={{ background: "linear-gradient(90deg, #f07030, #f5c518)" }}>
            Join the Discord
          </a>
        </div>
      </div>
    </div>
  );
}
