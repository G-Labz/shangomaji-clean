import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import {
  SDL_ACKS,
  SDL_SECTIONS,
  SDL_TITLE,
  SDL_VERSION,
} from "@/lib/standard-distribution-license";

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

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const adminPw  = req.headers.get("x-admin-password");
  const isAdmin  = !!adminPw && adminPw === process.env.ADMIN_PASSWORD;

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

  const sectionsHtml = SDL_SECTIONS.map(
    (s) => `
      <section>
        <h3>${escapeHtml(s.heading)}</h3>
        <p>${escapeHtml(s.body)}</p>
      </section>`
  ).join("");

  const acksHtml = SDL_ACKS.map(
    (a) => `<li>${escapeHtml(a.label)}</li>`
  ).join("");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(SDL_TITLE)} — Receipt</title>
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
    <p class="eyebrow">${escapeHtml(SDL_VERSION)}</p>
    <h1>${escapeHtml(SDL_TITLE)} — Executed Receipt</h1>
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
  </dl>

  <h2 style="font-size:16px;margin:28px 0 12px;">Acknowledgments at Signing</h2>
  <ul class="acks">
    ${acksHtml}
    <li><strong>Legal-name truth attestation:</strong> ${
      license.legal_name_certification_ack === true
        ? "I certify that the legal name and typed signature entered are accurate and belong to me."
        : "Not captured for this execution."
    }</li>
  </ul>

  <h2 style="font-size:16px;margin:28px 0 12px;">${escapeHtml(SDL_TITLE)} — Full Terms</h2>
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
