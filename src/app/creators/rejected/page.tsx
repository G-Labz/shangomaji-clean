export default function CreatorRejectedPage() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        padding: "2rem",
      }}
    >
      <div style={{ width: "100%", maxWidth: "400px" }}>
        <div
          style={{
            display: "inline-block",
            padding: "0.25rem 0.75rem",
            marginBottom: "1.25rem",
            backgroundColor: "rgba(220,38,38,0.08)",
            border: "1px solid rgba(220,38,38,0.25)",
            borderRadius: "999px",
            fontSize: "0.75rem",
            fontWeight: 600,
            letterSpacing: "0.05em",
            color: "rgba(252,165,165,0.85)",
            textTransform: "uppercase",
          }}
        >
          Not Approved
        </div>

        <h1 style={{ marginBottom: "0.75rem", fontSize: "1.5rem", fontWeight: 700 }}>
          Your creator application was not approved.
        </h1>

        <p style={{ marginBottom: "2rem", color: "#666", lineHeight: 1.6 }}>
          Thank you for applying to ShangoMaji. At this time your application
          did not move forward. We appreciate your interest.
        </p>

        <a
          href="/"
          style={{
            fontSize: "0.875rem",
            color: "#888",
            textDecoration: "none",
          }}
        >
          ← Back to ShangoMaji
        </a>
      </div>
    </div>
  );
}
