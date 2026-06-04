// Phase 10J-I-R3-A — Shared premium dashboard language: the single presentation
// derive consumed by both the Admin Forge and (in a later slice) the Creator
// Cockpit. It turns a work's protected lifecycle truth into three things the new
// surfaces render — where it sits on the Pipeline Rail, whose move it is
// (Ownership Verdict), and the operational pressure across the catalog
// (bucket counts).
//
// CRITICAL DISCIPLINE:
//   • The public-visibility GATE is NOT reimplemented here. `publicDiagnostic`
//     delegates every "live" work to `derivePublicReadiness` (the single source
//     of truth in lib/public-visibility.ts), exactly as the live admin page
//     does. Client callers pass `libraryConfigured: true` — the documented
//     client behavior, since the server env id isn't readable here.
//   • `licenseState`, `classifyBucket`, `operatorPriorityRank`, and the
//     diagnostic mapping are line-for-line ports of the admin helpers currently
//     trapped in src/app/admin/page.tsx, so the new surfaces can never disagree
//     with the live dashboard. The Admin Forge preview asserts this parity.
//
// Pure + read-only. Never mutates anything. Never claims visibility it cannot
// prove.

import { derivePublicReadiness } from "@/lib/public-visibility";

// ── Input shape ─────────────────────────────────────────────────────────────
// The subset of the enriched /api/admin/projects (and /api/creators/projects)
// row this module reads. Permissive + optional so either surface's payload fits.

export interface WorkLicense {
  id?: string | null;
  term_years?: number | null;
  signer_legal_name?: string | null;
  signer_email?: string | null;
  signed_at?: string | null;
  term_start?: string | null;
  term_end?: string | null;
  sdl_version?: string | null;
  sdl_snapshot_stored?: boolean | null;
  pdf_url?: string | null;
}

export interface WorkLike {
  id?: string | null;
  status?: string | null;
  title?: string | null;
  project_type?: string | null;
  creator_email?: string | null;
  cover_image_url?: string | null;
  banner_url?: string | null;
  updated_at?: string | null;
  title_status?: string | null;
  media_ready?: boolean | null;
  bunny_video_id?: string | null;
  license?: WorkLicense | null;
}

// ── License state (port of admin licenseState) ──────────────────────────────

export type LicenseState = "executed" | "awaiting" | "legacy_missing" | "not_required";

export function licenseState(p: WorkLike): LicenseState {
  if (p?.license) return "executed";
  if (p?.status === "approved") return "awaiting";
  if (p?.status === "live" || p?.status === "removal_requested") return "legacy_missing";
  return "not_required";
}

// ── Public-visibility diagnostic (port of admin getPublicVisibilityDiagnostic;
//    live works delegate to the protected derivePublicReadiness) ─────────────

export type PublicVisibilityTone = "ready" | "held" | "rejected" | "neutral";
export interface PublicVisibilityDiagnostic {
  label: string;
  tone: PublicVisibilityTone;
}

export function publicDiagnostic(p: WorkLike): PublicVisibilityDiagnostic {
  const status = p?.status as string | undefined;
  if (status === "removed")   return { label: "Removed",                       tone: "rejected" };
  if (status === "rejected")  return { label: "Rejected",                      tone: "rejected" };
  if (status === "archived")  return { label: "Internal hold",                 tone: "neutral" };
  if (status === "removal_requested") return { label: "Held — removal under review", tone: "held" };
  if (status === "draft")     return { label: "Held — awaiting submission",    tone: "held" };
  if (status === "pending" || status === "in_review") {
    return { label: "Held — awaiting approval", tone: "held" };
  }
  if (status === "approved") {
    if (!p?.license) return { label: "Held — license not executed",     tone: "held" };
    return { label: "Held — distribution not activated", tone: "held" };
  }
  if (status === "live") {
    // Delegate the live gate to the single source of truth. Do NOT inline the
    // title/bunny/media/library checks here.
    const readiness = derivePublicReadiness({
      status,
      titleStatus:  p?.title_status ?? null,
      mediaReady:   p?.media_ready ?? null,
      bunnyVideoId: p?.bunny_video_id ?? null,
      libraryConfigured: true,
    });
    if (readiness.state === "public") {
      return { label: "Ready — visible in public catalog", tone: "ready" };
    }
    if (readiness.state === "finishing_setup") {
      const label =
        readiness.reason === "title_inactive" ? "Held — title row inactive"
        : readiness.reason === "bunny_missing" ? "Held — Bunny video missing"
        : "Held — media not ready";
      return { label, tone: "held" };
    }
    return { label: "Held — not live", tone: "held" };
  }
  return { label: "Held — unknown state", tone: "held" };
}

// ── Operational bucket classification (port of admin classifyBucket) ────────

export type BucketKey =
  | "needs_review"
  | "needs_license"
  | "needs_activation"
  | "needs_bunny"
  | "needs_processing"
  | "public_ready"
  | "internal_hold"
  | "draft";

export function classifyBucket(p: WorkLike): BucketKey {
  const status = p?.status as string | undefined;
  if (status === "pending" || status === "in_review" || status === "removal_requested") {
    return "needs_review";
  }
  if (status === "approved") {
    return p?.license ? "needs_activation" : "needs_license";
  }
  if (status === "live") {
    const d = publicDiagnostic(p);
    if (d.tone === "ready") return "public_ready";
    if (p?.title_status && p.title_status !== "active") return "internal_hold";
    if (!p?.bunny_video_id) return "needs_bunny";
    if (p?.media_ready !== true) return "needs_processing";
    return "internal_hold";
  }
  if (status === "archived" || status === "rejected" || status === "removed") {
    return "internal_hold";
  }
  if (status === "draft") return "draft";
  return "internal_hold";
}

export type BucketCounts = Record<BucketKey, number>;

const EMPTY_BUCKET_COUNTS: BucketCounts = {
  needs_review: 0,
  needs_license: 0,
  needs_activation: 0,
  needs_bunny: 0,
  needs_processing: 0,
  public_ready: 0,
  internal_hold: 0,
  draft: 0,
};

/** Tally how many works sit in each operational bucket — feeds the Pressure Rail. */
export function bucketCounts(projects: WorkLike[]): BucketCounts {
  const counts: BucketCounts = { ...EMPTY_BUCKET_COUNTS };
  for (const p of projects ?? []) counts[classifyBucket(p)] += 1;
  return counts;
}

// ── Operator priority (port of admin operatorPriorityRank) ──────────────────
// Lower = more urgent. Null = not an operator priority (waiting on the creator,
// already public, or terminal). Drives the Flow conveyor's default sort.

export function operatorPriorityRank(p: WorkLike): number | null {
  const s = p?.status;
  if (s === "removal_requested") return 0;
  if (s === "pending" || s === "in_review") return 1;
  if (s === "approved" && p?.license) return 2;
  if (s === "live" && publicDiagnostic(p).tone === "held") return 3;
  return null;
}

// ── Pipeline Rail position ──────────────────────────────────────────────────
// The canonical illuminated lifecycle track. `activeIndex` is the glowing node;
// nodes before it are travelled (forge-gold), after it are dim. `held` makes the
// active node pulse amber. `terminal` dims the rail and caps it.

export const PIPELINE_NODES = [
  "Draft",
  "Submitted",
  "In review",
  "Approved",
  "Signed",
  "Activated",
  "Finishing",
  "Public",
] as const;

export type PipelineNode = (typeof PIPELINE_NODES)[number];

export interface PipelineStage {
  nodes: readonly PipelineNode[];
  activeIndex: number;
  held: boolean;
  terminal: "rejected" | "removed" | "archived" | null;
}

export function pipelineStage(p: WorkLike): PipelineStage {
  const s = p?.status;
  const base = { nodes: PIPELINE_NODES, held: false, terminal: null as PipelineStage["terminal"] };

  switch (s) {
    case "draft":     return { ...base, activeIndex: 0 };
    case "pending":   return { ...base, activeIndex: 1 };
    case "in_review": return { ...base, activeIndex: 2 };
    case "approved":
      // Approved-but-unsigned sits on "Approved"; signed sits on "Signed".
      return { ...base, activeIndex: p?.license ? 4 : 3 };
    case "live": {
      const d = publicDiagnostic(p);
      if (d.tone === "ready") return { ...base, activeIndex: 7 };
      // Finishing setup — past activation, held before public.
      return { ...base, activeIndex: 6, held: true };
    }
    case "removal_requested":
      // Stays live/public during review; flag the hold.
      return { ...base, activeIndex: 7, held: true };
    case "rejected": return { ...base, activeIndex: 2, terminal: "rejected" };
    case "removed":  return { ...base, activeIndex: 7, terminal: "removed" };
    case "archived": return { ...base, activeIndex: 5, terminal: "archived" };
    default:         return { ...base, activeIndex: 0 };
  }
}

// ── Ownership Verdict ───────────────────────────────────────────────────────
// The single, unambiguous answer to "whose move is it." Built from the SAME
// owner mapping as the admin workCommand, then flipped per audience: a
// creator-owned work is calm ash to the operator but glowing ember to that
// creator, and vice-versa. Parity invariant the preview asserts:
//   ownershipVerdict(p,"admin").verdict === "your_move"  ⟺  operatorPriorityRank(p) !== null

export type WorkOwner = "creator" | "shangomaji" | "public" | "system" | "none";
export type Audience = "admin" | "creator";
export type Verdict =
  | "your_move"
  | "waiting_on_creator"
  | "waiting_on_shangomaji"
  | "live_public"
  | "system_hold";
export type VerdictTone = "move" | "held" | "public" | "terminal" | "waiting";

export interface OwnershipVerdict {
  verdict: Verdict;
  tone: VerdictTone;
  /** Plain-language state line for the chosen audience. */
  line: string;
  /** Optional one-sentence "why", or null. */
  why: string | null;
  owner: WorkOwner;
}

interface OwnerResolution {
  owner: WorkOwner;
  why: string | null;
  adminLine: string;
  creatorLine: string;
  /** Set for terminal removed/rejected so the verdict reads red, not slate. */
  terminalTone?: boolean;
}

function resolveOwner(p: WorkLike): OwnerResolution {
  const s = p?.status;
  if (s === "pending" || s === "in_review") {
    return {
      owner: "shangomaji",
      why: "Complete the review record, then approve or reject.",
      adminLine: "Awaiting review decision",
      creatorLine: "In review · Awaiting decision",
    };
  }
  if (s === "approved") {
    if (!p?.license) {
      return {
        owner: "creator",
        why: "The creator must sign the Standard Distribution License before activation.",
        adminLine: "Awaiting creator signature",
        creatorLine: "Approved · License ready to sign",
      };
    }
    return {
      owner: "shangomaji",
      why: "Signed and ready — activate distribution to start the term.",
      adminLine: "Signed — ready to activate",
      creatorLine: "Licensed · Awaiting activation",
    };
  }
  if (s === "live") {
    const d = publicDiagnostic(p);
    if (d.tone === "ready") {
      return {
        owner: "public",
        why: null,
        adminLine: "Live · Publicly visible",
        creatorLine: "Live · Publicly visible",
      };
    }
    return {
      owner: "shangomaji",
      why: "Bind a Bunny video and mark media ready to make this public.",
      adminLine: d.label, // e.g. "Held — Bunny video missing"
      creatorLine: "Live · Finishing setup — not yet public",
    };
  }
  if (s === "removal_requested") {
    return {
      owner: "shangomaji",
      why: "Approve to remove from distribution, or deny to keep it live.",
      adminLine: "Removal request — decide",
      creatorLine: "Removal under review",
    };
  }
  if (s === "removed") {
    return { owner: "none", why: null, adminLine: "Removed from distribution", creatorLine: "Removed from distribution", terminalTone: true };
  }
  if (s === "rejected") {
    return { owner: "none", why: null, adminLine: "Not approved", creatorLine: "Rejected · See notes", terminalTone: true };
  }
  if (s === "archived") {
    return { owner: "system", why: null, adminLine: "Internal hold", creatorLine: "Archived" };
  }
  if (s === "draft") {
    return { owner: "creator", why: null, adminLine: "Draft — not submitted", creatorLine: "Draft · Not submitted" };
  }
  return { owner: "none", why: null, adminLine: String(s ?? "—"), creatorLine: String(s ?? "—") };
}

export function ownershipVerdict(p: WorkLike, audience: Audience): OwnershipVerdict {
  const r = resolveOwner(p);
  const line = audience === "admin" ? r.adminLine : r.creatorLine;

  let verdict: Verdict;
  let tone: VerdictTone;

  switch (r.owner) {
    case "shangomaji":
      verdict = audience === "admin" ? "your_move" : "waiting_on_shangomaji";
      tone = audience === "admin" ? "move" : "waiting";
      break;
    case "creator":
      verdict = audience === "creator" ? "your_move" : "waiting_on_creator";
      tone = audience === "creator" ? "move" : "waiting";
      break;
    case "public":
      verdict = "live_public";
      tone = "public";
      break;
    case "system":
      verdict = "system_hold";
      tone = "waiting";
      break;
    default: // none / terminal
      verdict = "system_hold";
      tone = r.terminalTone ? "terminal" : "waiting";
      break;
  }

  return { verdict, tone, line, why: r.why, owner: r.owner };
}

// ── Next action ─────────────────────────────────────────────────────────────
// The ONE relevant action for a work, per audience. Admin actions deep-link to
// the live /admin dashboard (the Forge preview is read-only and never mutates).
// Creator deep-links are defined for the later Cockpit slice.

export interface WorkAction {
  label: string;
  /** Deep-link target. Admin → the live dashboard; creator → the real page. */
  href: string;
  /** Visual emphasis for the rendered (inert/deep-link) button. */
  emphasis: "primary" | "secondary" | "quiet";
}

export function nextAction(p: WorkLike, audience: Audience): WorkAction | null {
  const s = p?.status;
  const id = p?.id ?? "";

  if (audience === "admin") {
    // Read-only preview: every admin action routes to the live /admin surface.
    const toAdmin: WorkAction = { label: "Open in Mission Control", href: "/admin", emphasis: "primary" };
    if (s === "pending" || s === "in_review") return { ...toAdmin, label: "Review & decide" };
    if (s === "approved" && p?.license)       return { ...toAdmin, label: "Activate distribution" };
    if (s === "approved")                     return { ...toAdmin, label: "Awaiting creator signature", emphasis: "quiet" };
    if (s === "live" && publicDiagnostic(p).tone === "held") return { ...toAdmin, label: "Finish media setup" };
    if (s === "removal_requested")            return { ...toAdmin, label: "Review removal" };
    if (s === "archived")                     return { ...toAdmin, label: "Restore from hold", emphasis: "secondary" };
    return null;
  }

  // creator
  if (s === "approved" && !p?.license) return { label: "Sign license",     href: `/license/${id}`,                     emphasis: "primary" };
  if (s === "approved" || s === "live") return { label: "Manage media",    href: `/workspace/projects/${id}/media`,    emphasis: "primary" };
  if (s === "draft")                    return { label: "Continue",        href: `/workspace/projects/${id}/edit`,     emphasis: "primary" };
  if (s === "rejected")                 return { label: "View notes",      href: `/workspace/projects/${id}/edit`,     emphasis: "secondary" };
  return null;
}
