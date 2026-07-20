// Records a full walkthrough of UKC Social: signup page → login → onboarding →
// meals → rides → people → group chat → profile. Resets the demo account to a
// fresh state each run. Requires a running dev server on :3000.
//   DEMO_PASSWORD=... node --env-file=.env.local scripts/e2e/demo-walkthrough.mjs
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, readdirSync } from "node:fs";
import { join } from "node:path";

const BASE = "http://localhost:3000";
const EMAIL = "such4283@gmail.com";
const PASSWORD = process.env.DEMO_PASSWORD; // no secret in the repo — pass it at run time
if (!PASSWORD) throw new Error("Set DEMO_PASSWORD (the demo account's password).");
const USER_ID = "73c25563-79b5-4e19-955e-c2fdfc5418f0";
// Illustrative values typed into the Create-account form (never submitted — no
// user/email side effects; we switch to Sign in and log in for real).
const SIGNUP_EMAIL = "jiwoo.kim@gmail.com";
const SIGNUP_PW = "welcome1234";

const OUT = "demo";
const RAW = join(OUT, "raw");
const VIEW = { width: 390, height: 844 };
const DWELL = 1800; // ~1.8s per screen
const KEY = 95;     // ms between keystrokes

const svc = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const log = (m) => console.error(`▶ ${m}`);

const HIDE_BADGE = () => {
  const add = () => {
    const s = document.createElement("style");
    s.textContent =
      "nextjs-portal,[data-next-badge-root],[data-nextjs-toast],#__next-build-watcher{display:none!important}";
    document.head.appendChild(s);
  };
  if (document.head) add();
  else document.addEventListener("DOMContentLoaded", add);
};

async function main() {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(RAW, { recursive: true });

  // Fresh start: clear the real account's profile (cascades signups/flights/
  // group) so onboarding shows, and remove any leftover signup demo user.
  await svc.from("profiles").delete().eq("id", USER_ID);
  await svc.from("groups").delete().like("name", "Table 9%");
  log("state reset");

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: VIEW, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    recordVideo: { dir: RAW, size: VIEW },
  });
  await ctx.addInitScript(HIDE_BADGE);
  const page = await ctx.newPage();
  const pause = (ms = DWELL) => page.waitForTimeout(ms);
  const type = async (loc, text, d = KEY) => {
    await loc.click();
    await loc.fill("");
    await loc.pressSequentially(text, { delay: d });
  };

  try {
    // ── 1. Auth pages: show Create-account, then Sign in ───────────
    log("Login page");
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    await pause();
    log("Create an account page");
    await page.getByRole("button", { name: "Create an account" }).click();
    await pause();
    await type(page.locator("#email"), SIGNUP_EMAIL);
    await pause(400);
    await type(page.locator("#password"), SIGNUP_PW);
    await pause(1300); // linger on the filled Create-account form
    await page.getByRole("button", { name: "Sign in" }).click(); // switch back to login
    await pause();

    // ── 2. Sign in (typed key by key) ──────────────────────────────
    log("Sign in");
    await type(page.locator("#email"), EMAIL);
    await pause(500);
    await type(page.locator("#password"), PASSWORD);
    await pause(700);
    await page.getByRole("button", { name: "Sign in" }).click();

    // ── 3. Onboarding ──────────────────────────────────────────────
    await page.waitForURL(/\/welcome/, { timeout: 15000 });
    await pause();
    log("Onboarding · basics");
    await type(page.getByPlaceholder("이름 / Your name"), "Sunghwan Cho");
    await pause(400);
    await type(page.getByPlaceholder("Enter here"), "UW–Madison");
    await pause(400);
    await type(page.getByPlaceholder("PhD, Software Engineer, …"), "Robotics Researcher");
    await pause(400);
    await page.locator('input[type="date"]').fill("1998-03-15");
    await pause(700);
    await page.getByRole("button", { name: "Continue" }).click();
    await pause();

    log("Onboarding · interests");
    for (const chip of ["Robotics", "Perception", "Computer Vision"]) {
      await page.getByRole("button", { name: chip, exact: true }).click();
      await pause(650);
    }
    await page.getByRole("button", { name: "Continue" }).click();
    await pause();

    log("Onboarding · finish");
    await page.getByRole("button", { name: "Finish" }).click();
    await page.waitForURL(/\/home/, { timeout: 15000 });
    await pause();

    // ── 4. Home hub ────────────────────────────────────────────────
    log("Home · 'Line these up'");
    await pause();

    // ── 5. Join a dinner ───────────────────────────────────────────
    log("Grab a seat at dinner → Meals");
    await page.getByRole("link", { name: /Grab a seat at dinner/ }).click();
    await page.waitForURL(/\/meals/, { timeout: 15000 });
    await pause();
    log("Join a dinner");
    await page.locator("button.act--join").first().click();
    await pause();
    const sheet = page.getByRole("dialog");
    await sheet.getByRole("button", { name: "Just me" }).click().catch(() => {});
    await pause(700);
    await sheet.getByRole("button", { name: "Join", exact: true }).click();
    await pause();

    // ── 6. Post an arrival flight ──────────────────────────────────
    log("Home → Split a ride from the airport");
    await page.getByRole("link", { name: "Home" }).click({ force: true });
    await page.waitForURL(/\/home/, { timeout: 15000 });
    await pause();
    await page.getByRole("link", { name: /Split a ride from the airport/ }).click();
    await page.waitForURL(/\/rides\/add/, { timeout: 15000 });
    await pause();
    log("Fill the arrival");
    await type(page.getByPlaceholder("DL1423"), "DL1423");
    await pause(300);
    await type(page.getByPlaceholder("Delta"), "Delta");
    await pause(300);
    await type(page.getByPlaceholder("Boston"), "Boston");
    await pause(300);
    await type(page.getByPlaceholder("BOS", { exact: true }), "BOS");
    await pause(300);
    await page.locator('input[type="datetime-local"]').fill("2026-08-05T15:20");
    await pause(800);
    await page.getByRole("button", { name: "Post my flight" }).click();
    await pause(1800); // upsert saves; router.push races under automation, so goto
    log("Rides board");
    await page.goto(`${BASE}/rides`, { waitUntil: "networkidle" });
    await pause(DWELL + 400);

    // ── 7. Browse People ───────────────────────────────────────────
    log("People");
    await page.getByRole("link", { name: "People" }).click({ force: true });
    await page.waitForURL(/\/people/, { timeout: 15000 });
    await pause();
    await pause();

    // ── 8. Seed a matched group, then chat ─────────────────────────
    log("[side] seed a matched table + messages");
    const groupId = await seedGroup();
    log("Home → Meet your table");
    await page.goto(`${BASE}/home`, { waitUntil: "networkidle" });
    await pause();
    const meet = page.getByRole("link", { name: /Meet your table/ });
    if (await meet.count()) await meet.first().click();
    else await page.goto(`${BASE}/groups/${groupId}`, { waitUntil: "networkidle" });
    await page.waitForURL(/\/groups\//, { timeout: 15000 });
    await pause(2200);
    log("Open group chat");
    await page.getByRole("link", { name: /Open group chat/ }).click();
    await page.waitForURL(/\/chat/, { timeout: 15000 });
    await pause(2200);
    log("Open the roster");
    await page.locator(".head-id").click();
    await pause(2000);
    await page.locator(".sheet-close").click().catch(() => {});
    await pause(700);
    log("Send a message");
    await type(page.getByPlaceholder(/^Message /), "Hey everyone! Looking forward to dinner 🙌");
    await pause(700);
    await page.getByRole("button", { name: "Send" }).click();
    await pause(2400);

    // ── 9. Profile ── (chat is full-screen, no tab bar → navigate directly)
    log("Me · profile");
    await page.goto(`${BASE}/me`, { waitUntil: "networkidle" });
    await pause(2600);

    log("Done");
  } finally {
    await ctx.close();
    await browser.close();
  }

  const webm = readdirSync(RAW).find((f) => f.endsWith(".webm"));
  if (!webm) throw new Error("no video recorded");
  const mp4 = join(OUT, "ukc-social-walkthrough.mp4");
  execFileSync("ffmpeg", ["-y", "-i", join(RAW, webm), "-movflags", "+faststart", "-pix_fmt", "yuv420p", "-vf", "scale=780:-2", mp4], { stdio: "inherit" });
  console.log(`\n✅ mp4: ${mp4}`);
}

async function seedGroup() {
  const { data: slot } = await svc.from("slots").select("id").eq("kind", "meal").limit(1).single();
  const { data: others } = await svc
    .from("profiles").select("id, name").neq("id", USER_ID).not("name", "is", null).limit(3);
  await svc.from("groups").delete().like("name", "Table 9%");
  const { data: g } = await svc.from("groups").insert({
    slot_id: slot.id,
    name: "Table 9 · Perception",
    rationale: "You all lean robotics + perception, and half of you are coffee-chat people.",
    suggested_place: "Twistee Treat, ChampionsGate",
    meet_time: "2026-08-06T23:30:00Z",
  }).select("id").single();
  const members = [{ id: USER_ID }, ...others];
  await svc.from("group_members").insert(members.map((m) => ({ group_id: g.id, user_id: m.id })));
  const base = Date.parse("2026-08-06T22:05:00Z");
  const msgs = [
    [others[0], "Hey team! So glad we matched 🙌", 0],
    [others[0], "I'm staying by the resort, walk over together?", 1],
    [others[1], "Yes! What time are we thinking?", 8],
    [others[2] ?? others[0], "7:30 works for me ☕", 15],
  ];
  await svc.from("messages").insert(msgs.map(([p, body, min]) => ({
    channel_type: "meal", channel_id: g.id, user_id: p.id, body,
    created_at: new Date(base + min * 60000).toISOString(),
  })));
  return g.id;
}

main().catch((e) => { console.error("\n❌ demo failed:", e.message); process.exit(1); });
