"use client";

// Phase 11D-R3 — New Work intake (name a world into being).
//
// Container collapse: there is no form box here. The title you type IS the
// masthead-in-waiting — large display type laid directly on the canvas, with
// an ambient ember wash bleeding behind it (no bordered card, no field stack).
// Name the world, add an optional spark, and carry that same title straight
// into the World Room. Reuses POST /api/creators/projects; no backend change.

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

  return (
    <div className="start-canvas relative min-h-[62vh] flex flex-col justify-center">
      {/* Ambient ember wash — bleeds, never frames. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(120% 80% at 12% 18%, rgba(200,10,46,0.16) 0%, rgba(234,115,27,0.07) 38%, transparent 70%)",
        }}
      />

      <p className="text-[11px] uppercase tracking-[0.3em] mb-6" style={{ color: "#F6A31A" }}>
        Creator Studio · a new world
      </p>

      {/* The title named into being — the masthead before it has a home. */}
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") startTitle(); }}
        placeholder="Name your world"
        autoFocus
        aria-label="Name your world"
        className="title-input w-full bg-transparent border-0 outline-none text-white font-bold tracking-tight"
        style={{ fontFamily: "var(--font-display)", fontSize: "clamp(34px, 7vw, 68px)", lineHeight: 1.02 }}
      />

      {/* A single warm rule stands in for the stage the world will occupy. */}
      <div
        className="mt-4 mb-5 h-px w-full max-w-2xl"
        style={{ background: "linear-gradient(90deg, rgba(224,118,58,0.55), rgba(224,118,58,0))" }}
      />

      <input
        value={spark}
        onChange={(e) => setSpark(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") startTitle(); }}
        placeholder="One line that captures it — optional"
        aria-label="One-line spark (optional)"
        className="spark-input w-full max-w-2xl bg-transparent border-0 outline-none italic"
        style={{ fontFamily: "var(--font-display)", fontSize: "clamp(16px, 2.4vw, 22px)", color: "rgba(255,255,255,0.78)" }}
      />

      <p className="text-sm mt-7 max-w-md" style={{ color: "rgba(255,255,255,0.5)" }}>
        Nothing to fill out here. Name it, and shape the rest in the Studio — the title carries
        straight into the World Room.
      </p>

      {error && <p className="text-sm mt-4" style={{ color: "rgba(252,165,165,0.9)" }}>{error}</p>}

      <div className="mt-7">
        <button
          onClick={startTitle}
          disabled={busy}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-black font-semibold text-sm transition active:scale-95 disabled:opacity-60"
          style={{ background: "#E0763A" }}
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
          {busy ? "Opening the Studio…" : "Enter Creator Studio"}
        </button>
      </div>

      <style jsx global>{`
        .start-canvas .title-input::placeholder {
          color: rgba(255, 255, 255, 0.26);
          font-style: normal;
        }
        .start-canvas .spark-input::placeholder {
          color: rgba(255, 255, 255, 0.32);
        }
      `}</style>
    </div>
  );
}
