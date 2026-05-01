"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  SDL_ACKS,
  SDL_SECTIONS,
  SDL_TERM_YEARS,
  SDL_TITLE,
  SDL_VERSION,
  isValidLegalName,
  LEGAL_NAME_ERROR,
  type AckKey,
  type SDLTermYears,
} from "@/lib/standard-distribution-license";

type LicenseRow = {
  id: string;
  project_id: string;
  term_years: number;
  signer_legal_name: string;
  signer_email: string;
  signed_at: string;
  status: string;
  term_start: string | null;
  term_end: string | null;
  pdf_url: string | null;
};

type ApiState = {
  project: { id: string; title: string; status: string } | null;
  license: LicenseRow | null;
  suggestedSignerName: string | null;
  error: string | null;
  loading: boolean;
};

export default function LicensePage() {
  const params    = useParams<{ projectId: string }>();
  const projectId = params?.projectId ?? "";

  const [state, setState] = useState<ApiState>({
    project: null,
    license: null,
    suggestedSignerName: null,
    error:   null,
    loading: true,
  });

  // Form state
  const [termYears, setTermYears]     = useState<SDLTermYears | null>(null);
  const [legalName, setLegalName]     = useState("");
  const [signature, setSignature]     = useState("");
  const [acks, setAcks]               = useState<Record<AckKey, boolean>>(() =>
    Object.fromEntries(SDL_ACKS.map((a) => [a.key, false])) as Record<AckKey, boolean>
  );
  const [legalNameCertAck, setLegalNameCertAck] = useState(false);
  const [submitBusy, setSubmitBusy]   = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!projectId) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    fetch(`/api/licenses?projectId=${encodeURIComponent(projectId)}`, {
      credentials: "include",
    })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data?.error || "Could not load license state");
        return data;
      })
      .then((data) => {
        const suggested =
          typeof data.suggestedSignerName === "string" && data.suggestedSignerName.trim().length > 0
            ? data.suggestedSignerName.trim()
            : null;
        setState({
          project: data.project ?? null,
          license: data.license ?? null,
          suggestedSignerName: suggested,
          error:   null,
          loading: false,
        });
        if (!data.license && suggested) {
          setLegalName((prev) => (prev.trim().length === 0 ? suggested : prev));
        }
      })
      .catch((err: any) => {
        setState({
          project: null,
          license: null,
          suggestedSignerName: null,
          error:   err.message || "Could not load license state",
          loading: false,
        });
      });
  }, [projectId]);

  const allAcksTrue = useMemo(
    () => SDL_ACKS.every((a) => acks[a.key] === true),
    [acks]
  );
  const legalNameValid   = isValidLegalName(legalName);
  const signatureMatches = legalNameValid && signature.trim() === legalName.trim();
  const canSubmit =
    !submitBusy &&
    termYears !== null &&
    legalNameValid &&
    signatureMatches &&
    allAcksTrue &&
    legalNameCertAck;

  async function submitLicense() {
    if (!canSubmit || termYears === null) return;
    setSubmitBusy(true);
    setSubmitError("");
    try {
      const body: Record<string, any> = {
        projectId,
        termYears,
        signerLegalName: legalName.trim(),
        typedSignature:  signature.trim(),
        legalNameCertificationAck: legalNameCertAck === true,
      };
      for (const a of SDL_ACKS) body[a.key] = acks[a.key] === true;

      const res = await fetch("/api/licenses", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Execution failed");

      // Reload to confirmation state
      setState((s) => ({ ...s, license: data.license }));
    } catch (err: any) {
      setSubmitError(err.message || "Execution failed");
    } finally {
      setSubmitBusy(false);
    }
  }

  // ── Loading / error / unavailable ──
  if (state.loading) {
    return <Shell><p style={faintText}>Loading license…</p></Shell>;
  }
  if (state.error) {
    return (
      <Shell>
        <Eyebrow>{SDL_VERSION}</Eyebrow>
        <h1 style={titleStyle}>License unavailable</h1>
        <p style={faintText}>{state.error}</p>
        <BackLink />
      </Shell>
    );
  }
  if (!state.project) {
    return (
      <Shell>
        <Eyebrow>{SDL_VERSION}</Eyebrow>
        <h1 style={titleStyle}>License unavailable</h1>
        <p style={faintText}>This license cannot be opened right now.</p>
        <BackLink />
      </Shell>
    );
  }

  // ── Already executed ──
  if (state.license) {
    const lic = state.license;
    return (
      <Shell>
        <Eyebrow>{SDL_VERSION}</Eyebrow>
        <h1 style={titleStyle}>License executed.</h1>
        <p style={{ ...bodyText, marginBottom: 8 }}>
          Your {SDL_TITLE} for <strong style={{ color: "white" }}>{state.project.title}</strong> is on file.
        </p>
        <p style={{ ...bodyText, marginBottom: 24, fontSize: 14 }}>
          Distribution is now <strong style={{ color: "white" }}>pending ShangoMaji activation</strong>.
          Your selected term begins only when activation occurs.
        </p>

        <Card>
          <Row label="Status">{lic.status}</Row>
          <Row label="Term">{lic.term_years} year(s)</Row>
          <Row label="Signed">{formatDate(lic.signed_at)}</Row>
          <Row label="Term start">{lic.term_start ? formatDate(lic.term_start) : "Pending activation"}</Row>
          <Row label="Term end">{lic.term_end ? formatDate(lic.term_end) : "Pending activation"}</Row>
          <Row label="Signer">{lic.signer_legal_name}</Row>
        </Card>

        <div style={{ marginTop: 20, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a
            href={lic.pdf_url ?? `/api/licenses/${lic.id}/receipt`}
            target="_blank"
            rel="noopener noreferrer"
            style={primaryBtn}
          >
            View receipt
          </a>
          <BackLink />
        </div>

        {!lic.pdf_url && (
          <p style={{ ...faintText, fontSize: 12, marginTop: 16 }}>
            PDF generation is not yet available. The HTML receipt above is the durable record —
            print to PDF from your browser for an offline copy.
          </p>
        )}
      </Shell>
    );
  }

  // ── Execute ──
  return (
    <Shell wide>
      <Eyebrow>{SDL_VERSION}</Eyebrow>
      <h1 style={titleStyle}>{SDL_TITLE}</h1>
      <p style={{ ...bodyText, marginBottom: 28 }}>
        Executing for <strong style={{ color: "white" }}>{state.project.title}</strong>.
        Read the terms, select your term length, acknowledge each item, and sign.
      </p>

      {/* SDL full text */}
      <Card>
        {SDL_SECTIONS.map((s) => (
          <div key={s.heading} style={{ marginBottom: 14 }}>
            <p style={{ color: "white", fontWeight: 600, fontSize: 14, margin: "0 0 4px" }}>
              {s.heading}
            </p>
            <p style={{ ...bodyText, fontSize: 13, margin: 0 }}>{s.body}</p>
          </div>
        ))}
      </Card>

      {/* Term selection */}
      <SectionHeader>Select term</SectionHeader>
      <p style={{ ...faintText, fontSize: 13, marginBottom: 12 }}>
        No default. Choose 1, 2, 3, or 5 years.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 28 }}>
        {SDL_TERM_YEARS.map((y) => (
          <button
            key={y}
            onClick={() => setTermYears(y)}
            style={termYears === y ? termBtnActive : termBtnIdle}
          >
            {y} year{y === 1 ? "" : "s"}
          </button>
        ))}
      </div>

      {/* Acknowledgments */}
      <SectionHeader>Acknowledgments</SectionHeader>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
        {SDL_ACKS.map((a) => (
          <label key={a.key} style={ackRow}>
            <input
              type="checkbox"
              checked={acks[a.key]}
              onChange={(e) =>
                setAcks((prev) => ({ ...prev, [a.key]: e.target.checked }))
              }
              style={{ marginTop: 3, accentColor: "#f5c518" }}
            />
            <span style={{ ...bodyText, fontSize: 13, lineHeight: 1.5 }}>{a.label}</span>
          </label>
        ))}
      </div>

      {/* Signature */}
      <SectionHeader>Sign</SectionHeader>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
        <div>
          <label style={fieldLabel}>Full legal name (first and last)</label>
          <input
            type="text"
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
            placeholder="e.g. Jane A. Doe"
            style={inputStyle}
          />
          {legalName.trim().length > 0 && !legalNameValid && (
            <p style={{ color: "#fca5a5", fontSize: 12, marginTop: 6 }}>
              {LEGAL_NAME_ERROR}
            </p>
          )}
        </div>
        <div>
          <label style={fieldLabel}>Typed signature (must match the legal name exactly)</label>
          <input
            type="text"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder={legalNameValid ? legalName.trim() : "Type your full legal name"}
            style={inputStyle}
          />
          {signature.length > 0 && !signatureMatches && (
            <p style={{ color: "#fca5a5", fontSize: 12, marginTop: 6 }}>
              Signature must match the legal name exactly.
            </p>
          )}
        </div>
      </div>

      {/* Standalone legal-name truth attestation. Separate from the seven SDL acks. */}
      <div
        style={{
          marginBottom: 28,
          padding: 14,
          border: "1px solid rgba(245,197,24,0.25)",
          background: "rgba(245,197,24,0.05)",
          borderRadius: 10,
        }}
      >
        <label style={{ ...ackRow, alignItems: "flex-start" }}>
          <input
            type="checkbox"
            checked={legalNameCertAck}
            onChange={(e) => setLegalNameCertAck(e.target.checked)}
            style={{ marginTop: 3, accentColor: "#f5c518" }}
          />
          <span style={{ ...bodyText, fontSize: 13, lineHeight: 1.5 }}>
            I certify that the legal name and typed signature entered above are accurate
            and belong to me.
          </span>
        </label>
      </div>

      {submitError && (
        <p style={{ color: "#fca5a5", fontSize: 13, marginBottom: 14 }}>{submitError}</p>
      )}

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button
          onClick={submitLicense}
          disabled={!canSubmit}
          style={canSubmit ? primaryBtn : primaryBtnDisabled}
        >
          {submitBusy ? "Executing…" : "Execute License"}
        </button>
        <BackLink />
      </div>
    </Shell>
  );
}

// ── Layout / styling helpers ─────────────────────────────────────────────

function Shell({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div style={{ minHeight: "100vh", padding: "96px 20px 80px" }}>
      <div style={{ maxWidth: wide ? 720 : 560, margin: "0 auto" }}>{children}</div>
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 11,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: "rgba(245,197,24,0.85)",
        margin: "0 0 12px",
        fontWeight: 600,
      }}
    >
      {children}
    </p>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        color: "white",
        fontSize: 14,
        fontWeight: 600,
        margin: "8px 0 8px",
        letterSpacing: "0.02em",
      }}
    >
      {children}
    </h2>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.02)",
        borderRadius: 12,
        padding: 18,
        marginBottom: 28,
      }}
    >
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "140px 1fr",
        gap: 12,
        padding: "6px 0",
        fontSize: 13,
      }}
    >
      <span style={{ color: "rgba(255,255,255,0.45)" }}>{label}</span>
      <span style={{ color: "white" }}>{children}</span>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/workspace/projects"
      style={{
        fontSize: 12,
        textTransform: "uppercase",
        letterSpacing: "0.15em",
        color: "rgba(255,255,255,0.45)",
        textDecoration: "none",
      }}
    >
      ← Back to projects
    </Link>
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toUTCString();
  } catch {
    return iso;
  }
}

const titleStyle: React.CSSProperties = {
  color: "white",
  fontWeight: 700,
  fontSize: 28,
  letterSpacing: "-0.01em",
  margin: "0 0 12px",
};
const bodyText: React.CSSProperties = { color: "rgba(255,255,255,0.7)", lineHeight: 1.6 };
const faintText: React.CSSProperties = { color: "rgba(255,255,255,0.5)" };
const fieldLabel: React.CSSProperties = {
  display: "block",
  color: "rgba(255,255,255,0.55)",
  fontSize: 12,
  marginBottom: 6,
  letterSpacing: "0.02em",
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(0,0,0,0.4)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 10,
  color: "white",
  padding: "10px 12px",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};
const ackRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "auto 1fr",
  gap: 10,
  alignItems: "start",
  cursor: "pointer",
};
const termBtnIdle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.15)",
  color: "rgba(255,255,255,0.7)",
  padding: "8px 14px",
  borderRadius: 10,
  fontSize: 13,
  cursor: "pointer",
};
const termBtnActive: React.CSSProperties = {
  ...termBtnIdle,
  background: "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)",
  color: "#000",
  fontWeight: 600,
  border: "1px solid transparent",
};
const primaryBtn: React.CSSProperties = {
  background: "linear-gradient(90deg, #e53e2a, #f07030, #f5c518)",
  color: "#000",
  border: "none",
  padding: "10px 18px",
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  textDecoration: "none",
  display: "inline-block",
};
const primaryBtnDisabled: React.CSSProperties = {
  ...primaryBtn,
  opacity: 0.4,
  cursor: "not-allowed",
};
