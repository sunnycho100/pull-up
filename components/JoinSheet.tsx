"use client";

import { useState } from "react";
import type { Slot, Signup } from "./MealsList";

const dtf = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/New_York",
});

const SIZES: { label: string; val: number | undefined }[] = [
  { label: "4", val: 4 },
  { label: "5", val: 5 },
  { label: "6", val: 6 },
  { label: "Any", val: undefined },
];

export default function JoinSheet({
  slot,
  joined,
  signup,
  closed,
  onClose,
  onJoin,
  onLeave,
}: {
  slot: Slot;
  joined: boolean;
  signup?: Signup;
  closed: boolean;
  onClose: () => void;
  onJoin: (slotId: string, pref: number | undefined, notes: string) => void;
  onLeave: (slotId: string) => void;
}) {
  const [pref, setPref] = useState<number | undefined>(signup?.groupSizePref ?? undefined);
  const [notes, setNotes] = useState(signup?.notes ?? "");

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`Join ${slot.title}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="grabber" aria-hidden="true" />

        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>{slot.title}</h2>
        <p style={{ fontSize: 14, color: "var(--ink-2)", marginBottom: 20 }}>
          {dtf.format(new Date(slot.starts_at))} · {slot.area}
        </p>

        {closed ? (
          <p style={{ fontSize: 15, color: "var(--ink-2)", marginBottom: 8 }}>
            This one&apos;s closed.
          </p>
        ) : (
          <>
            <label className="field-label">Table size</label>
            <div className="seg" role="group" aria-label="Preferred table size">
              {SIZES.map((s) => {
                const selected = pref === s.val;
                return (
                  <button
                    key={s.label}
                    type="button"
                    className={`seg__opt${selected ? " seg__opt--on" : ""}`}
                    aria-pressed={selected}
                    onClick={() => setPref(s.val)}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>

            <label className="field-label" htmlFor="join-notes" style={{ marginTop: 20 }}>
              Notes
            </label>
            <textarea
              id="join-notes"
              className="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything your table should know? (optional)"
            />

            <button className="btn-primary" onClick={() => onJoin(slot.id, pref, notes)}>
              {joined ? "Save changes" : "Join"}
            </button>

            {joined && (
              <button className="btn-leave" onClick={() => onLeave(slot.id)}>
                Leave this dinner
              </button>
            )}
          </>
        )}

        <button className="btn-close" onClick={onClose}>
          Close
        </button>
      </div>

      <style>{`
        .sheet-backdrop {
          position: fixed;
          inset: 0;
          z-index: 100;
          background: rgba(10, 37, 64, 0.35);
          display: flex;
          align-items: flex-end;
          animation: sheet-fade 200ms ease-out;
        }
        .sheet {
          width: 100%;
          background: var(--bg);
          border-radius: 16px 16px 0 0;
          padding: 8px 20px calc(20px + env(safe-area-inset-bottom));
          box-shadow: 0 -8px 40px rgba(10, 37, 64, 0.18);
          animation: sheet-up 300ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        .grabber {
          width: 36px;
          height: 5px;
          border-radius: 999px;
          background: var(--line);
          margin: 6px auto 16px;
        }
        .field-label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.02em;
          text-transform: uppercase;
          color: var(--ink-3);
          margin-bottom: 8px;
        }
        .seg {
          display: flex;
          gap: 6px;
          background: var(--surface);
          padding: 4px;
          border-radius: 12px;
        }
        .seg__opt {
          flex: 1;
          border: none;
          background: transparent;
          color: var(--ink-2);
          font-size: 15px;
          font-weight: 600;
          padding: 10px 0;
          border-radius: 9px;
          cursor: pointer;
          transition: background 150ms ease-out, color 150ms ease-out;
        }
        .seg__opt--on {
          background: var(--accent);
          color: var(--accent-ink);
        }
        .notes {
          width: 100%;
          box-sizing: border-box;
          font: inherit;
          font-size: 15px;
          color: var(--ink);
          background: var(--bg);
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 12px;
          resize: none;
        }
        .notes:focus {
          outline: none;
          border-color: var(--accent);
        }
        .btn-primary {
          width: 100%;
          margin-top: 24px;
          border: none;
          background: var(--accent);
          color: var(--accent-ink);
          font-size: 16px;
          font-weight: 600;
          padding: 14px;
          border-radius: 12px;
          cursor: pointer;
          transition: opacity 150ms ease-out;
        }
        .btn-primary:active { opacity: 0.85; }
        .btn-leave {
          width: 100%;
          margin-top: 8px;
          border: none;
          background: transparent;
          color: #b42318;
          font-size: 15px;
          font-weight: 500;
          padding: 12px;
          cursor: pointer;
        }
        .btn-close {
          width: 100%;
          margin-top: 8px;
          border: none;
          background: transparent;
          color: var(--ink-3);
          font-size: 15px;
          padding: 12px;
          cursor: pointer;
        }
        @keyframes sheet-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes sheet-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .sheet { animation: sheet-fade 200ms ease-out; }
          .seg__opt, .btn-primary { transition: none; }
        }
      `}</style>
    </div>
  );
}
