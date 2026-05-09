"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Image as ImageIcon, Film, MonitorPlay, Link as LinkIcon, ArrowUpRight } from "lucide-react";
import { Card, StatusBadge, ItemActions, useConfirm } from "../components";

type RawProject = {
  id: string;
  title: string;
  status: string;
  cover_image_url: string | null;
  banner_url: string | null;
  stills_urls: string[] | null;
  trailer_url: string | null;
  sample_url: string | null;
};

type MediaItem = {
  type: string;
  url: string;
  projectId: string;
  projectTitle: string;
  projectStatus: string;
  isLink: boolean;
  /** field on the project that holds this URL */
  field: string;
  /** index within stills_urls array, if applicable */
  stillIndex?: number;
};

const FILTERS = ["All", "Poster", "Banner", "Still", "Trailer", "Sample"];

export default function WorkspaceMedia() {
  const [filter, setFilter] = useState("All");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const { confirm, dialog } = useConfirm();

  useEffect(() => {
    loadMedia();
  }, []);

  async function loadMedia() {
    try {
      const res = await fetch("/api/creators/projects");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not load projects");

      const items: MediaItem[] = [];

      for (const project of (data.projects ?? []) as RawProject[]) {
        if (project.cover_image_url) {
          items.push({
            type: "Poster",
            url: project.cover_image_url,
            projectId: project.id,
            projectTitle: project.title,
            projectStatus: project.status,
            isLink: false,
            field: "cover_image_url",
          });
        }
        if (project.banner_url) {
          items.push({
            type: "Banner",
            url: project.banner_url,
            projectId: project.id,
            projectTitle: project.title,
            projectStatus: project.status,
            isLink: false,
            field: "banner_url",
          });
        }
        if (project.stills_urls?.length) {
          for (let i = 0; i < project.stills_urls.length; i++) {
            items.push({
              type: "Still",
              url: project.stills_urls[i],
              projectId: project.id,
              projectTitle: project.title,
              projectStatus: project.status,
              isLink: false,
              field: "stills_urls",
              stillIndex: i,
            });
          }
        }
        if (project.trailer_url) {
          items.push({
            type: "Trailer",
            url: project.trailer_url,
            projectId: project.id,
            projectTitle: project.title,
            projectStatus: project.status,
            isLink: true,
            field: "trailer_url",
          });
        }
        if (project.sample_url) {
          items.push({
            type: "Sample",
            url: project.sample_url,
            projectId: project.id,
            projectTitle: project.title,
            projectStatus: project.status,
            isLink: true,
            field: "sample_url",
          });
        }
      }

      setMedia(items);
    } catch (err: any) {
      setError(err.message || "Could not load media");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    if (filter === "All") return media;
    return media.filter((item) => item.type === filter);
  }, [filter, media]);

  function showFeedback(msg: string) {
    setFeedback(msg);
    setTimeout(() => setFeedback(""), 2500);
  }

  async function handleDeleteMedia(item: MediaItem) {
    const ok = await confirm({
      title: "Delete Media",
      description: `This will remove this ${item.type.toLowerCase()} from "${item.projectTitle}". The file will no longer be linked to the project.`,
      confirmLabel: `Delete ${item.type}`,
      destructive: true,
    });
    if (!ok) return;

    try {
      // Build the update payload to null out the media field on the project
      const update: Record<string, any> = { id: item.projectId };

      if (item.field === "stills_urls") {
        // Fetch current project stills and remove by URL (not index, which can go stale)
        const res = await fetch("/api/creators/projects");
        const data = await res.json();
        const project = (data.projects ?? []).find((p: any) => p.id === item.projectId);
        const currentStills: string[] = project?.stills_urls ?? [];
        // Remove only the first occurrence of this URL to handle duplicates safely
        let removed = false;
        update.stills_urls = currentStills.filter((url: string) => {
          if (!removed && url === item.url) { removed = true; return false; }
          return true;
        });
      } else {
        update[item.field] = null;
      }

      const res = await fetch("/api/creators/projects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Delete failed");

      // Remove from local state
      setMedia((prev) =>
        prev.filter((m) => !(m.projectId === item.projectId && m.field === item.field && m.url === item.url))
      );
      showFeedback(`${item.type} removed from "${item.projectTitle}".`);
    } catch (err: any) {
      setError(err.message || "Could not delete media");
    }
  }

  return (
    <div className="space-y-6 pb-10">
      {dialog}

      <div>
        <h1
          className="font-bold text-2xl text-white tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Media Library
        </h1>
        <p className="text-ink-faint text-sm mt-1">
          All assets uploaded across your projects.
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
              filter === f
                ? "border-white/20 bg-white/10 text-white"
                : "border-white/10 text-ink-faint hover:border-white/20 hover:text-white"
            }`}
          >
            {f}
          </button>
        ))}
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

      {loading && (
        <p className="text-ink-faint text-sm">Loading media...</p>
      )}

      {error && (
        <p className="text-brand-red text-sm">{error}</p>
      )}

      {/* Phase 6 Tier 2.5 fix v2 — empty-state copy distinguishes
          "no media saved on any work yet" from "filter excludes
          everything we have". Neither path implies a submission flow;
          both point the creator at the work-side media-package action. */}
      {!loading && !error && filtered.length === 0 && (
        <Card className="text-center py-8 space-y-2">
          <p className="text-ink-faint text-sm">
            {filter === "All"
              ? "No media assets attached yet."
              : "No media matches this filter."}
          </p>
          {filter === "All" && (
            <p className="text-ink-muted text-xs">
              Choose a work to add or view its media package.
            </p>
          )}
          <div className="pt-2">
            <Link
              href="/workspace/projects"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/15 text-white hover:bg-white/10 transition"
            >
              Choose Work for Media
            </Link>
          </div>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((item, i) => {
          // Phase 6 Tier 2.5 fix v2 — route to the right per-work
          // surface based on status:
          //   - draft / rejected → full editor (existing behavior)
          //   - approved / live  → media package page (Tier 2.5 surface)
          //   - other            → no per-card "edit" affordance (the
          //                        item is read-only at this layer)
          const isMediaPackageState =
            item.projectStatus === "approved" || item.projectStatus === "live";
          const isFullEditState =
            item.projectStatus === "draft" || item.projectStatus === "rejected";
          const projectHref = isMediaPackageState
            ? `/workspace/projects/${item.projectId}/media`
            : isFullEditState
            ? `/workspace/projects/${item.projectId}/edit`
            : undefined;
          // Sample / screener stays a creator/admin-private asset. Do NOT
          // expose it for inline deletion alongside public-facing assets.
          // Removing requires the draft surface (existing behavior).
          const allowDelete = item.field !== "sample_url" && isFullEditState;

          return (
          <Card key={`${item.projectId}-${item.field}-${i}`} className="space-y-3">
            {item.isLink ? (
              <div className="h-36 rounded-lg overflow-hidden bg-black/30 border border-white/5 flex items-center justify-center">
                <div className="text-center">
                  <AssetIcon type={item.type} />
                  <p className="text-ink-faint text-xs mt-2">{item.type} link</p>
                </div>
              </div>
            ) : (
              <div className="h-36 rounded-lg overflow-hidden bg-black/30 border border-white/5">
                <img src={item.url} alt={`${item.type} for ${item.projectTitle}`} className="w-full h-full object-cover" />
              </div>
            )}

            {/* Info + project linkage */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-white font-semibold text-sm">
                  {item.type}
                  {item.field === "sample_url" && (
                    <span
                      className="ml-2 text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded border align-middle bg-yellow-500/10 text-yellow-300 border-yellow-500/30"
                      title="Sample / screener URL is creator/admin private. Not part of the public media package."
                    >
                      Private
                    </span>
                  )}
                </p>
                {projectHref ? (
                  <Link
                    href={projectHref}
                    className="text-ink-faint text-xs hover:text-brand-orange transition"
                  >
                    {item.projectTitle}
                  </Link>
                ) : (
                  <span className="text-ink-faint text-xs">{item.projectTitle}</span>
                )}
              </div>
              <StatusBadge status={item.projectStatus} />
            </div>

            {/* Standardized actions: Edit (go to project), Delete */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-ink-faint">
                <AssetIcon type={item.type} />
                <span>{item.isLink ? "External link" : "Uploaded image"}</span>
              </div>
              <ItemActions
                editHref={projectHref}
                onDelete={allowDelete ? () => handleDeleteMedia(item) : undefined}
              />
            </div>
          </Card>
          );
        })}
      </div>
    </div>
  );
}

function AssetIcon({ type }: { type: string }) {
  if (type === "Trailer") return <MonitorPlay size={14} className="text-brand-orange" />;
  if (type === "Banner") return <ImageIcon size={14} className="text-brand-orange" />;
  if (type === "Poster") return <Film size={14} className="text-brand-orange" />;
  if (type === "Sample") return <LinkIcon size={14} className="text-brand-orange" />;
  return <ImageIcon size={14} className="text-brand-orange" />;
}
