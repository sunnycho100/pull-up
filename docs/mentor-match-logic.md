# Mentor–Mentee Matching — Logic

Plain-English record of how UKC Social matches people. Code: [`lib/mentorMatch.ts`](../lib/mentorMatch.ts).
Test run over 30 synthetic people: `node --experimental-strip-types scripts/match-report.ts` → CSVs in `data/`.

## 1. Classify (mentor vs mentee)

At sign-up we know each person's `role`:

| role | side |
|---|---|
| `phd`, `industry` (working adult) | **mentor** |
| `masters`, `undergrad` | **mentee** |

Binary for now. The boundary is a knob: if sign-ups skew (e.g. too few mentors),
move `masters` up to mentor, or split PhD junior/senior. We'll see the real ratio
once people sign up.

## 2. Score a pair — `scorePair(a, b)` → 0–100%

Three topic signals, each 0–1, then a role factor and a small bonus.

| signal | how | weight |
|---|---|---|
| **field** (major) | same broad field = 1, else 0 | 0.30 |
| **research area** | same area = 1; same field, different area = 0.5; else 0 | 0.40 |
| **interests** | Jaccard overlap of interest tags (shared ÷ union) | 0.30 |

`topic = 0.30·field + 0.40·research + 0.30·interest`

Then:
- **role factor** — mentorship pair (one mentor + one mentee) ×1.0; peer pair (both same side) ×0.7.
  Peers still get scored (for "find others like you" discovery) but rank below the mentorship bridge.
- **cross-school bonus** — +0.05 if different schools. "Groups silo by school" is a stated pain
  point, so meeting outside your bubble is a small tiebreak.

`total = min(1, topic · roleFactor + crossSchoolBonus)`

All numbers live in one `WEIGHTS` const — tune there, re-run the report.

## 3. Assign 1:1 — `assignMentees(people, { mentorCapacity: 2 })`

Greedy: rank every mentee×mentor pair by score, walk down assigning a mentee to a mentor while
the mentee is unassigned and the mentor is under capacity (default 2 mentees each). Not globally
optimal (no Hungarian) — good enough to validate scores; upgrade if pairings look unfair.

## 4. Suggest a group of 4 — `suggestGroups(assignments, people, { affinityFloor })`

Fuse two matched pairs into a group (2 mentors + 2 mentees). Rank every pair-of-pairs by
**affinity** = mean topic score across the 4 cross-combos (role-neutral — grouping is about shared
field/vibe). Greedily merge. Two guards:
- never fuse two pairs that share a mentor (would make a 3-person "group");
- never fuse below the **affinity floor** (`WEIGHTS.groupAffinityFloor`, default **0.40**) — a weak
  pairing is left as a 1:1 duo rather than forced into a bad group.

A pair with no above-floor, non-overlapping partner stays a duo.

## Test-run findings (30 people, 15/15)

- **1:1 pairs are healthy** — same-field 90–100%, same-field/different-area 70–81%.
- **Grouping tail was weak** — greedy fusion once strands mismatched leftovers (a CS pair got fused
  with a Data-Science pair at **6.8%**). **Fixed** with the 0.40 affinity floor: those weak pairs
  now stay as 1:1 duos. Adjacent cross-field groups (ME+EE robotics, ~53%) still form.

## How matching runs (the model, not yet built)

Matching is **behind the scenes**, not a live browse. Decided flow:

1. **Batch after sign-up closes.** Once everyone has a profile, a match job runs. No one hand-picks;
   the algorithm above assigns pairs + groups.
2. **A new person each day.** Day 1, Day 2, Day 3 → each attendee is introduced to a *different*
   match. So the job runs per day and must **exclude already-seen pairings** (track a `seen` set of
   (a,b) per user; rank next-best unseen match each morning).
3. **A match is an offer, not a fact.** Either side may take it or ignore it — the day still rotates
   to someone new. (Whether "both accepted" unlocks contact/DM is a later call.)
4. **Opt-out lives in settings** — "Stop meeting new people." Clicking it shows **one retention
   confirm** before it takes effect:
   > *We really hope to connect you with new people every day!*
   > *Are you sure you want to leave?*
   Confirm → the daily job skips this user. (A quiet setting to re-enable, no dark patterns beyond
   the single confirm.)

**What building it needs (next phase):** real `role`/`field`/`research_area` columns + onboarding
capture; a `matches` table (day, a, b, status); a daily job (cron / Supabase scheduled fn) that
picks next-best *unseen* matches; a `matching_enabled` flag on the profile + the settings toggle and
confirm dialog. None of this exists yet — the algorithm is validated on synthetic data first.

## Not built yet (deferred on purpose)

- Real DB fields: `field` / `research_area` / `role` aren't in `profiles` yet (only free-text
  `position`). This is validated on the synthetic set first; wiring into onboarding + a migration is
  the follow-up once the scoring is trusted.
- Seniority ladder (a PhD mentoring undergrads but being mentored by professors) — binary for now.
