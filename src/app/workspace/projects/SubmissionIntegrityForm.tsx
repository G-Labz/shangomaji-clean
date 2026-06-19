"use client";

// Creator declaration mechanics — split into two render zones so the World
// Room can present them as part of two distinct experiences rather than one
// stacked submission form:
//   zone="thesis" → the editorial argument (Creative shaping zone)
//   zone="trust"  → ownership, collaborators, AI, prior distribution, license
//                   awareness (Trust & Provenance zone)
//   zone="all"    → both (default; legacy callers).
//
// The data contract, payload keys, validator (lib/submission-integrity.ts) and
// disabled semantics are unchanged — this is a presentation reorganization.
// No lettered intake-section framing; no schema/API change.

import {
  THESIS_PATHS,
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

// Creator-facing thesis framing — writes the same enum values to thesis_path.
const CREATOR_THESIS_LABELS: Record<ThesisPath, string> = {
  black_creator:                "Culture-led story",
  meaningful_black_characters:  "Meaningful Black / Afro-descendant characters",
  both:                         "Black or Afro-influenced worldbuilding",
  edge_case:                    "Other cultural fit / explain below",
};

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
  zone = "all",
}: {
  value: IntegrityState;
  onChange: (next: IntegrityState) => void;
  disabled?: boolean;
  fieldError?: string | null;
  zone?: "thesis" | "trust" | "all";
}) {
  const set = <K extends keyof IntegrityState>(k: K) =>
    (v: IntegrityState[K]) => onChange({ ...value, [k]: v });

  const showThesis = zone === "all" || zone === "thesis";
  const showTrust = zone === "all" || zone === "trust";

  return (
    <fieldset
      disabled={disabled}
      className={disabled ? "pointer-events-none" : ""}
      style={{ border: "none", padding: 0, margin: 0 }}
    >
      {/* The editorial argument — why this title belongs in the collection. */}
      {showThesis && (
        <Block
          title="Why this title belongs"
          helper="Make the editorial case. Choose the closest cultural fit, then say — in your own words — why this world belongs in the ShangoMaji collection."
          topRule={false}
        >
          <ChoiceGrid
            options={THESIS_PATHS.map((p) => ({ value: p, label: CREATOR_THESIS_LABELS[p] }))}
            selected={value.thesis_path}
            onSelect={(v) => set("thesis_path")(v as ThesisPath)}
          />
          <BlockField label="Your argument for the collection">
            <BlockTextarea
              value={value.thesis_explanation}
              onChange={(v) => set("thesis_explanation")(v)}
              placeholder="What makes this world belong here? Be specific."
              rows={5}
            />
          </BlockField>
        </Block>
      )}

      {showTrust && (
        <>
          {/* Ownership & rights */}
          <Block
            title="Ownership & rights"
            helper="Establish the title's trust posture. Confirm each statement applies to this work."
            topRule={zone === "trust"}
          >
            <div className="rounded-lg border border-white/8 divide-y divide-white/8 overflow-hidden">
              <AttestationRow
                checked={value.rights_ownership_ack}
                onChange={set("rights_ownership_ack")}
                label="I own or control the rights to this work."
              />
              <AttestationRow
                checked={value.rights_collaborators_disclosed_ack}
                onChange={set("rights_collaborators_disclosed_ack")}
                label="All collaborators, co-owners, or contributors have been disclosed."
              />
              <AttestationRow
                checked={value.rights_no_conflicts_ack}
                onChange={set("rights_no_conflicts_ack")}
                label="This work has no conflicting distribution, publishing, or licensing agreements."
              />
              <AttestationRow
                checked={value.rights_no_unlicensed_assets_ack}
                onChange={set("rights_no_unlicensed_assets_ack")}
                label="This work does not contain unlicensed third-party assets."
              />
            </div>
          </Block>

          {/* Collaborators */}
          <Block
            title="Collaborators"
            helper="List everyone who shares ownership or contributed — or confirm there are none."
          >
            <BlockField label="Who shaped this world with you?">
              <BlockTextarea
                value={value.collaborators}
                onChange={(v) => {
                  if (v.trim() && value.no_collaborators_ack) {
                    onChange({ ...value, collaborators: v, no_collaborators_ack: false });
                  } else {
                    set("collaborators")(v);
                  }
                }}
                placeholder={"Name, role, agreement (one per line)"}
                rows={4}
              />
            </BlockField>
            <ConfirmationRow
              checked={value.no_collaborators_ack}
              onChange={(checked) => {
                if (checked && value.collaborators.trim()) {
                  onChange({ ...value, no_collaborators_ack: true, collaborators: "" });
                } else {
                  set("no_collaborators_ack")(checked);
                }
              }}
              label="No collaborators or co-owners."
            />
          </Block>

          {/* AI disclosure */}
          <Block
            title="AI disclosure"
            helper="Be transparent about how AI was — or wasn’t — used."
          >
            <ChoiceGrid
              options={AI_USAGE_VALUES.map((p) => ({ value: p, label: AI_USAGE_LABELS[p] }))}
              selected={value.ai_usage}
              onSelect={(v) => set("ai_usage")(v as AiUsage)}
            />
            {(value.ai_usage === "assisted" || value.ai_usage === "generated") && (
              <BlockField label="Describe how AI was used in this work.">
                <BlockTextarea
                  value={value.ai_usage_description}
                  onChange={(v) => set("ai_usage_description")(v)}
                  placeholder="Tools, scope of use, what was AI-touched and what wasn’t."
                  rows={3}
                />
              </BlockField>
            )}
          </Block>

          {/* Prior distribution */}
          <Block
            title="Prior distribution"
            helper="Disclose any prior public release of this work."
          >
            <ChoiceGrid
              options={PRIOR_DISTRIBUTION_VALUES.map((p) => ({
                value: p,
                label: PRIOR_DISTRIBUTION_LABELS[p],
              }))}
              selected={value.prior_distribution}
              onSelect={(v) => set("prior_distribution")(v as PriorDistribution)}
            />
            {value.prior_distribution === "published" && (
              <BlockField label="Where, when, and under what arrangement was this work distributed?">
                <BlockTextarea
                  value={value.prior_distribution_details}
                  onChange={(v) => set("prior_distribution_details")(v)}
                  placeholder="Distributor / platform, dates, exclusivity, current status."
                  rows={3}
                />
              </BlockField>
            )}
          </Block>

          {/* License awareness — institutional callout */}
          <div className="mt-8 rounded-xl border border-[#E0763A]/[0.3] bg-[#E0763A]/[0.05] p-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#E0763A] font-semibold">
              License awareness
            </p>
            <p className="mt-2 text-[13px] text-white/80 leading-relaxed">
              ShangoMaji is a licensing destination. Acceptance leads to a binding distribution
              license, not an automatic publication. Please confirm you understand what
              submission means.
            </p>
            <label className="mt-4 flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={value.license_awareness_ack}
                onChange={(e) => set("license_awareness_ack")(e.target.checked)}
                className="mt-1 h-4 w-4 shrink-0"
                style={{ accentColor: "#E0763A" }}
              />
              <span className="text-[13px] text-white/85 leading-relaxed">
                {LICENSE_AWARENESS_COPY}
              </span>
            </label>
          </div>

          {fieldError && <p className="mt-4 text-xs text-brand-red">{fieldError}</p>}
        </>
      )}

      {/* When only the thesis zone is shown, surface its own validation message. */}
      {showThesis && !showTrust && fieldError && (
        <p className="mt-4 text-xs text-brand-red">{fieldError}</p>
      )}
    </fieldset>
  );
}

/* ─────────────────────────── Shaping primitives ─────────────────────────── */

function Block({
  title,
  helper,
  topRule = true,
  children,
}: {
  title: string;
  helper?: string;
  topRule?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={topRule ? "py-7 border-t border-white/8 space-y-5" : "pt-2 pb-7 space-y-5"}>
      <header className="space-y-2">
        <h3
          className="text-white text-[18px] leading-tight font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </h3>
        {helper && <p className="text-[13px] text-ink-faint leading-relaxed max-w-xl">{helper}</p>}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function BlockField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="block text-[13px] text-white/80 font-medium leading-snug">{label}</label>
      {children}
    </div>
  );
}

function BlockTextarea({
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
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows ?? 3}
      className="w-full bg-black/40 border border-white/10 rounded-lg px-3.5 py-3 text-[13px] text-white placeholder:text-white/30 leading-relaxed outline-none focus:border-[#E0763A]/[0.5] focus:bg-black/55 transition resize-y"
    />
  );
}

function ChoiceGrid({
  options,
  selected,
  onSelect,
}: {
  options: { value: string; label: string }[];
  selected: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {options.map((opt) => {
        const active = selected === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSelect(opt.value)}
            className={`text-left px-4 py-3.5 rounded-lg border text-[13px] leading-snug transition ${
              active
                ? "border-[#E0763A]/[0.5] bg-[#E0763A]/[0.07] text-white"
                : "border-white/10 bg-white/[0.02] text-ink-faint hover:border-white/25 hover:text-white"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <span
                className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border ${
                  active ? "border-[#E0763A]/[0.7]" : "border-white/25"
                }`}
              >
                {active && <span className="h-1.5 w-1.5 rounded-full bg-[#E0763A]" />}
              </span>
              <span>{opt.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function AttestationRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className={`flex items-start gap-3 px-4 py-3.5 cursor-pointer transition ${checked ? "bg-white/[0.03]" : "hover:bg-white/[0.02]"}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 shrink-0"
        style={{ accentColor: "#E0763A" }}
      />
      <span className="text-[13px] text-white/85 leading-relaxed">{label}</span>
    </label>
  );
}

function ConfirmationRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition ${checked ? "border-white/20 bg-white/[0.04]" : "border-white/8 bg-white/[0.01] hover:border-white/15"}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 shrink-0"
        style={{ accentColor: "#E0763A" }}
      />
      <span className="text-[13px] text-white/85">{label}</span>
    </label>
  );
}
