"use client";

import { useState } from "react";
import JoinSheet from "./JoinSheet";
import { joinSlot, leaveSlot } from "@/app/actions/signups";

export type Slot = {
  id: string;
  title: string;
  starts_at: string;
  area: string;
  join_deadline: string;
};
export type Signup = { partySize: number; notes: string };

const dtf = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/New_York",
});

function whenLine(startsAt: string, area: string) {
  // "Wed, 7:00 PM" -> "Wed · 7:00 PM · ChampionsGate"
  return `${dtf.format(new Date(startsAt)).replace(", ", " · ")} · ${area}`;
}

export default function MealsList({
  slots,
  counts: counts0,
  mine: mine0,
  nowMs,
}: {
  slots: Slot[];
  counts: Record<string, number>;
  mine: Record<string, Signup>;
  nowMs: number;
}) {
  const [mine, setMine] = useState(mine0);
  const [counts, setCounts] = useState(counts0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function flashToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }

  async function handleJoin(slotId: string, partySize: number, notes: string) {
    const prevMine = mine[slotId];
    const prevCount = counts[slotId] ?? 0;
    const prevSize = prevMine?.partySize ?? 0;

    setMine((m) => ({ ...m, [slotId]: { partySize, notes } }));
    // Counts track headcount: adjust by the delta between old and new party size.
    setCounts((c) => ({ ...c, [slotId]: prevCount - prevSize + partySize }));
    setOpenId(null);

    const res = await joinSlot(slotId, { partySize, notes });
    if (!res.ok) {
      setMine((m) => ({ ...m, [slotId]: prevMine }));
      setCounts((c) => ({ ...c, [slotId]: prevCount }));
      flashToast(res.error === "closed" ? "This one just closed." : "Couldn't save — try again.");
    }
  }

  async function handleLeave(slotId: string) {
    const prevMine = mine[slotId];
    const prevCount = counts[slotId] ?? 0;

    setMine((m) => ({ ...m, [slotId]: undefined as unknown as Signup }));
    setCounts((c) => ({ ...c, [slotId]: Math.max(0, prevCount - (prevMine?.partySize ?? 1)) }));
    setOpenId(null);

    const res = await leaveSlot(slotId);
    if (!res.ok) {
      setMine((m) => ({ ...m, [slotId]: prevMine }));
      setCounts((c) => ({ ...c, [slotId]: prevCount }));
      flashToast("Couldn't leave — try again.");
    }
  }

  const activeSlot = slots.find((s) => s.id === openId) ?? null;

  return (
    <div>
      <div>
        {slots.map((slot) => {
          const count = counts[slot.id] ?? 0;
          const joined = !!mine[slot.id];
          const closed = new Date(slot.join_deadline).getTime() <= nowMs;

          return (
            <div key={slot.id} className="meal-row">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)" }}>
                  {slot.title}
                </div>
                <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 4 }}>
                  {whenLine(slot.starts_at, slot.area)}
                </div>
                <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 3 }}>
                  {count === 0 ? "Be the first in" : `${count} ${count === 1 ? "person" : "people"} in`}
                </div>
              </div>

              {joined ? (
                <button
                  className="chip chip--in"
                  onClick={() => setOpenId(slot.id)}
                  aria-label={`You're in ${slot.title}. Edit signup.`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  You&apos;re in
                </button>
              ) : closed ? (
                <span className="chip chip--closed">Closed</span>
              ) : (
                <button className="btn-join" onClick={() => setOpenId(slot.id)}>
                  Join
                </button>
              )}
            </div>
          );
        })}
      </div>

      {activeSlot && (
        <JoinSheet
          slot={activeSlot}
          joined={!!mine[activeSlot.id]}
          signup={mine[activeSlot.id]}
          closed={new Date(activeSlot.join_deadline).getTime() <= nowMs}
          onClose={() => setOpenId(null)}
          onJoin={handleJoin}
          onLeave={handleLeave}
        />
      )}

      {toast && <div className="toast" role="status">{toast}</div>}

      <style>{`
        .meal-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 16px 0;
          border-bottom: 1px solid var(--line);
        }
        .meal-row:last-child { border-bottom: none; }
        .btn-join {
          flex-shrink: 0;
          border: none;
          background: var(--accent);
          color: var(--accent-ink);
          font-size: 14px;
          font-weight: 600;
          padding: 9px 18px;
          border-radius: 999px;
          cursor: pointer;
          transition: opacity 150ms ease-out;
        }
        .btn-join:active { opacity: 0.8; }
        .chip {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 14px;
          font-weight: 600;
          padding: 8px 14px;
          border-radius: 999px;
          border: none;
        }
        .chip--in {
          background: rgba(99, 91, 255, 0.1);
          color: var(--accent);
          cursor: pointer;
        }
        .chip--closed {
          background: var(--surface);
          color: var(--ink-3);
        }
        .toast {
          position: fixed;
          left: 50%;
          bottom: calc(96px + env(safe-area-inset-bottom));
          transform: translateX(-50%);
          z-index: 60;
          background: var(--ink);
          color: #fff;
          font-size: 14px;
          padding: 10px 16px;
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(10, 37, 64, 0.2);
          animation: toast-in 200ms ease-out;
        }
        @keyframes toast-in {
          from { opacity: 0; transform: translate(-50%, 8px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .btn-join { transition: none; }
          .toast { animation: none; }
        }
      `}</style>
    </div>
  );
}
