# UKC Meal-Match — Design Spec

- **Date:** 2026-07-15
- **Status:** Draft (awaiting review)
- **Author:** 성환 (with Claude as build orchestrator)
- **Event:** UKC 2026 — FIRE AI Build Challenge
- **Working name:** MealMatch (team/display name TBD)

## 1. Context & Problem

UKC 2026 attendees want to connect over meals, but the large official networking
events don't cover everyone — plenty of people end up without a group to eat with
during the conference. Approaching strangers is hard, and finding people with
shared interests takes too long. Organizers can't hand-match everyone.

**MealMatch** lets an attendee make a quick profile, opt into a meal slot, and get
placed by AI into a small group of like-minded people — with a group chat to sort
out where to eat. Framed positively ("find people to grab a meal with"); the app
never references the official dinner or any pricing.

A second matching mode, **mentor-mentee**, reuses the same engine to pair people by
research interest and seniority. It is specified here but built only after the meal
flow is solid.

## 2. Goals & Non-Goals

**Goals (v1 — meal grouping):**
- Attendee onboarding: sign in + quick profile in under a minute.
- Opt into meal slots aligned to the conference schedule.
- AI forms interest-matched groups of ~4–6 with a rationale and a suggested spot.
- Realtime group chat to coordinate.
- Demo-able on command (admin can trigger a grouping run live).

**Goals (v2 — mentor-mentee, if time allows):**
- Role flag on profile (offering mentorship / seeking / both, + areas).
- AI pairs mentees ↔ mentors (or small mentor circles) by interest alignment.
- Same chat surface for introductions.

**Non-Goals (v1):**
- Restaurant reservations, maps, or navigation.
- Native push notifications (use in-app + email).
- Session-schedule optimization.
- Any reference to the official dinner or payments.
- Roles/permissions system beyond a single admin email.

## 3. Users

- **Attendee** — the primary user. Creates a profile, joins slots, chats.
- **Admin (us)** — creates slots, triggers grouping runs. Gated by a single email.

## 4. Architecture & Stack

- **Frontend/Backend:** Next.js (App Router), mobile-first, Tailwind. Deployed on Vercel.
- **Data + Auth + Realtime:** Supabase (Postgres, Supabase Auth, Realtime).
- **AI:** Claude API (`claude-opus-4-8` for quality; `claude-sonnet-5` acceptable for
  cost) — a single structured call per grouping run.
- **Distribution:** one public URL + QR code.

Rationale: batteries-included stack, least custom glue, one URL to share, and the
shape subagents build most reliably under time pressure.

## 5. Data Model (Supabase / Postgres)

```
profiles
  id            uuid  (= auth user id, PK)
  name          text
  school        text
  major         text
  research_area text
  interests     text[]
  bio           text
  kakao         text
  linkedin      text
  dietary       text          -- free text, e.g. "vegetarian, no pork"
  -- mentor-mentee (v2):
  mentor_role   text          -- 'mentor' | 'mentee' | 'both' | null
  mentor_areas  text[]
  created_at    timestamptz

slots
  id            uuid PK
  title         text          -- e.g. "Day 1 Dinner"
  starts_at     timestamptz
  area          text          -- e.g. "Downtown"
  join_deadline timestamptz
  kind          text          -- 'meal' | 'mentor'  (default 'meal')

signups
  id            uuid PK
  slot_id       uuid FK -> slots
  user_id       uuid FK -> profiles
  group_size_pref int         -- preferred group size (nullable)
  notes         text
  unique (slot_id, user_id)

groups
  id            uuid PK
  slot_id       uuid FK -> slots
  name          text          -- AI-generated group name
  rationale     text          -- AI "why you matched" blurb
  suggested_place text        -- AI cuisine/spot suggestion (free text)
  meet_time     timestamptz
  created_at    timestamptz

group_members
  group_id      uuid FK -> groups
  user_id       uuid FK -> profiles
  primary key (group_id, user_id)

messages
  id            uuid PK
  group_id      uuid FK -> groups
  user_id       uuid FK -> profiles
  body          text
  created_at    timestamptz
```

Row Level Security: a user reads/writes their own profile and signups; reads groups
and messages only for groups they belong to; admin email bypasses for slot/grouping
management.

## 6. Matching Engine (shared core — the "AI-driven" part)

One generic component, two modes. Given a slot's opted-in profiles, it calls Claude
once with a structured-output contract and returns assignments.

**Meal mode (v1):**
- Input: `[{user_id, interests, research_area, major, group_size_pref}]` + target
  size (default 5, range 4–6).
- Output (JSON): list of groups, each `{member_ids[], name, rationale, suggested_place}`.
- Constraint: every signup assigned to exactly one group; leftovers below the
  minimum size merge into one "flex" group.

**Mentor mode (v2):**
- Input adds `mentor_role` + `mentor_areas`.
- Output: pairings (or small circles) linking mentees to mentors by area/interest
  alignment; unmatched users surfaced for manual follow-up.

*ponytail: no embeddings/vector DB at conference scale (tens–low hundreds per slot).
A single structured LLM call clusters directly. Upgrade path — switch to
embeddings + a clustering pass only if a slot ever exceeds a few hundred signups.*

**Guardrails (validated in code, not trusted from the model):**
- Every signed-up `user_id` appears in exactly one group. Assert on the returned set
  equalling the input set; on mismatch, re-run once, then fall back to size-ordered
  round-robin grouping.
- Group sizes within `[min, max]`; oversized groups split, undersized merged.

## 7. Core Flows

1. **Onboard** — Google / magic-link sign in → profile form → done.
2. **Browse & join** — slot list → open a slot → "Join" with optional group-size pref
   and notes.
3. **Grouping run** — triggered at `join_deadline` (or by admin button for demo):
   server action loads signups + profiles → matching engine → validate → persist
   `groups` + `group_members`.
4. **My groups** — list of the user's groups → group detail: members (name, blurb,
   Kakao/LinkedIn), suggested place, meet time, and **realtime chat**.

## 8. Realtime Chat

Supabase Realtime subscription on `messages` filtered by `group_id`. Insert on send;
render on receive. No moderation/notifications in v1 beyond what Supabase provides.

## 9. Auth

Supabase Auth with Google OAuth + magic-link. The app never handles raw passwords or
payment data. Admin is a single hard-coded email checked server-side.

## 10. Admin / Demo Control

One protected page (admin email only) to: create/edit slots, and trigger a grouping
run for a slot on demand. Needed so grouping can be demoed live instead of waiting on
a real deadline. *ponytail: single admin email, no role system.*

## 11. Verification

- **Core-logic check (automated):** seed script creates ~20 fake profiles + signups
  for a slot → run the matching engine → assert (a) every signup assigned exactly
  once, (b) all group sizes within `[min, max]`. This is the one runnable test that
  fails if grouping breaks.
- **Manual smoke:** sign-in flow, profile save, join slot, trigger grouping, open
  group chat between two browser sessions.

## 12. Build Plan (subagent orchestration)

Shared schema first, then streams (meal path prioritized; mentor mode last):

1. **Scaffold** — Next.js + Tailwind + Supabase client, env, deploy skeleton.
2. **Auth + profile** — sign-in, profile CRUD, RLS.
3. **Slots + signups** — slot list, join flow, admin slot creation.
4. **Matching engine + seed/test** — Claude call, validation guardrails, seed script,
   the automated assertion.
5. **Group detail + realtime chat.**
6. **Admin/demo controls + polish** (QR, mobile pass).
7. **(If time) mentor-mentee mode** — profile role fields, mentor pairing path,
   reuse chat.

## 13. Open Questions

- **Team + app display name** (needed by 2026-07-16 afternoon). Placeholder: MealMatch.
- Which conference meal slots exist for UKC 2026 (to seed real slots)?
- Claude model choice for grouping: quality (`claude-opus-4-8`) vs cost (`claude-sonnet-5`).
