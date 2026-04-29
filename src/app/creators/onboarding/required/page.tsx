export default function OnboardingRequiredPage() {
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
      <div style={{ width: "100%", maxWidth: 460 }}>
        <div
          style={{
            display: "inline-block",
            padding: "0.25rem 0.75rem",
            marginBottom: "1.25rem",
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
          Onboarding Required
        </div>

        <h1 style={{ margin: "0 0 0.75rem", fontSize: "1.5rem", fontWeight: 700, lineHeight: 1.3 }}>
          Please finish onboarding to continue.
        </h1>

        <p style={{ margin: "0 0 1.25rem", color: "#bbb", lineHeight: 1.65 }}>
          You've been accepted into ShangoMaji, but you haven't reviewed and accepted
          the terms yet. Open the onboarding link we emailed to you to continue.
        </p>

        <p style={{ margin: "0 0 2rem", color: "#888", lineHeight: 1.65, fontSize: "0.9rem" }}>
          Can't find the email? Check your spam folder, or contact the ShangoMaji team
          to request a new onboarding link.
        </p>

        <a
          href="/"
          style={{ fontSize: "0.875rem", color: "#888", textDecoration: "none" }}
        >
          ← Back to ShangoMaji
        </a>
      </div>
    </div>
  );
}
