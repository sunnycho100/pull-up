// End-to-end demo + recording of the full meal-matching pipeline.
//   node scripts/e2e/demo.mjs
// 1) runs prepare.mjs (seed slots + fillers, fresh hero, magic links)
// 2) drives the HERO through signup → onboarding → join → reveal → chat (recorded)
// 3) triggers matching in a side ADMIN context (not recorded)
// 4) saves an mp4 to demo/ukc-social-e2e.mp4
import { chromium } from "playwright";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, rmSync, readdirSync } from "node:fs";
import { join } from "node:path";

const BASE = "http://localhost:3000";
const OUT = "demo";
const RAW = join(OUT, "raw");
const VIEW = { width: 390, height: 844 };
const PAUSE = 1300; // ~1.3s between actions, per "don't rush"

const log = (m) => console.log(`\n▶ ${m}`);

function prepare() {
  const r = spawnSync("node", ["--env-file=.env.local", "scripts/e2e/prepare.mjs"], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`prepare failed:\n${r.stderr}`);
  const out = Object.fromEntries(
    r.stdout.trim().split("\n").map((l) => [l.split(" ")[0], l.slice(l.indexOf(" ") + 1)]),
  );
  if (!out.HERO || !out.ADMIN || !out.SLOT) throw new Error(`prepare output missing keys:\n${r.stdout}`);
  return out;
}

async function main() {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(RAW, { recursive: true });

  const { HERO, ADMIN, SLOT } = prepare();
  console.error(`[demo] slot=${SLOT}`);

  const browser = await chromium.launch({ headless: true });
  const heroCtx = await browser.newContext({
    viewport: VIEW, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    recordVideo: { dir: RAW, size: VIEW },
  });
  const hero = await heroCtx.newPage();
  const pause = (ms = PAUSE) => hero.waitForTimeout(ms);

  try {
    // ── 1. Sign in via magic link → onboarding ──
    log("Sign in (magic link) → onboarding");
    await hero.goto(HERO, { waitUntil: "networkidle" });
    await hero.waitForURL(/\/welcome/, { timeout: 15000 });
    await pause();

    // Step 1 — basics
    log("Onboarding · basics");
    await hero.getByPlaceholder("이름 / Your name").fill("Sunny Demo");
    await pause(700);
    await hero.getByPlaceholder("KAIST, Stanford, …").fill("UW–Madison");
    await pause(700);
    await hero.getByPlaceholder("PhD student, Founder, …").fill("PhD student");
    await pause(700);
    await hero.getByRole("button", { name: "Continue" }).click();
    await pause();

    // Step 2 — interests (need ≥3)
    log("Onboarding · interests");
    for (const chip of ["Robotics", "Perception", "Computer Vision"]) {
      await hero.getByRole("button", { name: chip, exact: true }).click();
      await pause(600);
    }
    await hero.getByRole("button", { name: "Continue" }).click();
    await pause();

    // Step 3 — plans (finish WITHOUT pre-selecting, so we can show the Join flow next)
    log("Onboarding · finish");
    await hero.getByRole("button", { name: "Finish" }).click();
    await hero.waitForURL(/\/home/, { timeout: 15000 });
    await pause();

    // ── 2. Join a dinner from the Meals tab ──
    log("Home → Find your table");
    await hero.getByRole("link", { name: /Find your table/ }).click();
    await hero.waitForURL(/\/meals/, { timeout: 15000 });
    await pause();

    log("Join Day 2 Dinner");
    // Open the Day 2 row's "Join ▸" (button carries data-slot-id), then confirm in the sheet.
    await hero.locator(`button[data-slot-id="${SLOT}"]`).click();
    await pause();
    const sheet = hero.getByRole("dialog");
    await sheet.getByRole("button", { name: "Just me" }).click().catch(() => {});
    await pause(700);
    await sheet.getByRole("button", { name: "Join", exact: true }).click();
    await pause();

    log("Back to Home (waiting to be matched)");
    await hero.goto(`${BASE}/home`, { waitUntil: "networkidle" });
    await pause();

    // ── 3. Trigger matching in a side admin context (NOT recorded) ──
    log("[side] Admin runs matching");
    const adminCtx = await browser.newContext({ viewport: VIEW });
    const admin = await adminCtx.newPage();
    await admin.goto(ADMIN, { waitUntil: "networkidle" });
    await admin.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
    // Run matching for the exact slot the hero joined (button carries data-slot-id).
    await admin.locator(`button[data-slot-id="${SLOT}"]`).click();
    await admin.waitForTimeout(4000); // let matching write groups+members
    await adminCtx.close();

    // ── 4. Reveal → chat ──
    log("Home → group revealed");
    await hero.goto(`${BASE}/home`, { waitUntil: "networkidle" });
    await pause();
    await hero.getByRole("link", { name: /Meet your table/ }).click();
    await hero.waitForURL(/\/groups\//, { timeout: 15000 });
    await pause(1800);

    log("Open group chat");
    await hero.getByRole("link", { name: /Open group chat/ }).click();
    await hero.waitForURL(/\/chat/, { timeout: 15000 });
    await pause();

    log("Send a message");
    await hero.getByPlaceholder("Message").fill("Hey everyone! Excited to meet you all 👋");
    await pause(800);
    await hero.getByRole("button", { name: "Send" }).click();
    await pause(2200);

    log("Done — flow complete");
  } finally {
    await heroCtx.close(); // finalizes the video
    await browser.close();
  }

  // ── Convert the recorded webm to mp4 ──
  const webm = readdirSync(RAW).find((f) => f.endsWith(".webm"));
  if (!webm) throw new Error("no video recorded");
  const mp4 = join(OUT, "ukc-social-e2e.mp4");
  execFileSync("ffmpeg", ["-y", "-i", join(RAW, webm), "-movflags", "+faststart", "-pix_fmt", "yuv420p", "-vf", "scale=780:-2", mp4], { stdio: "inherit" });
  console.log(`\n✅ mp4: ${mp4}`);
}

main().catch((e) => { console.error("\n❌ demo failed:", e.message); process.exit(1); });
