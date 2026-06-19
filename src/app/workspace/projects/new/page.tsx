"use client";

// Phase 11D-R2 — New Work intake (minimal "start a title").
//
// No paperwork before a title exists. Name the world + an optional one-line
// spark, then enter the Studio with the title on the bench. Everything else is
// shaped in the rooms. Reuses the existing POST /api/creators/projects (partial
// draft is supported); no backend change.

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
    <div className="max-w-2xl mx-auto py-6 space-y-8">
      <header className="space-y-2">
        <p className="text-[11px] uppercase tracking-[0.26em]" style={{ color: "#F6A31A" }}>
          Creator Studio
        </p>
        <h1 className="text-white font-bold text-3xl tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          Start a title
        </h1>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
          Name your world and bring it to the bench. You&rsquo;ll shape it in the Studio — there&rsquo;s nothing
          to fill out here.
        </p>
      </header>

      <div
        className="rounded-2xl border px-7 py-8 space-y-6"
        style={{
          borderColor: "rgba(217,38,28,0.22)",
          background:
            "linear-gradient(135deg, rgba(200,10,46,0.12) 0%, rgba(17,17,17,0.55) 48%, rgba(234,115,27,0.07) 100%)",
        }}
      >
        <div className="start-field space-y-2">
          <label className="block text-sm font-medium text-white">Name your world</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") startTitle(); }}
            placeholder="The title of your world"
            autoFocus
          />
        </div>
        <div className="start-field space-y-2">
          <label className="block text-sm font-medium text-white">
            One-line spark <span className="text-ink-faint">(optional)</span>
          </label>
          <input
            value={spark}
            onChange={(e) => setSpark(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") startTitle(); }}
            placeholder="A single line that captures it"
          />
        </div>

        {error && <p className="text-sm" style={{ color: "rgba(252,165,165,0.9)" }}>{error}</p>}

        <button
          onClick={startTitle}
          disabled={busy}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-black font-semibold text-sm transition active:scale-95 disabled:opacity-60"
          style={{ background: "#E0763A" }}
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
          {busy ? "Starting…" : "Enter Creator Studio"}
        </button>
      </div>

      <style jsx global>{`
        .start-field input {
          width: 100%;
          background: rgba(26, 26, 26, 1);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.75rem;
          padding: 0.85rem 1rem;
          color: white;
          font-size: 0.95rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .start-field input:focus {
          border-color: rgba(224, 118, 58, 0.5);
        }
        .start-field input::placeholder {
          color: rgba(120, 120, 120, 1);
        }
      `}</style>
    </div>
  );
}
