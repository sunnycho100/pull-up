import ridersData from "@/data/example-riders.json";
import { RiderCard } from "./RiderCard";
import { AddArrival } from "./AddArrival";

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

      {riders.length === 0 ? (
        <div className="rides-empty">
          <p className="rides-empty-title">No arrivals posted near yours yet.</p>
          <p className="rides-empty-sub">
            Add your flight and we&apos;ll match you with people landing around the same time.
          </p>
          <AddArrival />
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
            {riders.map((r) => (
              <RiderCard
                key={r.id}
                name={r.name}
                timeLabel={fmt(r.arrivalLocal)}
                originCity={r.originCity}
                originIata={r.originIata}
                airline={r.airline}
                flightNumber={r.flightNumber}
              />
            ))}
          </div>
          <div style={{ marginTop: 16 }}>
            <AddArrival />
          </div>
        </>
      )}

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
        border: 1px solid var(--line);
        border-radius: 16px;
        background: var(--surface);
        overflow: hidden;
      }
      .rider-main {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 16px;
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
      .rider-lead {
        font-size: 15px;
        font-weight: 700;
        color: var(--ink);
        text-wrap: balance;
      }
      .rider-detail {
        font-size: 13px;
        color: var(--ink-2);
        margin-top: 2px;
        text-wrap: pretty;
      }
      .rider-btn {
        flex-shrink: 0;
        min-height: 44px;
        border: none;
        border-radius: 999px;
        padding: 0 18px;
        background: var(--accent);
        color: var(--accent-ink);
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.15s ease;
      }
      .rider-btn:hover { background: color-mix(in srgb, var(--accent) 88%, #000); }
      .rider-chip {
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        min-height: 44px;
        padding: 0 14px;
        border-radius: 999px;
        border: 1px solid var(--line);
        color: var(--ink-2);
        font-size: 13px;
        font-weight: 600;
      }
      .rider-ack {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 10px 16px;
        border-top: 1px solid var(--line);
        background: color-mix(in srgb, var(--accent) 7%, transparent);
        font-size: 13px;
        color: var(--ink-2);
      }
      .rider-undo {
        flex-shrink: 0;
        background: none;
        border: none;
        padding: 4px 6px;
        color: var(--accent);
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
      }
      .rides-empty {
        margin-top: 40px;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
      }
      .rides-empty-title { font-size: 16px; font-weight: 600; color: var(--ink); }
      .rides-empty-sub { font-size: 14px; color: var(--ink-2); max-width: 34ch; }
      .add-arrival { display: flex; flex-direction: column; gap: 8px; }
      .add-btn {
        align-self: flex-start;
        min-height: 44px;
        padding: 0 18px;
        border-radius: 999px;
        border: 1px solid var(--line);
        background: var(--bg);
        color: var(--ink);
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
      }
      .add-btn:hover { border-color: var(--accent); color: var(--accent); }
      .add-note {
        font-size: 13px;
        color: var(--ink-2);
        max-width: 48ch;
        text-wrap: pretty;
      }
      .rides-empty .add-arrival { align-items: center; margin-top: 8px; }
      .rides-empty .add-btn { align-self: center; }
    `}</style>
  );
}
