# End-to-End Pipeline Demo

Automated proof that the full meal-matching pipeline works, from a cold signup to a sent group-chat
message, recorded as a video.

## Run it

```bash
# dev server must be up on :3000 (npm run dev)
node scripts/e2e/demo.mjs
```

Produces **`demo/ukc-social-e2e.mp4`** (~33s, mobile 390×844). Steps run with ~1.3s pauses so the
flow is watchable, not a blur.

- `scripts/e2e/prepare.mjs` — idempotently seeds the 4 meal slots + 20 filler users on "Day 2
  Dinner", (re)creates a **fresh** hero (`hero@ukctest.dev`) so onboarding always starts clean, and
  mints magic links for the hero and the admin. Writes clearly-fake test rows to the cloud DB.
- `scripts/e2e/demo.mjs` — Playwright driver. Records the **hero's** browser context; triggers
  matching in a **separate, un-recorded admin context** (matching is admin-email-gated, so a normal
  user can't self-trigger it).

## Pipeline stages verified (all green)

1. **Sign in** — magic link → `/auth/callback` → onboarding.
2. **Onboarding** — basics (name/school/position) → interests (≥3) → finish.
3. **Home** — fresh state → "Find your table".
4. **Join** — `/meals` → Day 2 Dinner "Join ▸" → sheet → "Join".
5. **Matching** — admin `/admin` → "Run matching" → `runMatching` writes groups + members
   (round-robin fallback; no ANTHROPIC key needed).
6. **Reveal** — Home shows the group → "Meet your table ▸" → `/groups/[id]`.
7. **Chat** — "Open group chat ▸" → type → "Send".

Verified in the DB after the run: the hero landed in group **"Cross-Pollinators"** and the message
`"Hey everyone! Excited to meet you all 👋"` persisted.

## What was found & changed

The pipeline was **structurally intact** — no missing pages or dead buttons. The real gaps were
polish + test-targeting:

- **Group names were "Table 1 / Table 2"** (round-robin fallback, no LLM key). Wired the deterministic
  name bank (`lib/groupName.ts` + `data/group-names.json`) into `runMatching`, so tables now read
  "Cross-Pollinators", "Model Citizens", "Petri Party", etc. — no API key. See
  `docs/group-naming-logic.md`.
- **Middot name-soup on the Home reveal** (`민서 · Ethan · …`) → comma-joined.
- **Deterministic test hooks** — added `data-slot-id` to the join button (`MealsList`) and the run
  button (`AdminSlotRow`) so the E2E can target a specific slot instead of "the first one" (the first
  attempt joined Day 1 while matching ran on Day 2).
- **Matching is admin-gated** — the harness runs it in a side admin context rather than exposing
  `/admin` to normal users. No code change; correct by design.

## Known non-blockers (documented, not fixed here)

- Slot deadlines are hard-coded to Aug 5–8 2026; after that every slot shows "Closed" (time-bomb).
- No `middleware.ts`, so the session isn't refreshed mid-navigation (fine for a sub-hour run).
- Onboarding still uses the older pill/chip styling — the editorial de-box pass so far only covers the
  match surfaces, not onboarding.
