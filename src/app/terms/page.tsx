export default function TermsPage() {
  return (
    <div className="min-h-screen pt-28 pb-20 px-6 md:px-10">
      <div className="max-w-2xl mx-auto">
        <p className="text-xs uppercase tracking-[0.25em] mb-4" style={{ color: "rgba(240,112,48,0.7)" }}>Legal</p>
        <h1 className="text-display font-bold text-4xl md:text-5xl text-white mb-12 tracking-tight">Terms of Service</h1>
        <div className="space-y-10 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.60)" }}>
          <p style={{ color: "rgba(255,255,255,0.75)" }}>Welcome to ShangoMaji. By accessing or using this website, you agree to the following terms.</p>

          {[
            { title: "1. Use of the Platform", body: "ShangoMaji is a cultural platform built to explore anime, creativity, and storytelling. You agree to use this platform respectfully and lawfully.", list: ["Upload harmful, offensive, or illegal content", "Violate intellectual property rights", "Attempt to disrupt or damage the platform"], listLabel: "You may not:" },
            { title: "2. Content Ownership", body: "All original content, branding, and materials on ShangoMaji belong to ShangoMaji unless otherwise stated. Creators retain ownership of their work but grant ShangoMaji permission to feature, promote, and distribute content submitted to the platform." },
            { title: "3. Community Conduct", body: "ShangoMaji is built on culture, creativity, and community. Users are expected to respect creators and other users, engage constructively, and avoid harassment or hate speech." },
            { title: "4. Platform Evolution", body: "ShangoMaji is an evolving platform. Features, services, and content may change over time without prior notice." },
            { title: "5. Limitation of Liability", body: "ShangoMaji is not liable for user-generated content, external links or third-party platforms, or temporary service interruptions." },
            { title: "6. Agreement", body: "By using this platform, you agree to these terms." },
          ].map(({ title, body, list, listLabel }) => (
            <div key={title} className="pt-8" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <h2 className="text-white font-semibold text-base mb-3">{title}</h2>
              <p>{body}</p>
              {list && (<><p className="mt-3 mb-2">{listLabel}</p><ul className="space-y-1 pl-4">{list.map(i => <li key={i} style={{ listStyleType: "disc" }}>{i}</li>)}</ul></>)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
