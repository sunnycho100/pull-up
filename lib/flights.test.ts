import { describe, it, expect } from "vitest";
import { bucketIntoPools, delayMinutes, fetchArrivals, type Arrival } from "./flights";

const a = (flightNumber: string, estimatedLocal: string, extra: Partial<Arrival> = {}): Arrival => ({
  flightNumber, airline: "Test", originIata: "XXX", originCity: "X",
  scheduledLocal: estimatedLocal, estimatedLocal, status: "scheduled", ...extra,
});

describe("delayMinutes", () => {
  it("is 0 when on time and positive when revised later", () => {
    expect(delayMinutes(a("ON1", "2026-08-04T14:00:00-04:00"))).toBe(0);
    expect(
      delayMinutes(a("DL1", "2026-08-04T14:00:00-04:00", {
        scheduledLocal: "2026-08-04T13:30:00-04:00",
        estimatedLocal: "2026-08-04T14:00:00-04:00",
      })),
    ).toBe(30);
  });
});

describe("bucketIntoPools", () => {
  it("groups arrivals within the window and starts a new pool past it", () => {
    const pools = bucketIntoPools(
      [
        a("F1", "2026-08-04T14:00:00-04:00"),
        a("F2", "2026-08-04T14:20:00-04:00"), // within 30m of F1
        a("F3", "2026-08-04T14:45:00-04:00"), // >30m past F1 -> new pool
      ],
      30,
    );
    expect(pools.length).toBe(2);
    expect(pools[0].arrivals.map((x) => x.flightNumber)).toEqual(["F1", "F2"]);
    expect(pools[1].arrivals.map((x) => x.flightNumber)).toEqual(["F3"]);
  });

  it("excludes cancelled flights and sorts by estimated time", () => {
    const pools = bucketIntoPools([
      a("LATE", "2026-08-04T18:00:00-04:00"),
      a("GONE", "2026-08-04T14:00:00-04:00", { status: "cancelled" }),
      a("EARLY", "2026-08-04T14:05:00-04:00"),
    ]);
    const flights = pools.flatMap((p) => p.arrivals.map((x) => x.flightNumber));
    expect(flights).toEqual(["EARLY", "LATE"]);
  });
});

describe("fetchArrivals (seed fallback, no API key)", () => {
  it("returns the Aug-4 MCO example and buckets it into shareable pools", async () => {
    const arrivals = await fetchArrivals("MCO", "2026-08-04T12:00", "2026-08-04T20:00");
    expect(arrivals.length).toBeGreaterThan(5);
    expect(arrivals.some((x) => x.status === "delayed")).toBe(true);
    const pools = bucketIntoPools(arrivals, 30);
    expect(pools.length).toBeGreaterThan(1);
    // cancelled flight (F9210) is never poolable
    expect(pools.flatMap((p) => p.arrivals).some((x) => x.status === "cancelled")).toBe(false);
  });

  it("returns nothing for an airport we have no data for", async () => {
    expect(await fetchArrivals("SFO", "2026-08-04T12:00", "2026-08-04T20:00")).toEqual([]);
  });
});
