"use client";

// Phase 6 Tier 2.5 — Creator Media Package page.
//
// A media-only flow that lets the creator add or refresh promotional
// deliverables on an APPROVED work without re-opening the full editor.
//
// State rules (mirrors the server-side gate at
// src/app/api/creators/projects/route.ts PUT):
//   - draft     → this page redirects the creator to the regular edit page
//                 (full edit is the right surface there)
//   - approved  → media inputs editable; core metadata locked
//   - all else  → page renders a read-only "locked" notice
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
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { Card, SectionHeading, GradientButton, StatusBadge } from "../../../components";

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

  // Locked notice for any state that is not draft / approved. Draft is
  // already redirected above; approved is the editable case below.
  const allowedStates = new Set(["approved"]);
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
            The media package can be added or updated only after approval. Core work
            details are locked after review.
          </p>
        </Card>
      </div>
    );
  }

  const licenseExecuted = project.license_status === "executed";

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
        <p className="text-ink-muted text-xs mt-2 max-w-2xl leading-relaxed">
          Add the assets required for distribution activation. Core work details
          are locked after review.
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

        <Field label="Poster / Thumbnail" hint="Square or 2:3 portrait recommended.">
          {draft.thumbUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={draft.thumbUrl}
              alt="Poster"
              className="h-24 w-auto rounded-lg object-cover mb-2"
            />
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const url = await uploadFile(file, "poster");
                  setDraft((d) => ({ ...d, thumbUrl: url }));
                } catch (err: any) {
                  showError(err.message || "Upload failed");
                }
              }}
              className="text-xs text-ink-faint"
            />
            {uploading.poster && <Loader2 size={14} className="animate-spin text-ink-faint" />}
            {draft.thumbUrl && (
              <button
                type="button"
                onClick={() => setDraft((d) => ({ ...d, thumbUrl: "" }))}
                className="text-[11px] text-ink-faint hover:text-white"
              >
                Remove
              </button>
            )}
          </div>
        </Field>

        <Field label="Banner" hint="Wide cinematic image used in hero contexts.">
          {draft.bannerUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={draft.bannerUrl}
              alt="Banner"
              className="h-24 w-auto rounded-lg object-cover mb-2"
            />
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const url = await uploadFile(file, "banner");
                  setDraft((d) => ({ ...d, bannerUrl: url }));
                } catch (err: any) {
                  showError(err.message || "Upload failed");
                }
              }}
              className="text-xs text-ink-faint"
            />
            {uploading.banner && <Loader2 size={14} className="animate-spin text-ink-faint" />}
            {draft.bannerUrl && (
              <button
                type="button"
                onClick={() => setDraft((d) => ({ ...d, bannerUrl: "" }))}
                className="text-[11px] text-ink-faint hover:text-white"
              >
                Remove
              </button>
            )}
          </div>
        </Field>

        <Field label="Stills" hint="Two or more stills render as a release gallery.">
          {draft.stillsUrls.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-2">
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
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const url = await uploadFile(file, "still");
                  setDraft((d) => ({ ...d, stillsUrls: [...d.stillsUrls, url] }));
                  // Reset the input so re-uploading the same file fires onChange.
                  e.target.value = "";
                } catch (err: any) {
                  showError(err.message || "Upload failed");
                }
              }}
              className="text-xs text-ink-faint"
            />
            {uploading.still && <Loader2 size={14} className="animate-spin text-ink-faint" />}
          </div>
        </Field>
      </Card>

      <Card className="space-y-6">
        <SectionHeading title="Trailer & deliverables" />

        <Field label="Trailer URL" hint="Outbound link only. The public title page renders this as a single &ldquo;Watch trailer&rdquo; link.">
          <input
            value={draft.trailerUrl}
            onChange={(e) => setDraft((d) => ({ ...d, trailerUrl: e.target.value }))}
            placeholder="https://youtube.com/... or direct link"
          />
        </Field>

        <Field label="Deliverables" hint="Track which assets are committed for this work.">
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
        <p className="text-[11px] text-ink-muted leading-relaxed max-w-md">
          Saving updates only the assets above. Title, logline, synopsis, rights and
          license terms remain locked.
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
