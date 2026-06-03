import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import {
  getSdlByVersion,
  type SDLVersionEntry,
} from "@/lib/standard-distribution-license";
import { checkAdminPassword } from "@/lib/admin-auth";

// HTML receipt for an executed license. This is the durable record in the
// absence of a generated PDF — it can be printed to PDF by the browser.
// Access is restricted to the signer (creator) and admin (via x-admin-password).

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function escapeHtml(s: string | null | undefined): string {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Validate a stored sdl_terms_snapshot (jsonb) into a usable terms object.
// Returns null on missing/malformed data so the caller can fall back to the
// frozen version registry rather than throwing on a bad row.
function parseSnapshot(raw: unknown): SDLVersionEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const { version, title, sections, acks } = o;
  if (
    typeof version === "string" &&
    typeof title === "string" &&
    Array.isArray(sections) &&
    Array.isArray(acks) &&
    sections.every(
      (s) => s && typeof (s as any).heading === "string" && typeof (s as any).body === "string"
    ) &&
    acks.every((a) => a && typeof (a as any).label === "string")
  ) {
    return o as unknown as SDLVersionEntry;
  }
  return null;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  // Timing-safe comparison via shared helper. See src/lib/admin-auth.ts.
  // Receipt admin access keeps its existing semantics (admin can fetch any
  // signer's receipt); only the comparison primitive changes.
  const isAdmin  = checkAdminPassword(req.headers.get("x-admin-password"));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userEmail = user?.email?.trim().toLowerCase() ?? null;

  if (!isAdmin && !userEmail) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = svc();
  const { data: license, error } = await admin
    .from("creator_licenses")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !license) {
    return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
  }

  if (!isAdmin && license.signer_email?.trim().toLowerCase() !== userEmail) {
    return NextResponse.json({ error: "Not authorized for this receipt" }, { status: 403 });
  }

  const { data: project } = await admin
    .from("creator_projects")
    .select("title")
    .eq("id", license.project_id)
    .maybeSingle();

  const projectTitle = project?.title ?? "Untitled";

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toUTCString();
    } catch {
      return iso;
    }
  };

  // Resolve the terms to display. Prefer the immutable snapshot captured at
  // signing (Phase 10J-F); fall back to the frozen version registry for legacy
  // rows executed before snapshots existed. Live SDL constants are never used.
  const snapshot    = parseSnapshot(license.sdl_terms_snapshot);
  const hasSnapshot = snapshot !== null;
  const terms       = snapshot ?? getSdlByVersion(license.sdl_version);
  const termsSource = hasSnapshot
    ? "Terms shown from signed snapshot."
    : "Terms shown from SDL-v1 record. Snapshot was not stored at original signing.";

  const sectionsHtml = terms.sections.map(
    (s) => `
      <section>
        <h3>${escapeHtml(s.heading)}</h3>
        <p>${escapeHtml(s.body)}</p>
      </section>`
  ).join("");

  const acksHtml = terms.acks.map(
    (a) => `<li>${escapeHtml(a.label)}</li>`
  ).join("");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(terms.title)} — Receipt</title>
<style>
  :root { color-scheme: light; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 760px; margin: 40px auto; padding: 0 24px; color: #111; line-height: 1.55; }
  header { border-bottom: 1px solid #ddd; padding-bottom: 16px; margin-bottom: 28px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .eyebrow { font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #888; }
  h3 { font-size: 14px; margin: 18px 0 4px; }
  p  { font-size: 14px; margin: 0 0 8px; }
  dl { display: grid; grid-template-columns: 200px 1fr; gap: 6px 16px; font-size: 13px; margin: 0; }
  dt { color: #666; }
  dd { margin: 0; }
  .acks { padding-left: 20px; font-size: 13px; }
  .acks li { margin-bottom: 4px; }
  footer { margin-top: 36px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 11px; color: #888; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
  <header>
    <p class="eyebrow">${escapeHtml(terms.version)}</p>
    <h1>${escapeHtml(terms.title)} — Executed Receipt</h1>
    <p>Project: <strong>${escapeHtml(projectTitle)}</strong></p>
  </header>

  <h2 style="font-size:16px;margin:0 0 12px;">Execution Record</h2>
  <dl>
    <dt>License ID</dt>           <dd>${escapeHtml(license.id)}</dd>
    <dt>Project ID</dt>           <dd>${escapeHtml(license.project_id)}</dd>
    <dt>Status</dt>               <dd>${escapeHtml(license.status)}</dd>
    <dt>Term</dt>                 <dd>${escapeHtml(String(license.term_years))} year(s)</dd>
    <dt>Term Start</dt>           <dd>${escapeHtml(formatDate(license.term_start))}</dd>
    <dt>Term End</dt>             <dd>${escapeHtml(formatDate(license.term_end))}</dd>
    <dt>Signer Legal Name</dt>    <dd>${escapeHtml(license.signer_legal_name)}</dd>
    <dt>Signer Email</dt>         <dd>${escapeHtml(license.signer_email)}</dd>
    <dt>Signed At (UTC)</dt>      <dd>${escapeHtml(formatDate(license.signed_at))}</dd>
    <dt>Signed IP</dt>            <dd>${escapeHtml(license.signed_ip ?? "—")}</dd>
    <dt>Signed User-Agent</dt>    <dd>${escapeHtml(license.signed_user_agent ?? "—")}</dd>
    <dt>Legal-Name Certification</dt><dd>${
      license.legal_name_certification_ack === true
        ? "Certified by signer at execution"
        : "Not on record (pre-certification execution)"
    }</dd>
    <dt>Certification Copy Version</dt><dd>${escapeHtml(
      license.identity_certification_version ?? "v1"
    )}</dd>
  </dl>

  <h2 style="font-size:16px;margin:28px 0 12px;">Acknowledgments at Signing</h2>
  <ul class="acks">
    ${acksHtml}
    <li><strong>Legal-name truth attestation:</strong> ${(() => {
      // Render the historically accurate certification copy. We do not
      // retroactively rewrite what past signers actually agreed to.
      if (license.legal_name_certification_ack !== true) {
        return "Not captured for this execution.";
      }
      const v = license.identity_certification_version;
      if (v === "v2") {
        return (
          "I certify that the legal name entered is my true legal identity " +
          "and matches my government-issued identification. I understand that " +
          "providing false information may result in account termination, " +
          "license invalidation, and removal from the ShangoMaji catalog."
        );
      }
      // Old/unversioned certifications carry the previous, weaker copy.
      return "I certify that the legal name and typed signature entered are accurate and belong to me.";
    })()}</li>
  </ul>

  <h2 style="font-size:16px;margin:28px 0 12px;">${escapeHtml(terms.title)} — Full Terms</h2>
  <p style="font-size:12px;color:#666;margin:0 0 12px;">${escapeHtml(termsSource)}</p>
  ${sectionsHtml}

  <footer>
    Generated from ShangoMaji creator_licenses #${escapeHtml(license.id)}.
    This is a durable receipt; print this page to PDF for an offline copy.
  </footer>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type":  "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
