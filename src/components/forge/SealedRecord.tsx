"use client";

// Phase 10J-I-R3-A — Sealed Record.
//
// Promotes the license/receipt from a footnote link to "proof you can open":
// a stamped, durable credential. Receipt access is UNCHANGED — the admin
// surface passes a read-only `onView` that fetches the existing receipt route
// with the admin-password header; the creator surface passes a plain
// `receiptHref` to the same route (signer session authorizes). This component
// never mutates and never alters receipt auth.

import React from "react";
import type { LicenseState, WorkLicense, Audience } from "@/lib/work-state";

function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function SealMark() {
  return (
    <span
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[9px] font-bold tracking-wide text-state-held"
      style={{
        border: "1px solid rgba(245,197,24,0.5)",
        boxShadow: "inset 0 0 12px -4px rgba(245,197,24,0.7)",
        background: "radial-gradient(120% 120% at 30% 20%, rgba(245,197,24,0.14), transparent 70%)",
      }}
    >
      SDL
    </span>
  );
}

export function SealedRecord({
  licenseState,
  license,
  audience,
  receiptHref,
  signingUrl,
  onView,
  busy = false,
  error,
  className = "",
}: {
  licenseState: LicenseState;
  license?: WorkLicense | null;
  audience: Audience;
  /** Creator surface: plain link to the existing receipt route. */
  receiptHref?: string;
  /** Admin surface (awaiting): the creator's signing URL to copy. */
  signingUrl?: string;
  /** Admin surface: read-only receipt open via the existing password bridge. */
  onView?: () => void;
  busy?: boolean;
  error?: string;
  className?: string;
}) {
  const [copied, setCopied] = React.useState(false);

  if (licenseState === "not_required") return null;

  // ── Executed — the gold sealed credential ──────────────────────────────
  if (licenseState === "executed") {
    const term = license?.term_years ? `${license.term_years}-yr term` : "—";
    const snapshot = license?.sdl_snapshot_stored
      ? "Immutable snapshot stored"
      : "Rebuilt from SDL-v1 registry";
    return (
      <div className={`seal rounded-xl p-4 ${className}`}>
        <div className="flex items-start gap-3">
          <SealMark />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-white">Standard Distribution License</p>
              <span className="rounded border border-state-held/30 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-state-held">
                {license?.sdl_version ?? "SDL-v1"}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-ink-faint">
              Signed by{" "}
              <span className="text-ink-muted">{license?.signer_legal_name ?? "—"}</span> ·{" "}
              {fmtDate(license?.signed_at)} · {term}
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-wider text-state-held/80">{snapshot}</p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3">
          {onView ? (
            <button
              type="button"
              onClick={onView}
              disabled={busy}
              className="rounded-lg border border-state-held/40 px-3 py-1.5 text-xs font-medium text-state-held transition hover:bg-state-held/10 disabled:opacity-50"
            >
              {busy ? "Opening…" : "View receipt"}
            </button>
          ) : receiptHref ? (
            <a
              href={receiptHref}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-state-held/40 px-3 py-1.5 text-xs font-medium text-state-held transition hover:bg-state-held/10"
            >
              View receipt →
            </a>
          ) : null}
          <span className="text-[10px] uppercase tracking-wider text-ink-faint">Durable proof</span>
        </div>
        {error && <p className="mt-2 text-xs text-state-terminal">{error}</p>}
      </div>
    );
  }

  // ── Awaiting signature ─────────────────────────────────────────────────
  if (licenseState === "awaiting") {
    return (
      <div className={`rounded-xl border border-state-held/25 bg-state-held/[0.06] p-4 ${className}`}>
        <p className="text-sm font-medium text-state-held">Signature pending</p>
        <p className="mt-1 text-xs text-ink-faint">
          Awaiting the creator&apos;s signature on the Standard Distribution License. Activation is blocked
          until it is executed.
        </p>
        {audience === "admin" && signingUrl && (
          <div className="mt-3 flex items-center gap-2">
            <code className="truncate rounded bg-black/40 px-2 py-1 text-[11px] text-ink-muted">{signingUrl}</code>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(signingUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                } catch {
                  /* clipboard unavailable — no-op */
                }
              }}
              className="shrink-0 rounded-lg border border-white/15 px-2.5 py-1 text-[11px] text-white transition hover:bg-white/10"
            >
              {copied ? "Copied" : "Copy URL"}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Legacy — activated before the license layer ────────────────────────
  return (
    <div className={`rounded-xl border border-white/8 bg-white/[0.02] p-4 ${className}`}>
      <p className="text-sm font-medium text-ink-muted">No license on file</p>
      <p className="mt-1 text-xs text-ink-faint">
        Legacy work — activated before the license layer. No receipt exists for this row.
      </p>
    </div>
  );
}
