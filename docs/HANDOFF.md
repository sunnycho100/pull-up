# UKC Social — Handoff / Status

_Last updated: 2026-07-19 (autonomous build + live QA run; + feature/polish run)_

### Update — 2026-07-19 feature + polish run
- **Party size ("come as a group")** shipped: join-time "How many are you?" (1–4), matching
  packs tables by headcount and keeps parties intact, reveal shows "+N with them". Migration
  `0005` applied to cloud. Design spec: `docs/superpowers/specs/2026-07-19-party-size-design.md`.
- **UX gap audit** written: `docs/UX-GAP-AUDIT.md` (prioritized). Fixed on this pass: Kakao
  broken link, Home ride-CTA dead-end, group-reveal back affordance, People empty state.
- **Logo** embedded on login + home header (`public/logo.png`).
- **Design polish** (impeccable): danger/accent-weak/overlay tokens, `:focus-visible` ring,
  unified error reds, teaching Rides placeholder.
- **Repo cleanup**: removed `CLAUDE.md`/`AGENTS.md` (Next.js note folded into README),
  rewrote README with setup + user state-flow.
- **Rides (started)**: `lib/flights.ts` — `fetchArrivals()` uses AeroDataBox (RapidAPI,
  set `AERODATABOX_API_KEY`) or the bundled Aug-4 MCO example; `bucketIntoPools()` groups
  arrivals by revised time so delays re-pool correctly. The Rides tab now renders the
  example pools with delay badges + car-split estimate. Next: join/leave a pool (ride_pools
  tables already exist) + persist onboarding flight info.

## Status: BUILT + VERIFIED END-TO-END on cloud Supabase ✅

All 12 core tasks built, and the full flow was driven and verified against the live
cloud database (project `ctkjzenmwvqgrncxinvt`, "sunny2.0"):

- ✅ **Magic-link login** — generated a real link, logged in, hit the callback.
- ✅ **Onboarding** (3 steps, avatar, interests incl. 국밥 crew, dinner opt-ins) → profile saved.
- ✅ **Slot join** → signup row created; **Home dashboard** shows joined-waiting then revealed.
- ✅ **Admin matching** — 21 signups → 4 valid groups (flex: no).
- ✅ **Group reveal** — member cards, interests, Korean names, rationale panel.
- ✅ **Realtime group chat** — verified LIVE delivery between two users (Sunghwan ↔ Ethan), Korean intact.
- ✅ **Directory contact-locking** — groupmate sees Kakao/LinkedIn; non-members gated by `can_see_contact`.

### 3 real bugs found & fixed during QA (all committed)
1. **Auth callback** only handled the PKCE `?code=` flow → magic links bounced to
   `/login?error=auth`. Added `token_hash` + `verifyOtp` path. (`0003`-era commit)
2. **Recursive RLS** on `group_members` (policy queried its own table → infinite
   recursion) silently nulled reveal/home/chat reads. Fixed with a SECURITY DEFINER
   `is_group_member()`. (migration `0003`)
3. **Realtime**: `messages` wasn't in the `supabase_realtime` publication, so chat
   never pushed live. Added it. (migration `0004`)

### Cloud DB state
- `.env.local` (gitignored) holds the live URL + legacy anon/service_role keys.
- Migrations applied: `0001` (schema+RLS), `0002` (directory), `0003` (RLS fix),
  `0004` (realtime), `0005` (party_size). **If you reset/recreate the DB, re-apply all
  five in order.**
- Seeded: 4 real slots (Wed/Thu/Fri dinners + Sat lunch) + 20 fake users on Day 2 Dinner.

## Remaining Human TODOs

1. **Anthropic API key** — add `ANTHROPIC_API_KEY=` to `.env.local`. Without it, matching
   uses the round-robin fallback (groups are correct, but the rationale is the generic
   "Grouped to keep tables even" instead of the warm AI blurb). This is the only feature
   still on the fallback path.
2. **Vercel deploy** — connect the repo, set the same env vars (URL, anon, service_role,
   ANTHROPIC_API_KEY, ADMIN_EMAIL), deploy. Then in Supabase → Auth → URL Configuration
   set Site URL + redirect `https://<domain>/auth/callback`.
3. **Google OAuth** (optional) — enable in Supabase Auth providers; the login page's
   magic-link path already works without it.
4. **(Later) Plan 2** — rides + polish (spec §7 S5). Ride tables already migrated.

## Deploy to Vercel (checklist)

_Not done yet — this is the runbook for when we deploy. Do NOT deploy silently; confirm first._

1. **Import the repo** into Vercel (framework auto-detects as Next.js).
2. **Set env vars** in Vercel → Project → Settings → Environment Variables (Production +
   Preview): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `ADMIN_EMAIL`, and optionally
   `AERODATABOX_API_KEY` (live Rides arrivals). Values mirror `.env.local`.
   The service-role key is server-only — never expose it as `NEXT_PUBLIC_*`.
3. **Deploy**, note the assigned domain (e.g. `ukc-social.vercel.app`).
4. **Point Supabase auth at the domain:** Supabase → Auth → URL Configuration →
   Site URL `https://<domain>`, and add redirect `https://<domain>/auth/callback`
   (keep `http://localhost:3000/auth/callback` for local dev). Magic links bounce to
   `/login?error=auth` if this is missing.
5. **DB is already live** (project `ctkjzenmwvqgrncxinvt`). If you deploy against a fresh
   Supabase project instead, re-apply migrations `0001`→`0005` in order first, then re-seed.
6. **Smoke test on the domain:** magic-link login → onboarding → join a dinner (try a party
   of 2–3) → admin runs matching at `/<domain>/admin` → reveal → chat delivers live.
7. **(Optional) Google OAuth:** enable in Supabase Auth providers; the magic-link path works
   without it.

## Dev helpers
- `scripts/seed-slots.ts`, `scripts/seed-fake.ts` — `npx -y tsx --env-file=.env.local scripts/<f>.ts`
- `scripts/dev-magiclink.mjs <email>` — prints a local login link for testing (no inbox needed).

## Known nits (not blockers)
- Next 16: rename `middleware.ts` → `proxy.ts` eventually.
- `/meals` shows an error card (not a redirect) if the DB is ever unreachable.
- Magic-link emails from real Supabase go to the real inbox; for scripted testing use `dev-magiclink.mjs`.
