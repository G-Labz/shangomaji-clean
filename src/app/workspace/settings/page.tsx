export default function SettingsPage() {
  return (
    <div>
      <h1
        style={{
          fontSize: 32,
          fontWeight: 700,
          marginBottom: 24,
          fontFamily: "var(--font-display)",
        }}
      >
        Settings
      </h1>

      <div style={{ display: "grid", gap: 16 }}>
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 16,
            padding: 20,
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: 18, fontWeight: 600 }}>Workspace Preferences</h2>
          <p style={{ opacity: 0.55, fontSize: 14 }}>
            Settings tools will live here as the creator system gets wired up.
          </p>
        </div>

        <div
          style={{
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 16,
            padding: 20,
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: 18, fontWeight: 600 }}>Session</h2>
          <form action="/api/creators/logout" method="POST">
            <button
              type="submit"
              style={{
                padding: "10px 20px",
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.65)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 8,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Sign out of workspace
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
