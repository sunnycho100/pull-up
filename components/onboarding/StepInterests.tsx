"use client";

import { useState } from "react";

const SEED = [
  "Robotics", "Perception", "NLP / Agents", "Computer Vision", "HCI", "RL",
  "Bioengineering", "Materials", "Energy", "Semiconductors", "Quant / Finance",
  "Startups", "국밥 crew", "Night owl", "Coffee chat", "K-drama", "Golf", "Runners",
];

export default function StepInterests({
  value,
  onChange,
  onContinue,
  onBack,
  busy,
  error,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  onContinue: () => void;
  onBack: () => void;
  busy: boolean;
  error: string;
}) {
  const [custom, setCustom] = useState("");
  const options = [...SEED, ...value.filter((v) => !SEED.includes(v))];

  const toggle = (chip: string) =>
    onChange(value.includes(chip) ? value.filter((v) => v !== chip) : [...value, chip]);

  function addCustom() {
    const t = custom.trim();
    if (t && !value.includes(t)) onChange([...value, t]);
    setCustom("");
  }

  const enough = value.length >= 3;

  return (
    <>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>What are you into?</h1>
      <p style={{ color: "var(--ink-2)", marginTop: 6, fontSize: 15 }}>
        Pick a few — we&apos;ll use these to seat you.{" "}
        <span style={{ color: enough ? "var(--ink-2)" : "var(--accent)", fontWeight: 600 }}>
          {enough ? `${value.length} selected` : "3+ to continue"}
        </span>
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 20 }}>
        {options.map((chip) => {
          const on = value.includes(chip);
          return (
            <button
              key={chip}
              type="button"
              onClick={() => toggle(chip)}
              aria-pressed={on}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                fontSize: 14,
                fontWeight: 500,
                border: on ? "1px solid var(--accent)" : "1px solid var(--line)",
                background: on ? "var(--accent)" : "var(--surface)",
                color: on ? "var(--accent-ink)" : "var(--ink)",
                transition: "background 150ms ease-out, color 150ms ease-out",
              }}
            >
              {chip}
            </button>
          );
        })}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          addCustom();
        }}
        style={{ marginTop: 16 }}
      >
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="Add your own — press Enter"
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
      </form>

      {error && (
        <p style={{ color: "#b42318", fontSize: 14, marginTop: 16 }}>{error}</p>
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
          onClick={onContinue}
          disabled={!enough || busy}
          style={{
            flex: 1,
            padding: "14px",
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 600,
            background: "var(--accent)",
            color: "var(--accent-ink)",
            opacity: !enough || busy ? 0.5 : 1,
            transition: "opacity 180ms ease-out",
          }}
        >
          {busy ? "Saving…" : "Continue"}
        </button>
      </div>
    </>
  );
}
