# Pull Up — Design Exploration Plan

- **Date:** 2026-07-15
- **Goal:** 3 HTML mockups, identical content, different skins → pick one → winner's
  tokens become `design/DESIGN.md`, the build-time reference for all subagents.

## Phase 0 — Shared foundation
- `design/shared-content.md`: frozen fake data all mockups render identically
  (3 slots, 1 revealed group of 5 w/ rationale + suggested spot, 6 chat messages).
- Every mockup: self-contained single HTML file, 390px phone frame, no external
  assets (Google Fonts allowed with system fallback stack).

## Phase 1 — Three parallel builds
Same three screens each: slot list → group reveal → group chat.

| # | File | Direction |
|---|------|-----------|
| 1 | `design/01-golden-hour.html` | via **impeccable** skill — warm off-white, coral/amber accent, "pulling up a chair" |
| 2 | `design/02-precision.html` | via **Stripe design.md** (getdesign.md) — white ground, gray hierarchy, blurple accent |
| 3 | `design/03-tonights-menu.html` | editorial menu-card — cream paper, serif display, prix-fixe numbering |

Verify each: standalone render, all 3 screens, same data, no horizontal scroll @390px.

## Phase 2 — Compare & decide
- `design/index.html`: three iframes side by side; serve via local static server in
  the in-app browser pane. Optional: publish as private artifacts for phone review.
- Judge hardest on the **group reveal** screen — the money moment.

## Phase 3 — Lock in
- Extract winner → `design/DESIGN.md`; losers stay in repo.
- Update main spec: name → Pull Up, add design-direction section. Commit + push.
- Then → writing-plans for the app build.

## Risks
- Venue may block Google Fonts → every design ships a system fallback stack.
- Mockups must NOT share CSS (defeats comparison).
- getdesign.md fetch may fail → hand-write Stripe-style tokens, noted as such.
