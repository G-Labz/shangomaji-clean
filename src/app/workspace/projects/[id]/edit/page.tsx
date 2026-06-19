"use client";

// Phase 11D-R4A — World Room = Workbench.
//
// A bounded workspace frame (hosted by the route-aware WorkspaceShell): a fixed
// top ribbon, a fixed left facet rail, and ONE persistent central object — the
// world as it reads (identity · premise · thesis as a continuous editorial
// reading, never a field stack). Shaping happens in the single side-stage
// summon (right entry, ~58%, the world stays visible/live). Persistence is
// ambient (saved on stage close via the existing PUT); the only deliberate
// commit is lifecycle advancement, which lives in the ribbon. No Save bar, no
// page scroll, no centered column. Reuses every existing handler/endpoint/
// validation/lifecycle; no backend change.

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Send, Lock, ImagePlus } from "lucide-react";
import { StatusBadge, useConfirm } from "../../../components";
import { RoomLayout, STUDIO_SIGNAL } from "../../../WorkspaceShell";
import SubmissionIntegrityForm, {
  emptyIntegrity,
  integrityFromProject,
  integrityToPayload,
  checkIntegrity,
  type IntegrityState,
} from "../../SubmissionIntegrityForm";

interface ProjectDraft {
  title: string;
  type: string;
  logline: string;
  synopsis: string;
  genre: string;
  runtime: string;
  deliverables: string[];
  thumbUrl: string;
  bannerUrl: string;
  trailerUrl: string;
  sampleUrl: string;
  stillsUrls: string[];
}

const TYPES  = ["Series", "Film", "Short"];
const GENRES = ["Mythic", "Sci-Fi", "Drama", "Spiritual", "Action", "Coming of Age"];
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

type Facet = "identity" | "premise" | "thesis" | "trust";
const FACETS: { key: Facet; label: string }[] = [
  { key: "identity", label: "Identity" },
  { key: "premise",  label: "Premise" },
  { key: "thesis",   label: "Thesis & Fit" },
  { key: "trust",    label: "Trust" },
];
const FACET_TITLE: Record<Facet, string> = {
  identity: "Identity",
  premise:  "Premise — what is this world?",
  thesis:   "Thesis — why this belongs at ShangoMaji",
  trust:    "Trust — the title's standing",
};

interface PageProps {
  params: { id: string };
}

export default function WorldRoomPage({ params }: PageProps) {
  const { id }   = params;
  const router   = useRouter();

  const [draft, setDraft]                   = useState<ProjectDraft | null>(null);
  const [integrity, setIntegrity]           = useState<IntegrityState>(emptyIntegrity);
  const [integrityError, setIntegrityError] = useState<string | null>(null);
  const [projectStatus, setProjectStatus]   = useState<string>("draft");
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [removalRequested, setRemovalRequested] = useState(false);
  const [licenseStatus, setLicenseStatus]   = useState<"executed" | "none">("none");
  const [loading, setLoading]               = useState(true);
  const [submitting, setSubmitting]         = useState(false);
  const [reviseBusy, setReviseBusy]         = useState(false);
  const [errors, setErrors]                 = useState<Record<string, string>>({});
  const [uploading, setUploading]           = useState<Record<string, boolean>>({});
  const [feedback, setFeedback]             = useState("");
  const [removalModalOpen, setRemovalModalOpen] = useState(false);
  const [removalReason, setRemovalReason]   = useState("");
  const [removalBusy, setRemovalBusy]       = useState(false);
  const { confirm, dialog }                 = useConfirm();

  // Side-stage summon state — which facet is being shaped, and whether the
  // stage is open. This is the single Studio-wide summon mechanism.
  const [activeFacet, setActiveFacet] = useState<Facet>("identity");
  const [stageOpen, setStageOpen]     = useState(false);

  function showFeedback(msg: string) {
    setFeedback(msg);
    setTimeout(() => setFeedback(""), 2500);
  }
  function showError(msg: string) {
    setErrors((prev) => ({ ...prev, save: msg }));
  }

  useEffect(() => {
    async function loadProject() {
      try {
        const res  = await fetch("/api/creators/projects");
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Could not load projects");
        const project = (data.projects ?? []).find((p: any) => p.id === id);
        if (!project) {
          setErrors({ load: "Project not found" });
          setLoading(false);
          return;
        }
        setProjectStatus(project.status || "draft");
        setRejectionReason(project.rejection_reason || "");
        setRemovalRequested(project.removal_requested ?? false);
        setLicenseStatus(project.license_status === "executed" ? "executed" : "none");
        setIntegrity(integrityFromProject(project));
        setDraft({
          title:      project.title || "",
          type:       project.project_type || "",
          logline:    project.logline || "",
          synopsis:   project.description || "",
          genre:      (project.genres || [])[0] || "",
          runtime:    project.runtime || "",
          deliverables: project.deliverables || [],
          thumbUrl:   project.cover_image_url || "",
          bannerUrl:  project.banner_url || "",
          trailerUrl: project.trailer_url || "",
          sampleUrl:  project.sample_url || "",
          stillsUrls: project.stills_urls || [],
        });
      } catch (err: any) {
        setErrors({ load: err.message });
      } finally {
        setLoading(false);
      }
    }
    loadProject();
  }, [id]);

  async function uploadFile(file: File, assetType: string): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("asset_type", assetType);
    setUploading((u) => ({ ...u, [assetType]: true }));
    try {
      const res  = await fetch("/api/creators/upload/asset", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Upload failed");
      return data.url as string;
    } finally {
      setUploading((u) => ({ ...u, [assetType]: false }));
    }
  }

  function validate() {
    if (!draft) return false;
    const nextErrors: Record<string, string> = {};
    if (!draft.title.trim())  nextErrors.title  = "Title is required.";
    if (!draft.type)          nextErrors.type   = "Select a type.";
    if (!draft.logline.trim()) nextErrors.logline = "Logline is required.";
    if (!draft.genre)         nextErrors.genre  = "Select a genre.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function payload() {
    if (!draft) return {};
    return {
      id,
      title:          draft.title.trim(),
      project_type:   draft.type || null,
      logline:        draft.logline.trim() || null,
      description:    draft.synopsis.trim() || null,
      genres:         draft.genre ? [draft.genre] : [],
      cover_image_url: draft.thumbUrl.trim() || null,
      banner_url:     draft.bannerUrl.trim() || null,
      trailer_url:    draft.trailerUrl.trim() || null,
      sample_url:     draft.sampleUrl.trim() || null,
      stills_urls:    draft.stillsUrls,
      deliverables:   draft.deliverables,
      runtime:        draft.runtime.trim() || null,
      ...integrityToPayload(integrity),
    };
  }

  // Ambient persistence — drafts save silently on stage close via the existing
  // PUT. Nothing resolves as "saved"; the world is simply, visibly changed.
  async function ambientSave() {
    if (!draft || projectStatus !== "draft") return;
    try {
      await fetch("/api/creators/projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload()),
      });
    } catch {
      /* ambient — surfaced on the deliberate commit instead */
    }
  }

  function openFacet(f: Facet) { setActiveFacet(f); setStageOpen(true); }
  async function closeStage() { setStageOpen(false); await ambientSave(); }

  async function handleDelete() {
    const ok = await confirm({
      title:        "Delete Project",
      description:  `This will permanently delete "${draft?.title || "this project"}" and all its associated data. This cannot be undone.`,
      confirmLabel: "Delete Project",
      destructive:  true,
    });
    if (!ok) return;
    try {
      const res  = await fetch("/api/creators/projects", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Delete failed");
      router.push("/workspace/projects");
    } catch (err: any) {
      showError(err.message || "Delete failed");
    }
  }

  async function handleSubmit() {
    if (!draft || !validate()) {
      // Surface what's missing by opening the relevant facet.
      if (errors.title || errors.type || errors.logline || errors.genre) openFacet("identity");
      return;
    }
    const integrityErr = checkIntegrity(integrity);
    if (integrityErr) {
      setIntegrityError(integrityErr.message);
      showError(integrityErr.message);
      openFacet("trust");
      return;
    }
    setIntegrityError(null);
    setSubmitting(true);
    try {
      const saveRes  = await fetch("/api/creators/projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload()),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData?.error || "Save failed");

      const submitRes  = await fetch("/api/creators/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "pending", ...integrityToPayload(integrity) }),
      });
      const submitData = await submitRes.json();
      if (submitRes.status === 422) {
        const msg = submitData?.error || "Submission required declaration is incomplete.";
        setIntegrityError(msg);
        showError(msg);
        openFacet("trust");
        return;
      }
      if (!submitRes.ok) throw new Error(submitData?.error || "Submit failed");

      setProjectStatus("pending");
      setStageOpen(false);
      showFeedback("Submitted for editorial review.");
    } catch (err: any) {
      showError(err.message || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevise() {
    setReviseBusy(true);
    try {
      const res  = await fetch("/api/creators/projects/revise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Revise failed");
      router.push(`/workspace/projects/${data.id}/edit`);
    } catch (err: any) {
      showError(err.message || "Revise failed");
      setReviseBusy(false);
    }
  }

  async function handleRemovalSubmit() {
    if (!removalReason.trim()) { showError("A reason is required for removal requests."); return; }
    setRemovalBusy(true);
    try {
      const res  = await fetch("/api/creators/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "requestRemoval", reason: removalReason.trim() }),
      });
      const data = await res.json();
      if (res.status === 409) throw new Error("A removal request has already been submitted.");
      if (!res.ok) throw new Error(data?.error || "Request failed");
      setRemovalRequested(true);
      setProjectStatus("removal_requested");
      setRemovalModalOpen(false);
      setRemovalReason("");
      showFeedback("Removal request submitted.");
    } catch (err: any) {
      showError(err.message || "Request failed");
    } finally {
      setRemovalBusy(false);
    }
  }

  const set = (key: keyof ProjectDraft) => (value: string) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  // ── Frame-level guards ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center w-full">
        <p className="text-ink-faint">Opening the workbench…</p>
      </div>
    );
  }
  if (errors.load || !draft) {
    return (
      <div className="flex-1 flex items-center justify-center w-full">
        <div className="text-center">
          <p className="text-brand-red text-sm mb-4">{errors.load || "Project not found"}</p>
          <Link href="/workspace/projects" className="text-sm" style={{ color: STUDIO_SIGNAL }}>Back to Worlds</Link>
        </div>
      </div>
    );
  }

  const isDraft   = projectStatus === "draft";
  const isLive    = projectStatus === "live";
  const isRejected = projectStatus === "rejected";
  const canDelete  = isDraft || isRejected;
  const trailer    = draft.trailerUrl.trim();
  const factLine   = [draft.type, draft.genre, draft.runtime].map((v) => v && v.trim()).filter(Boolean).join("  ·  ");

  const trustEstablished =
    integrity.rights_ownership_ack &&
    integrity.rights_collaborators_disclosed_ack &&
    integrity.rights_no_conflicts_ack &&
    integrity.rights_no_unlicensed_assets_ack &&
    (integrity.collaborators.trim() !== "" || integrity.no_collaborators_ack) &&
    integrity.ai_usage !== "" &&
    integrity.prior_distribution !== "" &&
    integrity.license_awareness_ack;

  const fitLabel: Record<string, string> = {
    black_creator: "Culture-led story",
    meaningful_black_characters: "Meaningful Black / Afro-descendant characters",
    both: "Black or Afro-influenced worldbuilding",
    edge_case: "Other cultural fit",
  };

  // ── Ribbon ────────────────────────────────────────────────────────────────
  const ribbon = (
    <div className="flex items-center justify-between gap-4 px-6 py-3 border-b border-white/8" style={{ background: "rgba(8,5,6,0.4)" }}>
      <div className="min-w-0 flex items-center gap-3">
        <span className="text-[11px] uppercase tracking-[0.24em] shrink-0" style={{ color: "rgba(255,255,255,0.34)" }}>World</span>
        <h1 className="truncate font-bold text-lg text-white tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          {draft.title.trim() || "Untitled world"}
        </h1>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {/* Trust posture gauge — single-glance; engaging it summons the declaration. */}
        <button
          onClick={() => openFacet("trust")}
          className="hidden sm:inline-flex items-center gap-1.5 text-[12px] transition hover:text-white"
          style={{ color: trustEstablished ? "#F6A31A" : "rgba(255,255,255,0.5)" }}
          title="Trust posture"
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: trustEstablished ? "#F6A31A" : "rgba(255,255,255,0.35)" }} />
          {trustEstablished ? "Trust · established" : "Trust · needs establishing"}
        </button>
        <span className="hidden sm:block w-px h-4" style={{ background: "rgba(255,255,255,0.12)" }} />
        <StatusBadge status={projectStatus} />
        {/* The single lifecycle-advance affordance lives here — never a bottom bar. */}
        {isDraft && (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-black transition active:scale-95 disabled:opacity-50"
            style={{ background: STUDIO_SIGNAL }}
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {submitting ? "Submitting…" : "Submit for review"}
          </button>
        )}
        {projectStatus === "approved" && (
          <Link href={`/license/${id}`} className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold text-black transition active:scale-95"
            style={{ background: licenseStatus === "executed" ? "rgba(255,255,255,0.85)" : STUDIO_SIGNAL }}>
            {licenseStatus === "executed" ? "View license" : "Review & sign license"}
          </Link>
        )}
        {isRejected && (
          <button onClick={handleRevise} disabled={reviseBusy}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-black transition active:scale-95 disabled:opacity-50"
            style={{ background: STUDIO_SIGNAL }}>
            {reviseBusy ? <Loader2 size={14} className="animate-spin" /> : null}
            {reviseBusy ? "Creating draft…" : "Revise"}
          </button>
        )}
        {isLive && !removalRequested && (
          <button onClick={() => setRemovalModalOpen(true)} className="text-[12px] transition hover:text-white" style={{ color: "rgba(245,197,24,0.75)" }}>
            Request removal
          </button>
        )}
        {canDelete && (
          <button onClick={handleDelete} className="text-[12px] transition hover:text-red-300" style={{ color: "rgba(255,255,255,0.3)" }}>
            Delete
          </button>
        )}
      </div>
    </div>
  );

  // ── Facet rail ──────────────────────────────────────────────────────────
  const rail = (
    <nav className="wb-rail h-full flex sm:flex-col gap-1 px-3 py-4 sm:w-[170px] border-b sm:border-b-0 sm:border-r border-white/8 overflow-x-auto sm:overflow-visible" style={{ background: "rgba(8,5,6,0.25)" }} aria-label="World facets">
      <p className="hidden sm:block text-[10px] uppercase tracking-[0.22em] px-2 mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>Facets</p>
      {FACETS.map((f) => {
        const active = activeFacet === f.key && stageOpen;
        return (
          <button
            key={f.key}
            onClick={() => openFacet(f.key)}
            className="text-left text-sm rounded-lg px-3 py-2 transition whitespace-nowrap"
            style={{
              background: active ? "rgba(224,118,58,0.14)" : "transparent",
              color: active ? "#F6A31A" : "rgba(255,255,255,0.6)",
              border: active ? "1px solid rgba(224,118,58,0.3)" : "1px solid transparent",
            }}
          >
            {f.label}
          </button>
        );
      })}
    </nav>
  );

  // ── Persistent center — the world as it reads ─────────────────────────────
  const facetRing = (f: Facet) =>
    activeFacet === f && stageOpen
      ? { boxShadow: "inset 2px 0 0 0 rgba(224,118,58,0.7)", background: "rgba(224,118,58,0.04)" }
      : undefined;

  const center = (
    <div className="relative">
      {draft.bannerUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={draft.bannerUrl} alt="" aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-64 w-full object-cover"
          style={{ opacity: 0.18, maskImage: "linear-gradient(180deg, rgba(0,0,0,0.9), transparent 90%)", WebkitMaskImage: "linear-gradient(180deg, rgba(0,0,0,0.9), transparent 90%)" }} />
      )}
      <article className="relative max-w-3xl mx-auto px-8 py-10 space-y-9">
        <p className="text-[11px] uppercase tracking-[0.28em]" style={{ color: "#F6A31A" }}>ShangoMaji Title · in the making</p>

        {/* Identity */}
        <button type="button" onClick={(e) => { e.stopPropagation(); openFacet("identity"); }}
          className="group block w-full text-left rounded-r-lg -mx-3 px-3 py-3 transition" style={facetRing("identity")}>
          <div className="flex gap-5 items-start">
            <div className="w-[104px] shrink-0 aspect-[2/3] rounded-lg overflow-hidden border" style={{ borderColor: "rgba(255,255,255,0.14)", background: "rgba(0,0,0,0.5)" }}>
              {draft.thumbUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={draft.thumbUrl} alt={draft.title} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center p-2 text-center"><span className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>the title's face</span></div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-white font-bold tracking-tight" style={{ fontFamily: "var(--font-display)", fontSize: "clamp(26px, 3.4vw, 40px)", lineHeight: 1.05 }}>
                {draft.title.trim() || "Untitled world"}
              </h2>
              {draft.logline.trim() && (
                <p className="mt-2 italic" style={{ fontFamily: "var(--font-display)", color: "rgba(255,255,255,0.76)", fontSize: "1.05rem" }}>{draft.logline.trim()}</p>
              )}
              <p className="mt-3 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>{factLine || (isDraft ? "Type · genre · runtime —" : "—")}</p>
              {isDraft && <span className="mt-2 inline-block text-[11px] opacity-0 group-hover:opacity-100 transition" style={{ color: STUDIO_SIGNAL }}>Shape identity →</span>}
            </div>
          </div>
        </button>

        {/* Premise */}
        <FacetReading label="Premise" onOpen={() => openFacet("premise")} ring={facetRing("premise")} editable={isDraft}>
          {draft.synopsis.trim()
            ? <p className="whitespace-pre-line" style={{ color: "rgba(255,255,255,0.82)", fontSize: "1.02rem", lineHeight: 1.75 }}>{draft.synopsis.trim()}</p>
            : <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>The world has no premise yet. {isDraft ? "Open to shape what this world is." : "—"}</p>}
        </FacetReading>

        {/* Thesis */}
        <FacetReading label="Why this belongs at ShangoMaji" onOpen={() => openFacet("thesis")} ring={facetRing("thesis")} editable={isDraft}>
          {integrity.thesis_path && (
            <p className="text-sm mb-2"><span style={{ color: "rgba(255,255,255,0.4)" }}>Declared fit · </span><span className="text-white">{fitLabel[integrity.thesis_path] || integrity.thesis_path}</span></p>
          )}
          {integrity.thesis_explanation.trim()
            ? <blockquote className="pl-4 italic whitespace-pre-line" style={{ borderLeft: "2px solid rgba(224,118,58,0.45)", color: "rgba(255,255,255,0.74)", lineHeight: 1.7 }}>{integrity.thesis_explanation.trim()}</blockquote>
            : <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>The curatorial case isn't made yet. {isDraft ? "Open to argue why this world belongs in the collection." : "—"}</p>}
        </FacetReading>

        {/* Trust — posture reading (the declaration itself is summoned) */}
        <FacetReading label="Trust & provenance" onOpen={() => openFacet("trust")} ring={facetRing("trust")} editable={isDraft}>
          <p className="text-sm" style={{ color: trustEstablished ? "#F6A31A" : "rgba(255,255,255,0.6)" }}>
            {trustEstablished ? "Standing established — ownership, collaborators, AI, and prior distribution declared." : "Standing not yet established. The declaration is summoned here."}
          </p>
        </FacetReading>

        {isRejected && rejectionReason && (
          <div className="rounded-lg border p-4" style={{ borderColor: "rgba(220,38,38,0.25)", background: "rgba(220,38,38,0.06)" }}>
            <p className="text-[11px] uppercase tracking-[0.16em] mb-1.5" style={{ color: "rgba(252,165,165,0.7)" }}>Notes from ShangoMaji</p>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.82)", lineHeight: 1.6 }}>{rejectionReason}</p>
          </div>
        )}
      </article>
    </div>
  );

  // ── Side-stage instrument for the active facet ────────────────────────────
  const stageContent = (
    <div className="world-stage space-y-6">
      {!isDraft && (
        <p className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: "rgba(255,255,255,0.45)" }}>
          <Lock size={11} className="opacity-70" /> Settled with the label — read-only in this state.
        </p>
      )}

      {activeFacet === "identity" && (
        isDraft ? (
          <>
            <StageField label="Name" hint="What is this world called?">
              <input value={draft.title} onChange={(e) => set("title")(e.target.value)} placeholder="Name your world" />
            </StageField>
            {errors.title && <p className="text-xs text-brand-red -mt-3">{errors.title}</p>}
            <StageField label="Logline" hint="One line that captures it.">
              <input value={draft.logline} onChange={(e) => set("logline")(e.target.value)} placeholder="A young warrior…" />
            </StageField>
            <StageField label="Type">
              <div className="grid grid-cols-3 gap-2">
                {TYPES.map((t) => (
                  <button key={t} type="button" onClick={() => set("type")(t)}
                    className="py-2.5 rounded-lg border text-sm transition"
                    style={draft.type === t ? { background: STUDIO_SIGNAL, color: "#000", borderColor: "transparent" } : { borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)" }}>
                    {t}
                  </button>
                ))}
              </div>
            </StageField>
            <StageField label="Genre">
              <div className="flex flex-wrap gap-2">
                {GENRES.map((g) => (
                  <button key={g} type="button" onClick={() => set("genre")(g)}
                    className="px-3 py-1.5 rounded-lg border text-xs transition"
                    style={draft.genre === g ? { background: STUDIO_SIGNAL, color: "#000", borderColor: "transparent" } : { borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)" }}>
                    {g}
                  </button>
                ))}
              </div>
            </StageField>
            <StageField label="Runtime / Episodes" hint="Optional.">
              <input value={draft.runtime} onChange={(e) => set("runtime")(e.target.value)} placeholder="e.g., 6 x 22min" />
            </StageField>
            <StageUpload label="Key art (the title's face)" busy={uploading.poster} preview={draft.thumbUrl} ratio="2/3"
              onFile={async (f) => { try { const url = await uploadFile(f, "poster"); set("thumbUrl")(url); } catch (e: any) { setErrors((p) => ({ ...p, thumbUrl: e.message })); } }}
              onClear={draft.thumbUrl ? () => set("thumbUrl")("") : undefined} />
            <StageUpload label="Hero image (the world's backdrop)" busy={uploading.banner} preview={draft.bannerUrl} ratio="16/9"
              onFile={async (f) => { try { const url = await uploadFile(f, "banner"); set("bannerUrl")(url); } catch (e: any) { setErrors((p) => ({ ...p, bannerUrl: e.message })); } }}
              onClear={draft.bannerUrl ? () => set("bannerUrl")("") : undefined} />
            <StageField label="Trailer link" hint="Renders as a single Watch-trailer action.">
              <input value={draft.trailerUrl} onChange={(e) => set("trailerUrl")(e.target.value)} placeholder="https://…" />
            </StageField>
          </>
        ) : (
          <div className="space-y-3">
            {[["Title", draft.title], ["Logline", draft.logline], ["Type", draft.type], ["Genre", draft.genre], ["Runtime", draft.runtime], ["Trailer", draft.trailerUrl]].map(([l, v]) => (
              <div key={l} className="flex gap-4"><span className="w-24 shrink-0 text-[11px] uppercase tracking-[0.14em] pt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{l}</span><span className="text-sm text-white/80">{v && v.trim() ? v : "—"}</span></div>
            ))}
          </div>
        )
      )}

      {activeFacet === "premise" && (
        isDraft ? (
          <StageField label="What is this world?" hint="Write it the way you'd want it read.">
            <textarea value={draft.synopsis} onChange={(e) => set("synopsis")(e.target.value)} rows={14} placeholder="What is this world, and what unfolds in it?" />
          </StageField>
        ) : (
          <p className="whitespace-pre-line text-sm" style={{ color: "rgba(255,255,255,0.8)", lineHeight: 1.7 }}>{draft.synopsis.trim() || "—"}</p>
        )
      )}

      {activeFacet === "thesis" && (
        <SubmissionIntegrityForm value={integrity} onChange={setIntegrity} disabled={!isDraft} zone="thesis" />
      )}

      {activeFacet === "trust" && (
        <>
          <SubmissionIntegrityForm value={integrity} onChange={setIntegrity} disabled={!isDraft} fieldError={integrityError} zone="trust" />
          <div className="pt-2">
            <p className="text-[11px] uppercase tracking-widest inline-flex items-center gap-1.5 mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
              <Lock size={11} className="opacity-70" /> Private review screener
            </p>
            {isDraft ? (
              <div className="world-stage"><StageField label="Screener URL" hint="Shared with ShangoMaji review only.">
                <input value={draft.sampleUrl} onChange={(e) => set("sampleUrl")(e.target.value)} placeholder="https://…" />
              </StageField></div>
            ) : (
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>{draft.sampleUrl.trim() || "— none provided"}</p>
            )}
          </div>
        </>
      )}

      <style jsx global>{`
        .world-stage input, .world-stage textarea {
          width: 100%;
          background: rgba(0,0,0,0.35);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 0.6rem;
          padding: 0.7rem 0.85rem;
          color: white;
          font-size: 0.92rem;
          outline: none;
          transition: border-color 0.2s;
          resize: vertical;
        }
        .world-stage input:focus, .world-stage textarea:focus { border-color: rgba(224,118,58,0.55); }
        .world-stage input::placeholder, .world-stage textarea::placeholder { color: rgba(255,255,255,0.3); }
      `}</style>
    </div>
  );

  return (
    <>
      {dialog}
      {removalModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} onClick={() => { setRemovalModalOpen(false); setRemovalReason(""); }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 440, margin: "0 16px", padding: "28px 24px 20px", borderRadius: 16, background: "#1a1210", border: "1px solid rgba(255,255,255,0.12)" }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "white" }}>Request Removal</h3>
            <p style={{ margin: "10px 0 16px", fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>"{draft.title}" will remain live while this request is reviewed.</p>
            <textarea value={removalReason} onChange={(e) => setRemovalReason(e.target.value)} placeholder="Reason for removal request…" rows={3}
              style={{ width: "100%", background: "rgba(26,26,26,1)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 12px", color: "white", fontSize: 14, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
              <button onClick={() => { setRemovalModalOpen(false); setRemovalReason(""); }} style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "rgba(255,255,255,0.6)", fontSize: 14, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleRemovalSubmit} disabled={removalBusy} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "rgba(234,179,8,0.9)", color: "black", fontWeight: 600, fontSize: 14, cursor: removalBusy ? "not-allowed" : "pointer", opacity: removalBusy ? 0.6 : 1 }}>{removalBusy ? "Submitting…" : "Submit Request"}</button>
            </div>
          </div>
        </div>
      )}

      {feedback && (
        <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 90, padding: "10px 18px", borderRadius: 10, background: "rgba(52,211,153,0.14)", border: "1px solid rgba(52,211,153,0.35)", fontSize: 13, color: "rgba(167,243,208,0.95)" }}>{feedback}</div>
      )}
      {errors.save && (
        <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 90, padding: "10px 18px", borderRadius: 10, background: "rgba(220,38,38,0.12)", border: "1px solid rgba(220,38,38,0.3)", fontSize: 13, color: "rgba(252,165,165,0.95)" }}>{errors.save}</div>
      )}

      <RoomLayout
        ribbon={ribbon}
        rail={rail}
        center={center}
        stage={{ open: stageOpen, title: FACET_TITLE[activeFacet], onClose: closeStage, children: stageContent }}
      />
    </>
  );
}

function FacetReading({ label, onOpen, ring, editable, children }: { label: string; onOpen: () => void; ring?: React.CSSProperties; editable: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); onOpen(); }} className="group block w-full text-left rounded-r-lg -mx-3 px-3 py-3 transition" style={ring}>
      <p className="text-[11px] uppercase tracking-[0.22em] mb-2" style={{ color: "rgba(255,255,255,0.42)" }}>{label}</p>
      {children}
      {editable && <span className="mt-2 inline-block text-[11px] opacity-0 group-hover:opacity-100 transition" style={{ color: "#E0763A" }}>Shape →</span>}
    </button>
  );
}

function StageField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-white">{label}</label>
      {hint && <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{hint}</p>}
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function StageUpload({ label, busy, preview, ratio, onFile, onClear }: { label: string; busy?: boolean; preview: string; ratio: string; onFile: (f: File) => void | Promise<void>; onClear?: () => void }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-white">{label}</label>
      <div className="flex items-center gap-3">
        <div className="rounded-lg overflow-hidden border shrink-0" style={{ width: ratio === "2/3" ? 72 : 128, aspectRatio: ratio, borderColor: "rgba(255,255,255,0.14)", background: "rgba(0,0,0,0.5)" }}>
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center"><ImagePlus size={16} style={{ color: "rgba(255,255,255,0.3)" }} /></div>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition hover:bg-white/10" style={{ borderColor: "rgba(255,255,255,0.18)", color: "white" }}>
            {busy ? <Loader2 size={12} className="animate-spin" /> : <ImagePlus size={12} />}
            {preview ? "Replace" : "Add"}
            <input type="file" accept={ACCEPT} disabled={busy} className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) await onFile(f); }} />
          </label>
          {onClear && <button type="button" onClick={onClear} className="text-[11px] text-left transition hover:text-white" style={{ color: "rgba(255,255,255,0.35)" }}>Remove</button>}
        </div>
      </div>
    </div>
  );
}
