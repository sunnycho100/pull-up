import { fetchArrivals, bucketIntoPools, delayMinutes, type Arrival } from "@/lib/flights";

const timeFmt = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/New_York",
});
const fmt = (iso: string) => timeFmt.format(new Date(iso));

export default async function RidesPage() {
  // Evening arrivals into Orlando (MCO) the day before UKC 2026 — the band when most
  // attendees land. Live once AERODATABOX_API_KEY is set; the seed keeps it working offline.
  const arrivals = await fetchArrivals("MCO", "2026-08-04T17:00", "2026-08-04T19:00");
  const pools = bucketIntoPools(arrivals, 30);
  const live = !!process.env.AERODATABOX_API_KEY;

  return (
    <section style={{ padding: "24px 20px" }}>
      <header style={{ marginBottom: 6 }}>
        <h1 style={{ fontSize: 28, fontWeight: 600 }}>Rides</h1>
        <p style={{ color: "var(--ink-2)", marginTop: 6, fontSize: 15 }}>
          Share a car from MCO — we group people landing around the same time.
        </p>
      </header>

      <div className="rides-note">
        {live ? "Live · " : "Example · "}Tue Aug 4 arrivals into Orlando (MCO)
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 16 }}>
        {pools.map((pool) => (
          <div key={pool.windowStart} className="pool">
            <div className="pool-head">
              <span className="pool-time">
                {fmt(pool.windowStart)} – {fmt(pool.windowEnd)}
              </span>
              <span className="pool-count">
                {pool.arrivals.length} {pool.arrivals.length === 1 ? "arrival" : "arrivals"}
              </span>
            </div>
            <div>
              {pool.arrivals.map((a) => (
                <FlightRow key={a.flightNumber} a={a} />
              ))}
            </div>
            {pool.arrivals.length > 1 && (
              <div className="pool-cta">
                {pool.arrivals.length} landing here · ~${Math.round(55 / Math.min(4, pool.arrivals.length))} each in a shared car
              </div>
            )}
          </div>
        ))}
      </div>

      <RidesStyles />
    </section>
  );
}

function FlightRow({ a }: { a: Arrival }) {
  const delay = delayMinutes(a);
  return (
    <div className="flight">
      <div style={{ minWidth: 0 }}>
        <div className="flight-top">
          <span className="flight-no">{a.flightNumber}</span>
          <span className="flight-origin">{a.originCity}</span>
        </div>
        <div className="flight-sub">
          {a.airline}
          {a.terminal ? ` · Terminal ${a.terminal}` : ""}
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div className="flight-time">{fmt(a.estimatedLocal)}</div>
        {delay > 0 && <div className="flight-delay">+{delay}m late</div>}
      </div>
    </div>
  );
}

function RidesStyles() {
  return (
    <style>{`
      .rides-note {
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.02em;
        color: var(--ink-3);
        text-transform: uppercase;
      }
      .pool {
        border: 1px solid var(--line);
        border-radius: 16px;
        padding: 14px 16px;
        background: var(--surface);
      }
      .pool-head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 6px;
      }
      .pool-time { font-size: 16px; font-weight: 700; color: var(--ink); }
      .pool-count { font-size: 13px; color: var(--ink-2); }
      .flight {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 10px 0;
        border-top: 1px solid var(--line);
      }
      .flight-top { display: flex; align-items: baseline; gap: 8px; min-width: 0; }
      .flight-no {
        font-variant-numeric: tabular-nums;
        font-weight: 700;
        font-size: 14px;
        color: var(--accent);
      }
      .flight-origin {
        font-size: 14px;
        color: var(--ink);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .flight-sub { font-size: 12px; color: var(--ink-2); margin-top: 2px; }
      .flight-time { font-size: 15px; font-weight: 600; color: var(--ink); font-variant-numeric: tabular-nums; }
      .flight-delay { font-size: 12px; font-weight: 600; color: var(--danger); margin-top: 1px; }
      .pool-cta {
        margin-top: 10px;
        font-size: 13px;
        font-weight: 600;
        color: var(--accent);
      }
    `}</style>
  );
}
