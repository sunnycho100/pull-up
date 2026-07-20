// E2E setup: ensure slots + filler users exist, (re)create a FRESH hero user, print the
// hero's magic-link URL on the last stdout line for the Playwright runner to consume.
//   node --env-file=.env.local scripts/e2e/prepare.mjs
import { createClient } from "@supabase/supabase-js";

const svc = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const HERO_EMAIL = "hero@ukctest.dev";
const HERO_NAME = "Sunny Demo";
const DEMO_SLOT = "Day 2 Dinner"; // filler users are seeded here by seed-fake

const SLOTS = [
  { title: "Day 1 Dinner", starts_at: "2026-08-05T23:00:00Z", area: "ChampionsGate", join_deadline: "2026-08-05T21:00:00Z", kind: "meal" },
  { title: "Day 2 Dinner", starts_at: "2026-08-06T23:00:00Z", area: "ChampionsGate", join_deadline: "2026-08-06T21:00:00Z", kind: "meal" },
  { title: "Day 3 Dinner", starts_at: "2026-08-07T23:00:00Z", area: "ChampionsGate", join_deadline: "2026-08-07T21:00:00Z", kind: "meal" },
  { title: "Farewell Lunch", starts_at: "2026-08-08T16:30:00Z", area: "Near the resort", join_deadline: "2026-08-08T14:30:00Z", kind: "meal" },
];

const NAMES = ["민서 Park","Jiwoo Kim","David Lee","하은 Choi","Ethan Cho","서준 Kang","Grace Yoon","지호 Han","Alex Moon","유나 Lim","Brian Seo","수아 Jung","Kevin Nam","예준 Oh","Sarah Bae","도윤 Shin","Chris Im","하윤 Song","Rachel Ko","시우 Hwang"];
const SCHOOLS = ["UW–Madison","UMD","GT","UIUC","UT Austin","Purdue","UMich","Stanford"];
const POSITIONS = ["PhD student","MS student","Postdoc","Undergrad"];
const INTERESTS = ["Robotics","Perception","NLP / Agents","Computer Vision","HCI","RL","Bioengineering","Materials","Energy","Semiconductors","국밥 crew","Night owl","Coffee chat"];
const pick = (arr, i) => arr[i % arr.length];

async function ensureSlots() {
  const { data: existing } = await svc.from("slots").select("title");
  const have = new Set((existing ?? []).map((s) => s.title));
  const missing = SLOTS.filter((s) => !have.has(s.title));
  if (missing.length) {
    const { error } = await svc.from("slots").insert(missing);
    if (error) throw error;
  }
  const { data: slot } = await svc.from("slots").select("id").eq("title", DEMO_SLOT).single();
  return slot.id;
}

async function ensureFillers(slotId) {
  for (let i = 0; i < NAMES.length; i++) {
    const email = `fake${i}@ukctest.dev`;
    let userId;
    const { data: created } = await svc.auth.admin.createUser({ email, email_confirm: true });
    if (created?.user) userId = created.user.id;
    else {
      const { data: prof } = await svc.from("profiles").select("id").eq("name", NAMES[i]).single();
      userId = prof?.id;
    }
    if (!userId) continue;
    await svc.from("profiles").upsert({
      id: userId, name: NAMES[i], school: pick(SCHOOLS, i), position: pick(POSITIONS, i),
      interests: [pick(INTERESTS, i), pick(INTERESTS, i + 3), pick(INTERESTS, i + 7)].filter((v, idx, a) => a.indexOf(v) === idx),
    });
    await svc.from("signups").upsert({ slot_id: slotId, user_id: userId }, { onConflict: "slot_id,user_id", ignoreDuplicates: true });
  }
}

async function magicLink(email) {
  const { data, error } = await svc.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;
  return `http://localhost:3000/auth/callback?token_hash=${data.properties.hashed_token}&type=magiclink`;
}

// Recreate the hero from scratch so onboarding is always fresh (no profile → /welcome).
async function freshHero() {
  const { data: list } = await svc.auth.admin.listUsers({ perPage: 1000 });
  const existing = (list?.users ?? []).find((u) => u.email === HERO_EMAIL);
  if (existing) await svc.auth.admin.deleteUser(existing.id); // cascade drops profile/signups
  const { error } = await svc.auth.admin.createUser({ email: HERO_EMAIL, email_confirm: true });
  if (error) throw error;
  return magicLink(HERO_EMAIL);
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const slotId = await ensureSlots();
await ensureFillers(slotId);

// Admin account must exist to receive a magic link (it's the matching trigger).
const { data: list } = await svc.auth.admin.listUsers({ perPage: 1000 });
if (!list.users.find((u) => u.email === ADMIN_EMAIL))
  await svc.auth.admin.createUser({ email: ADMIN_EMAIL, email_confirm: true });

const heroUrl = await freshHero();
const adminUrl = await magicLink(ADMIN_EMAIL);
console.error(`[prepare] slot=${DEMO_SLOT} (${slotId}) · fillers ready · hero=${HERO_EMAIL} · admin=${ADMIN_EMAIL}`);
console.log(`SLOT ${slotId}`);
console.log(`HERO ${heroUrl}`);
console.log(`ADMIN ${adminUrl}`);
