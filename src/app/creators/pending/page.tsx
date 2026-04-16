export default function CreatorPendingPage() {
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
            backgroundColor: "rgba(234,179,8,0.1)",
            border: "1px solid rgba(234,179,8,0.3)",
            borderRadius: "999px",
            fontSize: "0.75rem",
            fontWeight: 600,
            letterSpacing: "0.05em",
            color: "rgba(234,179,8,0.9)",
            textTransform: "uppercase",
          }}
        >
          Under Review
        </div>

        <h1 style={{ marginBottom: "0.75rem", fontSize: "1.5rem", fontWeight: 700 }}>
          Your creator application is under review.
        </h1>

        <p style={{ marginBottom: "2rem", color: "#666", lineHeight: 1.6 }}>
          The ShangoMaji team will be in touch once a decision has been made.
          You'll receive an email at the address you applied with.
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
