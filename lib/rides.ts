// Shared ride constants + types. Plain module (not "use server") so it can export
// non-async values, which a "use server" file cannot.

// The event's shared airport. Single event → single airport (Orlando, UKC 2026).
export const EVENT_AIRPORT = "MCO";
// Orlando is EDT (-04:00) across the Aug arrival window. datetime-local inputs are
// wall-clock with no zone, so we pin them to the event's offset when storing.
export const EVENT_OFFSET = "-04:00";

export type Direction = "arrival" | "departure";

export type FlightInput = {
  direction: Direction;
  flightNo: string;
  airline: string;
  otherCity: string; // origin (arrival) or destination (departure)
  otherIata: string;
  localDateTime: string; // "2026-08-04T15:30" in event-airport wall-clock
  luggage: boolean;
};

export type FlightDraft = Partial<{
  direction: Direction;
  flightNo: string;
  airline: string;
  otherCity: string;
  otherIata: string;
  localDateTime: string;
}>;
