# UKC Social — Handoff / Human TODOs

_Last updated: 2026-07-18 (autonomous build run)_

## Where things stand

**All 12 core tasks are BUILT, tsc-clean, and pushed** (see `docs/superpowers/plans/2026-07-17-ukc-social-core.md`):
auth (magic link) · glass tab-bar shell · 3-step onboarding w/ avatar upload · meals list + join sheet ·
AI matching engine (7/7 unit tests) · admin trigger + seeds · group reveal · realtime chat ·
directory w/ contact locking · home dashboard · me page. `npm run build` passes (13 routes).

**NOT yet verified end-to-end:** anything needing a live database. Local Supabase
(`npx supabase start`) stalled — Docker registry pulls were crawling on this network
(even `alpine` wouldn't land). The command may still be running; check
`/tmp/supabase-start.log`.

`.env.local` already exists with the **local-dev** URL + correctly-signed local JWTs —
if the local stack ever finishes booting, everything connects with zero edits.

## Human TODOs (in order)

1. **Supabase project** (10 min) — supabase.com → new project (account: such4283@gmail.com).
   Then replace in `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API).
2. **Apply migrations** — dashboard SQL editor: paste `supabase/migrations/0001_core.sql`,
   run; then `0002_directory.sql`. (Or `npx supabase link` + `db push`.)
3. **Anthropic API key** — console.anthropic.com → add `ANTHROPIC_API_KEY=` to `.env.local`
   (matching engine uses `claude-sonnet-5`; without the key it falls back to round-robin).
4. **Seed** — `npx -y tsx --env-file=.env.local scripts/seed-slots.ts` (4 real slots), then
   `npx -y tsx --env-file=.env.local scripts/seed-fake.ts` (20 fake users on Day 2 Dinner).
5. **Integration verify** (Claude can drive this once keys land):
   login round-trip → onboarding ≤60s → join slot → `/admin` run matching (as
   such4283@gmail.com) → group reveal renders w/ rationale → chat live between two
   browsers → directory contact-lock check (stranger vs groupmate).
6. **Vercel** — connect repo, set the same env vars, deploy. Add the Vercel URL to
   Supabase Auth → URL Configuration (Site URL + redirect `https://<domain>/auth/callback`).
7. **(Later)** Google OAuth in Supabase Auth providers; then Plan 2: rides + polish
   (spec §7 S5, ride tables already migrated).

## Known nits (not blockers)

- Next 16 deprecation warning: `middleware.ts` → rename to `proxy.ts` eventually.
- `/meals` renders an error card (not a redirect) when the DB is unreachable — self-heals
  with a live DB; consider a friendlier global error boundary later.
- Magic-link emails on **local** Supabase land in Mailpit (http://127.0.0.1:54324), not real inboxes.
