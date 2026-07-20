import ridersData from "@/data/example-riders.json";

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
          See who&apos;s landing at MCO around your time — start a group and split the car.
        </p>
      </header>

      <div className="rides-note">Example · Tue Aug 4 arrivals into Orlando (MCO)</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
        {riders.map((r) => (
          <RiderCard key={r.id} r={r} />
        ))}
      </div>

      <RidesStyles />
    </section>
  );
}

function RiderCard({ r }: { r: Rider }) {
  return (
    <div className="rider">
      <div className="rider-top">
        <div className="rider-avatar">{r.name[0]}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="rider-name">{r.name}</div>
          <div className="rider-flight">
            {r.originCity} → MCO · {r.airline} {r.flightNumber}
          </div>
        </div>
        <div className="rider-time">{fmt(r.arrivalLocal)}</div>
      </div>
      <div className="rider-cta">
        <span>{r.name} is looking for a ride around {fmt(r.arrivalLocal)}</span>
        <button className="rider-join" type="button">
          Add to group
        </button>
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
      .rider {
        border: 1px solid var(--line);
        border-radius: 16px;
        padding: 14px 16px;
        background: var(--surface);
      }
      .rider-top {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .rider-avatar {
        width: 40px;
        height: 40px;
        flex-shrink: 0;
        border-radius: 999px;
        background: var(--accent);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 17px;
      }
      .rider-name { font-size: 16px; font-weight: 700; color: var(--ink); }
      .rider-flight {
        font-size: 13px;
        color: var(--ink-2);
        margin-top: 2px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .rider-time {
        font-size: 15px;
        font-weight: 600;
        color: var(--ink);
        font-variant-numeric: tabular-nums;
        flex-shrink: 0;
      }
      .rider-cta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid var(--line);
      }
      .rider-cta > span { font-size: 13px; color: var(--ink-2); }
      .rider-join {
        flex-shrink: 0;
        border: none;
        border-radius: 999px;
        padding: 8px 16px;
        background: var(--accent);
        color: #fff;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
      }
    `}</style>
  );
}
