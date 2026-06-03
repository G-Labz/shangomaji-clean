"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { PublicReadiness } from "@/lib/public-visibility";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`p-5 rounded-xl bg-surface-raised border border-white/8 ${className}`}>
      {children}
    </div>
  );
}

export function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-white font-semibold" style={{ fontFamily: "var(--font-display)" }}>
          {title}
        </h2>
        {description && <p className="text-ink-faint text-sm mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}

const STATUS_DISPLAY: Record<string, string> = {
  draft:             "Draft",
  pending:           "Pending",
  in_review:         "In Review",
  approved:          "Approved",
  rejected:          "Rejected",
  live:              "Live",
  archived:          "Archived",
  removal_requested: "Removal Requested",
  removed:           "Removed",
};

export function statusLabel(status: string): string {
  return STATUS_DISPLAY[status] || "Draft";
}

export function StatusBadge({ status }: { status: string }) {
  const display = statusLabel(status);

  const styles: Record<string, string> = {
    Draft:                "bg-white/5 text-ink-faint border-white/10",
    Pending:              "bg-yellow-500/10 text-yellow-300 border-yellow-500/30",
    "In Review":          "bg-blue-500/10 text-blue-300 border-blue-500/30",
    Approved:             "bg-teal-500/10 text-teal-300 border-teal-500/30",
    Rejected:             "bg-red-500/15 text-red-300 border-red-500/40",
    Live:                 "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
    Archived:             "bg-white/5 text-ink-faint border-white/15",
    "Removal Requested":  "bg-amber-500/15 text-amber-300 border-amber-500/40",
    Removed:              "bg-red-900/30 text-red-300 border-red-500/40",
  };

  const cls = styles[display] || styles.Draft;

  return (
    <span className={`text-[11px] px-2.5 py-1 rounded-full border ${cls}`}>
      {display}
    </span>
  );
}

export function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] px-2 py-1 rounded-full bg-white/5 border border-white/10 text-ink-faint">
      {children}
    </span>
  );
}

// Phase 7.3 Layer 2B.1 — Catalog tone for poster status stripe + dot.
// Encodes only what a creator needs to glance: green = good, amber =
// creator action / attention, red = terminal/negative, neutral = quiet.
export type WorkTone = "emerald" | "amber" | "red" | "neutral" | "blue";

export function workTone(
  status: string,
  licenseStatus?: "executed" | "none",
  publicVisibility?: PublicReadiness
): WorkTone {
  // Phase 10J-H-A — a live work that is still finishing setup is not yet
  // public; surface it as attention (amber), not "done" (emerald).
  if (status === "live")              return publicVisibility?.state === "finishing_setup" ? "amber" : "emerald";
  if (status === "approved")          return licenseStatus === "executed" ? "emerald" : "amber";
  if (status === "removal_requested") return "amber";
  if (status === "rejected")          return "red";
  if (status === "removed")           return "red";
  if (status === "pending" || status === "in_review") return "blue";
  if (status === "archived")          return "neutral";
  return "neutral";
}

const STRIPE_BG: Record<WorkTone, string> = {
  emerald: "bg-emerald-500/70",
  amber:   "bg-amber-500/70",
  red:     "bg-red-500/60",
  blue:    "bg-blue-400/50",
  neutral: "bg-white/15",
};

const DOT_BG: Record<WorkTone, string> = {
  emerald: "bg-emerald-400",
  amber:   "bg-amber-400",
  red:     "bg-red-400",
  blue:    "bg-blue-300",
  neutral: "bg-white/40",
};

// Phase 7.3 Layer 2B.1 — single state line shown under the title. One
// short sentence covering the lifecycle position; no editorial helper
// text, no badges. Returns null when the state should stay quiet (we
// always render it so creators get a consistent line).
export function workStateLine(
  status: string,
  licenseStatus?: "executed" | "none",
  publicVisibility?: PublicReadiness
): string {
  switch (status) {
    case "live":
      // Phase 10J-H-A — split "live" into its public-visibility truth so the
      // creator never reads "active" for a work the public can't see yet.
      if (publicVisibility?.state === "public")          return "Live · Publicly visible";
      if (publicVisibility?.state === "finishing_setup") return "Live · Finishing setup — not yet public";
      return "Live · Distribution active";
    case "pending":
    case "in_review":         return "In review · Awaiting decision";
    case "approved":
      return licenseStatus === "executed"
        ? "Licensed · Awaiting activation"
        : "Approved · License ready to sign";
    case "draft":             return "Draft · Not submitted";
    case "rejected":          return "Rejected · See notes";
    case "removal_requested": return "Removal under review";
    case "removed":           return "Removed from distribution";
    case "archived":          return "Archived";
    default:                  return "";
  }
}

// Phase 7.3 Layer 2B.1 — poster region for a creator work. Renders the
// 2:3 artwork with a thin status stripe at the bottom. Resolution order:
// cover_image_url → banner_url (cropped) → title/type placeholder.
// Image-only; no actions, no metadata.
export function WorkPoster({
  title,
  projectType,
  coverUrl,
  bannerUrl,
  status,
  licenseStatus,
  publicVisibility,
  className = "",
}: {
  title: string;
  projectType?: string | null;
  coverUrl?: string | null;
  bannerUrl?: string | null;
  status: string;
  licenseStatus?: "executed" | "none";
  publicVisibility?: PublicReadiness;
  className?: string;
}) {
  const tone   = workTone(status, licenseStatus, publicVisibility);
  const stripe = STRIPE_BG[tone];
  const src    = (coverUrl && coverUrl.trim()) || (bannerUrl && bannerUrl.trim()) || "";

  return (
    <div
      className={`relative aspect-[2/3] w-full overflow-hidden rounded-lg border border-white/8 bg-black/40 ${className}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={title}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0 flex flex-col justify-end p-4"
          style={{
            background:
              "linear-gradient(160deg, rgba(40,28,24,0.95) 0%, rgba(20,14,12,0.95) 55%, rgba(10,7,6,0.98) 100%)",
          }}
        >
          {projectType && (
            <p className="text-[10px] uppercase tracking-[0.18em] text-ink-muted mb-2">
              {projectType}
            </p>
          )}
          <p
            className="text-white text-base leading-tight line-clamp-3"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {title}
          </p>
        </div>
      )}
      <div className={`absolute inset-x-0 bottom-0 h-[3px] ${stripe}`} />
    </div>
  );
}

export function WorkStatusDot({
  status,
  licenseStatus,
  publicVisibility,
}: {
  status: string;
  licenseStatus?: "executed" | "none";
  publicVisibility?: PublicReadiness;
}) {
  const tone = workTone(status, licenseStatus, publicVisibility);
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${DOT_BG[tone]}`} />;
}

// Phase 10J-H-A — persistent receipt access for the creator (the signer of the
// license). The receipt route authorizes the signer's own session, so a plain
// link works for any signed work, including live ones — no auth change, no
// bridge. Stays available after activation, unlike the old approved-only link.
export function ReceiptLink({
  licenseId,
  className = "text-ink-faint hover:text-white transition",
}: {
  licenseId: string;
  className?: string;
}) {
  return (
    <a
      href={`/api/licenses/${licenseId}/receipt`}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      View receipt →
    </a>
  );
}

// Phase 7.3 Layer 2 — small two-state pill for readiness / context strips.
// Tones mirror the Phase 7.1/7.2 admin diagnostic palette so creator and
// admin surfaces share the same visual language.
export function ReadinessChip({
  tone,
  label,
}: {
  tone: "amber" | "emerald" | "neutral";
  label: string;
}) {
  const cls =
    tone === "emerald"
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
      : tone === "amber"
      ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
      : "bg-white/5 text-neutral-300 border-white/15";
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded border ${cls}`}>
      {label}
    </span>
  );
}

// Phase 7.3 Layer 2 — visual chrome around <input type="file">. Keyboard +
// screen-reader accessible via <label>-wrapping; no upload logic, no
// drag/drop, no fetch. Caller owns the preview render and the upload
// handler. Designed to be a drop-in replacement for the bare file inputs
// on Media Package and (where useful) New / Edit Work.
export function UploadField({
  label,
  hint,
  accept,
  uploading,
  preview,
  onFile,
  onRemove,
  multiple,
}: {
  label: string;
  hint?: string;
  accept: string;
  uploading?: boolean;
  preview?: React.ReactNode;
  onFile: (file: File) => void | Promise<void>;
  onRemove?: () => void;
  multiple?: boolean;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-white">{label}</p>
      {hint && <p className="text-xs text-ink-faint">{hint}</p>}
      {preview}
      <div className="flex items-center gap-3 flex-wrap">
        <label
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer ${
            uploading
              ? "border-white/10 text-ink-muted cursor-not-allowed"
              : "border-white/15 bg-white/5 text-white hover:bg-white/10"
          }`}
        >
          <span>{uploading ? "Uploading…" : "Choose file"}</span>
          <input
            type="file"
            accept={accept}
            multiple={multiple}
            disabled={uploading}
            onChange={async (e) => {
              const files = Array.from(e.target.files ?? []);
              if (multiple && files.length) {
                await Promise.all(files.map((f) => onFile(f)));
              } else if (files[0]) {
                await onFile(files[0]);
              }
              e.target.value = "";
            }}
            className="sr-only"
          />
        </label>
        {uploading && <Loader2 size={14} className="animate-spin text-ink-faint" />}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-[11px] text-ink-faint hover:text-white transition"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

export function GradientButton({
  children,
  href,
  onClick,
  disabled,
  className = "",
}: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const content = (
    <span className="flex items-center gap-2 justify-center">
      {children}
    </span>
  );

  const baseClasses =
    "px-4 py-2 rounded-xl text-black font-semibold text-sm transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed";

  const style = { background: "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)" } as const;

  if (href) {
    return (
      <Link href={href} className={`${baseClasses} ${className}`} style={style}>
        {content}
      </Link>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${className}`}
      style={style}
    >
      {content}
    </button>
  );
}

/* ── Confirm Dialog ── */

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
  destructive = false,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 420,
          margin: "0 16px",
          padding: "28px 24px 20px",
          borderRadius: 16,
          background: "#1a1210",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "white" }}>{title}</h3>
        <p style={{ margin: "10px 0 24px", fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
          {description}
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "transparent",
              color: "rgba(255,255,255,0.6)",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              border: "none",
              background: destructive
                ? "rgba(220,38,38,0.9)"
                : "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)",
              color: destructive ? "white" : "black",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── useConfirm hook ── */

export function useConfirm() {
  const [state, setState] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    destructive: boolean;
    resolve: ((v: boolean) => void) | null;
  }>({ open: false, title: "", description: "", confirmLabel: "", destructive: false, resolve: null });

  const confirm = useCallback(
    (opts: { title: string; description: string; confirmLabel: string; destructive?: boolean }) =>
      new Promise<boolean>((resolve) => {
        setState({
          open: true,
          title: opts.title,
          description: opts.description,
          confirmLabel: opts.confirmLabel,
          destructive: opts.destructive ?? false,
          resolve,
        });
      }),
    []
  );

  const handleConfirm = useCallback(() => {
    state.resolve?.(true);
    setState((s) => ({ ...s, open: false, resolve: null }));
  }, [state.resolve]);

  const handleCancel = useCallback(() => {
    state.resolve?.(false);
    setState((s) => ({ ...s, open: false, resolve: null }));
  }, [state.resolve]);

  const dialog = (
    <ConfirmDialog
      open={state.open}
      title={state.title}
      description={state.description}
      confirmLabel={state.confirmLabel}
      destructive={state.destructive}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );

  return { confirm, dialog };
}

/* ── Item Actions ── */

export function ItemActions({
  onEdit,
  onDelete,
  onDeleteBlocked,
  onRequestRemoval,
  editHref,
  deleteBlockedReason,
}: {
  onEdit?: () => void;
  onDelete?: () => void;
  onDeleteBlocked?: (reason: string) => void;
  onRequestRemoval?: () => void;
  editHref?: string;
  deleteBlockedReason?: string;
}) {
  const linkClass =
    "text-xs flex items-center gap-1 transition px-2.5 py-1.5 rounded-lg border border-white/8 hover:border-white/20";

  return (
    <div className="flex items-center gap-1.5">
      {editHref ? (
        <Link href={editHref} className={`${linkClass} text-ink-faint hover:text-white`}>
          Edit
        </Link>
      ) : onEdit ? (
        <button onClick={onEdit} className={`${linkClass} text-ink-faint hover:text-white`}>
          Edit
        </button>
      ) : null}

      {onRequestRemoval ? (
        <button
          onClick={onRequestRemoval}
          className={`${linkClass} text-yellow-400/70 hover:text-yellow-400 hover:border-yellow-400/30`}
        >
          Request Removal
        </button>
      ) : onDelete ? (
        <button
          onClick={onDelete}
          className={`${linkClass} text-red-400/60 hover:text-red-400 hover:border-red-400/30`}
        >
          Delete
        </button>
      ) : deleteBlockedReason ? (
        /* Delete is blocked — button is ALWAYS visible and clickable (shows reason on click) */
        <button
          onClick={() => onDeleteBlocked?.(deleteBlockedReason)}
          className={`${linkClass} text-white/30 hover:text-white/50 hover:border-white/20`}
          title={deleteBlockedReason}
        >
          Delete
        </button>
      ) : null}
    </div>
  );
}

