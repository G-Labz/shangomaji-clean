"use client";

// Submission Integrity v1 — creator-facing integrity panel.
//
// Used by the New Work and Edit Work pages. Renders the six required sections
// (Thesis Declaration, Rights Attestation, Collaborator Disclosure,
// AI Disclosure, Prior Distribution, License Awareness) and lifts state to
// the parent through controlled props.
//
// Validation here is UX only. The server is the source of truth for the
// submit gate; see src/lib/submission-integrity.ts.

import {
  THESIS_PATHS,
  THESIS_PATH_LABELS,
  AI_USAGE_VALUES,
  AI_USAGE_LABELS,
  PRIOR_DISTRIBUTION_VALUES,
  PRIOR_DISTRIBUTION_LABELS,
  validateCreatorIntegrity,
  type ThesisPath,
  type AiUsage,
  type PriorDistribution,
  type CreatorIntegrityInput,
} from "@/lib/submission-integrity";

export type IntegrityState = {
  thesis_path:                          ThesisPath | "";
  thesis_explanation:                   string;
  rights_ownership_ack:                 boolean;
  rights_collaborators_disclosed_ack:   boolean;
  rights_no_conflicts_ack:              boolean;
  rights_no_unlicensed_assets_ack:      boolean;
  collaborators:                        string;
  no_collaborators_ack:                 boolean;
  ai_usage:                             AiUsage | "";
  ai_usage_description:                 string;
  prior_distribution:                   PriorDistribution | "";
  prior_distribution_details:           string;
  license_awareness_ack:                boolean;
};

export const emptyIntegrity: IntegrityState = {
  thesis_path:                          "",
  thesis_explanation:                   "",
  rights_ownership_ack:                 false,
  rights_collaborators_disclosed_ack:   false,
  rights_no_conflicts_ack:              false,
  rights_no_unlicensed_assets_ack:      false,
  collaborators:                        "",
  no_collaborators_ack:                 false,
  ai_usage:                             "",
  ai_usage_description:                 "",
  prior_distribution:                   "",
  prior_distribution_details:           "",
  license_awareness_ack:                false,
};

// Convert from the loose any-shape API record into the form state.
export function integrityFromProject(p: any): IntegrityState {
  return {
    thesis_path:                          (p?.thesis_path ?? "") as ThesisPath | "",
    thesis_explanation:                   p?.thesis_explanation ?? "",
    rights_ownership_ack:                 p?.rights_ownership_ack === true,
    rights_collaborators_disclosed_ack:   p?.rights_collaborators_disclosed_ack === true,
    rights_no_conflicts_ack:              p?.rights_no_conflicts_ack === true,
    rights_no_unlicensed_assets_ack:      p?.rights_no_unlicensed_assets_ack === true,
    collaborators:                        p?.collaborators ?? "",
    no_collaborators_ack:                 p?.no_collaborators_ack === true,
    ai_usage:                             (p?.ai_usage ?? "") as AiUsage | "",
    ai_usage_description:                 p?.ai_usage_description ?? "",
    prior_distribution:                   (p?.prior_distribution ?? "") as PriorDistribution | "",
    prior_distribution_details:           p?.prior_distribution_details ?? "",
    license_awareness_ack:                p?.license_awareness_ack === true,
  };
}

// Convert state into the API payload shape expected by /api/creators/projects.
export function integrityToPayload(s: IntegrityState): Record<string, unknown> {
  return {
    thesis_path:                          s.thesis_path || null,
    thesis_explanation:                   s.thesis_explanation.trim() || null,
    rights_ownership_ack:                 s.rights_ownership_ack,
    rights_collaborators_disclosed_ack:   s.rights_collaborators_disclosed_ack,
    rights_no_conflicts_ack:              s.rights_no_conflicts_ack,
    rights_no_unlicensed_assets_ack:      s.rights_no_unlicensed_assets_ack,
    collaborators:                        s.collaborators.trim() || null,
    no_collaborators_ack:                 s.no_collaborators_ack,
    ai_usage:                             s.ai_usage || null,
    ai_usage_description:                 s.ai_usage_description.trim() || null,
    prior_distribution:                   s.prior_distribution || null,
    prior_distribution_details:           s.prior_distribution_details.trim() || null,
    license_awareness_ack:                s.license_awareness_ack,
  };
}

export function checkIntegrity(s: IntegrityState) {
  return validateCreatorIntegrity(s as unknown as CreatorIntegrityInput);
}

const LICENSE_AWARENESS_COPY =
  "I understand this is a licensing submission, not a publishing platform. " +
  "If accepted, this work requires a signed distribution license before " +
  "distribution activation and cannot be removed unilaterally during the " +
  "active license term.";

export default function SubmissionIntegrityForm({
  value,
  onChange,
  disabled,
  fieldError,
}: {
  value: IntegrityState;
  onChange: (next: IntegrityState) => void;
  disabled?: boolean;
  fieldError?: string | null;
}) {
  const set = <K extends keyof IntegrityState>(k: K) =>
    (v: IntegrityState[K]) => onChange({ ...value, [k]: v });

  return (
    <fieldset
      disabled={disabled}
      style={{
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        padding: 20,
        margin: 0,
        opacity: disabled ? 0.55 : 1,
        pointerEvents: disabled ? "none" : "auto",
        background: "rgba(255,255,255,0.02)",
      }}
    >
      <legend
        style={{
          padding: "0 8px",
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "rgba(245,197,24,0.85)",
          fontWeight: 600,
        }}
      >
        Submission Integrity
      </legend>
      <p className="text-xs text-ink-faint" style={{ marginTop: 4, marginBottom: 18 }}>
        Required before this work can be submitted for editorial review. Drafts may save
        partially; submission is gated on a complete record.
      </p>

      {/* A. Thesis Declaration */}
      <Section title="A. Thesis Declaration" />
      <p className="text-xs text-ink-faint" style={{ marginBottom: 8 }}>
        How does this work meet ShangoMaji&rsquo;s thesis?
      </p>
      <div className="flex flex-wrap gap-2" style={{ marginBottom: 10 }}>
        {THESIS_PATHS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => set("thesis_path")(p)}
            className={`px-3 py-1.5 rounded-lg text-xs border transition ${
              value.thesis_path === p
                ? "border-transparent text-black"
                : "border-white/10 text-ink-faint hover:border-white/20 hover:text-white"
            }`}
            style={
              value.thesis_path === p
                ? { background: "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)" }
                : {}
            }
          >
            {THESIS_PATH_LABELS[p]}
          </button>
        ))}
      </div>
      <Label>Explain how this work meets ShangoMaji&rsquo;s thesis.</Label>
      <Textarea
        value={value.thesis_explanation}
        onChange={(v) => set("thesis_explanation")(v)}
        placeholder="Be specific. What makes this work fit the thesis?"
        rows={4}
      />

      {/* B. Rights Attestation */}
      <Section title="B. Rights Attestation" />
      <CheckRow
        checked={value.rights_ownership_ack}
        onChange={set("rights_ownership_ack")}
        label="I own or control the rights to this work."
      />
      <CheckRow
        checked={value.rights_collaborators_disclosed_ack}
        onChange={set("rights_collaborators_disclosed_ack")}
        label="All collaborators, co-owners, or contributors have been disclosed."
      />
      <CheckRow
        checked={value.rights_no_conflicts_ack}
        onChange={set("rights_no_conflicts_ack")}
        label="This work has no conflicting distribution, publishing, or licensing agreements."
      />
      <CheckRow
        checked={value.rights_no_unlicensed_assets_ack}
        onChange={set("rights_no_unlicensed_assets_ack")}
        label="This work does not contain unlicensed third-party assets."
      />

      {/* C. Collaborator Disclosure */}
      <Section title="C. Collaborator Disclosure" />
      <Label>List collaborators, co-owners, or contributors.</Label>
      <Textarea
        value={value.collaborators}
        onChange={(v) => {
          // Typing collaborators implicitly clears the "no collaborators" ack.
          if (v.trim() && value.no_collaborators_ack) {
            onChange({ ...value, collaborators: v, no_collaborators_ack: false });
          } else {
            set("collaborators")(v);
          }
        }}
        placeholder="Name, role, agreement (one per line)"
        rows={3}
      />
      <CheckRow
        checked={value.no_collaborators_ack}
        onChange={(checked) => {
          // Checking "no collaborators" implicitly clears the list.
          if (checked && value.collaborators.trim()) {
            onChange({ ...value, no_collaborators_ack: true, collaborators: "" });
          } else {
            set("no_collaborators_ack")(checked);
          }
        }}
        label="No collaborators or co-owners."
      />

      {/* D. AI Disclosure */}
      <Section title="D. AI Disclosure" />
      <div className="flex flex-wrap gap-2" style={{ marginBottom: 10 }}>
        {AI_USAGE_VALUES.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => set("ai_usage")(p)}
            className={`px-3 py-1.5 rounded-lg text-xs border transition ${
              value.ai_usage === p
                ? "border-transparent text-black"
                : "border-white/10 text-ink-faint hover:border-white/20 hover:text-white"
            }`}
            style={
              value.ai_usage === p
                ? { background: "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)" }
                : {}
            }
          >
            {AI_USAGE_LABELS[p]}
          </button>
        ))}
      </div>
      {(value.ai_usage === "assisted" || value.ai_usage === "generated") && (
        <>
          <Label>Describe how AI was used in this work.</Label>
          <Textarea
            value={value.ai_usage_description}
            onChange={(v) => set("ai_usage_description")(v)}
            placeholder="Tools, scope of use, what was AI-touched and what wasn't."
            rows={3}
          />
        </>
      )}

      {/* E. Prior Distribution */}
      <Section title="E. Prior Distribution" />
      <div className="flex flex-wrap gap-2" style={{ marginBottom: 10 }}>
        {PRIOR_DISTRIBUTION_VALUES.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => set("prior_distribution")(p)}
            className={`px-3 py-1.5 rounded-lg text-xs border transition ${
              value.prior_distribution === p
                ? "border-transparent text-black"
                : "border-white/10 text-ink-faint hover:border-white/20 hover:text-white"
            }`}
            style={
              value.prior_distribution === p
                ? { background: "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)" }
                : {}
            }
          >
            {PRIOR_DISTRIBUTION_LABELS[p]}
          </button>
        ))}
      </div>
      {value.prior_distribution === "published" && (
        <>
          <Label>Where, when, and under what arrangement was this work distributed?</Label>
          <Textarea
            value={value.prior_distribution_details}
            onChange={(v) => set("prior_distribution_details")(v)}
            placeholder="Distributor / platform, dates, exclusivity, current status."
            rows={3}
          />
        </>
      )}

      {/* F. License Awareness */}
      <Section title="F. License Awareness" />
      <CheckRow
        checked={value.license_awareness_ack}
        onChange={set("license_awareness_ack")}
        label={LICENSE_AWARENESS_COPY}
      />

      {fieldError && (
        <p className="text-xs text-brand-red" style={{ marginTop: 14 }}>
          {fieldError}
        </p>
      )}

      <style jsx global>{`
        .integrity-textarea {
          width: 100%;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.625rem;
          padding: 0.625rem 0.75rem;
          color: white;
          font-size: 0.85rem;
          outline: none;
          resize: vertical;
          box-sizing: border-box;
        }
        .integrity-textarea:focus {
          border-color: rgba(240, 112, 48, 0.5);
        }
        .integrity-textarea::placeholder {
          color: rgba(120, 120, 120, 1);
        }
      `}</style>
    </fieldset>
  );
}

function Section({ title }: { title: string }) {
  return (
    <h3
      style={{
        color: "white",
        fontSize: 13,
        fontWeight: 600,
        margin: "20px 0 10px",
        letterSpacing: "0.01em",
      }}
    >
      {title}
    </h3>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        display: "block",
        fontSize: 12,
        color: "rgba(255,255,255,0.6)",
        marginBottom: 6,
      }}
    >
      {children}
    </label>
  );
}

function Textarea({
  value,
  onChange,
  placeholder,
  rows,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      className="integrity-textarea"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows ?? 3}
      style={{ marginBottom: 4 }}
    />
  );
}

function CheckRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        gap: 10,
        alignItems: "flex-start",
        padding: "8px 0",
        cursor: "pointer",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ marginTop: 3, accentColor: "#f5c518" }}
      />
      <span style={{ color: "rgba(255,255,255,0.78)", fontSize: 13, lineHeight: 1.5 }}>
        {label}
      </span>
    </label>
  );
}
