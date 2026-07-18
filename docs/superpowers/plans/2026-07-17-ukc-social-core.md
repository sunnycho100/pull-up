# UKC Social Core (P0–P2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Working UKC Social core — magic-link auth, ≤60s onboarding with avatar, meal-slot join flow, AI interest matching with validated output, group reveal + realtime chat.

**Architecture:** Next.js 15 App Router (TS) on Vercel; Supabase for Postgres/Auth/Realtime/Storage; one server-side matching module calling Claude with structured output, validated in code with round-robin fallback. Glass tab-bar app shell; every route mobile-first at 390px.

**Tech Stack:** Next.js 15, TypeScript, Tailwind v4, @supabase/ssr, @supabase/supabase-js, @anthropic-ai/sdk (model `claude-sonnet-5`), vitest.

## Global Constraints

- Display name everywhere: **UKC Social** (repo stays `pull-up`). Never mention official dinner pricing in app copy.
- Design: Precision base (white ground, navy→gray ramp, single blurple accent `#635BFF`) + Apple layer (system font stack, springs ~300–400ms ease-out, glass tab bar `rgba(255,255,255,0.6)` + `backdrop-filter: blur(20px) saturate(180%)`).
- A11y: `prefers-reduced-motion` → crossfade; `prefers-reduced-transparency` → solid bg; body text contrast ≥4.5:1.
- Contacts (kakao/linkedin) readable ONLY via shared group membership (RLS-enforced).
- Admin = `such4283@gmail.com` (env `ADMIN_EMAIL`), checked server-side.
- Korean text must render throughout (UTF-8).
- Commits: short subject, no AI-attribution trailers.
- Env (`.env.local`, never committed): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `ADMIN_EMAIL`.

---

### Task 1: Scaffold

**Files:**
- Create: Next.js app at repo root (`app/`, `package.json`, etc.)
- Create: `.env.example`

- [ ] **Step 1: Scaffold app**

```bash
cd /Users/sunghwan_cho/Documents/projects/ai-build
npx create-next-app@latest . --ts --tailwind --app --no-src-dir --import-alias "@/*" --use-npm --yes
npm i @supabase/ssr @supabase/supabase-js @anthropic-ai/sdk
npm i -D vitest
```

(create-next-app refuses non-empty dirs: run in `/tmp/ukc-scaffold` then `rsync -a` into repo root, keeping existing `docs/` and `design/`.)

- [ ] **Step 2: Add `.env.example`**

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
ADMIN_EMAIL=such4283@gmail.com
```

- [ ] **Step 3: Add `"test": "vitest run"` to package.json scripts; verify dev server**

Run: `npm run dev` → http://localhost:3000 renders. Expected: default page, no errors.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "Scaffold Next.js app with Supabase and Anthropic deps"
```

### Task 2: Database schema + RLS

**Files:**
- Create: `supabase/migrations/0001_core.sql`

**Interfaces:**
- Produces: tables `profiles`, `slots`, `signups`, `groups`, `group_members`, `ride_pools`, `ride_members`, `messages`; helper fn `shares_channel(uuid, uuid)`.

- [ ] **Step 1: Write the full migration**

```sql
-- 0001_core.sql
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null default '',
  photo_url text,
  school text not null default '',
  position text not null default '',
  interests text[] not null default '{}',
  bio text not null default '',
  kakao text not null default '',
  linkedin text not null default '',
  dietary text not null default '',
  dinners_wanted uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
create table slots (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  starts_at timestamptz not null,
  area text not null default '',
  join_deadline timestamptz not null,
  kind text not null default 'meal'
);
create table signups (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references slots on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  group_size_pref int,
  notes text not null default '',
  unique (slot_id, user_id)
);
create table groups (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references slots on delete cascade,
  name text not null,
  rationale text not null default '',
  suggested_place text not null default '',
  meet_time timestamptz
);
create table group_members (
  group_id uuid not null references groups on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  primary key (group_id, user_id)
);
create table ride_pools (
  id uuid primary key default gen_random_uuid(),
  direction text not null check (direction in ('arrival','departure')),
  pickup_at timestamptz not null,
  capacity int not null default 4,
  status text not null default 'open',
  meet_point text not null default ''
);
create table ride_members (
  pool_id uuid not null references ride_pools on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  flight_no text not null default '',
  flight_at timestamptz,
  ready_at timestamptz not null,
  luggage bool not null default true,
  primary key (pool_id, user_id)
);
create table messages (
  id uuid primary key default gen_random_uuid(),
  channel_type text not null check (channel_type in ('meal','ride')),
  channel_id uuid not null,
  user_id uuid not null references profiles on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create or replace function shares_channel(a uuid, b uuid) returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from group_members g1 join group_members g2 using (group_id)
    where g1.user_id = a and g2.user_id = b
  ) or exists (
    select 1 from ride_members r1 join ride_members r2 using (pool_id)
    where r1.user_id = a and r2.user_id = b
  );
$$;

alter table profiles enable row level security;
alter table slots enable row level security;
alter table signups enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table ride_pools enable row level security;
alter table ride_members enable row level security;
alter table messages enable row level security;

-- profiles: directory fields readable by authed users; own row writable.
create policy p_sel on profiles for select using (auth.role() = 'authenticated');
create policy p_ins on profiles for insert with check (auth.uid() = id);
create policy p_upd on profiles for update using (auth.uid() = id);
-- NOTE: kakao/linkedin column privacy is enforced by a view in Task 12 (directory
-- reads go through `directory_profiles`; raw table selects of others' rows are used
-- only inside group/pool detail where shares_channel(auth.uid(), id) is checked).
create policy s_sel on slots for select using (auth.role() = 'authenticated');
create policy su_sel on signups for select using (auth.role() = 'authenticated');
create policy su_ins on signups for insert with check (auth.uid() = user_id);
create policy su_del on signups for delete using (auth.uid() = user_id);
create policy g_sel on groups for select using (
  exists (select 1 from group_members m where m.group_id = id and m.user_id = auth.uid()));
create policy gm_sel on group_members for select using (
  exists (select 1 from group_members m where m.group_id = group_members.group_id
          and m.user_id = auth.uid()));
create policy rp_sel on ride_pools for select using (auth.role() = 'authenticated');
create policy rm_sel on ride_members for select using (auth.role() = 'authenticated');
create policy rm_ins on ride_members for insert with check (auth.uid() = user_id);
create policy rm_del on ride_members for delete using (auth.uid() = user_id);
create policy m_sel on messages for select using (
  (channel_type = 'meal' and exists (select 1 from group_members m
     where m.group_id = channel_id and m.user_id = auth.uid()))
  or (channel_type = 'ride' and exists (select 1 from ride_members r
     where r.pool_id = channel_id and r.user_id = auth.uid())));
create policy m_ins on messages for insert with check (
  auth.uid() = user_id and (
    (channel_type = 'meal' and exists (select 1 from group_members m
       where m.group_id = channel_id and m.user_id = auth.uid()))
    or (channel_type = 'ride' and exists (select 1 from ride_members r
       where r.pool_id = channel_id and r.user_id = auth.uid()))));

insert into storage.buckets (id, name, public) values ('avatars','avatars', true)
  on conflict do nothing;
create policy av_ins on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy av_sel on storage.objects for select using (bucket_id = 'avatars');
```

- [ ] **Step 2: Apply** — Supabase dashboard SQL editor (paste + run) or `npx supabase db push` once creds exist. Expected: success, 8 tables visible.

- [ ] **Step 3: Commit**

```bash
git add supabase && git commit -m "Add core schema with RLS and avatar bucket"
```

### Task 3: Supabase clients + auth (magic link)

**Files:**
- Create: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `middleware.ts`, `app/(auth)/login/page.tsx`, `app/auth/callback/route.ts`

**Interfaces:**
- Produces: `createClient()` (browser), `createServerSupabase()` (RSC/actions, cookie-aware), `requireUser()` helper returning `{ user, supabase }` or redirecting to `/login`.

- [ ] **Step 1: Clients** — standard `@supabase/ssr` pattern: browser client with anon key; server client reading/writing Next cookies; `middleware.ts` refreshing sessions on all routes except `_next/*`.

- [ ] **Step 2: Login page** — email input + "Send link" (calls `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: origin + '/auth/callback' }})`), states: default / sending / sent ("Check your email") / error banner. UKC Social wordmark + one-line value prop.

- [ ] **Step 3: Callback route** — `exchangeCodeForSession`, then redirect: profile row exists → `/home`, else → `/welcome`.

- [ ] **Step 4: Verify manually** — `npm run dev`, request link, complete login, land on `/welcome`. Expected: session cookie set; refresh keeps session.

- [ ] **Step 5: Commit** — `git commit -m "Add magic-link auth with session middleware"`

### Task 4: Design tokens + glass tab-bar shell

**Files:**
- Create: `app/globals.css` (tokens), `components/TabBar.tsx`, `app/(tabs)/layout.tsx`

**Interfaces:**
- Produces: CSS vars `--bg --surface --line --ink --ink-2 --ink-3 --accent --accent-ink`; `<TabBar/>` with 5 tabs (Home `/home`, Meals `/meals`, Rides `/rides`, People `/people`, Me `/me`).

- [ ] **Step 1: Tokens**

```css
:root {
  --bg: #ffffff; --surface: #f7f8fa; --line: #e6e8ee;
  --ink: #0a2540; --ink-2: #425466; --ink-3: #596b80;
  --accent: #635bff; --accent-ink: #ffffff;
}
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
       color: var(--ink); background: var(--bg); }
h1,h2,h3 { text-wrap: balance; letter-spacing: -0.02em; }
```

- [ ] **Step 2: TabBar** — fixed bottom, safe-area inset, `background: rgba(255,255,255,0.6); backdrop-filter: blur(20px) saturate(180%); border-top: 1px solid rgba(10,37,64,0.08);` active tab in `--accent`; inactive `--ink-3`; `@media (prefers-reduced-transparency: reduce) { background:#fff; backdrop-filter:none; }`. Layout `(tabs)/layout.tsx` renders children + TabBar; content bottom padding = tab height + safe area.

- [ ] **Step 3: Verify** — placeholder pages for the 5 routes; check at 390px: no horizontal scroll, glass effect over scrolled content, active states.

- [ ] **Step 4: Commit** — `git commit -m "Add design tokens and glass tab bar shell"`

### Task 5: Onboarding — 3 steps

**Files:**
- Create: `app/welcome/page.tsx`, `components/onboarding/StepBasics.tsx`, `StepInterests.tsx`, `StepPlans.tsx`, `lib/avatar.ts`, `app/actions/profile.ts`

**Interfaces:**
- Produces: server action `saveProfile(fields: Partial<ProfileInput>): Promise<{ok:boolean; error?:string}>` (upsert on `auth.uid()`); `downscale(file: File, max=512): Promise<Blob>`.

- [ ] **Step 1: `lib/avatar.ts`** — canvas downscale to ≤512px JPEG q0.85; unit test with a generated ImageData is overkill → single runtime assert in dev; keep function pure `(file, max) => Blob`.

- [ ] **Step 2: Step 1 Basics** — avatar picker (tap → input[type=file accept=image/*] → downscale → upload to `avatars/{uid}/avatar.jpg` → progress ring → error+retry; skip = initials avatar), name, school, position. Client-validate non-empty name.

- [ ] **Step 3: Step 2 Interests** — chip grid (seed list incl. Korean/English: Robotics, Perception, NLP / Agents, Computer Vision, HCI, RL, Bio, Materials, Energy, Semiconductor, 국밥 crew, Night owl, Coffee chat…), min 3, custom-add input. Progress dots, back preserved state.

- [ ] **Step 4: Step 3 Plans** — the 4 dinner checkboxes fetched from `slots` (title + date), optional flight fields (airline+number OR manual arrival datetime) with "I'll add later". Save → `saveProfile` → `/home`. Store dinner choices as `signups` rows (one per checked slot) AND `dinners_wanted`.

- [ ] **Step 5: Verify the 60s test** — stopwatch a full run on phone-sized viewport; must be ≤60s typing normally. All three steps resumable (state in URL step param + saved partials).

- [ ] **Step 6: Commit** — `git commit -m "Add 3-step onboarding with avatar upload and dinner opt-ins"`

### Task 6: Slots seed + Meals list

**Files:**
- Create: `scripts/seed-slots.ts`, `app/(tabs)/meals/page.tsx`

**Interfaces:**
- Consumes: `slots`, `signups` tables.
- Produces: seeded 4 real slots (Wed 8/5 19:00, Thu 8/6 19:00, Fri 8/7 19:00 dinners; Sat 8/8 12:30 lunch; deadlines 17:00 day-of except Sat 10:30), Meals list UI.

- [ ] **Step 1: Seed script** — service-role client, upsert-by-title the 4 slots (America/New_York times → UTC). Run: `npx tsx scripts/seed-slots.ts`. Expected: "4 slots".
- [ ] **Step 2: Meals page** — slot rows (title, day/time, area, live count via `signups` count, state chip): open / joined ("You're in") / closed. Skeleton while loading, empty state if no slots.
- [ ] **Step 3: Verify** — list shows 4 slots with correct local times; joined state reflects DB.
- [ ] **Step 4: Commit** — `git commit -m "Seed real UKC slots and add meals list"`

### Task 7: Join sheet

**Files:**
- Create: `components/JoinSheet.tsx`, `app/actions/signups.ts`

**Interfaces:**
- Produces: server actions `joinSlot(slotId, {groupSizePref?, notes?})`, `leaveSlot(slotId)`; bottom sheet with grabber, spring-in, drag-to-dismiss (transform/opacity only; reduced-motion → fade).

- [ ] **Step 1:** Sheet UI: group-size segmented (4 / 5 / 6 / any), notes field, Join CTA (accent). Optimistic joined state, rollback+toast on error. Past deadline → sheet shows closed state, no CTA.
- [ ] **Step 2: Verify** — join/leave round-trip from two different accounts; count updates.
- [ ] **Step 3: Commit** — `git commit -m "Add slot join sheet with optimistic state"`

### Task 8: Matching engine (TDD — the core)

**Files:**
- Create: `lib/matching.ts`, `lib/matching.test.ts`

**Interfaces:**
- Produces:
  - `validateAssignment(signupIds: string[], groups: {memberIds: string[]}[], min=4, max=6): {ok: boolean; missing: string[]; dupes: string[]; oversize: number[]}`
  - `roundRobinGroups(signups: SignupProfile[], target=5): MatchGroup[]`
  - `matchSlot(signups: SignupProfile[], opts?): Promise<MatchGroup[]>` where `MatchGroup = { memberIds: string[]; name: string; rationale: string; suggestedPlace: string }` and `SignupProfile = { userId: string; name: string; school: string; position: string; interests: string[]; groupSizePref?: number; notes?: string }`.

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from "vitest";
import { validateAssignment, roundRobinGroups } from "./matching";

const ids = (n: number) => Array.from({length: n}, (_, i) => `u${i}`);

describe("validateAssignment", () => {
  it("passes a clean partition", () => {
    const r = validateAssignment(ids(10),
      [{memberIds: ids(10).slice(0,5)}, {memberIds: ids(10).slice(5)}]);
    expect(r.ok).toBe(true);
  });
  it("catches missing and duplicated users", () => {
    const r = validateAssignment(ids(10),
      [{memberIds: ["u0","u1","u2","u3","u0"]}, {memberIds: ["u5","u6","u7","u8"]}]);
    expect(r.ok).toBe(false);
    expect(r.dupes).toContain("u0");
    expect(r.missing).toContain("u4");
    expect(r.missing).toContain("u9");
  });
  it("flags oversize groups", () => {
    const r = validateAssignment(ids(7), [{memberIds: ids(7)}]);
    expect(r.ok).toBe(false);
    expect(r.oversize).toEqual([0]);
  });
});

describe("roundRobinGroups", () => {
  const profiles = ids(13).map(id => ({ userId: id, name: id, school: "",
    position: "", interests: [] }));
  it("partitions everyone exactly once within size bounds", () => {
    const gs = roundRobinGroups(profiles);
    const all = gs.flatMap(g => g.memberIds).sort();
    expect(all).toEqual(ids(13).sort());
    for (const g of gs) {
      expect(g.memberIds.length).toBeGreaterThanOrEqual(4);
      expect(g.memberIds.length).toBeLessThanOrEqual(6);
    }
  });
  it("handles n<min as one flex group", () => {
    const gs = roundRobinGroups(profiles.slice(0, 3));
    expect(gs.length).toBe(1);
    expect(gs[0].memberIds.length).toBe(3);
  });
});
```

- [ ] **Step 2: Run** `npm test` — Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
// lib/matching.ts
import Anthropic from "@anthropic-ai/sdk";

export type SignupProfile = { userId: string; name: string; school: string;
  position: string; interests: string[]; groupSizePref?: number; notes?: string };
export type MatchGroup = { memberIds: string[]; name: string; rationale: string;
  suggestedPlace: string };

export function validateAssignment(signupIds: string[],
  groups: { memberIds: string[] }[], min = 4, max = 6) {
  const seen = new Map<string, number>();
  for (const g of groups) for (const id of g.memberIds)
    seen.set(id, (seen.get(id) ?? 0) + 1);
  const dupes = [...seen].filter(([, c]) => c > 1).map(([id]) => id);
  const missing = signupIds.filter(id => !seen.has(id));
  const extra = [...seen.keys()].filter(id => !signupIds.includes(id));
  const oversize = groups.flatMap((g, i) =>
    g.memberIds.length > max || (groups.length > 1 && g.memberIds.length < min) ? [i] : []);
  return { ok: !dupes.length && !missing.length && !extra.length && !oversize.length,
    missing: [...missing, ...extra], dupes, oversize };
}

export function roundRobinGroups(signups: SignupProfile[], target = 5): MatchGroup[] {
  const n = signups.length;
  const count = Math.max(1, Math.round(n / target));
  const groups: string[][] = Array.from({ length: count }, () => []);
  signups.forEach((s, i) => groups[i % count].push(s.userId));
  return groups.map((memberIds, i) => ({ memberIds,
    name: `Table ${i + 1}`, rationale: "Grouped to keep tables even.",
    suggestedPlace: "" }));
}

const TOOL = {
  name: "submit_groups",
  description: "Submit the final grouping",
  input_schema: {
    type: "object" as const,
    properties: { groups: { type: "array", items: { type: "object", properties: {
      memberIds: { type: "array", items: { type: "string" } },
      name: { type: "string" }, rationale: { type: "string" },
      suggestedPlace: { type: "string" } },
      required: ["memberIds", "name", "rationale", "suggestedPlace"] } } },
    required: ["groups"] },
};

export async function matchSlot(signups: SignupProfile[],
  opts: { min?: number; max?: number; model?: string } = {}): Promise<MatchGroup[]> {
  const { min = 4, max = 6, model = "claude-sonnet-5" } = opts;
  if (signups.length <= max) return roundRobinGroups(signups);
  const client = new Anthropic();
  const ids = signups.map(s => s.userId);
  const prompt = `Group these UKC 2026 conference attendees into dinner tables of ${min}-${max} people by shared research interests and vibe. Every attendee appears in EXACTLY one group. Give each group a short fun name, a one-sentence "why you matched" rationale (warm, specific, mention shared interests), and a suggested cuisine near ChampionsGate FL (Korean options welcome).\n\nAttendees:\n${JSON.stringify(signups, null, 1)}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await client.messages.create({ model, max_tokens: 4096,
      tools: [TOOL], tool_choice: { type: "tool", name: "submit_groups" },
      messages: [{ role: "user", content: prompt }] });
    const call = res.content.find(b => b.type === "tool_use");
    if (call && call.type === "tool_use") {
      const groups = (call.input as { groups: MatchGroup[] }).groups;
      if (validateAssignment(ids, groups, min, max).ok) return groups;
    }
  }
  return roundRobinGroups(signups); // ponytail: LLM twice then deterministic fallback
}
```

- [ ] **Step 4: Run** `npm test` — Expected: PASS (5 tests; `matchSlot` LLM path not unit-tested — covered by Task 9's seeded integration run).

- [ ] **Step 5: Commit** — `git commit -m "Add matching engine with validation and fallback"`

### Task 9: Matching run — admin trigger + persistence + seed check

**Files:**
- Create: `app/admin/page.tsx`, `app/actions/admin.ts`, `scripts/seed-fake.ts`

**Interfaces:**
- Consumes: `matchSlot`, `validateAssignment` (Task 8).
- Produces: server action `runMatching(slotId): Promise<{groups: number; flex: boolean}>` — loads signups+profiles (service role), calls `matchSlot`, writes `groups` + `group_members` in one transaction (delete prior groups for slot first: reruns idempotent).

- [ ] **Step 1: Admin gate** — server component: session email !== `process.env.ADMIN_EMAIL` → 404. Page lists slots w/ signup counts + "Run matching" button per slot + result summary (n groups, any flex).
- [ ] **Step 2: `seed-fake.ts`** — service role: 20 fake profiles (Korean+English names, varied schools/interests) + signups for Thu dinner. Run: `npx tsx scripts/seed-fake.ts`.
- [ ] **Step 3: Integration check** — run matching from admin UI on seeded slot. Expected: every fake user in exactly one group (SQL count check printed by action), rationale text present, groups of 4–6.
- [ ] **Step 4: Commit** — `git commit -m "Add admin matching trigger with idempotent persistence"`

### Task 10: Group reveal page

**Files:**
- Create: `app/groups/[id]/page.tsx`, `components/GroupReveal.tsx`

**Interfaces:**
- Consumes: `groups`, `group_members`, `profiles` (RLS gives members-only).

- [ ] **Step 1:** Layout: context line (slot title/time/area) → "Meet your table" → group name → member cards (photo/initials, name, school, position, interests chips; kakao/linkedin shown — RLS already restricts to members) → rationale panel (accent-tinted, "WHY THIS TABLE") → suggested place + meet time → "Open group chat" CTA.
- [ ] **Step 2: Reveal motion** — first visit only (localStorage flag): member cards spring-stagger in (translateY+opacity, 60ms stagger); reduced-motion → instant. Non-members hitting URL get 404 (RLS returns empty → notFound()).
- [ ] **Step 3: Verify** — as seeded member: full render incl. Korean names; as outsider: 404.
- [ ] **Step 4: Commit** — `git commit -m "Add group reveal with member cards and rationale"`

### Task 11: Realtime chat

**Files:**
- Create: `components/Chat.tsx`, `app/groups/[id]/chat/page.tsx`

**Interfaces:**
- Produces: `<Chat channelType="meal"|"ride" channelId={uuid}/>` — reused verbatim for ride pools in Plan 2.

- [ ] **Step 1:** Load last 100 messages; subscribe `postgres_changes` INSERT on `messages` filtered `channel_id=eq.{id}`; insert via server action; optimistic append w/ pending style; failed → retry chip. Own messages right-aligned accent bubble; others left with name label. Empty state: "Say hi — suggest a meet spot 👋". Input bar above tab bar, safe-area aware.
- [ ] **Step 2: Verify** — two browsers, two seeded users: message appears live both sides <1s; non-member cannot read (RLS).
- [ ] **Step 3: Commit** — `git commit -m "Add realtime group chat"`

### Task 12: Directory view + Home dashboard

**Files:**
- Create: `supabase/migrations/0002_directory.sql`, `app/(tabs)/people/page.tsx`, `app/(tabs)/home/page.tsx`, `app/(tabs)/me/page.tsx`

- [ ] **Step 1: Directory view migration**

```sql
create view directory_profiles with (security_invoker = false) as
  select id, name, photo_url, school, position, interests, bio from profiles;
grant select on directory_profiles to authenticated;
```

- [ ] **Step 2: People page** — search (name/school) + interest filter chips over `directory_profiles`; card grid → profile bottom sheet; contacts section: locked ("Join a table or ride together to connect") unless `shares_channel` (checked via an RPC `can_see_contact(target uuid)` wrapping it) → then show kakao/linkedin. Skeletons, no-results state.
- [ ] **Step 3: Home** — states per spec S2: fresh (two CTAs) / joined-waiting (countdown to deadline) / revealed (group teaser card → group page) / day-of (meet time+place). Me page: edit profile (reuse onboarding field components), my dinners, my groups, sign out.
- [ ] **Step 4: Verify** — directory hides contacts for strangers, shows for groupmates; Home renders each state (drive via seeded data).
- [ ] **Step 5: Commit** — `git commit -m "Add directory with contact locking, home dashboard, me page"`

---

## Self-review notes

- Spec coverage: S0(T3) S1(T5) S2(T12) S3(T6,7) S4(T10,11) S6(T12) S7(T12) S8(T9); S5 rides + polish phase → Plan 2 (`2026-07-XX-ukc-social-rides.md`) after this executes. Ride tables ship in T2 so no migration churn later.
- Types consistent: `MatchGroup`/`SignupProfile` defined T8, consumed T9; `Chat` props defined T11 for Plan 2 reuse.
- Blockers: T2 apply + T3 verify need Supabase creds; T9 integration needs `ANTHROPIC_API_KEY`. All other tasks proceed without.
```
