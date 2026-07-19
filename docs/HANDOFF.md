# UKC Social — Handoff / Status

_Last updated: 2026-07-19 (autonomous build + live QA run)_

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
  `0004` (realtime). **If you reset/recreate the DB, re-apply all four in order.**
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

## Dev helpers
- `scripts/seed-slots.ts`, `scripts/seed-fake.ts` — `npx -y tsx --env-file=.env.local scripts/<f>.ts`
- `scripts/dev-magiclink.mjs <email>` — prints a local login link for testing (no inbox needed).

## Known nits (not blockers)
- Next 16: rename `middleware.ts` → `proxy.ts` eventually.
- `/meals` shows an error card (not a redirect) if the DB is ever unreachable.
- Magic-link emails from real Supabase go to the real inbox; for scripted testing use `dev-magiclink.mjs`.
