// lib/flights.ts — airport arrival data for ride pooling.
// Provider-agnostic: uses AeroDataBox (RapidAPI) when AERODATABOX_API_KEY is set,
// otherwise falls back to the bundled Aug-4 example so the feature works offline.
import exampleData from "../data/example-arrivals-mco-2026-08-04.json";

export type Arrival = {
  flightNumber: string;
  airline: string;
  originIata: string;
  originCity: string;
  scheduledLocal: string; // ISO w/ offset, e.g. 2026-08-04T14:05:00-04:00
  estimatedLocal: string; // revised time, or scheduled when on time
  status: "scheduled" | "delayed" | "landed" | "cancelled";
  terminal?: string;
};

export type RidePool = {
  windowStart: string; // ISO of the pool's earliest estimated arrival
  windowEnd: string; // windowStart + bucketMinutes
  arrivals: Arrival[];
};

const ms = (iso: string) => new Date(iso).getTime();

export const delayMinutes = (a: Arrival) =>
  Math.max(0, Math.round((ms(a.estimatedLocal) - ms(a.scheduledLocal)) / 60000));

// Group arrivals so everyone landing within `bucketMinutes` of the pool's first
// arrival can share a car. Cancelled flights are excluded. Uses ESTIMATED time so a
// delayed flight pools with whoever it actually lands near, not its original slot.
export function bucketIntoPools(arrivals: Arrival[], bucketMinutes = 30): RidePool[] {
  const active = arrivals
    .filter((a) => a.status !== "cancelled")
    .sort((a, b) => ms(a.estimatedLocal) - ms(b.estimatedLocal));
  const width = bucketMinutes * 60000;
  const pools: RidePool[] = [];
  for (const a of active) {
    const last = pools[pools.length - 1];
    if (last && ms(a.estimatedLocal) - ms(last.arrivals[0].estimatedLocal) <= width) {
      last.arrivals.push(a);
    } else {
      pools.push({
        windowStart: a.estimatedLocal,
        windowEnd: new Date(ms(a.estimatedLocal) + width).toISOString(),
        arrivals: [a],
      });
    }
  }
  return pools;
}

// fromLocal/toLocal are local wall-clock like "2026-08-04T12:00" (no offset).
// AeroDataBox caps the window at 12h.
export async function fetchArrivals(
  airport: string,
  fromLocal: string,
  toLocal: string,
): Promise<Arrival[]> {
  const key = process.env.AERODATABOX_API_KEY;
  if (!key) return seedArrivals(airport, fromLocal, toLocal);

  const url =
    `https://aerodatabox.p.rapidapi.com/flights/airports/iata/${airport}/${fromLocal}/${toLocal}` +
    `?direction=Arrival&withLeg=true&withCancelled=true&withLocation=false`;
  const res = await fetch(url, {
    headers: { "X-RapidAPI-Key": key, "X-RapidAPI-Host": "aerodatabox.p.rapidapi.com" },
    next: { revalidate: 300 }, // arrivals shift as flights delay; refresh every 5 min
  });
  if (!res.ok) return seedArrivals(airport, fromLocal, toLocal);
  const data = (await res.json()) as { arrivals?: AdbFlight[] };
  return (data.arrivals ?? []).map(normalizeAdb);
}

// --- AeroDataBox normalization ---
type AdbTime = { local?: string; utc?: string };
type AdbFlight = {
  number?: string;
  status?: string;
  airline?: { name?: string };
  departure?: { airport?: { iata?: string; name?: string } };
  arrival?: { scheduledTime?: AdbTime; revisedTime?: AdbTime; terminal?: string };
};

// AeroDataBox local times look like "2026-08-04 16:20-04:00" — make them ISO.
const iso = (t?: string) => (t ? t.replace(" ", "T") : "");

function normalizeAdb(f: AdbFlight): Arrival {
  const scheduled = iso(f.arrival?.scheduledTime?.local);
  const estimated = iso(f.arrival?.revisedTime?.local) || scheduled;
  const raw = (f.status ?? "").toLowerCase();
  const status: Arrival["status"] = raw.includes("cancel")
    ? "cancelled"
    : raw.includes("arrived") || raw.includes("landed")
      ? "landed"
      : estimated && scheduled && ms(estimated) > ms(scheduled)
        ? "delayed"
        : "scheduled";
  return {
    flightNumber: (f.number ?? "").replace(/\s+/g, ""),
    airline: f.airline?.name ?? "",
    originIata: f.departure?.airport?.iata ?? "",
    originCity: f.departure?.airport?.name ?? "",
    scheduledLocal: scheduled,
    estimatedLocal: estimated,
    status,
    terminal: f.arrival?.terminal,
  };
}

function seedArrivals(airport: string, fromLocal: string, toLocal: string): Arrival[] {
  if (airport.toUpperCase() !== exampleData.airport) return [];
  // The demo seed covers a single day; return it when the requested window overlaps.
  if (!fromLocal.startsWith(exampleData.date) && !toLocal.startsWith(exampleData.date)) return [];
  return exampleData.arrivals as Arrival[];
}
