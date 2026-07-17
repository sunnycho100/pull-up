# Pull Up — Prompts for v0 / Lovable (design exploration)

These generate a *fourth and fifth* design take on Pull Up, alongside our 3 hand-built
mockups. Same frozen sample data so results are comparable. Set model to a default/mid
tier to save credits.

---

## Vercel v0 (give it creative latitude — better design harness)

Build **"Pull Up"** — a mobile-first web app that matches conference attendees into
small dinner groups by shared interests. It's for **UKC 2026**, a Korean-American
academic conference, so a warm bicultural tone (English with occasional Korean) fits.

**Design with real creativity and taste — you have latitude.** Make it feel like a
delightful consumer social app (Partiful / Timeleft warmth), NOT a corporate tool.
Mobile-first at 390px. The **Group Reveal screen is the emotional peak** — make that
moment feel magical.

Build three screens (as routes or a stacked prototype):

**1. Meal Slots** — a list of meal times to join. Header "Pull Up" + tagline "Find your
table at UKC 2026." Cards:
- Day 1 Dinner · Wed 7:00 PM · Downtown · 18 people in · [Join]
- Day 2 Lunch · Thu 12:30 PM · Convention Center · 9 people in · [Join]
- Day 2 Dinner · Thu 7:30 PM · K-town · 24 people in · show as "You're in"

**2. Group Reveal** ("Meet your table") — context: "Day 2 Dinner · Thu 7:30 PM · K-town".
Your group of 5, "Table 3":
- 성환 (Sunghwan) — UW–Madison · Robotics / Perception
- 지원 (Jiwon) — U Maryland · NLP / Agents
- David Kim — Georgia Tech · Computer Vision
- Yuna Park — UIUC · HCI / Design
- 민준 (Minjun) — UT Austin · Reinforcement Learning

Show an AI rationale prominently: *"You all live somewhere near robotics, perception,
and agentic AI — and four of you said late-night 국밥 is non-negotiable."*
Suggested spot: **Jang Soo Jang** — Korean BBQ & 국밥 · 0.4 mi · $$. Meet 7:30 PM.
Primary button: "Open group chat".

**3. Group Chat** — "Table 3 · Day 2 Dinner". Messages:
- Yuna Park: omg finally people who get HCI 😭
- 성환: haha same. down for 국밥 after?
- David Kim: i'm so in. never had it
- 민준: wait it's David's first 국밥?? this is a big night
- 지원: ordering for the table, trust me
- Yuna Park: meeting at the lobby 7:15?
Plus a visual input bar.

**Tech:** Next.js + Tailwind + shadcn/ui. Korean text must render (UTF-8). No login
needed — it's a prototype. Make it beautiful.

---

## Lovable (full-stack leaning)

Same as above, but Lovable can wire a backend. Prompt:

Build **"Pull Up"**, a mobile-first web app where conference attendees at UKC 2026 get
matched into small dinner groups by shared interests. [paste the same three-screen +
sample-data block from the v0 prompt above]. Use a warm, playful consumer-social look
(not corporate). If you add a backend, use Supabase, but a beautiful front-end
prototype with the sample data is the priority. Korean text must render correctly.
