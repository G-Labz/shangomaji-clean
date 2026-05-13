export default function HelpPage() {
  const faqs = [
    { q: "What is ShangoMaji™?", a: "ShangoMaji™ is a curated anime distribution label. Approved titles join the public catalog through review, licensing, and media readiness — not open upload or self-publishing." },
    { q: "How do I get access?", a: "Viewers can watch titles in the public catalog and follow announcements on Discord. Creators join through application review." },
    { q: "How do creators get into the catalog?", a: "Creators submit work for review through the creator application. Approval does not mean immediate public release — distribution requires licensing, media readiness, and ShangoMaji review." },
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

        <p className="mt-10 pt-6 text-[11px]" style={{ color: "rgba(255,255,255,0.35)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          ShangoMaji™ is a claimed mark of GeneUs Labz.
        </p>
      </div>
    </div>
  );
}
