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
    <section className="rides">
      <header className="rides-head">
        <p className="rides-kicker">MCO · Tue Aug 4 · Example</p>
        <h1 className="rides-title">Arrivals</h1>
        <p className="rides-sub">See who lands near you, then split a car into town.</p>
      </header>

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
          <div className="board">
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
          <AddArrival />
        </>
      )}

      <RidesStyles />
    </section>
  );
}

function RidesStyles() {
  return (
    <style>{`
      .rides { padding: 28px 20px 24px; }
      .rides-head { margin-bottom: 22px; }
      .rides-kicker {
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--accent);
      }
      .rides-title {
        font-size: 40px;
        font-weight: 800;
        line-height: 1;
        letter-spacing: -0.03em;
        margin-top: 10px;
      }
      .rides-sub {
        margin-top: 10px;
        font-size: 15px;
        color: var(--ink-2);
        max-width: 34ch;
      }

      /* the arrivals board — hairline-divided rows, no cards */
      .board { border-bottom: 1px solid var(--line); margin-bottom: 20px; }
      .arr { border-top: 1px solid var(--line); }
      .arr-main {
        display: grid;
        grid-template-columns: auto 1fr auto;
        column-gap: 14px;
        align-items: baseline;
        padding: 16px 0;
      }
      .arr-time {
        font-family: var(--font-display), sans-serif;
        font-size: 21px;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        letter-spacing: -0.02em;
        color: var(--ink);
        white-space: nowrap;
      }
      .arr-body { min-width: 0; }
      .arr-name { font-size: 16px; font-weight: 600; color: var(--ink); }
      .arr-meta { font-size: 13px; color: var(--ink-2); margin-top: 3px; text-wrap: pretty; }
      .arr-share {
        align-self: center;
        min-height: 44px;
        padding: 0 6px;
        background: none;
        border: none;
        color: var(--accent);
        font-size: 14px;
        font-weight: 700;
        white-space: nowrap;
        cursor: pointer;
      }
      .arr-share span { margin-left: 2px; display: inline-block; transition: transform 0.15s ease; }
      .arr-share:hover span { transform: translateX(3px); }
      .arr-done {
        align-self: center;
        min-height: 44px;
        display: inline-flex;
        align-items: center;
        font-size: 13px;
        font-weight: 600;
        color: var(--ink-2);
        white-space: nowrap;
      }
      .arr-ack {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin: 0 0 14px;
        padding: 10px 14px;
        border-radius: 12px;
        background: color-mix(in srgb, var(--accent) 12%, transparent);
        font-size: 13px;
        color: var(--ink);
      }
      .arr-undo {
        flex-shrink: 0;
        min-height: 32px;
        padding: 0 8px;
        background: none;
        border: none;
        color: var(--accent);
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
      }

      .rides-empty {
        margin-top: 48px;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
      }
      .rides-empty-title { font-family: var(--font-display), sans-serif; font-size: 18px; font-weight: 700; color: var(--ink); }
      .rides-empty-sub { font-size: 14px; color: var(--ink-2); max-width: 34ch; }
      .rides-empty .add-arrival { align-items: center; margin-top: 12px; }

      .add-arrival { display: flex; flex-direction: column; gap: 10px; }
      .add-btn {
        align-self: flex-start;
        min-height: 44px;
        padding: 0 18px;
        border-radius: 999px;
        border: 1px solid var(--accent);
        background: none;
        color: var(--accent);
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        transition: background 0.15s ease;
      }
      .add-btn:hover { background: color-mix(in srgb, var(--accent) 14%, transparent); }
      .rides-empty .add-btn { align-self: center; }
      .add-note {
        font-size: 13px;
        color: var(--ink-2);
        max-width: 48ch;
        text-wrap: pretty;
      }
    `}</style>
  );
}
