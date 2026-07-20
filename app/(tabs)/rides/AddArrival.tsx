"use client";

import { useState } from "react";

// ponytail: no backend yet — the button reveals an inline note explaining what
// posting your arrival will do. Wire to the arrivals table when it exists.
export function AddArrival() {
  const [open, setOpen] = useState(false);

  return (
    <div className="add-arrival">
      <button type="button" className="add-btn" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        + Add your arrival
      </button>
      {open && (
        <p className="add-note">
          Post your flight and everyone landing near you can ask to share a car. We&apos;ll
          pull it from your profile once arrivals go live.
        </p>
      )}
    </div>
  );
}
