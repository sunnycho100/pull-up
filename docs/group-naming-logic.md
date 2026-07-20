# Group Naming Logic

How a matched group earns a name instead of "Table 1 / Table 2" (which just leaks the table count).
A name should carry the group's **identity** — its field, its role mix, or its shared vibe.

## Recommended method: deterministic bank first, LLM optional

For a small, well-characterized set of group identities, a **curated bank + deterministic pick**
beats an LLM as the default: free, instant, fully tone-controlled, never drifts, testable. An LLM
(Gemini 2.5 Flash) is an **optional upgrade** for bespoke names that react to a specific combo — with
the bank as the fallback when there's no key. Same shape as `lib/matching.ts` (LLM + deterministic
fallback). **Ship the deterministic picker; wire Gemini later only if bespoke flavor is worth it.**

## The name bank (approved — playful English; Korean set dropped per owner)

| Identity | Names |
|---|---|
| **Engineering** (ME / EE / ChemE) | Engi Fam · The Builders · Torque Squad · Circuit Breakers · Load-Bearing |
| **CS / AI / Data** | Model Citizens · Latent Space · The Compilers · Overfit Club · Null & Void |
| **Bio / Chem / Life sci** | Petri Party · Helix House · The Cultures · Lab Fam |
| **Mixed / interdisciplinary** | Cross-Pollinators · The Bridge · Sundry Crew · Loose Coupling |
| **Interest / vibe-led** | Send It (climbing) · The Grind (coffee) · Cold Brew Crew · Founder Mode (startups) · Base Camp |

The machine-readable bank lives in `data/group-names.json`. Add names freely; keep the tone childish
and warm, not corporate.

## Identity signals (derived from the group's members)

Every member has `field`, `role`, `interests[]` (see `lib/mentorMatch.ts` / `profiles`). From a group:

- **dominant field** = the most common `field` among members
- **mixed?** = more than one distinct field with no clear majority → use the *Mixed* category
- **top shared interest** = an interest most/all members list (e.g. everyone has "climbing")
- **role mix** = mentors + mentees both present (a mentorship group)

## Deterministic selection (the default to build)

```
nameGroup(members, alreadyUsedInSlot):
  1. if a top shared interest is near-unanimous → category = Interest/vibe (map interest→name)
  2. else if fields are mixed (no majority)     → category = Mixed
  3. else                                        → category = dominant field's category
  4. pick the first name in that category not in alreadyUsedInSlot
     (seed the start index by group index so re-runs are stable but tables differ)
  5. if the whole category is exhausted, fall through to the Mixed pool, then a numbered suffix
```

Pure and testable — mirror `lib/matching.ts`'s TDD. No key, no latency, no failure mode.

## Optional upgrade: Gemini 2.5 Flash (future)

Gated behind `GEMINI_API_KEY` (placeholder in `.env.example`). If the key is absent, use the
deterministic picker above. Model: `gemini-2.5-flash`. Constrain output to ONE short name in the
bank's register; forbid Korean, forbid "Table N", forbid anything already used in the slot.

### Prompt (few-shot — keep it this detailed)

**System / instruction:**
> You name small groups of people at UKC 2026, a US–Korea academic conference, who've been matched to
> meet over a meal or as mentor/mentee. Return ONE short, playful, warm team name (max 3 words) that
> reflects the group's shared identity — their field, their role mix, or a shared interest. The tone is
> childish and fun, like a summer-camp cabin name, never corporate. Do NOT use Korean words. Do NOT
> output "Table" + a number. Do NOT reuse any name in `avoid`. Return only the name, no quotes, no
> explanation.

**Few-shot examples** (identity → name):

| Group identity | Name |
|---|---|
| 4 mechanical + electrical engineers, mostly PhDs, into robotics | Torque Squad |
| 4 CS/ML people, mix of undergrad + industry, into startups | Model Citizens |
| 4 biologists + chemists, shared interest coffee | Petri Party |
| a chem-E, a data scientist, a physicist, a bio-E (all different fields) | Cross-Pollinators |
| 4 people who all listed climbing, across fields | Send It |
| 3 CS students + 1 CS PhD mentor, into gaming | Overfit Club |

**User turn (filled at call time):**
```
Field mix: {e.g. "Computer Science ×3, Data Science ×1"}
Roles: {e.g. "2 mentors, 2 students"}
Top shared interests: {e.g. "startups, coffee"}
avoid: {names already used in this slot}
```

### Is an LLM the best method? (recorded answer)

No — not as the default. The identity space is small and the tone must stay tightly controlled, which
is exactly where a curated deterministic map wins (free, instant, no drift). The LLM's only real edge
is novelty for unusual combos, which is a nice-to-have. Build deterministic; keep Gemini as a
documented, key-gated enhancement.
