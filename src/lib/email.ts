// Email delivery via Resend REST API.
// We call the HTTP endpoint directly to avoid adding a new npm dependency.
// https://resend.com/docs/api-reference/emails/send-email
//
// Truthful failure: if RESEND_API_KEY or ONBOARDING_EMAIL_FROM is not set,
// or if Resend rejects the request, we return a descriptive error. Callers
// must surface this to admin — DO NOT pretend the email went out.

export type SendResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

export async function sendOnboardingEmail(opts: {
  to: string;
  name: string;
  onboardingUrl: string;
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from   = process.env.ONBOARDING_EMAIL_FROM;

  if (!apiKey) {
    return {
      ok: false,
      error:
        "RESEND_API_KEY is not configured. Set this environment variable to enable onboarding email delivery.",
    };
  }
  if (!from) {
    return {
      ok: false,
      error:
        "ONBOARDING_EMAIL_FROM is not configured. Set this to a verified Resend sender (e.g. 'ShangoMaji <onboarding@your-verified-domain.com>').",
    };
  }

  const { html, text } = buildOnboardingEmailBody({
    name: opts.name,
    onboardingUrl: opts.onboardingUrl,
  });

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to:      opts.to,
        subject: "You've been accepted into ShangoMaji",
        html,
        text,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg =
        (data && (data.message || data.error || data.name)) ||
        `Email send failed (HTTP ${res.status})`;
      return { ok: false, error: String(msg) };
    }

    return { ok: true, id: data?.id };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || "Network error while sending onboarding email.",
    };
  }
}

function buildOnboardingEmailBody(opts: { name: string; onboardingUrl: string }) {
  const first = (opts.name || "").split(" ")[0] || "there";

  const text =
`Hi ${first},

You've been accepted into ShangoMaji.

Before you can publish, we need you to review and accept the minimum terms. This takes about a minute.

Open your onboarding page:
${opts.onboardingUrl}

This link is unique to you. If you didn't apply to ShangoMaji, you can ignore this email.

— ShangoMaji`;

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#0c0806;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0c0806;">
      <tr>
        <td align="center" style="padding:40px 20px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#141010;border:1px solid rgba(255,255,255,0.08);border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 8px;">
                <div style="font-size:12px;letter-spacing:0.15em;color:rgba(245,197,24,0.9);text-transform:uppercase;font-weight:600;">
                  ShangoMaji
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 8px;">
                <h1 style="margin:12px 0 8px;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">
                  You've been accepted.
                </h1>
                <p style="margin:0 0 16px;color:rgba(255,255,255,0.7);font-size:15px;line-height:1.6;">
                  Hi ${escapeHtml(first)}, welcome. Before you can publish, review the terms and confirm. This takes about a minute.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 24px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0;border-collapse:separate;">
                  <tr>
                    <td align="center" bgcolor="#f5c518" style="background-color:#f5c518;background-image:linear-gradient(90deg,#e53e2a,#f07030,#f5c518);border-radius:10px;">
                      <a href="${escapeHtml(opts.onboardingUrl)}"
                         style="display:inline-block;padding:13px 26px;color:#0c0806;text-decoration:none;font-weight:700;font-size:15px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;letter-spacing:0.01em;border:1px solid #f5c518;border-radius:10px;mso-padding-alt:0;">
                        Review terms and continue
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:14px 0 0;color:rgba(255,255,255,0.55);font-size:12px;line-height:1.6;">
                  Button not working? Paste this link into your browser:<br />
                  <a href="${escapeHtml(opts.onboardingUrl)}" style="color:#f5c518;word-break:break-all;">${escapeHtml(opts.onboardingUrl)}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px;border-top:1px solid rgba(255,255,255,0.06);">
                <p style="margin:20px 0 0;color:rgba(255,255,255,0.4);font-size:12px;line-height:1.6;">
                  This link is unique to you and expires in 14 days. If you didn't apply to ShangoMaji, ignore this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// --- Password setup / recovery email (post-acceptance or forgot-password) ---
// We send the link ourselves via Resend instead of letting Supabase Auth send
// its generic "You have been invited" email. This lets us:
//   1. Keep the sender identity as ShangoMaji (Resend-verified domain)
//   2. Use a token_hash + type link (no PKCE verifier required)
//   3. Work reliably when creators open the link in a different browser/app
//      than the one that initiated the flow.

export async function sendPasswordSetupEmail(opts: {
  to: string;
  setupUrl: string;
  kind: "invite" | "recovery";
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from   = process.env.ONBOARDING_EMAIL_FROM;

  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY is not configured." };
  }
  if (!from) {
    return { ok: false, error: "ONBOARDING_EMAIL_FROM is not configured." };
  }

  const { html, text, subject } = buildPasswordSetupEmailBody({
    setupUrl: opts.setupUrl,
    kind:     opts.kind,
  });

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ from, to: opts.to, subject, html, text }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg =
        (data && (data.message || data.error || data.name)) ||
        `Email send failed (HTTP ${res.status})`;
      return { ok: false, error: String(msg) };
    }

    return { ok: true, id: data?.id };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || "Network error while sending password setup email.",
    };
  }
}

function buildPasswordSetupEmailBody(opts: {
  setupUrl: string;
  kind: "invite" | "recovery";
}) {
  const isInvite = opts.kind === "invite";

  const subject = isInvite
    ? "Set up your ShangoMaji creator account"
    : "Reset your ShangoMaji password";

  const headline = isInvite
    ? "Set up your account."
    : "Reset your password.";

  const intro = isInvite
    ? "You've accepted the ShangoMaji terms. Create your password below to finish setting up your creator account."
    : "We received a request to reset the password for your ShangoMaji creator account. Use the button below to set a new one.";

  const cta = isInvite ? "Set your password" : "Reset your password";

  const footer = isInvite
    ? "This link is one-time use. If you didn't apply to ShangoMaji, ignore this email."
    : "This link is one-time use. If you didn't request a reset, ignore this email and your password will stay the same.";

  const text =
`${headline}

${intro}

Open the link:
${opts.setupUrl}

${footer}

— ShangoMaji`;

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#0c0806;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0c0806;">
      <tr>
        <td align="center" style="padding:40px 20px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#141010;border:1px solid rgba(255,255,255,0.08);border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 8px;">
                <div style="font-size:12px;letter-spacing:0.15em;color:rgba(245,197,24,0.9);text-transform:uppercase;font-weight:600;">
                  ShangoMaji
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 8px;">
                <h1 style="margin:12px 0 8px;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">
                  ${escapeHtml(headline)}
                </h1>
                <p style="margin:0 0 16px;color:rgba(255,255,255,0.7);font-size:15px;line-height:1.6;">
                  ${escapeHtml(intro)}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 24px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0;border-collapse:separate;">
                  <tr>
                    <td align="center" bgcolor="#f5c518" style="background-color:#f5c518;background-image:linear-gradient(90deg,#e53e2a,#f07030,#f5c518);border-radius:10px;">
                      <a href="${escapeHtml(opts.setupUrl)}"
                         style="display:inline-block;padding:13px 26px;color:#0c0806;text-decoration:none;font-weight:700;font-size:15px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;letter-spacing:0.01em;border:1px solid #f5c518;border-radius:10px;mso-padding-alt:0;">
                        ${escapeHtml(cta)}
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:14px 0 0;color:rgba(255,255,255,0.55);font-size:12px;line-height:1.6;">
                  Button not working? Paste this link into your browser:<br />
                  <a href="${escapeHtml(opts.setupUrl)}" style="color:#f5c518;word-break:break-all;">${escapeHtml(opts.setupUrl)}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px;border-top:1px solid rgba(255,255,255,0.06);">
                <p style="margin:20px 0 0;color:rgba(255,255,255,0.4);font-size:12px;line-height:1.6;">
                  ${escapeHtml(footer)}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, html, text };
}

// --- License-required email (post project approval) ---
// Sent when an admin transitions a project to `approved`. The creator must
// then execute the Standard Distribution License v1 before distribution can
// be activated. This email is a hand-off, not a confirmation of going live.

export async function sendLicenseRequestEmail(opts: {
  to: string;
  projectTitle: string;
  licenseUrl: string;
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from   = process.env.ONBOARDING_EMAIL_FROM;

  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY is not configured." };
  }
  if (!from) {
    return { ok: false, error: "ONBOARDING_EMAIL_FROM is not configured." };
  }

  const subject = `Action required: Sign license for ${opts.projectTitle}`;

  const text =
`Your project "${opts.projectTitle}" has been approved for distribution consideration on ShangoMaji.

Before distribution can be activated, you need to execute the Standard Distribution License v1 for this project. Approval does not guarantee distribution and the work is not yet live.

Open the license:
${opts.licenseUrl}

You'll select your term, review the agreement, and sign. After execution, ShangoMaji will activate distribution from there.

— ShangoMaji`;

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#0c0806;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0c0806;">
      <tr>
        <td align="center" style="padding:40px 20px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#141010;border:1px solid rgba(255,255,255,0.08);border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 8px;">
                <div style="font-size:12px;letter-spacing:0.15em;color:rgba(245,197,24,0.9);text-transform:uppercase;font-weight:600;">
                  ShangoMaji
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 8px;">
                <h1 style="margin:12px 0 8px;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">
                  Action required: sign license
                </h1>
                <p style="margin:0 0 12px;color:rgba(255,255,255,0.7);font-size:15px;line-height:1.6;">
                  Your project <strong style="color:#fff;">${escapeHtml(opts.projectTitle)}</strong> has been approved for distribution consideration. Before distribution can be activated, execute the Standard Distribution License v1 for this project.
                </p>
                <p style="margin:0 0 16px;color:rgba(255,255,255,0.55);font-size:13px;line-height:1.6;">
                  Approval does not guarantee distribution. The work is not yet live.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 24px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0;border-collapse:separate;">
                  <tr>
                    <td align="center" bgcolor="#f5c518" style="background-color:#f5c518;background-image:linear-gradient(90deg,#e53e2a,#f07030,#f5c518);border-radius:10px;">
                      <a href="${escapeHtml(opts.licenseUrl)}"
                         style="display:inline-block;padding:13px 26px;color:#0c0806;text-decoration:none;font-weight:700;font-size:15px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;letter-spacing:0.01em;border:1px solid #f5c518;border-radius:10px;mso-padding-alt:0;">
                        Open license
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:14px 0 0;color:rgba(255,255,255,0.55);font-size:12px;line-height:1.6;">
                  Button not working? Paste this link into your browser:<br />
                  <a href="${escapeHtml(opts.licenseUrl)}" style="color:#f5c518;word-break:break-all;">${escapeHtml(opts.licenseUrl)}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px;border-top:1px solid rgba(255,255,255,0.06);">
                <p style="margin:20px 0 0;color:rgba(255,255,255,0.4);font-size:12px;line-height:1.6;">
                  You'll select your term, review the agreement, and sign. After execution, ShangoMaji will activate distribution.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ from, to: opts.to, subject, html, text }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg =
        (data && (data.message || data.error || data.name)) ||
        `Email send failed (HTTP ${res.status})`;
      return { ok: false, error: String(msg) };
    }

    return { ok: true, id: data?.id };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || "Network error while sending license-required email.",
    };
  }
}
