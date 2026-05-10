"use client";

// Phase 6 Tier 2.5 — Creator Media Package page.
//
// A media-only flow that lets the creator add or refresh promotional
// deliverables on an APPROVED work without re-opening the full editor.
//
// State rules (mirrors the server-side gate at
// src/app/api/creators/projects/route.ts PUT):
//   - draft           → this page redirects the creator to the regular
//                       edit page (full edit is the right surface there)
//   - approved | live → media inputs editable; core metadata locked
//                       (same five-key whitelist applies to both)
//   - all else        → page renders a read-only "locked" notice
//
// Phase 6 Tier 2.5 Final Correction: `live` joins `approved` as an
// editable media-package state per founder direction (pre-launch
// packaging workflow). The page no longer carries a `readOnly`
// branch.
//
// Editable here:
//   • cover_image_url (Poster / Thumbnail)
//   • banner_url      (Banner)
//   • stills_urls     (Stills, ordered)
//   • trailer_url     (outbound link)
//   • deliverables    (checklist tag set)
//
// Locked (NOT shown as inputs):
//   • title, type, genre, logline, synopsis, runtime
//   • thesis declaration, rights attestations, AI disclosure,
//     prior distribution, license awareness
//   • license term + signature data
//   • sample/screener URL (private creator → admin asset; not part of
//     the post-approval media-package update flow)
//
// Server still enforces all of the above. This client renders the
// minimal surface; the API rejects anything outside the whitelist.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, Lock } from "lucide-react";
import { Card, SectionHeading, GradientButton, StatusBadge, UploadField } from "../../../components";

interface PageProps {
  params: { id: string };
}

const DELIVERABLES = ["Poster", "Banner", "Trailer", "Full Episode", "Stills"];

type LoadedProject = {
  id:               string;
  title:            string;
  status:           string;
  cover_image_url:  string | null;
  banner_url:       string | null;
  trailer_url:      string | null;
  stills_urls:      string[] | null;
  deliverables:     string[] | null;
  license_status?:  "executed" | "none";
};

type MediaDraft = {
  thumbUrl:     string;
  bannerUrl:    string;
  trailerUrl:   string;
  stillsUrls:   string[];
  deliverables: string[];
};

const emptyDraft: MediaDraft = {
  thumbUrl:     "",
  bannerUrl:    "",
  trailerUrl:   "",
  stillsUrls:   [],
  deliverables: [],
};

export default function WorkspaceMediaPackagePage({ params }: PageProps) {
  const { id }   = params;
  const router   = useRouter();

  const [project, setProject]   = useState<LoadedProject | null>(null);
  const [draft, setDraft]       = useState<MediaDraft>(emptyDraft);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState<string>("");
  const [feedback, setFeedback] = useState<string>("");
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadProject() {
      try {
        const res  = await fetch("/api/creators/projects");
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Could not load project");
        const found: LoadedProject | undefined =
          (data.projects ?? []).find((p: LoadedProject) => p.id === id);
        if (!found) {
          setError("Project not found.");
          setLoading(false);
          return;
        }
        setProject(found);
        setDraft({
          thumbUrl:     found.cover_image_url || "",
          bannerUrl:    found.banner_url      || "",
          trailerUrl:   found.trailer_url     || "",
          stillsUrls:   found.stills_urls     || [],
          deliverables: found.deliverables    || [],
        });
      } catch (err: any) {
        setError(err.message || "Could not load project");
      } finally {
        setLoading(false);
      }
    }
    loadProject();
  }, [id]);

  // Drafts go to the full editor — that's the right surface for full
  // edit. This page is for approved-state media-only updates.
  useEffect(() => {
    if (!loading && project && project.status === "draft") {
      router.replace(`/workspace/projects/${id}/edit`);
    }
  }, [loading, project, id, router]);

  function showFeedback(msg: string) {
    setFeedback(msg);
    setTimeout(() => setFeedback(""), 2500);
  }

  function showError(msg: string) {
    setError(msg);
    setTimeout(() => setError(""), 3500);
  }

  async function uploadFile(file: File, assetType: string): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("assetType", assetType);
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

  function toggleDeliverable(item: string) {
    setDraft((d) => {
      const exists = d.deliverables.includes(item);
      return {
        ...d,
        deliverables: exists ? d.deliverables.filter((x) => x !== item) : [...d.deliverables, item],
      };
    });
  }

  async function saveMedia() {
    if (!project) return;
    setSaving(true);
    setSaved(false);
    try {
      const res  = await fetch("/api/creators/projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          // Phase 6 Tier 2.5 — only the media-package whitelist is
          // sent. The server enforces the same whitelist; any extra
          // field would be silently dropped, but we keep the payload
          // narrow for clarity.
          cover_image_url: draft.thumbUrl.trim()   || null,
          banner_url:      draft.bannerUrl.trim()  || null,
          trailer_url:     draft.trailerUrl.trim() || null,
          stills_urls:     draft.stillsUrls,
          deliverables:    draft.deliverables,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save failed");
      setSaved(true);
      showFeedback("Media package saved.");
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      showError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="animate-spin text-ink-faint" size={20} />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="space-y-4 pb-10">
        <Link
          href="/workspace/projects"
          className="text-ink-faint text-sm hover:text-white inline-flex items-center gap-1.5"
        >
          <ArrowLeft size={14} /> Back to My Works
        </Link>
        <Card>
          <p className="text-sm text-red-300/80">{error || "Project not found."}</p>
        </Card>
      </div>
    );
  }

  // Locked notice for any state that is not draft / approved / live.
  // Draft is already redirected above; approved is the editable case
  // below; live is the read-only case below (founder rule: live media
  // changes are not direct-edit in this phase).
  const allowedStates = new Set(["approved", "live"]);
  if (!allowedStates.has(project.status)) {
    return (
      <div className="space-y-4 pb-10">
        <Link
          href="/workspace/projects"
          className="text-ink-faint text-sm hover:text-white inline-flex items-center gap-1.5"
        >
          <ArrowLeft size={14} /> Back to My Works
        </Link>
        <Card className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-white font-semibold text-base">{project.title}</p>
            <StatusBadge status={project.status} />
          </div>
          <p className="text-sm text-ink-muted leading-relaxed">
            The media package opens after approval. Core work details remain locked under review.
          </p>
        </Card>
      </div>
    );
  }

  const licenseExecuted = project.license_status === "executed";
  // Phase 6 Tier 2.5 Final Correction — both approved and live render
  // the same editable surface. The previous `readOnly` derivation has
  // been removed; the page is uniformly editable for the two states
  // that reach this render path. The server-side PUT applies the same
  // five-key whitelist to both, so the boundary is enforced even if
  // the UI ever drifts.
  const isLive = project.status === "live";

  return (
    <div className="space-y-6 pb-10">
      <div>
        <Link
          href="/workspace/projects"
          className="text-ink-faint text-sm hover:text-white inline-flex items-center gap-1.5 mb-3"
        >
          <ArrowLeft size={14} /> Back to My Works
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <h1
            className="font-bold text-2xl text-white tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Media package
          </h1>
          <StatusBadge status={project.status} />
          {licenseExecuted && (
            <span className="text-[11px] px-2.5 py-1 rounded-full border bg-emerald-500/10 text-emerald-300 border-emerald-500/30">
              License executed
            </span>
          )}
        </div>
        <p className="text-ink-faint text-sm mt-1">
          {project.title}
        </p>
        {/* Phase 7.3: three-state copy distinguishes live distribution
            from approved-and-licensed (awaiting activation) from
            approved-pending-license. The locked boundary is named in
            every variant so creators see what's editable vs settled. */}
        <p className="text-ink-muted text-xs mt-2 max-w-2xl leading-relaxed">
          {isLive
            ? "Update your release assets at any time. Core work details remain locked under the active license."
            : licenseExecuted
            ? "Add your release assets. Core work details remain locked. ShangoMaji will activate distribution after review."
            : "Add your release assets. Core work details remain locked. Media is required for activation."}
        </p>
      </div>

      {feedback && (
        <div
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            background: "rgba(52,211,153,0.1)",
            border: "1px solid rgba(52,211,153,0.3)",
            fontSize: 13,
            color: "rgba(52,211,153,0.9)",
          }}
        >
          {feedback}
        </div>
      )}

      {error && (
        <div
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            background: "rgba(220,38,38,0.08)",
            border: "1px solid rgba(220,38,38,0.25)",
            fontSize: 13,
            color: "rgba(252,165,165,0.9)",
          }}
        >
          {error}
        </div>
      )}

      <Card className="space-y-6">
        <SectionHeading title="Promotional artwork" />

        <UploadField
          label="Poster / Thumbnail"
          hint="Square or 2:3 portrait recommended."
          accept="image/*"
          uploading={uploading.poster}
          preview={
            draft.thumbUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={draft.thumbUrl} alt="Poster" className="h-24 w-auto rounded-lg object-cover" />
            ) : null
          }
          onFile={async (file) => {
            try {
              const url = await uploadFile(file, "poster");
              setDraft((d) => ({ ...d, thumbUrl: url }));
            } catch (err: any) {
              showError(err.message || "Upload failed");
            }
          }}
          onRemove={draft.thumbUrl ? () => setDraft((d) => ({ ...d, thumbUrl: "" })) : undefined}
        />

        <UploadField
          label="Banner"
          hint="Wide cinematic image used in hero contexts."
          accept="image/*"
          uploading={uploading.banner}
          preview={
            draft.bannerUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={draft.bannerUrl} alt="Banner" className="h-24 w-auto rounded-lg object-cover" />
            ) : null
          }
          onFile={async (file) => {
            try {
              const url = await uploadFile(file, "banner");
              setDraft((d) => ({ ...d, bannerUrl: url }));
            } catch (err: any) {
              showError(err.message || "Upload failed");
            }
          }}
          onRemove={draft.bannerUrl ? () => setDraft((d) => ({ ...d, bannerUrl: "" })) : undefined}
        />

        <UploadField
          label="Stills"
          hint="Two or more stills appear as a release gallery on your public title page."
          accept="image/*"
          uploading={uploading.still}
          preview={
            draft.stillsUrls.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {draft.stillsUrls.map((url, i) => (
                  <div key={`${url}-${i}`} className="relative aspect-video rounded-lg overflow-hidden border border-white/8">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((d) => ({
                          ...d,
                          stillsUrls: d.stillsUrls.filter((_, idx) => idx !== i),
                        }))
                      }
                      className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] hover:bg-black/80"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : null
          }
          onFile={async (file) => {
            try {
              const url = await uploadFile(file, "still");
              setDraft((d) => ({ ...d, stillsUrls: [...d.stillsUrls, url] }));
            } catch (err: any) {
              showError(err.message || "Upload failed");
            }
          }}
        />
      </Card>

      <Card className="space-y-6">
        <SectionHeading title="Trailer & deliverables" />

        <Field label="Trailer URL" hint="An outbound link. Your public title page renders this as a single “Watch trailer” button.">
          <input
            value={draft.trailerUrl}
            onChange={(e) => setDraft((d) => ({ ...d, trailerUrl: e.target.value }))}
            placeholder="https://youtube.com/... or direct link"
          />
        </Field>

        <Field label="Deliverables" hint="These assets ship with your release.">
          <div className="space-y-2">
            {DELIVERABLES.map((item) => {
              const on = draft.deliverables.includes(item);
              return (
                <label
                  key={item}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg border cursor-pointer ${
                    on ? "border-white/20 bg-white/5" : "border-white/10"
                  }`}
                >
                  <span className="text-sm text-white">{item}</span>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggleDeliverable(item)}
                    style={{ accentColor: "#f5c518" }}
                  />
                </label>
              );
            })}
          </div>
        </Field>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-[11px] text-ink-muted leading-relaxed max-w-md inline-flex items-start gap-1.5">
          <Lock size={12} className="mt-[2px] shrink-0 opacity-70" aria-hidden="true" />
          <span>
            Saving updates only the assets above. Title, logline, synopsis, rights and
            license terms remain locked.
          </span>
        </p>
        <GradientButton onClick={saveMedia} disabled={saving}>
          {saving ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Saving…
            </>
          ) : saved ? (
            "Saved"
          ) : (
            <>
              <Save size={14} />
              Save media package
            </>
          )}
        </GradientButton>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  // Mirrors the `.workspace-field` styling used by the New Project + Edit
  // pages so trailer URL / text inputs render with the same dark
  // background and focus ring as the rest of the workspace.
  return (
    <div className="workspace-field space-y-1.5">
      <label className="block text-sm font-medium text-white">{label}</label>
      {hint && <p className="text-xs text-ink-faint">{hint}</p>}
      <div className="space-y-2">{children}</div>
      <style jsx global>{`
        .workspace-field input[type="text"],
        .workspace-field input:not([type]),
        .workspace-field textarea {
          width: 100%;
          background: rgba(26, 26, 26, 1);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.75rem;
          padding: 0.75rem 1rem;
          color: white;
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .workspace-field input[type="text"]:focus,
        .workspace-field input:not([type]):focus,
        .workspace-field textarea:focus {
          border-color: rgba(240, 112, 48, 0.5);
        }
        .workspace-field input[type="text"]::placeholder,
        .workspace-field input:not([type])::placeholder,
        .workspace-field textarea::placeholder {
          color: rgba(120, 120, 120, 1);
        }
      `}</style>
    </div>
  );
}
