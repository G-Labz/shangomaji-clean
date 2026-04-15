"use client";

export function CulturalContextPanel() {
  return (
    <div className="mt-10 p-6 rounded-2xl"
      style={{
        border: "1px solid rgba(255,255,255,0.08)",
        background: "linear-gradient(to bottom, rgba(229,62,42,0.06) 0%, rgba(4,3,5,0.85) 100%)",
        backdropFilter: "blur(12px)",
      }}>
      <h2 className="text-base font-semibold text-white mb-5 tracking-wide">
        Why This Matters
      </h2>

      <div className="space-y-5 text-sm" style={{ color: "rgba(255,255,255,0.60)" }}>
        <div>
          <p className="text-xs uppercase tracking-widest font-medium mb-1"
            style={{ color: "rgba(240,112,48,0.85)" }}>
            Cultural Signal
          </p>
          <p>
            This story reflects the rise of creator-built anime worlds shaped
            outside traditional industry systems.
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-widest font-medium mb-1"
            style={{ color: "rgba(240,112,48,0.85)" }}>
            Creator Perspective
          </p>
          <p>
            Built by independent creators pushing new visual language and
            storytelling directions.
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-widest font-medium mb-1"
            style={{ color: "rgba(240,112,48,0.85)" }}>
            Expansion Thread
          </p>
          <p>
            Part of a growing wave redefining what anime can become when more
            voices are given space to build.
          </p>
        </div>

        <div className="pt-5" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <p className="text-white font-semibold mb-2">Join the Wave</p>
          <p className="mb-5 max-w-md" style={{ color: "rgba(255,255,255,0.55)" }}>
            This is where creators and fans build together. Share your work.
            Find your people. Shape what comes next.
          </p>
          <a
            href="https://discord.gg/egtY83MuGY"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-black text-sm font-semibold hover:opacity-90 active:scale-95 transition-all duration-200"
            style={{ background: "linear-gradient(90deg, #f07030, #f5c518)" }}
          >
            Enter the Discord
          </a>
        </div>
      </div>
    </div>
  );
}
