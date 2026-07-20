export default function MealsLoading() {
  return (
    <section style={{ padding: "24px 20px" }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 600 }}>Meals</h1>
        <p style={{ color: "var(--ink-2)", marginTop: 6, fontSize: 15 }}>
          Grab dinner with people worth meeting.
        </p>
      </header>

      <div>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              padding: "16px 0",
              borderBottom: "1px solid var(--line)",
            }}
          >
            <div style={{ flex: 1 }}>
              <div className="sk sk-line" style={{ width: "55%", height: 16 }} />
              <div className="sk sk-line" style={{ width: "78%", height: 12, marginTop: 10 }} />
              <div className="sk sk-line" style={{ width: "34%", height: 12, marginTop: 8 }} />
            </div>
            <div className="sk" style={{ width: 68, height: 34, borderRadius: 999 }} />
          </div>
        ))}
      </div>

      <style>{`
        .sk {
          background: var(--surface);
          border-radius: 6px;
          position: relative;
          overflow: hidden;
        }
        .sk-line { border-radius: 4px; }
        .sk::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent);
          transform: translateX(-100%);
          animation: sk-shimmer 1.3s infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .sk::after { animation: none; }
        }
        @keyframes sk-shimmer { to { transform: translateX(100%); } }
      `}</style>
    </section>
  );
}
