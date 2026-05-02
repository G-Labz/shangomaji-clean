"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";

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

