"use client";

// Phase 11D-R6A — New World entry as a Threshold (not a form).
//
// The creator names a world and watches it begin to exist: the typed name fills
// a Founding Masthead — the same poster-frame + display-title composition, on
// the same ember stage, that they'll land in inside the World Room. It renders
// in the shared workspace frame (WorkspaceShell) so crossing into the Studio is
// one continuous step, not a teleport. Title + optional spark only; the poster
// is a non-interactive placeholder (every world eventually gains a face). Reuses
// POST /api/creators/projects — no backend/schema/persistence change.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight } from "lucide-react";

export default function StartTitlePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [spark, setSpark] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function startTitle() {
    if (!title.trim()) {
      setError("Name your world to begin.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/creators/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), logline: spark.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not start your title.");
      router.push(`/workspace/projects/${data.id}/edit`);
    } catch (err: any) {
      setError(err.message || "Could not start your title.");
      setBusy(false);
    }
  }

  const named = title.trim();
  const ctaName = named.length > 32 ? named.slice(0, 32).trim() + "…" : named;

  return (
    <div className="newworld relative flex-1 min-w-0 overflow-y-auto">
      {/* The world's stage — the same ember atmosphere as the World Room, filling
          the whole frame so the title is founded on a lit stage, not in dead space. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(110% 55% at 12% 4%, rgba(200,10,46,0.16) 0%, transparent 55%), radial-gradient(90% 50% at 92% 8%, rgba(234,115,27,0.12) 0%, transparent 60%)",
        }}
      />

      <div
        className="relative min-h-full mx-auto w-full flex flex-col justify-center px-6 sm:px-10 lg:px-16 py-12"
        style={{ maxWidth: 1180 }}
      >
        <p className="text-[11px] uppercase tracking-[0.3em] mb-8" style={{ color: "#F6A31A" }}>
          Creator Studio · a new world
        </p>

        {/* ── Founding Masthead — poster frame + live title, the ancestor of the
            World Room masthead. ── */}
        <div className="grid gap-8 sm:grid-cols-[minmax(160px,200px)_1fr] items-center">
          {/* Poster frame placeholder — NOT an uploader; it shows that every
              world eventually gains a face (added later, in the Studio). */}
          <div className="w-full max-w-[200px] justify-self-start">
            <div
              className="relative aspect-[2/3] w-full rounded-xl border flex items-center justify-center p-4 text-center"
              style={{
                borderColor: "rgba(255,255,255,0.14)",
                background: "rgba(0,0,0,0.42)",
                boxShadow: "0 28px 60px -24px rgba(0,0,0,0.9)",
              }}
            >
              <div>
                <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.45)" }}>the title&rsquo;s face</p>
                <p className="text-[10px] mt-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>added in the Studio</p>
              </div>
            </div>
          </div>

          {/* Live masthead — typing fills the title, exactly as it reads inside
              the World Room (same display type, same sizes). */}
          <div className="min-w-0">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") startTitle(); }}
              placeholder="Name your world"
              autoFocus
              aria-label="Name your world"
              className="title-input w-full bg-transparent border-0 outline-none text-white font-bold tracking-tight break-words"
              style={{ fontFamily: "var(--font-display)", fontSize: "clamp(34px, 5vw, 64px)", lineHeight: 1.01 }}
            />
            <input
              value={spark}
              onChange={(e) => setSpark(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") startTitle(); }}
              placeholder="One line that captures it — optional"
              aria-label="One-line spark (optional)"
              className="spark-input mt-4 w-full max-w-2xl bg-transparent border-0 outline-none italic"
              style={{ fontFamily: "var(--font-display)", fontSize: "clamp(17px, 2.1vw, 24px)", color: "rgba(255,255,255,0.82)", lineHeight: 1.4 }}
            />
          </div>
        </div>

        {/* One expectation line — what this is, where it goes, what's needed now. */}
        <p className="text-sm mt-12 max-w-2xl" style={{ color: "rgba(255,255,255,0.55)" }}>
          This becomes a ShangoMaji title — you&rsquo;ll shape it in the Studio. Only the name is needed to begin.
        </p>

        {error && <p className="text-sm mt-4" style={{ color: "rgba(252,165,165,0.9)" }}>{error}</p>}

        {/* The threshold — crossing into the Studio, named. */}
        <div className="mt-8">
          <button
            onClick={startTitle}
            disabled={busy}
            className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl text-black font-semibold text-base transition active:scale-95 disabled:opacity-60"
            style={{ background: "#E0763A" }}
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : null}
            <span>
              {busy ? "Opening the Studio…" : named ? <>Open &ldquo;{ctaName}&rdquo; in the Studio</> : "Name your world to begin"}
            </span>
            {!busy && <ArrowRight size={16} />}
          </button>
        </div>
      </div>

      <style jsx global>{`
        .newworld .title-input::placeholder {
          color: rgba(255, 255, 255, 0.24);
          font-style: normal;
        }
        .newworld .spark-input::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
}
