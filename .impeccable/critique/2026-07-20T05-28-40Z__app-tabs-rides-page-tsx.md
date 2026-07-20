---
target: rides
total_score: 22
p0_count: 1
p1_count: 1
timestamp: 2026-07-20T05-28-40Z
slug: app-tabs-rides-page-tsx
---
# Critique — Rides (app/(tabs)/rides/page.tsx)
Method: dual-agent (A: a05b9d71 · B: ada03d33) · Register: Product · Score 22/40

## Design Health Score
| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | "Request sent" flips locally; no next-step / human-reached signal |
| 2 | Match System / Real World | 3 | "Someone" coy when name is shown |
| 3 | User Control and Freedom | 1 | Terminal "Request sent", no undo/cancel |
| 4 | Consistency and Standards | 3 | Clean tokens, conventional pill |
| 5 | Error Prevention | 2 | One irreversible tap, no confirm, sub-44px target |
| 6 | Recognition Rather Than Recall | 3 | Truncation forces recall |
| 7 | Flexibility and Efficiency | 2 | No filter/sort, no add-my-flight |
| 8 | Aesthetic and Minimalist | 3 | Identical lead line wastes loudest slot |
| 9 | Error Recovery | 1 | No error path exists |
| 10 | Help and Documentation | 2 | No how-sharing-works affordance |
| Total | | 22/40 | Acceptable-low |

## Anti-Patterns Verdict
Chrome clean (detect.mjs exit 0, []). Content architecture reads AI: identical bold "Someone's looking for a ride" x3; inverted hierarchy (payload muted+truncated).
Browser evidence: mobile detail truncation scrollWidth 292 vs client 131 (arrival time clipped every card); button 107.5x37.5 fails 44px; "Request sent" contrast 3.79:1 fails 4.5:1; no dark mode (no prefers-color-scheme query); static contrasts pass (detail 7.34, note 5.47).

## Priority Issues
[P0] Terminal Request-sent dead-end. -> clarify + onboard
[P1] Inverted hierarchy + identical lead x3. Promote payload to lead, delete/demote constant. -> typeset -> distill
[P2] Sub-44px button + mobile truncation of arrival time. min-height:44px, wrap payload. -> harden -> layout
[P2] No empty state / add-my-flight / own-ride. -> onboard
[P3] Unused airline/flight/IATA data; no dark mode. -> colorize / harden

## Persona Red Flags
Casey (mobile): sub-44 button + clipped arrival time + irreversible mis-tap. Worst hit.
Jordan (first-timer): identical lines blur; no add-my-flight; dead-end after Share.
Riley (stress): no undo, double-tap locked, EXAMPLE undercuts trust.

## Questions
1. Cards vs time-sorted arrivals board?
2. What does Share a ride commit to if exchange isn't built?
3. Where is the user's own arrival?
