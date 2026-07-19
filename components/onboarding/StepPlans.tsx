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

  return (
    <>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Which dinners are you in for?</h1>
      <p style={{ color: "var(--ink-2)", marginTop: 6, fontSize: 15 }}>
        Pick any — we&apos;ll seat you with people worth meeting.
      </p>

      <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
        {slots === null ? (
          <p style={{ color: "var(--ink-2)", fontSize: 14 }}>Loading…</p>
        ) : slots.length === 0 ? (
          <p
            style={{
              color: "var(--ink-2)",
              fontSize: 14,
              padding: "16px",
              background: "var(--surface)",
              borderRadius: 12,
            }}
          >
            Dinner slots open soon.
          </p>
        ) : (
          slots.map((s) => {
            const on = value.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggle(s.id)}
                aria-pressed={on}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  borderRadius: 12,
                  textAlign: "left",
                  border: on ? "1px solid var(--accent)" : "1px solid var(--line)",
                  background: on ? "rgba(99,91,255,0.06)" : "var(--bg)",
                  transition: "border-color 150ms ease-out, background 150ms ease-out",
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    display: "grid",
                    placeItems: "center",
                    color: "var(--accent-ink)",
                    fontSize: 14,
                    border: on ? "1px solid var(--accent)" : "1px solid var(--line)",
                    background: on ? "var(--accent)" : "transparent",
                  }}
                >
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

      <div style={{ marginTop: 20 }}>
        <button
          type="button"
          onClick={() => setShowFlight((v) => !v)}
          aria-expanded={showFlight}
          style={{ fontSize: 14, fontWeight: 600, color: "var(--accent)" }}
        >
          {showFlight ? "− Flight info" : "+ Add flight info (optional)"}
        </button>
        {showFlight && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
            {(
              [
                ["airline", "Airline (e.g. Korean Air)", "text"],
                ["number", "Flight number (e.g. KE081)", "text"],
                ["arrival", "Arrival", "datetime-local"],
              ] as const
            ).map(([key, ph, type]) => (
              <input
                key={key}
                type={type}
                value={flight[key]}
                placeholder={ph}
                onChange={(e) => saveFlight({ ...flight, [key]: e.target.value })}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  fontSize: 16,
                  border: "1px solid var(--line)",
                  borderRadius: 12,
                  background: "var(--bg)",
                  color: "var(--ink)",
                }}
              />
            ))}
            <p style={{ fontSize: 13, color: "var(--ink-2)" }}>
              Used later to suggest airport rides. You can add it anytime.
            </p>
          </div>
        )}
      </div>

      {error && (
        <p style={{ color: "var(--danger)", fontSize: 14, marginTop: 16 }}>{error}</p>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            padding: "14px 20px",
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 600,
            border: "1px solid var(--line)",
            color: "var(--ink)",
          }}
        >
          Back
        </button>
        <button
          type="button"
          onClick={onFinish}
          disabled={busy}
          style={{
            flex: 1,
            padding: "14px",
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 600,
            background: "var(--accent)",
            color: "var(--accent-ink)",
            opacity: busy ? 0.5 : 1,
            transition: "opacity 180ms ease-out",
          }}
        >
          {busy ? "Finishing…" : "Finish"}
        </button>
      </div>
    </>
  );
}
