export default function HelpPage() {
  const faqs = [
    { q: "What is ShangoMaji?", a: "ShangoMaji is a curated space for anime-influenced storytelling — films, series, and creative work from invited creators." },
    { q: "How do I get access?", a: "Creators are selected by invitation. Viewers can watch titles in the catalog and follow announcements on Discord." },
    { q: "How do creators get featured?", a: "We spotlight creators we've selected. If you're interested in being considered, apply through the creators page." },
    { q: "Who is ShangoMaji for?", a: "Anime fans who want more. Creators building the next wave. Anyone looking for something worth watching." },
  ];
  return (
    <div className="min-h-screen pt-28 pb-20 px-6 md:px-10">
      <div className="max-w-2xl mx-auto">
        <p className="text-xs uppercase tracking-[0.25em] mb-4" style={{ color: "rgba(240,112,48,0.7)" }}>Support</p>
        <h1 className="text-display font-bold text-4xl md:text-5xl text-white mb-4 tracking-tight">Help & Support</h1>
        <p className="text-sm mb-12" style={{ color: "rgba(255,255,255,0.45)" }}>Welcome to ShangoMaji support.</p>

        <div className="space-y-6 mb-16">
          <h2 className="text-white font-semibold text-base">Common Questions</h2>
          {faqs.map(({ q, a }) => (
            <div key={q} className="pt-5" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="text-white font-medium text-sm mb-2">{q}</p>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>{a}</p>
            </div>
          ))}
        </div>

        <div className="pt-8" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <h2 className="text-white font-semibold text-base mb-4">Contact</h2>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
            For support or inquiries:{" "}
            <a href="mailto:support@shangomaji.com"
              className="hover:text-white transition-colors"
              style={{ color: "rgba(240,112,48,0.85)" }}>
              support@shangomaji.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
