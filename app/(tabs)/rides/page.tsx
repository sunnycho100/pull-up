import ridersData from "@/data/example-riders.json";
import { RiderCard } from "./RiderCard";

type Rider = {
  id: string;
  name: string;
  originCity: string;
  originIata: string;
  flightNumber: string;
  airline: string;
  arrivalLocal: string;
};

const timeFmt = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/New_York",
});
const fmt = (iso: string) => timeFmt.format(new Date(iso));

export default async function RidesPage() {
  const riders = (ridersData.riders as Rider[])
    .slice()
    .sort((a, b) => +new Date(a.arrivalLocal) - +new Date(b.arrivalLocal));

  return (
    <section style={{ padding: "24px 20px" }}>
      <header style={{ marginBottom: 6 }}>
        <h1 style={{ fontSize: 28, fontWeight: 600 }}>Rides</h1>
        <p style={{ color: "var(--ink-2)", marginTop: 6, fontSize: 15 }}>
          See who&apos;s landing at MCO near your arrival, then share a car.
        </p>
      </header>

      <div className="rides-note">Example · Tue Aug 4 arrivals into Orlando (MCO)</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
        {riders.map((r) => (
          <RiderCard
            key={r.id}
            name={r.name}
            detail={`${r.name} · ${r.originCity} → MCO · lands around ${fmt(r.arrivalLocal)}`}
          />
        ))}
      </div>

      <RidesStyles />
    </section>
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
      .rider {
        display: flex;
        align-items: center;
        gap: 12px;
        border: 1px solid var(--line);
        border-radius: 16px;
        padding: 14px 16px;
        background: var(--surface);
      }
      .rider-glyph {
        width: 38px;
        height: 38px;
        flex-shrink: 0;
        border-radius: 12px;
        background: color-mix(in srgb, var(--accent) 12%, transparent);
        color: var(--accent);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .rider-body { min-width: 0; flex: 1; }
      .rider-lead { font-size: 15px; font-weight: 700; color: var(--ink); }
      .rider-detail {
        font-size: 13px;
        color: var(--ink-2);
        margin-top: 2px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .rider-btn {
        flex-shrink: 0;
        border: none;
        border-radius: 999px;
        padding: 9px 16px;
        background: var(--accent);
        color: var(--accent-ink);
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.15s ease, color 0.15s ease;
      }
      .rider-btn:hover { background: color-mix(in srgb, var(--accent) 88%, #000); }
      .rider-btn.is-sent {
        background: color-mix(in srgb, var(--accent) 12%, transparent);
        color: var(--accent);
        cursor: default;
      }
    `}</style>
  );
}
