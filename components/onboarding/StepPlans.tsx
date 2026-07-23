"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Slot = { id: string; title: string; starts_at: string };

function whenLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
}

export default function StepPlans({
  value,
  onChange,
  onFinish,
  onBack,
  busy,
  error,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  onFinish: () => void;
  onBack: () => void;
  busy: boolean;
  error: string;
}) {
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [showFlight, setShowFlight] = useState(false);
  const [flight, setFlight] = useState({ airline: "", number: "", arrival: "" });

  useEffect(() => {
    createClient()
      .from("slots")
      .select("id,title,starts_at")
      .eq("kind", "meal")
      .order("starts_at")
      .then(({ data }) => setSlots((data as Slot[]) ?? []));
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("ukc-flight");
      if (raw) {
        setFlight(JSON.parse(raw));
        setShowFlight(true);
      }
    } catch {
      /* ignore malformed */
    }
  }, []);

  function saveFlight(next: typeof flight) {
    setFlight(next);
    const empty = !next.airline && !next.number && !next.arrival;
    if (empty) localStorage.removeItem("ukc-flight");
    else localStorage.setItem("ukc-flight", JSON.stringify(next));
  }

  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

  const FLIGHT_FIELDS = [
    ["airline", "Airline", "Airline (e.g. Korean Air)", "text"],
    ["number", "Flight number", "Flight number (e.g. KE081)", "text"],
    ["arrival", "Arrival", "Arrival", "datetime-local"],
  ] as const;

  return (
    <>
      <span className="ob-kicker">Set up · 3 of 3</span>
      <h1 className="ob-title">Which dinners are you in for?</h1>
      <p className="ob-sub">Pick any. We&apos;ll seat you with people worth meeting.</p>

      <div style={{ marginTop: 20 }}>
        {slots === null ? (
          <p style={{ color: "var(--ink-2)", fontSize: 14 }}>Loading…</p>
        ) : slots.length === 0 ? (
          <p style={{ color: "var(--ink-2)", fontSize: 14, paddingTop: 8 }}>
            Dinner slots open soon.
          </p>
        ) : (
          slots.map((s) => {
            const on = value.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                className={on ? "ob-slot on" : "ob-slot"}
                onClick={() => toggle(s.id)}
                aria-pressed={on}
              >
                <span aria-hidden className="ob-check">
                  {on ? "✓" : ""}
                </span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: "block", fontWeight: 600 }}>{s.title}</span>
                  <span style={{ fontSize: 13, color: "var(--ink-2)" }}>
                    {whenLabel(s.starts_at)}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>

      <div style={{ marginTop: 22 }}>
        <button
          type="button"
          className="ob-textlink"
          onClick={() => setShowFlight((v) => !v)}
          aria-expanded={showFlight}
        >
          {showFlight ? "− Flight info" : "+ Add flight info (optional)"}
        </button>
        {showFlight && (
          <div style={{ display: "flex", flexDirection: "column", marginTop: 4 }}>
            {FLIGHT_FIELDS.map(([key, label, ph, type]) => (
              <input
                key={key}
                type={type}
                className="ob-field"
                aria-label={label}
                value={flight[key]}
                placeholder={ph}
                onChange={(e) => saveFlight({ ...flight, [key]: e.target.value })}
              />
            ))}
            <p style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 10 }}>
              Used later to suggest airport rides. You can add it anytime.
            </p>
          </div>
        )}
      </div>

      {error && (
        <p style={{ color: "var(--danger)", fontSize: 14, marginTop: 16 }}>{error}</p>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
        <button type="button" className="ob-back" onClick={onBack}>
          Back
        </button>
        <button type="button" className="ob-primary" onClick={onFinish} disabled={busy}>
          {busy ? "Finishing…" : "Finish"}
        </button>
      </div>
    </>
  );
}
