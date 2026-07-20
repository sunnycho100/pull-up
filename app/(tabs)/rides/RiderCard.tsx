"use client";

import { useState } from "react";

export function RiderCard({
  name,
  timeLabel,
  originCity,
  originIata,
  airline,
  flightNumber,
}: {
  name: string;
  timeLabel: string;
  originCity: string;
  originIata: string;
  airline: string;
  flightNumber: string;
}) {
  const [sent, setSent] = useState(false);

  return (
    <div className="rider">
      <div className="rider-main">
        <span className="rider-glyph" aria-hidden>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 17h14M6.5 17V8.5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2V17M5 12h14" />
            <circle cx="8" cy="17.5" r="1.5" />
            <circle cx="16" cy="17.5" r="1.5" />
          </svg>
        </span>
        <div className="rider-body">
          <div className="rider-lead">
            {name} · lands {timeLabel}
          </div>
          <div className="rider-detail">
            {originCity} ({originIata}) → MCO · {airline} {flightNumber}
          </div>
        </div>
        {sent ? (
          <span className="rider-chip" aria-hidden>
            Requested
          </span>
        ) : (
          <button
            type="button"
            className="rider-btn"
            onClick={() => setSent(true)}
            aria-label={`Share a ride with ${name}`}
          >
            Share a ride
          </button>
        )}
      </div>

      {sent && (
        <div className="rider-ack" role="status">
          <span>{name} gets your name and can message you.</span>
          <button type="button" className="rider-undo" onClick={() => setSent(false)}>
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
