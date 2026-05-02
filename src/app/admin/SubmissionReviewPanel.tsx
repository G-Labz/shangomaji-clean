"use client";

// Admin-side panel for the Submission Integrity System v1.
//
// Renders two stacked sections inside the expanded project view:
//   1. Submission Integrity Summary  — read-only view of the creator's
//      attestations, so the reviewer can verify what was claimed.
//   2. Review Integrity Panel        — controlled inputs for the admin's
//      review record. Save Review persists without status change; Approve
//      uses the same fields and the server re-validates them.
//
// Approval state and the wired Approve button live in the parent admin page
// (this component only emits onSaveReview / onApprove callbacks).

import {
  THESIS_PATH_LABELS,
  AI_USAGE_LABELS,
  PRIOR_DISTRIBUTION_LABELS,
  REVIEW_RIGHTS_POSTURE_VALUES,
  REVIEW_RIGHTS_POSTURE_LABELS,
  REVIEW_CRAFT_RESULT_VALUES,
  REVIEW_CRAFT_RESULT_LABELS,
  REVIEW_CATALOG_FIT_VALUES,
  REVIEW_CATALOG_FIT_LABELS,
  validateCreatorIntegrity,
  validateAdminReviewComplete,
  isReviewPassing,
  type ReviewRightsPosture,
  type ReviewCraftResult,
  type ReviewCatalogFit,
  type CreatorIntegrityInput,
  type AdminReviewInput,
} from "@/lib/submission-integrity";

export type AdminReviewState = {
  review_thesis_confirmed:              boolean;
  review_meaningful_presence_rationale: string;
  review_rights_posture:                ReviewRightsPosture | "";
  review_craft_result:                  ReviewCraftResult | "";
  review_catalog_fit:                   ReviewCatalogFit | "";
  review_decision_record:               string;
  review_risk_notes:                    string;
};

export const emptyReview: AdminReviewState = {
  review_thesis_confirmed:              false,
  review_meaningful_presence_rationale: "",
  review_rights_posture:                "",
  review_craft_result:                  "",
  review_catalog_fit:                   "",
  review_decision_record:               "",
  review_risk_notes:                    "",
};

export function reviewFromProject(p: any): AdminReviewState {
  return {
    review_thesis_confirmed:              p?.review_thesis_confirmed === true,
    review_meaningful_presence_rationale: p?.review_meaningful_presence_rationale ?? "",
    review_rights_posture:                (p?.review_rights_posture ?? "") as ReviewRightsPosture | "",
    review_craft_result:                  (p?.review_craft_result ?? "") as ReviewCraftResult | "",
    review_catalog_fit:                   (p?.review_catalog_fit ?? "") as ReviewCatalogFit | "",
    review_decision_record:               p?.review_decision_record ?? "",
    review_risk_notes:                    p?.review_risk_notes ?? "",
  };
}

export function reviewToPayload(s: AdminReviewState) {
  return {
    review_thesis_confirmed:              s.review_thesis_confirmed,
    review_meaningful_presence_rationale: s.review_meaningful_presence_rationale.trim() || null,
    review_rights_posture:                s.review_rights_posture || null,
    review_craft_result:                  s.review_craft_result || null,
    review_catalog_fit:                   s.review_catalog_fit || null,
    review_decision_record:               s.review_decision_record.trim() || null,
    review_risk_notes:                    s.review_risk_notes.trim() || null,
  };
}

// Project-level summary of where the institutional gates currently stand.
// Returned to the parent so it can disable Approve and render copy.
export function gateState(project: any, review: AdminReviewState) {
  const integrityErr = validateCreatorIntegrity(project as CreatorIntegrityInput);
  const reviewMerged: AdminReviewInput = { ...project, ...reviewToPayload(review) };
  const completenessErr = validateAdminReviewComplete(reviewMerged);
  const passingErr      = isReviewPassing(reviewMerged);
  return {
    integrityComplete:  integrityErr === null,
    integrityMessage:   integrityErr?.message ?? null,
    reviewComplete:     completenessErr === null,
    reviewMessage:      completenessErr?.message ?? null,
    approvalAllowed:    integrityErr === null && passingErr === null,
    approvalBlockedMessage: passingErr?.message ?? integrityErr?.message ?? null,
  };
}

export default function SubmissionReviewPanel({
  project,
  review,
  onChange,
  onSaveReview,
  saving,
  saved,
  hideForLegacyStates = false,
}: {
  project: any;
  review: AdminReviewState;
  onChange: (next: AdminReviewState) => void;
  onSaveReview: () => void;
  saving: boolean;
  saved: boolean;
  hideForLegacyStates?: boolean;
}) {
  const set = <K extends keyof AdminReviewState>(k: K) =>
    (v: AdminReviewState[K]) => onChange({ ...review, [k]: v });

  const integrityHasNothing =
    !project.thesis_path && !project.ai_usage && !project.prior_distribution;

  // Backward compatibility: if a project predates the integrity system
  // entirely (no thesis_path, no ai_usage, no prior_distribution), surface
  // a "legacy" warning. Approve is still gated server-side; admin must
  // still complete the review record before approval.
  const isLegacy = integrityHasNothing;

  if (hideForLegacyStates && isLegacy && project.status === "live") {
    // Live legacy works: surface only the warning, no review form.
    return (
      <div className="mt-5 pt-4 border-t border-white/5 space-y-2">
        <p className="text-xs uppercase tracking-widest text-neutral-500">
          Submission Integrity
        </p>
        <p className="text-[11px] text-yellow-300/80 leading-relaxed">
          Legacy work — predates Submission Integrity v1. No creator integrity
          record on file. Future approvals require a full record.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* ── 1. Submission Integrity Summary (read-only) ── */}
      <div className="mt-5 pt-4 border-t border-white/5 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs uppercase tracking-widest text-neutral-500">
            Submission Integrity Summary
          </p>
          {isLegacy ? (
            <span className="text-[11px] px-2 py-0.5 rounded border bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
              Legacy — no integrity record
            </span>
          ) : (
            <span className="text-[11px] px-2 py-0.5 rounded border bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
              Submitted with integrity record
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <SummaryField label="Thesis path" value={
            project.thesis_path ? THESIS_PATH_LABELS[project.thesis_path as keyof typeof THESIS_PATH_LABELS] : "—"
          } />
          <SummaryField label="AI usage" value={
            project.ai_usage ? AI_USAGE_LABELS[project.ai_usage as keyof typeof AI_USAGE_LABELS] : "—"
          } />
          <SummaryField label="Prior distribution" value={
            project.prior_distribution ? PRIOR_DISTRIBUTION_LABELS[project.prior_distribution as keyof typeof PRIOR_DISTRIBUTION_LABELS] : "—"
          } />
          <SummaryField label="License awareness" value={
            project.license_awareness_ack === true ? "Acknowledged" : "Not acknowledged"
          } />
          <SummaryField label="Thesis explanation" full value={project.thesis_explanation || "—"} />
          <SummaryField
            label="Collaborators"
            full
            value={
              project.no_collaborators_ack === true
                ? "None disclosed (creator confirmed no collaborators or co-owners)."
                : project.collaborators || "—"
            }
          />
          {project.ai_usage_description && (
            <SummaryField label="AI usage description" full value={project.ai_usage_description} />
          )}
          {project.prior_distribution_details && (
            <SummaryField label="Prior distribution details" full value={project.prior_distribution_details} />
          )}
          <SummaryField
            label="Rights attestations"
            full
            value={[
              ["Owns / controls rights",            project.rights_ownership_ack],
              ["Collaborators disclosed",           project.rights_collaborators_disclosed_ack],
              ["No conflicting agreements",         project.rights_no_conflicts_ack],
              ["No unlicensed third-party assets",  project.rights_no_unlicensed_assets_ack],
            ]
              .map(([label, ok]) => `${ok ? "✓" : "✗"} ${label}`)
              .join("  ·  ")}
          />
        </div>
      </div>

      {/* ── 2. Review Integrity Panel (admin inputs) ── */}
      <div className="mt-5 pt-4 border-t border-white/5 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs uppercase tracking-widest text-neutral-500">
            Review Integrity Panel
          </p>
          {project.reviewed_at && (
            <span className="text-[11px] text-neutral-500">
              Last reviewed {new Date(project.reviewed_at).toLocaleString()}{project.reviewed_by ? ` · ${project.reviewed_by}` : ""}
            </span>
          )}
        </div>

        {/* A. Thesis Check */}
        <Row label="A. Thesis check">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={review.review_thesis_confirmed}
              onChange={(e) => set("review_thesis_confirmed")(e.target.checked)}
              style={{ accentColor: "#f5c518" }}
            />
            <span className="text-xs text-white">Thesis fit confirmed</span>
          </label>
          <textarea
            value={review.review_meaningful_presence_rationale}
            onChange={(e) => set("review_meaningful_presence_rationale")(e.target.value)}
            placeholder="Rationale for meaningful presence (required)"
            rows={3}
            className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-orange-500/40 mt-2"
          />
        </Row>

        {/* B. Rights Check */}
        <Row label="B. Rights posture">
          <Pills
            options={REVIEW_RIGHTS_POSTURE_VALUES}
            labels={REVIEW_RIGHTS_POSTURE_LABELS}
            value={review.review_rights_posture}
            onChange={(v) => set("review_rights_posture")(v as ReviewRightsPosture | "")}
          />
        </Row>

        {/* C. Craft Check */}
        <Row label="C. Craft result">
          <Pills
            options={REVIEW_CRAFT_RESULT_VALUES}
            labels={REVIEW_CRAFT_RESULT_LABELS}
            value={review.review_craft_result}
            onChange={(v) => set("review_craft_result")(v as ReviewCraftResult | "")}
          />
        </Row>

        {/* D. Catalog Fit */}
        <Row label="D. Catalog fit">
          <Pills
            options={REVIEW_CATALOG_FIT_VALUES}
            labels={REVIEW_CATALOG_FIT_LABELS}
            value={review.review_catalog_fit}
            onChange={(v) => set("review_catalog_fit")(v as ReviewCatalogFit | "")}
          />
        </Row>

        {/* E. Decision Record */}
        <Row label="E. Decision record">
          <textarea
            value={review.review_decision_record}
            onChange={(e) => set("review_decision_record")(e.target.value)}
            placeholder="Why this work belongs in ShangoMaji."
            rows={3}
            className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-orange-500/40"
          />
        </Row>

        {/* F. Risk Notes */}
        <Row label="F. Risk notes (optional)">
          <textarea
            value={review.review_risk_notes}
            onChange={(e) => set("review_risk_notes")(e.target.value)}
            placeholder="Anything to flag for ops or future review."
            rows={2}
            className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-orange-500/40"
          />
        </Row>

        <div className="flex items-center gap-2 flex-wrap pt-1">
          <button
            onClick={onSaveReview}
            disabled={saving}
            className="px-3 py-1.5 rounded text-xs font-medium border border-white/15 text-white hover:bg-white/10 transition disabled:opacity-50"
          >
            {saving ? "Saving review…" : saved ? "Review saved" : "Save Review"}
          </button>
        </div>
      </div>
    </>
  );
}

function SummaryField({ label, value, full }: { label: string; value?: string; full?: boolean }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <p className="text-neutral-500 text-[11px] mb-0.5">{label}</p>
      <p className="text-white text-xs whitespace-pre-wrap">{value || "—"}</p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-neutral-500 mb-2">{label}</p>
      {children}
    </div>
  );
}

function Pills<T extends string>({
  options,
  labels,
  value,
  onChange,
}: {
  options: readonly T[];
  labels: Record<T, string>;
  value: T | "";
  onChange: (v: T | "") => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(value === o ? "" : o)}
          className={`px-3 py-1.5 rounded-lg text-xs border transition ${
            value === o
              ? "border-transparent text-black"
              : "border-white/10 text-neutral-400 hover:border-white/20 hover:text-white"
          }`}
          style={value === o ? { background: "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)" } : {}}
        >
          {labels[o]}
        </button>
      ))}
    </div>
  );
}
