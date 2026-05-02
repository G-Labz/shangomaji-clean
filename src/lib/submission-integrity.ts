// Submission Integrity System v1 — shared validators.
//
// Used by:
//   - The creator submission API (server) to gate draft → pending and
//     POST { submitImmediately: true }.
//   - The creator submission UI (client) for live UX feedback only — the
//     server is the source of truth.
//   - The admin review API (server) to gate pending|in_review → approved.
//   - The admin review UI (client) for "Approval locked" state.
//
// Server-side rejection is mandatory. Client validation is UX only.

// ── Controlled vocabularies ──────────────────────────────────────────────

export const THESIS_PATHS = [
  "black_creator",
  "meaningful_black_characters",
  "both",
  "edge_case",
] as const;
export type ThesisPath = (typeof THESIS_PATHS)[number];

export const THESIS_PATH_LABELS: Record<ThesisPath, string> = {
  black_creator:                "Black creator-led work",
  meaningful_black_characters:  "Meaningful Black characters",
  both:                         "Both",
  edge_case:                    "Edge case / requires review",
};

export const AI_USAGE_VALUES = ["none", "assisted", "generated"] as const;
export type AiUsage = (typeof AI_USAGE_VALUES)[number];

export const AI_USAGE_LABELS: Record<AiUsage, string> = {
  none:      "No AI used",
  assisted:  "AI-assisted",
  generated: "Primarily AI-generated",
};

export const PRIOR_DISTRIBUTION_VALUES = [
  "never_published",
  "published",
] as const;
export type PriorDistribution = (typeof PRIOR_DISTRIBUTION_VALUES)[number];

export const PRIOR_DISTRIBUTION_LABELS: Record<PriorDistribution, string> = {
  never_published: "Never publicly distributed",
  published:       "Previously distributed",
};

export const REVIEW_RIGHTS_POSTURE_VALUES = [
  "clear",
  "co_owned_clear",
  "encumbered",
  "disqualified",
] as const;
export type ReviewRightsPosture =
  (typeof REVIEW_RIGHTS_POSTURE_VALUES)[number];

export const REVIEW_RIGHTS_POSTURE_LABELS: Record<ReviewRightsPosture, string> = {
  clear:          "Clear",
  co_owned_clear: "Co-owned (clear)",
  encumbered:     "Encumbered",
  disqualified:   "Disqualified",
};

export const REVIEW_CRAFT_RESULT_VALUES = ["pass", "fail", "revision"] as const;
export type ReviewCraftResult = (typeof REVIEW_CRAFT_RESULT_VALUES)[number];

export const REVIEW_CRAFT_RESULT_LABELS: Record<ReviewCraftResult, string> = {
  pass:     "Pass",
  fail:     "Fail",
  revision: "Revision required",
};

export const REVIEW_CATALOG_FIT_VALUES = [
  "distinct",
  "redundant",
  "timing_issue",
  "strategic_fit",
] as const;
export type ReviewCatalogFit = (typeof REVIEW_CATALOG_FIT_VALUES)[number];

export const REVIEW_CATALOG_FIT_LABELS: Record<ReviewCatalogFit, string> = {
  distinct:      "Distinct",
  redundant:     "Redundant",
  timing_issue:  "Timing issue",
  strategic_fit: "Strategic fit",
};

// ── Field error type ─────────────────────────────────────────────────────

export type IntegrityError = { field: string; message: string };

// ── Inputs ───────────────────────────────────────────────────────────────

export type CreatorIntegrityInput = {
  thesis_path?: unknown;
  thesis_explanation?: unknown;
  rights_ownership_ack?: unknown;
  rights_collaborators_disclosed_ack?: unknown;
  rights_no_conflicts_ack?: unknown;
  rights_no_unlicensed_assets_ack?: unknown;
  collaborators?: unknown;
  no_collaborators_ack?: unknown;
  ai_usage?: unknown;
  ai_usage_description?: unknown;
  prior_distribution?: unknown;
  prior_distribution_details?: unknown;
  license_awareness_ack?: unknown;
};

export type AdminReviewInput = {
  review_thesis_confirmed?: unknown;
  review_meaningful_presence_rationale?: unknown;
  review_rights_posture?: unknown;
  review_craft_result?: unknown;
  review_catalog_fit?: unknown;
  review_decision_record?: unknown;
  review_risk_notes?: unknown;
};

function isTrue(v: unknown): boolean {
  return v === true;
}

function clean(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

// ── Creator submission integrity ─────────────────────────────────────────

// Returns the first failing field or null if every required gate passes.
// Save-as-draft does NOT call this — drafts may carry partial integrity
// fields. Only the submission gate (draft → pending) calls it.
export function validateCreatorIntegrity(
  input: CreatorIntegrityInput
): IntegrityError | null {
  // A. Thesis Declaration
  const thesis = clean(input.thesis_path);
  if (!thesis || !(THESIS_PATHS as readonly string[]).includes(thesis)) {
    return {
      field:   "thesis_path",
      message: "Select how this work meets ShangoMaji's thesis.",
    };
  }
  const thesisExplanation = clean(input.thesis_explanation);
  if (thesisExplanation.length < 20) {
    return {
      field:   "thesis_explanation",
      message:
        "Explain how this work meets ShangoMaji's thesis (at least 20 characters).",
    };
  }

  // B. Rights Attestation — all four checkboxes
  if (!isTrue(input.rights_ownership_ack)) {
    return {
      field:   "rights_ownership_ack",
      message: "You must attest that you own or control the rights to this work.",
    };
  }
  if (!isTrue(input.rights_collaborators_disclosed_ack)) {
    return {
      field:   "rights_collaborators_disclosed_ack",
      message: "You must attest that all collaborators, co-owners, or contributors have been disclosed.",
    };
  }
  if (!isTrue(input.rights_no_conflicts_ack)) {
    return {
      field:   "rights_no_conflicts_ack",
      message: "You must attest there are no conflicting distribution, publishing, or licensing agreements.",
    };
  }
  if (!isTrue(input.rights_no_unlicensed_assets_ack)) {
    return {
      field:   "rights_no_unlicensed_assets_ack",
      message: "You must attest this work does not contain unlicensed third-party assets.",
    };
  }

  // C. Collaborator Disclosure — collaborators OR no_collaborators_ack.
  // If both are provided, that is a contradiction.
  const collaborators       = clean(input.collaborators);
  const noCollaboratorsAck  = isTrue(input.no_collaborators_ack);
  if (!collaborators && !noCollaboratorsAck) {
    return {
      field:   "collaborators",
      message: "List collaborators / co-owners / contributors, or check 'No collaborators or co-owners.'",
    };
  }
  if (collaborators && noCollaboratorsAck) {
    return {
      field:   "no_collaborators_ack",
      message:
        "You marked 'No collaborators or co-owners' but also listed collaborators. Choose one.",
    };
  }

  // D. AI Disclosure
  const aiUsage = clean(input.ai_usage);
  if (!aiUsage || !(AI_USAGE_VALUES as readonly string[]).includes(aiUsage)) {
    return {
      field:   "ai_usage",
      message: "Select your AI usage disclosure.",
    };
  }
  const aiDescription = clean(input.ai_usage_description);
  if ((aiUsage === "assisted" || aiUsage === "generated") && aiDescription.length < 20) {
    return {
      field:   "ai_usage_description",
      message:
        "Describe how AI was used in this work (at least 20 characters).",
    };
  }

  // E. Prior Distribution
  const prior = clean(input.prior_distribution);
  if (!prior || !(PRIOR_DISTRIBUTION_VALUES as readonly string[]).includes(prior)) {
    return {
      field:   "prior_distribution",
      message: "Select prior distribution status.",
    };
  }
  const priorDetails = clean(input.prior_distribution_details);
  if (prior === "published" && priorDetails.length < 10) {
    return {
      field:   "prior_distribution_details",
      message:
        "Describe where, when, and under what arrangement this work was previously distributed.",
    };
  }

  // F. License Awareness
  if (!isTrue(input.license_awareness_ack)) {
    return {
      field:   "license_awareness_ack",
      message:
        "You must acknowledge the licensing nature of this submission before submitting for review.",
    };
  }

  return null;
}

// Helper: extract only the integrity columns from an input object so the
// caller can persist the same set used by the validator. Idempotent —
// undefined values are dropped so save-draft can pass partial fields.
export function pickCreatorIntegrityColumns(
  input: CreatorIntegrityInput
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (input.thesis_path !== undefined) out.thesis_path = clean(input.thesis_path) || null;
  if (input.thesis_explanation !== undefined) out.thesis_explanation = clean(input.thesis_explanation) || null;
  if (input.rights_ownership_ack !== undefined) out.rights_ownership_ack = isTrue(input.rights_ownership_ack);
  if (input.rights_collaborators_disclosed_ack !== undefined) out.rights_collaborators_disclosed_ack = isTrue(input.rights_collaborators_disclosed_ack);
  if (input.rights_no_conflicts_ack !== undefined) out.rights_no_conflicts_ack = isTrue(input.rights_no_conflicts_ack);
  if (input.rights_no_unlicensed_assets_ack !== undefined) out.rights_no_unlicensed_assets_ack = isTrue(input.rights_no_unlicensed_assets_ack);
  if (input.collaborators !== undefined) out.collaborators = clean(input.collaborators) || null;
  if (input.no_collaborators_ack !== undefined) out.no_collaborators_ack = isTrue(input.no_collaborators_ack);
  if (input.ai_usage !== undefined) out.ai_usage = clean(input.ai_usage) || null;
  if (input.ai_usage_description !== undefined) out.ai_usage_description = clean(input.ai_usage_description) || null;
  if (input.prior_distribution !== undefined) out.prior_distribution = clean(input.prior_distribution) || null;
  if (input.prior_distribution_details !== undefined) out.prior_distribution_details = clean(input.prior_distribution_details) || null;
  if (input.license_awareness_ack !== undefined) out.license_awareness_ack = isTrue(input.license_awareness_ack);
  return out;
}

// ── Admin review record ──────────────────────────────────────────────────

// Validates that a review record is "complete" — all required fields filled
// in. Does NOT decide pass/fail. Returns the first missing/invalid field,
// or null if the record is complete.
export function validateAdminReviewComplete(
  input: AdminReviewInput
): IntegrityError | null {
  if (!isTrue(input.review_thesis_confirmed)) {
    return {
      field:   "review_thesis_confirmed",
      message: "Confirm the thesis check.",
    };
  }
  const meaningful = clean(input.review_meaningful_presence_rationale);
  if (meaningful.length < 20) {
    return {
      field:   "review_meaningful_presence_rationale",
      message: "Provide a rationale for meaningful presence (at least 20 characters).",
    };
  }
  const rights = clean(input.review_rights_posture);
  if (!rights || !(REVIEW_RIGHTS_POSTURE_VALUES as readonly string[]).includes(rights)) {
    return {
      field:   "review_rights_posture",
      message: "Select a rights posture.",
    };
  }
  const craft = clean(input.review_craft_result);
  if (!craft || !(REVIEW_CRAFT_RESULT_VALUES as readonly string[]).includes(craft)) {
    return {
      field:   "review_craft_result",
      message: "Select a craft result.",
    };
  }
  const fit = clean(input.review_catalog_fit);
  if (!fit || !(REVIEW_CATALOG_FIT_VALUES as readonly string[]).includes(fit)) {
    return {
      field:   "review_catalog_fit",
      message: "Select a catalog fit.",
    };
  }
  const decision = clean(input.review_decision_record);
  if (decision.length < 20) {
    return {
      field:   "review_decision_record",
      message:
        "Write the decision record: why this work belongs in ShangoMaji (at least 20 characters).",
    };
  }
  return null;
}

// Decides whether a complete review record represents a passing posture
// suitable for approval. A complete review with `encumbered`/`disqualified`
// rights or `fail`/`revision` craft does not approve — it must be routed
// to revision or rejection by the admin manually.
export function isReviewPassing(input: AdminReviewInput): IntegrityError | null {
  const completeness = validateAdminReviewComplete(input);
  if (completeness) return completeness;

  const rights = clean(input.review_rights_posture) as ReviewRightsPosture;
  if (rights === "encumbered" || rights === "disqualified") {
    return {
      field:   "review_rights_posture",
      message:
        `Approval blocked: rights posture is "${rights}". Reject or route to revision.`,
    };
  }
  const craft = clean(input.review_craft_result) as ReviewCraftResult;
  if (craft === "fail" || craft === "revision") {
    return {
      field:   "review_craft_result",
      message:
        `Approval blocked: craft result is "${craft}". Reject or request revision.`,
    };
  }
  return null;
}

export function pickAdminReviewColumns(
  input: AdminReviewInput
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (input.review_thesis_confirmed !== undefined) out.review_thesis_confirmed = isTrue(input.review_thesis_confirmed);
  if (input.review_meaningful_presence_rationale !== undefined) out.review_meaningful_presence_rationale = clean(input.review_meaningful_presence_rationale) || null;
  if (input.review_rights_posture !== undefined) out.review_rights_posture = clean(input.review_rights_posture) || null;
  if (input.review_craft_result !== undefined) out.review_craft_result = clean(input.review_craft_result) || null;
  if (input.review_catalog_fit !== undefined) out.review_catalog_fit = clean(input.review_catalog_fit) || null;
  if (input.review_decision_record !== undefined) out.review_decision_record = clean(input.review_decision_record) || null;
  if (input.review_risk_notes !== undefined) out.review_risk_notes = clean(input.review_risk_notes) || null;
  return out;
}

// All creator integrity columns that should be selected when reading a
// project for review or display. Centralized so admin/creator routes stay
// consistent.
export const CREATOR_INTEGRITY_COLUMNS = [
  "thesis_path",
  "thesis_explanation",
  "rights_ownership_ack",
  "rights_collaborators_disclosed_ack",
  "rights_no_conflicts_ack",
  "rights_no_unlicensed_assets_ack",
  "collaborators",
  "no_collaborators_ack",
  "ai_usage",
  "ai_usage_description",
  "prior_distribution",
  "prior_distribution_details",
  "license_awareness_ack",
  "submission_integrity_completed_at",
] as const;

export const ADMIN_REVIEW_COLUMNS = [
  "review_thesis_confirmed",
  "review_meaningful_presence_rationale",
  "review_rights_posture",
  "review_craft_result",
  "review_catalog_fit",
  "review_decision_record",
  "review_risk_notes",
  "reviewed_at",
  "reviewed_by",
] as const;
