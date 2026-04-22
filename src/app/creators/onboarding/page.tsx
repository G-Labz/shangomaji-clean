import { createClient } from "@supabase/supabase-js";
import {
  ONBOARDING_INTRO,
  ONBOARDING_TERMS,
  ONBOARDING_TERMS_VERSION,
} from "@/lib/onboarding-terms";
import OnboardingAcceptClient from "./OnboardingAcceptClient";

// Service-role client for server-side token lookup.
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = "force-dynamic";

type OnboardingRow = {
  id: string;
  application_id: string;
  email: string;
  token_expires_at: string;
  accepted_at: string | null;
};

function MessageShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "70vh",
        padding: "2rem",
      }}
    >
      <div style={{ width: "100%", maxWidth: 520 }}>
        <h1 style={{ margin: "0 0 0.75rem", fontSize: "1.5rem", fontWeight: 700 }}>
          {title}
        </h1>
        <div style={{ color: "#888", lineHeight: 1.6 }}>{children}</div>
      </div>
    </div>
  );
}

export default async function CreatorOnboardingPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = (searchParams.token || "").trim();

  if (!token) {
    return (
      <MessageShell title="This onboarding link is not valid.">
        <p>No token was provided. Please use the link from your acceptance email.</p>
      </MessageShell>
    );
  }

  const { data, error } = await adminSupabase
    .from("creator_onboarding")
    .select("id, application_id, email, token_expires_at, accepted_at")
    .eq("token", token)
    .maybeSingle();

  if (error) {
    return (
      <MessageShell title="Something went wrong.">
        <p>We couldn't verify your onboarding link right now. Please try again shortly.</p>
      </MessageShell>
    );
  }

  const row = data as OnboardingRow | null;

  if (!row) {
    return (
      <MessageShell title="This onboarding link is not valid.">
        <p>
          We couldn't find an onboarding record for this link. If you believe this is a
          mistake, please contact the ShangoMaji team.
        </p>
      </MessageShell>
    );
  }

  if (row.accepted_at) {
    return (
      <MessageShell title="You've already completed onboarding.">
        <p>
          Your acceptance was recorded on{" "}
          {new Date(row.accepted_at).toLocaleDateString()}. Check your inbox for the
          password setup email, or{" "}
          <a href="/creators/login" style={{ color: "rgba(245,197,24,0.9)" }}>
            sign in to your workspace
          </a>
          .
        </p>
      </MessageShell>
    );
  }

  if (new Date(row.token_expires_at).getTime() < Date.now()) {
    return (
      <MessageShell title="This onboarding link has expired.">
        <p>
          For security, onboarding links expire after 14 days. Please contact the
          ShangoMaji team to request a new link.
        </p>
      </MessageShell>
    );
  }

  // Valid token — render terms + Accept action
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "5rem 1.5rem 4rem",
      }}
    >
      <div style={{ width: "100%", maxWidth: 640 }}>
        <div
          style={{
            display: "inline-block",
            padding: "0.25rem 0.75rem",
            marginBottom: "1.5rem",
            backgroundColor: "rgba(245,197,24,0.1)",
            border: "1px solid rgba(245,197,24,0.3)",
            borderRadius: 999,
            fontSize: "0.7rem",
            fontWeight: 600,
            letterSpacing: "0.1em",
            color: "rgba(245,197,24,0.9)",
            textTransform: "uppercase",
          }}
        >
          Creator Onboarding
        </div>

        <h1 style={{ margin: "0 0 1rem", fontSize: "1.9rem", fontWeight: 700, lineHeight: 1.2 }}>
          Welcome to ShangoMaji.
        </h1>

        <p style={{ margin: "0 0 2.5rem", color: "#bbb", lineHeight: 1.65, fontSize: "1rem" }}>
          {ONBOARDING_INTRO}
        </p>

        <div
          style={{
            padding: "1.5rem",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            background: "rgba(255,255,255,0.02)",
            marginBottom: "2rem",
          }}
        >
          {ONBOARDING_TERMS.map((section, i) => (
            <div
              key={section.heading}
              style={{
                paddingBottom: i === ONBOARDING_TERMS.length - 1 ? 0 : "1.25rem",
                marginBottom:  i === ONBOARDING_TERMS.length - 1 ? 0 : "1.25rem",
                borderBottom:  i === ONBOARDING_TERMS.length - 1 ? "none" : "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <h2
                style={{
                  margin: "0 0 0.5rem",
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  color: "#fff",
                  letterSpacing: "0.01em",
                }}
              >
                {section.heading}
              </h2>
              <p
                style={{
                  margin: 0,
                  color: "rgba(255,255,255,0.65)",
                  lineHeight: 1.65,
                  fontSize: "0.9rem",
                }}
              >
                {section.body}
              </p>
            </div>
          ))}
        </div>

        <OnboardingAcceptClient token={token} version={ONBOARDING_TERMS_VERSION} />

        <p
          style={{
            marginTop: "1.25rem",
            fontSize: "0.75rem",
            color: "rgba(255,255,255,0.35)",
            lineHeight: 1.55,
          }}
        >
          By clicking Accept, you confirm you have read and agree to these
          terms ({ONBOARDING_TERMS_VERSION}).
        </p>
      </div>
    </div>
  );
}
