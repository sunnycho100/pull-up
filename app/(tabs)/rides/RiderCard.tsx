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
    <div className="arr">
      <div className="arr-main">
        <div className="arr-time">{timeLabel}</div>
        <div className="arr-body">
          <div className="arr-name">{name}</div>
          <div className="arr-meta">
            {originCity} ({originIata}) · {airline} {flightNumber}
          </div>
        </div>
        {sent ? (
          <span className="arr-done">Requested</span>
        ) : (
          <button
            type="button"
            className="arr-share"
            onClick={() => setSent(true)}
            aria-label={`Share a ride with ${name}`}
          >
            Share <span aria-hidden>▸</span>
          </button>
        )}
      </div>

      {sent && (
        <div className="arr-ack" role="status">
          <span>{name} gets your name and can message you.</span>
          <button type="button" className="arr-undo" onClick={() => setSent(false)}>
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
