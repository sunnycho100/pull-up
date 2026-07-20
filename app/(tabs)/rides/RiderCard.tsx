"use client";

import { useState } from "react";

export function RiderCard({ name, detail }: { name: string; detail: string }) {
  const [sent, setSent] = useState(false);

  return (
    <div className="rider">
      <span className="rider-glyph" aria-hidden>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 17h14M6.5 17V8.5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2V17M5 12h14" />
          <circle cx="8" cy="17.5" r="1.5" />
          <circle cx="16" cy="17.5" r="1.5" />
        </svg>
      </span>
      <div className="rider-body">
        <div className="rider-lead">Someone&apos;s looking for a ride</div>
        <div className="rider-detail">{detail}</div>
      </div>
      <button
        type="button"
        className={sent ? "rider-btn is-sent" : "rider-btn"}
        onClick={() => setSent(true)}
        disabled={sent}
        aria-label={sent ? "Request sent" : `Share a ride with ${name}`}
      >
        {sent ? "Request sent" : "Share a ride"}
      </button>
    </div>
  );
}
