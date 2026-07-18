# UKC Social v2 — Product & Web-State Plan

> **Name:** display name is **UKC Social** (decided 2026-07-17; formerly "Pull Up" —
> repo stays github.com/sunnycho100/pull-up).

- **Date:** 2026-07-17 · **Status:** Draft (awaiting review) · **Supersedes:** 2026-07-15 spec
- **Event:** UKC 2026 · Omni Orlando Resort at ChampionsGate · Aug 4–8, 2026
- **Design direction:** #2 Precision (Stripe-white + blurple) + Apple motion/material layer
- **Repo:** github.com/sunnycho100/pull-up

## 1. What UKC Social Is Now

A mobile-first conference companion web app (one link + QR). Three pillars:

1. **Profiles & directory** — quick portfolio: photo, school, position, interests. Browse
   other attendees. The social graph everything else hangs on.
2. **Meal matching (the AI core)** — conference meals are out-of-pocket and expensive
   (lunch ~$50; dinners ~$80–130), so many attendees — especially students — skip the
   official options. UKC Social groups 4–6 people by shared interests per meal slot, with
   group chat. In-app copy stays positive ("find your table"); never mentions official
   dinner pricing.
3. **Ride pooling (the $$ saver)** — MCO → ChampionsGate runs $40–70/car. Attendees
   share arrival (or departure) times; deterministic algorithm suggests pools:
   *"3 others are looking for a ride around 1:35 PM — does that work?"* 4 people ≈
   $10–17 each.

**Why it wins the challenge brief:** solves real friction (meals, rides), enhances
networking (directory, interest matching), drives immediate human connection (groups
with chat) — with AI doing the matching.

## 2. Decisions Locked (2026-07-17)

| Decision | Choice |
|---|---|
| Design | Precision base + Apple motion/material (glass bottom tab bar) |
| Auth | Supabase Auth: Google OAuth + magic-link fallback; login required to use the app |
| Ride scope | Arrivals AND departures (direction flag on the same model) |
| Meal slots | Wed 8/5 dinner · Thu 8/6 dinner · Fri 8/7 dinner · Sat 8/8 post-closing lunch |
| Contact privacy | Kakao/LinkedIn visible ONLY to matched groupmates / ride-pool members; directory shows name·school·position·interests to any logged-in attendee |
| Onboarding length | ≤60s, 3 steps, dinner opt-ins included, flight info skippable |

## 3. Design System

**Base — Precision:** pure white ground, navy→gray text hierarchy, one blurple accent
(#635BFF family) for primary actions/selection/state. Crisp small radii, hairlines,
generous whitespace. Fixed rem type scale (product register), system font stack
(-apple-system/SF gets Apple's optical sizing for free).

**Layer — Apple motion & material** (source: emilkowalski/skills apple-design;
underlying: Apple HIG):
- **Springs, not durations:** damping 1.0 / response 0.3–0.4 for UI; slight bounce
  (0.8) only on momentum gestures (sheet flicks). Animate from current on-screen
  value; never lock input mid-transition.
- **Glass bottom tab bar** (the one sanctioned glassmorphism surface):
  `background: rgba(255,255,255,0.6); backdrop-filter: blur(20px) saturate(180%);`
  hairline top border, scroll-edge fade instead of a divider.
- **Sheets over modals:** joins/filters/profile-peeks are bottom sheets with grabber,
  spring-in, drag-to-dismiss with velocity handoff.
- **Typography tracking by size:** display −0.02em, body ~0; `text-wrap: balance` on
  headings.
- **Accessibility triplet:** `prefers-reduced-motion` (crossfade fallback),
  `prefers-reduced-transparency` (raise opacity, drop blur),
  `prefers-contrast` (solid bg + borders).

**Navigation:** glass tab bar, 5 tabs — **Home · Meals · Rides · People · Me**.

## 4. Real Schedule → Slots (from UKC 2026 program)

Seeded meal slots (join deadline 5:00 PM day-of; matching runs at deadline):
1. **Wed 8/5 Dinner** ~7:00 PM (Sponsor reception is invitation-only → everyone else is free)
2. **Thu 8/6 Dinner** ~7:00 PM (alternative to $130 Gala)
3. **Fri 8/7 Dinner** ~7:00 PM (alternative to $80 Networking Dinner)
4. **Sat 8/8 Lunch** ~12:30 PM (post-Closing Plenary, pre-departure)

Ride-pool peak windows: Tue–Wed arrivals; Sat 12:00+ exodus after Closing Plenary.

## 5. Data Model (Supabase)

```
profiles      id(=auth uid) · name · photo_url · school · position · interests[] ·
              bio · kakao · linkedin · dietary · dinners_wanted uuid[] · created_at
slots         id · title · starts_at · area · join_deadline · kind('meal')
signups       slot_id · user_id · group_size_pref · notes · UNIQUE(slot,user)
groups        id · slot_id · name · rationale · suggested_place · meet_time
group_members group_id · user_id
ride_pools    id · direction('arrival'|'departure') · pickup_at · capacity(4|6) ·
              status('open'|'full'|'done') · meet_point
ride_members  pool_id · user_id · flight_no · flight_at · ready_at · luggage bool
messages      id · channel_type('meal'|'ride') · channel_id · user_id · body · created_at
```

RLS: own profile writable; directory fields readable by any authed user; kakao/linkedin
readable only where a shared group_members/ride_members row exists; messages readable/
writable only by channel members; admin (single email) manages slots + matching runs.

**Storage:** `avatars/` bucket; client-side downscale to ≤512px before upload.

## 6. The Two Algorithms

**Meal matching (AI — the challenge's AI requirement).** Per slot at deadline (or admin
button): one structured Claude call over signups' profiles → groups of 4–6 + name +
rationale + suggested cuisine/spot. Code-validated: every signup in exactly one group;
sizes in bounds; leftovers → flex group; on invalid output retry once then round-robin
fallback. (Unchanged from v1 spec.)

**Ride pooling (deterministic — no LLM).**
- Input: arrival (or departure) datetime, optional flight #, luggage flag.
- `ready_at` = arrival + 35 min buffer (editable), rounded to :15.
  Departures: `ready_at` = flight − 3 h.
- Suggest pools where `|pool.pickup_at − ready_at| ≤ 45 min` and status='open',
  ranked by (member count desc, time distance asc). Top suggestion rendered as:
  *"3 others are aiming for 1:35 PM — join them?"*
- No fit → create pool at `ready_at`; it becomes suggestible to later arrivals.
- Join/leave freely until full (cap 4, or 6 with XL). Per-person estimate shown:
  $55 midpoint ÷ members.
- Members see each other's contacts + pool chat to coordinate the actual Uber.

## 7. Web States (page inventory — every state engineered)

**S0 · Landing / Login `/`** (logged-out)
- states: value-prop default → Google redirect · magic-link-sent confirmation ·
  auth-error banner · returning-session auto-redirect to Home.

**S1 · Onboarding `/welcome`** (3 steps, ≤60s, progress dots, all resumable)
- Step 1 Basics: photo upload (tap → picker → client resize → progress ring → error/retry ·
  skippable w/ initials avatar) · name · school · position.
- Step 2 Interests: chip grid (pick ≥3; Korean/English chips) · custom add.
- Step 3 Plans: dinner checkboxes (the 4 slots, pre-checked none) · optional flight
  info (airline+number+arrival OR manual time · "I'll add later" path).
- states per step: empty · valid · field-error · uploading · saving · done→Home.

**S2 · Home `/home`** ("Tonight" dashboard)
- states: fresh (nothing joined → two big CTAs: find your table / share your ride) ·
  joined-waiting (slot countdown to reveal) · revealed (group card teaser → S4) ·
  ride-suggested (pool prompt card) · day-of (meet-time + place front and center) ·
  post-event (rate/next-slot nudge).

**S3 · Meals `/meals`**
- slot list w/ live join counts; joined badge; closed badge.
- slot detail sheet: join (group size pref, notes) · leave · edit.
- states: open · joining(optimistic) · joined · deadline-passed-unmatched (flex notice) ·
  matched→group link · slot-closed-empty ("didn't join" + next slot pointer).

**S4 · Group `/groups/:id`** (meal group)
- reveal moment (spring-in member cards, rationale panel — the money screen) ·
  members w/ unlocked contacts · suggested place + meet time · realtime chat.
- states: first-reveal animation (once, then static) · chat loading skeleton ·
  chat empty (starter prompt suggestion) · send-failed retry · member-left notice.

**S5 · Rides `/rides`** (Arrivals | Departures segmented)
- no-info-yet: flight entry form (or manual time).
- suggestion: "N others around HH:MM — join?" accept/decline/adjust-time.
- no-match: pool created; "you're first — we'll fill it" + notify-on-join.
- pool detail: members, per-person estimate, meet point (MCO pickup zone / lobby),
  pool chat, leave/full states.
- states: empty · suggesting · joined-open · joined-full · pool-done · time-edited
  (re-suggest) · departure variant of all.

**S6 · People `/people`** (directory)
- search + filters (school, interests); profile cards.
- profile sheet: photo, school, position, interests, bio; contacts section shows
  locked state ("join a table or ride together to connect") vs unlocked.
- states: loading skeletons · results · no-results (clear-filters CTA) · my-own-card.

**S7 · Me `/me`**
- edit profile (re-uses onboarding fields) · my dinners · my groups · my pools ·
  sign out. states: saving · saved toast · error.

**S8 · Admin `/admin`** (single admin email)
- slot CRUD · run matching per slot (with dry-run preview) · pools overview.
- states: run-in-progress · run-result summary · run-failed (fallback offered).

**System-wide:** route loading skeletons (no spinners-in-content) · offline banner ·
error toast pattern · 404 · empty-avatar fallback (initials) · reduced-motion/
transparency/contrast variants · Korean text everywhere (UTF-8, Kakao naming).

## 8. Build Phases (subagent-orchestrated)

1. **P0 Foundation** — scaffold (Next.js/Tailwind/Supabase), tokens, glass tab-bar
   shell, auth (Google+magic link), RLS. → verify: login round-trip on phone.
2. **P1 Profile** — onboarding 3-step, avatar upload+resize, Me page. → verify: 60s test.
3. **P2 Meals** — slots, join sheet, matching engine + seed test (assert exactly-once
   assignment, size bounds), reveal, chat. → verify: 20-fake-profile run.
4. **P3 Rides** — flight entry, pooling algo + unit test (bucketing edge cases),
   pool detail + chat. → verify: scripted scenario (4 arrivals → 1 pool + suggest).
5. **P4 People** — directory, filters, contact-lock RLS proof. → verify: locked vs
   unlocked query as two different users.
6. **P5 Polish** — Home dashboard states, motion pass (springs, reveal), a11y triplet,
   QR, deploy, seed real slots. → verify: full walkthrough on real phone.

## 9. Out of Scope (v2)

Mentor-mentee mode (v3 candidate) · push notifications (in-app + email only) ·
payments/fare-split inside the app (Uber stays external) · session-schedule features ·
reservations · admin roles beyond one email.

## 10. Open Questions

- Exact dinner meet times (7:00 vs 7:30 PM) — confirm once venue-area restaurants picked.
- Claude model for matching: opus-4-8 quality vs sonnet-5 cost (default: sonnet-5,
  upgrade if rationale quality disappoints).
- Do we pre-seed interest chips from UKC symposium tracks? (nice touch, cheap)
