# Party Size ("Come as a group") — Design

_Date: 2026-07-19 · Status: self-approved for the autonomous run (user delegated the
"decide the right moment and justify it" call; review on wake)._

## Problem

Real UKC attendees arrive in pre-formed small groups (a pair, a trio) and want to be
**seated together with other small groups** — a group of 2 + a group of 3 → a table of 5.
Today there's no way to say "we're together," and the JoinSheet's "Table size" (4/5/6/Any)
control is an ambiguous, mostly-cosmetic preference (flagged P0 in the UX gap audit).

## Decisions (with justification)

**1. Capture at join time, not onboarding.** Party size is *per-dinner*, not a stable
profile attribute — the same person is solo one night and a trio the next, and their
friends may not have accounts. The JoinSheet is already the per-slot data-entry point.
(Rejected: onboarding — wrong lifetime/scope; manual host matchmaking — doesn't self-serve.)

**2. Count-based atoms, not an invite/party-code system.** The user's ask is literally
"how many people do you have, including yourself." We model each signup as an **atom**
carrying an indivisible `party_size` (1–4). We do NOT build friend-invites, party codes,
or guest accounts. Justification: one column vs. a whole sub-system (parties table, codes,
invite/accept, pending accounts, auth changes); and it still gives the matching engine the
real, testable contract — *keep each atom intact, pack atoms so each table's total headcount
is 4–6.* The two groups' representatives are both real accounts at the same table, in the
same group chat, contacts unlocked — the feature's actual value.

**Trade-off (accepted):** the friends-in-tow are not individual accounts, so they aren't
individually in the chat and don't have their own contact cards. The representative relays.
If we later want every friend as a first-class member, that's the party-code upgrade — out
of scope now. `// ponytail:` noted at the seams.

## Data model

Migration `0005_party_size.sql`:
```sql
alter table signups add column party_size int not null default 1
  check (party_size between 1 and 6);
alter table signups drop column group_size_pref;   -- ambiguous, unused by matcher
```
`party_size` = headcount for this signup including the signer. UI offers 1–4; DB allows up
to 6 (one party can fill a whole table). Existing rows default to 1 (solo) — safe backfill.

## Matching contract (`lib/matching.ts` — the core)

`SignupProfile` gains `partySize?: number` (absent ⇒ 1). Sizing everywhere becomes
**headcount** = sum of member `partySize`, not member count.

- `headcountOf(memberIds, sizes)` — helper.
- `validateAssignment(ids, groups, min=4, max=6, sizes?)` — partition checks unchanged
  (no dupe/missing/extra). **`oversize`** now means *headcount > max* (hard fail). Adds a
  reported-but-non-fatal **`undersize`** (headcount < min with >1 group) — because atoms can
  force an unavoidable small table (e.g. parties [6,3] → a table of 3). `ok` excludes
  undersize. Default `sizes` weight = 1, so all existing weight-1 tests still hold.
- `roundRobinGroups(signups, target=5)` becomes a **balanced first-fit-decreasing packer by
  headcount**: pre-create `max(1, round(totalHeadcount/target))` bins; place each atom
  (sorted desc by size) into the least-loaded bin that stays ≤ max; if none fits, open a new
  bin. Guarantees: every signup once; no table over max; atoms never split; solo-only input
  still balances to ~5s (13 solo → 5/4/4). Keeps the name (tests import it).
- `matchSlot`: short-circuit is now by **headcount** (`if totalHeadcount ≤ max`), the Claude
  prompt states each attendee's `(+N)` group and that tables seat 4–6 *total* counting the
  +N, and validation passes `sizes`. Fallback to `roundRobinGroups` unchanged.

## Join flow (UI)

- **JoinSheet**: replace the "Table size" segmented control with **"How many are you,
  including yourself?"** — options Just me (1) / +1 (2) / +2 (3) / +3 (4). Persists to
  `party_size`. Notes field stays. Copy explains "We'll seat your group together with
  another small group."
- **actions/signups.ts** `joinSlot(slotId, { partySize, notes })` — upsert `party_size`.
- **Meals list count**: "N people in" now sums **headcount** across signups (a trio counts
  as 3), so the number reflects real seats. Server sums `party_size`.

## Reveal / headcount display

- **GroupReveal**: header count and any "N people" become **headcount** (sum of member
  `partySize`). A member with `partySize>1` shows a "+2 with them" line on their card, so the
  table's real size reads correctly even though only representatives have cards.
- Pass `party_size` through the group-members query in `app/groups/[id]/page.tsx`.

## Testing (TDD)

New/updated `lib/matching.test.ts` cases — write first, then implement:
1. `[3,2]` → one table, headcount 5, both ids present, not oversize.
2. `[3,3]` → tables cover both, no table headcount > 6.
3. `[4,4]` → two separate tables (8 > 6 can't merge), each headcount 4.
4. party of 6 alone → its own table.
5. random mixed sizes → **no table headcount exceeds max**, every id exactly once.
6. `validateAssignment` with a `sizes` map: `[A(3),B(2)]` headcount 5 valid; `[A(3),B(3),C(2)]`
   headcount 8 → oversize.
7. Existing solo tests (13 → all 4–6; n=3 flex; n=0) still green.

## Out of scope

Friend-invites / party codes / guest accounts; changing the min/max table bounds; the other
audit fixes (shipped as a separate commit).
