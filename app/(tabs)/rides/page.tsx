export default function RidesPage() {
  return (
    <section style={{ padding: "24px 20px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 600 }}>Rides</h1>
      <p style={{ color: "var(--ink-2)", marginTop: 6, fontSize: 15 }}>
        Airport ride pooling for UKC 2026.
      </p>

      <div
        style={{
          marginTop: 24,
          padding: "20px",
          borderRadius: 16,
          border: "1px solid var(--line)",
          background: "var(--surface)",
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)" }}>
          Pooling opens closer to the conference
        </div>
        <p style={{ fontSize: 14, color: "var(--ink-2)", marginTop: 8, lineHeight: 1.5 }}>
          MCO ↔ ChampionsGate is ~$40–70 a car. We&apos;ll match you with people
          arriving around the same time so you can split it — check back as the dates
          get closer.
        </p>
      </div>
    </section>
  );
}
