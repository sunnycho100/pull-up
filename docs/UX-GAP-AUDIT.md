# UKC Social — UX Gap Audit

_Walked the app as a real UKC 2026 attendee, not a dev: land cold → make a profile →
join a dinner → get matched → open chat → browse people → check rides. Every screen
asked "what would I actually want next, and is the button there?"_

_Method: code-grounded (every route/component read) + design-pass in the browser.
Grouped by the state a user is actually standing in. Severity: **P0** breaks the core
promise or dead-ends the main flow · **P1** real friction, visible · **P2** polish._

> Not flagged (known/by design): matching rationale is generic until an `ANTHROPIC_API_KEY`
> is added; rides pillar is Plan-2 (but its *dangling links* below are still flagged).

---

## The core-promise problem (read this first)

The whole product is: **"your contacts unlock once you share a table."** But:

- **Contacts (KakaoTalk / LinkedIn) are never asked for during onboarding.** They only
  live in the *Me → Edit profile* screen, which a fresh user has no reason to open.
  So the common path is: sign up → pick a dinner → get seated → your tablemates open
  your card → **"No contacts added yet."** The payoff reveals nothing. **[P0]**
- Same for **bio**: never collected in onboarding, so People cards and the reveal show
  school/position only until someone edits Me. **[P1]**

**Fix direction:** add a 4th onboarding step (or fold into step 1) — "How can people reach
you?" with Kakao and/or LinkedIn (at least one encouraged, not required) + a one-line bio.
This is the single highest-leverage change in the app.

---

## S0 · Landing / Login

- `/` → `/home` → (no profile) `/welcome`, (logged out) `/login`. Routing is clean.
- **Magic-link is the only way in — no Google button** (spec called for Google + magic link).
  At a conference, "leave the app, go to your email, tap the link" on hotel/con wifi is the
  #1 drop-off point. Google one-tap would roughly halve time-to-first-screen. **[P1]**
- **The "Check your email" state is a dead end** — no *Resend*, no *Use a different email*,
  no *Open mail app*. If the mail is slow or typo'd, the user is stuck on a screen with no
  buttons. **[P1]**
- Copy is good ("Tap it on this device"). One-line value prop is good.

## S1 · Onboarding (3 steps: Basics → Interests → Plans)

- Progress bar, Back on every step, optimistic saves — solid spine.
- **No contact fields / no bio** — see core-promise box above. **[P0/P1]**
- **Party-size is never asked** — the "come as a group" feature (Thread 2). A pair/trio has
  no way to say "seat us together." **[P0 — the feature]**
- **Flight info is collected then goes nowhere.** StepPlans has a "+ Add flight info" panel
  that writes to `localStorage["ukc-flight"]` only — never to the DB, and Rides is a stub.
  The helper text promises "Used later to suggest airport rides." That's a false promise
  today. Either persist it toward the rides feature or hide the panel until rides ship. **[P1]**
- You can Finish with **zero dinners** selected → lands on Home "Fresh." Acceptable, but the
  Finish button gives no hint that picking nothing is fine.

## S2 · Home (dashboard)

- Four well-chosen states (fresh → joined-waiting → revealed → day-of). Priority order is right.
- **"Share your ride" CTA on the fresh dashboard links to `/rides`, which is a stub**
  ("Coming right up"). The primary dashboard sends you to a dead end. **[P0]**
  Fix: hide/disable the ride CTA until Rides ships, or make it a "Notify me" capture.
- **Joined-waiting** clearly states "Tables assigned at {time}" + "Change plans" → good, this
  answers "what happens next."
- **Fresh state has no path to People** — a user not ready to commit to dinner has nothing to
  explore but the two cards. A "Browse who's here" link would keep them engaged. **[P2]**

## S3 · Meals

- List with live counts, Join sheet, edit/leave, closed state — all present and correct.
- **The "Table size" segmented control (4/5/6/Any) is ambiguous and mostly cosmetic.** It reads
  as "how big should the table be," is a soft preference the matcher doesn't really honor, and
  is *not* the thing users actually need — which is "I'm coming with 2 friends, seat us
  together." This is exactly what Thread 2 replaces. **[P0 — the feature]**
- **The Join sheet never shows the join deadline / when matching runs.** You commit without
  being told when you'll find out your table (that fact only appears later on Home). Add a
  "Tables revealed {time}" line to the sheet. **[P1]**
- Meal rows show "N people in" but **no faces** — thin social proof for deciding to join. **[P2]**

## S4 · People (directory)

- Search + interest-chip filter + detail sheet with locked/unlocked contacts. Locked copy
  ("Join a table or ride together to connect") teaches the model well.
- **No true-empty state.** When the directory is genuinely empty (0 profiles), the code falls
  into the *filtered.length === 0* branch and shows **"No one matches — clear filters"** with a
  Clear-filters button that does nothing. An early user sees a broken-looking screen. Add a
  distinct "You're early — no one's here yet 👋" empty state. **[P1]**
- **A person card is a pure dead end when locked** — you can't act on it (no "invite to a
  dinner," no "you're both in Day 2 Dinner"). Given contacts are gated, offer *some* next step,
  e.g. surface shared dinners. **[P2]**

## S5 · Rides

- **Entire pillar is a one-line stub**, yet it's a bottom-tab AND a Home CTA AND the target of
  the onboarding flight panel. Three entry points, zero destination. **[P0 as dead-ends]**
  Minimum acceptable: the tab/CTA should say what's coming and when (or capture flight/interest),
  not "Coming right up." Full build is Plan 2.

## S6 · Me

- Profile card + full editor (incl. Kakao/LinkedIn/bio/dietary/photo), My dinners, My tables,
  **Sign out** — the most complete screen. Good.
- **"My dinners" rows link to `/meals` generically**, not to the specific slot or its table.
  Minor misdirection. **[P2]**

## S7 · Group reveal + chat (outside the tab bar)

- Reveal is rich: member cards, interests, inline contacts, "WHY THIS TABLE" rationale,
  suggested place/time, "Open group chat."
- **No back / Home affordance on the reveal or the group page.** `/groups/[id]` renders
  *outside* the `(tabs)` layout, so there's **no bottom tab bar and no back button** — the only
  exit is the browser's back gesture. Easy to feel trapped. **[P1]**
- **Kakao link is broken on the reveal.** GroupReveal renders Kakao as `<a href={m.kakao}>`,
  but Kakao is a plain ID/text (PeopleBrowser correctly treats it as text). Clicking navigates
  to a garbage URL. Make both surfaces render Kakao as copyable text. **[P1]**
- Chat itself is good: back button, optimistic send + retry, realtime, empty-state prompt.
  **No member list / no link back to the reveal** from chat. **[P2]**

## S8 · Admin

- `/admin` gates on `ADMIN_EMAIL` server-side in `runMatching`. Fine. (Verify the *page* also
  redirects non-admins, not just the action.) **[P2 — verify]**

---

## Priority summary

| # | Gap | Sev | Thread |
|---|-----|-----|--------|
| 1 | Contacts/bio never collected in onboarding → unlock reveals nothing | **P0** | audit |
| 2 | No "come as a group" party-size — pairs/trios can't sit together | **P0** | **T2** |
| 3 | Home "Share your ride" CTA dead-ends on stub | **P0** | audit |
| 4 | Rides tab/CTA/flight-panel: 3 entries, 0 destination | **P0** | audit / Plan2 |
| 5 | Login "check email" is a dead end (no resend/change) | P1 | audit |
| 6 | No Google sign-in (spec'd) | P1 | audit |
| 7 | Join sheet doesn't say when tables are revealed | P1 | audit |
| 8 | People true-empty shows misleading "clear filters" | P1 | audit |
| 9 | Group reveal/page has no back/Home (outside tab bar) | P1 | audit |
| 10 | Kakao rendered as a broken link on the reveal | P1 | audit |
| 11 | Flight info collected but persisted nowhere | P1 | audit |
| 12 | Onboarding has no bio → thin People cards | P1 | audit |
| 13 | Home fresh state has no path to People | P2 | audit |
| 14 | Meal rows show counts but no faces | P2 | audit |
| 15 | Locked person card has no next step | P2 | audit |
| 16 | "My dinners" links generically to /meals | P2 | audit |
| 17 | Chat has no member list/back-to-reveal | P2 | audit |

**This run addresses:** #2 (Thread 2 party-size, which subsumes #14 of the old "table size"),
plus opportunistic P0/P1 fixes that are cheap and on-path — #1 (collect a contact in
onboarding), #3 (stop the ride CTA dead-end), #9 (back affordance on reveal), #10 (Kakao text).
The rest are logged here for the next pass.
