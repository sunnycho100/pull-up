# UKC Social

A conference companion for **UKC 2026** (Aug 5–8, ChampionsGate FL). Attendees make a
quick profile, join a dinner slot, and get matched into small tables by shared interests —
solo or as a pre-formed group. Contacts unlock only for people you actually share a table
(or ride) with.

**Three pillars:** profiles/directory · AI meal matching · airport ride pooling (Plan 2).
**Design:** "Precision" — white ground, navy ink (`#0A2540`), a single blurple accent
(`#635BFF`), system font, glass bottom tab bar. Korean-safe throughout.

> **Heads up on Next.js:** this repo pins a Next.js version with breaking changes from what
> you may remember — APIs, conventions, and file structure can differ from older docs. Read
> the relevant guide in `node_modules/next/dist/docs/` before writing framework code, and
> heed deprecation notices.

## Stack

- **Next.js 15** (App Router, TypeScript, Tailwind v4) — route groups `(tabs)` and `(auth)`.
- **Supabase** — Postgres, Auth (magic-link), Realtime, Storage (avatars), Row Level Security.
- **Anthropic** `claude-sonnet-5` for meal matching, with a deterministic round-robin fallback.
- **vitest** for unit tests.

## Setup

1. `npm install`
2. Copy `.env.example` → `.env.local` and fill in (see below). `.env.local` is gitignored —
   never commit it.
3. Apply the migrations to your Supabase project in order (see [Database](#database)).
4. `./start.sh` (boots the dev server, reuses one if already up, opens Chrome), or `npm run dev`.
5. Open http://localhost:3000.

### Environment variables (`.env.local`)

| Var | Purpose |
|-----|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon (public) key — client + server reads under RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key — admin matching only, server-side |
| `ANTHROPIC_API_KEY` | Meal matching. Without it, matching uses the round-robin fallback |
| `ADMIN_EMAIL` | The one email allowed to run matching at `/admin` |

## Database

Apply migrations **in order** (`supabase/migrations/`). If you reset or recreate the DB,
re-apply all of them:

| File | What |
|------|------|
| `0001_core.sql` | 8 tables, `shares_channel()`, RLS policies, avatars bucket |
| `0002_directory.sql` | `directory_profiles` view + `can_see_contact()` |
| `0003_fix_group_members_rls.sql` | `is_group_member()` security-definer (fixes RLS recursion) |
| `0004_realtime_messages.sql` | adds `messages` to the realtime publication |
| `0005_party_size.sql` | `signups.party_size` (come-as-a-group); drops old `group_size_pref` |

Apply via the Supabase dashboard SQL editor (paste each file, Run), or the Supabase CLI.

## Scripts

```bash
# Seed real dinner slots (Wed/Thu/Fri dinners + Sat lunch)
npx -y tsx --env-file=.env.local scripts/seed-slots.ts
# Seed ~20 fake users onto Day 2 Dinner (for testing matching)
npx -y tsx --env-file=.env.local scripts/seed-fake.ts
# Print a local login link for an email (no inbox needed) — dev only
node --env-file=.env.local scripts/dev-magiclink.mjs you@example.com
# Tests
npx vitest run
```

## Deploy

See the running deploy checklist in [`docs/HANDOFF.md`](docs/HANDOFF.md#deploy-to-vercel-checklist).

## Docs

- `docs/HANDOFF.md` — build status, DB state, deploy checklist, human TODOs.
- `docs/UX-GAP-AUDIT.md` — prioritized conference-goer gap list.
- `docs/superpowers/specs/` — design specs (product spec, party-size).

---

## User pipeline — the states a person moves through

```
Landing (/)                → redirects to /home
   │  not signed in
   ▼
Login (/login)             → enter email → magic link → tap it
   │  first time (no profile)          returning
   ▼                                     │
Onboarding (/welcome)                    │
   Step 1 Basics  (name, school, position, photo)
   Step 2 Interests
   Step 3 Plans   (pick dinners, optional flight info)
   │  profile saved + dinner signups created
   ▼                                     ▼
Home (/home)  ◀──────────────────────────┘
   Four states, priority top-down:
     · Day-of      → "Tonight 7:00 · <place>"  → Open chat
     · Revealed    → "Your table is set"        → Meet your table
     · Joined-wait → "Tables assigned at <time>" → Change plans
     · Fresh       → CTAs: Find your table · See who's here
   │
   ├─▶ Meals (/meals)   list slots → Join sheet ("How many are you?" 1–4 + notes) → You're in
   │        │  admin runs matching (/admin)
   │        ▼
   │     Group reveal (/groups/[id])   member cards, "+N with them", rationale, place/time
   │        │                          → Open group chat
   │        ▼
   │     Chat (/groups/[id]/chat)      realtime group chat
   │
   ├─▶ People (/people)  directory → tap a person → contacts (locked until you share a table)
   │
   ├─▶ Rides (/rides)    airport pooling (Plan 2 — teaching placeholder for now)
   │
   └─▶ Me (/me)          profile view/edit, my dinners, my tables, sign out
```

**Matching:** an admin opens `/admin` and runs matching for a slot. Signups are packed into
tables of 4–6 *by headcount* — a party of 3 always sits together and merges with, say, a
party of 2 into a table of 5. Claude writes each table's name + "why you matched" rationale;
if no API key is set, a round-robin fallback produces correct tables with a generic rationale.

**Contact unlock:** KakaoTalk / LinkedIn are hidden in the directory until you and the other
person share a group (or ride), enforced in the DB by `can_see_contact()` / `shares_channel()`.
