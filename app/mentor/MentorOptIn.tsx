"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setMentorOptin } from "@/app/actions/mentor";

export function MentorOptIn({
  optedIn: initial,
  role,
}: {
  optedIn: boolean;
  role: "mentor" | "mentee";
}) {
  const router = useRouter();
  const [optedIn, setOptedIn] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [error, setError] = useState("");

  async function set(optin: boolean) {
    setBusy(true);
    setError("");
    const res = await setMentorOptin(optin);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Something went wrong.");
      return;
    }
    setOptedIn(optin);
    setConfirmLeave(false);
    router.refresh();
  }

  if (!optedIn) {
    return (
      <div style={{ marginTop: 28 }}>
        <button
          type="button"
          className="mx-primary"
          onClick={() => set(true)}
          disabled={busy}
        >
          {busy ? "Adding you…" : "Match me"}
        </button>
        {error && <p className="mx-error">{error}</p>}
        <p className="mx-fine">
          One new person suggested each day. Skip anyone; you only connect when
          it&apos;s a mutual yes.
        </p>
        <MentorStyles />
      </div>
    );
  }

  return (
    <div style={{ marginTop: 28 }}>
      <div className="mx-in" role="status">
        <span className="mx-check" aria-hidden>
          ✓
        </span>
        <span>
          You&apos;re in the daily 1:1 pool as a{" "}
          <strong>{role === "mentor" ? "mentor" : "mentee"}</strong>. We&apos;ll
          suggest your first match soon.
        </span>
      </div>

      {!confirmLeave ? (
        <button
          type="button"
          className="mx-leave"
          onClick={() => setConfirmLeave(true)}
        >
          Leave the pool
        </button>
      ) : (
        <div className="mx-leave-confirm">
          <p>
            We really hope to connect you with new people every day. Leave
            anyway?
          </p>
          <div style={{ display: "flex", gap: 14, marginTop: 10 }}>
            <button
              type="button"
              className="mx-leave-yes"
              onClick={() => set(false)}
              disabled={busy}
            >
              {busy ? "Leaving…" : "Leave anyway"}
            </button>
            <button
              type="button"
              className="mx-leave-stay"
              onClick={() => setConfirmLeave(false)}
              disabled={busy}
            >
              Stay
            </button>
          </div>
        </div>
      )}
      {error && <p className="mx-error">{error}</p>}
      <MentorStyles />
    </div>
  );
}

function MentorStyles() {
  return (
    <style>{`
      .mx-primary {
        width: 100%;
        min-height: 52px;
        border-radius: 14px;
        border: none;
        background: var(--accent);
        color: var(--accent-ink);
        font-size: 16px;
        font-weight: 700;
        cursor: pointer;
        transition: opacity 0.15s ease;
      }
      .mx-primary:disabled { opacity: 0.5; cursor: default; }
      .mx-fine {
        margin-top: 14px;
        font-size: 13px;
        color: var(--ink-2);
        text-wrap: pretty;
        max-width: 46ch;
      }
      .mx-in {
        display: flex;
        gap: 10px;
        padding: 14px 16px;
        border-radius: 14px;
        background: color-mix(in srgb, var(--accent) 12%, transparent);
        font-size: 15px;
        color: var(--ink);
        line-height: 1.4;
        text-wrap: pretty;
      }
      .mx-check {
        flex-shrink: 0;
        font-weight: 800;
        color: var(--accent);
      }
      .mx-leave {
        margin-top: 18px;
        min-height: 44px;
        background: none;
        border: none;
        padding: 0;
        color: var(--ink-3);
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
      }
      .mx-leave-confirm {
        margin-top: 16px;
        font-size: 14px;
        color: var(--ink);
        text-wrap: pretty;
        max-width: 44ch;
      }
      .mx-leave-yes {
        min-height: 44px;
        padding: 0 4px;
        background: none;
        border: none;
        color: var(--danger);
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
      }
      .mx-leave-stay {
        min-height: 44px;
        padding: 0 18px;
        border-radius: 999px;
        border: 1px solid var(--accent);
        background: none;
        color: var(--accent);
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
      }
      .mx-error { margin-top: 12px; font-size: 13px; color: var(--danger); }
    `}</style>
  );
}
