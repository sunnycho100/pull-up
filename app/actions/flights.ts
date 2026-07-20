"use server";

import { requireUser } from "@/lib/supabase/server";
import {
  EVENT_AIRPORT,
  EVENT_OFFSET,
  type Direction,
  type FlightInput,
  type FlightDraft,
} from "@/lib/rides";

type Result = { ok: boolean; error?: string };

export async function submitFlight(input: FlightInput): Promise<Result> {
  const { user, supabase } = await requireUser();
  if (!input.localDateTime) return { ok: false, error: "Add your flight time." };

  const scheduledAt = new Date(`${input.localDateTime}:00${EVENT_OFFSET}`);
  if (isNaN(scheduledAt.getTime())) return { ok: false, error: "That time didn't parse." };

  const { error } = await supabase.from("flights").upsert(
    {
      user_id: user.id,
      direction: input.direction,
      airport: EVENT_AIRPORT,
      flight_no: input.flightNo.trim().toUpperCase().replace(/\s+/g, ""),
      airline: input.airline.trim(),
      other_city: input.otherCity.trim(),
      other_iata: input.otherIata.trim().toUpperCase(),
      scheduled_at: scheduledAt.toISOString(),
      luggage: input.luggage,
    },
    { onConflict: "user_id,direction" },
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteFlight(direction: Direction): Promise<Result> {
  const { user, supabase } = await requireUser();
  const { error } = await supabase
    .from("flights")
    .delete()
    .eq("user_id", user.id)
    .eq("direction", direction);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// --- Screenshot → flight draft (key-guarded) ---
// With ANTHROPIC_API_KEY set, reads a boarding-pass/ticket image and prefills the
// form. Without a key, returns reason:"no_key" so the UI falls back to manual entry.
// The parse only PREFILLS — the user always reviews before submitting.

type ParseResult =
  | { ok: true; draft: FlightDraft }
  | { ok: false; reason: "no_key" | "unreadable" | "error"; message?: string };

const PARSE_PROMPT = `You are reading a flight ticket or boarding-pass screenshot.
The event airport is Orlando MCO — one leg of this trip touches MCO.
Return ONLY a JSON object (no prose, no code fence) with these fields:
{
  "direction": "arrival" | "departure",   // arrival = flight LANDS at MCO; departure = flight LEAVES from MCO
  "flightNo": string,                       // e.g. "DL1423", no spaces
  "airline": string,                        // e.g. "Delta"
  "otherCity": string,                      // the NON-MCO endpoint city name
  "otherIata": string,                      // the NON-MCO endpoint 3-letter code
  "localDateTime": string                   // the MCO-side time as "YYYY-MM-DDTHH:mm" (24h, local)
}
If a field is not legible, omit it. If no MCO leg is visible, return {}.`;

export async function parseFlightScreenshot(
  base64: string,
  mediaType: string,
): Promise<ParseResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, reason: "no_key" };

  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as "image/png" | "image/jpeg" | "image/webp",
                data: base64,
              },
            },
            { type: "text", text: PARSE_PROMPT },
          ],
        },
      ],
    });
    const text = msg.content.find((b) => b.type === "text");
    const raw = text && "text" in text ? text.text.trim() : "";
    const json = raw.replace(/^```(?:json)?|```$/g, "").trim();
    const draft = JSON.parse(json) as FlightDraft;
    if (!draft || typeof draft !== "object") return { ok: false, reason: "unreadable" };
    return { ok: true, draft };
  } catch (e) {
    return { ok: false, reason: "error", message: e instanceof Error ? e.message : "parse failed" };
  }
}
