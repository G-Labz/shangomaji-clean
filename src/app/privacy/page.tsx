export default function PrivacyPage() {
  return (
    <div className="min-h-screen pt-28 pb-20 px-6 md:px-10">
      <div className="max-w-2xl mx-auto">
        <p className="text-xs uppercase tracking-[0.25em] mb-4" style={{ color: "rgba(240,112,48,0.7)" }}>Legal</p>
        <h1 className="text-display font-bold text-4xl md:text-5xl text-white mb-12 tracking-tight">Privacy Policy</h1>
        <div className="space-y-10 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.60)" }}>
          <p style={{ color: "rgba(255,255,255,0.75)" }}>ShangoMaji respects your privacy.</p>
          {[
            { title: "1. Information We Collect", body: "We may collect email addresses (for waitlists, newsletters, or accounts) and basic usage data to improve the platform." },
            { title: "2. How We Use Information", body: "We use your information to improve user experience, communicate updates and opportunities, and grow the ShangoMaji community." },
            { title: "3. Data Protection", body: "We do not sell your personal information. Your data is handled securely and only used for platform-related purposes." },
            { title: "4. Third-Party Services", body: "We may use third-party tools (analytics, email services, etc.) to operate the platform." },
            { title: "5. Your Control", body: "You can unsubscribe or request removal of your data at any time." },
          ].map(({ title, body }) => (
            <div key={title} className="pt-8" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <h2 className="text-white font-semibold text-base mb-3">{title}</h2>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
