// Internal preview of the mentor–mentee matching workflow (NOT a shipped user surface).
// Shows what one person sees: the group they're introduced to — never the also-rans
// (those live in data/match-*.csv for tuning). Preview as anyone: /match-demo?me=<id>.
import raw from "@/data/synthetic-people.json";
import { type Person, classify, assignMentees, suggestGroups } from "@/lib/mentorMatch";
import ThemeToggle from "./ThemeToggle";

const roster = raw as Person[];
const byId = new Map(roster.map((p) => [p.id, p]));

const roleLabel: Record<Person["role"], string> = {
  undergrad: "Undergrad",
  masters: "Master's",
  phd: "PhD",
  industry: "Industry",
};

// Chip label without a leading honorific: "Dr. Sunghwan Jo" → "Sunghwan".
function chipLabel(name: string) {
  return name.replace(/^Dr\.?\s+/i, "").trim().split(/\s+/)[0] || name;
}

function sharedWith(me: Person, other: Person) {
  const mine = new Set(me.interests.map((x) => x.toLowerCase()));
  return other.interests.filter((i) => mine.has(i.toLowerCase()));
}

export default async function MatchDemo({
  searchParams,
}: {
  searchParams: Promise<{ me?: string }>;
}) {
  const sp = await searchParams;
  const me = byId.get(sp.me ?? "") ?? byId.get("u01")!;

  const assignments = assignMentees(roster);
  const groups = suggestGroups(assignments, roster);
  const myGroup = groups.find((g) => g.memberIds.includes(me.id));
  const members = (myGroup?.memberIds ?? [me.id])
    .map((id) => byId.get(id)!)
    .sort((a, b) => Number(b.id === me.id) - Number(a.id === me.id)); // you first

  const mentors = members.filter((p) => classify(p) === "mentor").length;
  const students = members.length - mentors;
  const fields = [...new Set(members.map((p) => p.field))];

  const subtitle =
    members.length <= 2
      ? "Your mentor for today. More of your people join as they arrive."
      : `${mentors} ${mentors === 1 ? "mentor" : "mentors"} and ${students} ${
          students === 1 ? "student" : "students"
        } who work near what you do.`;
  const themeLine =
    fields.length === 1 ? `All in ${fields[0]}.` : `Across ${fields.join(" and ")}.`;

  return (
    <main>
      <div className="topbar">
        <span className="topbar-tag">Preview</span>
        <ThemeToggle />
      </div>

      <div className="page">
        {/* ── what appears on Home (a real, tappable entry point) ── */}
        <a href="#your-group" className="promo">
          <div className="promo-text">
            <div className="kicker">New today</div>
            <div className="promo-head">Meet your group</div>
            <div className="promo-sub">
              A few people who work on what you work on. A new introduction every day.
            </div>
          </div>
          <span className="promo-chev" aria-hidden>▸</span>
        </a>

        {/* ── preview-as switcher (dev only) ── */}
        <div className="switch">
          <div className="switch-label">Preview as</div>
          <div className="names">
            {roster.map((p) => (
              <a
                key={p.id}
                href={`/match-demo?me=${p.id}`}
                className={p.id === me.id ? "pick pick-on" : "pick"}
              >
                {chipLabel(p.name)}
              </a>
            ))}
          </div>
        </div>

        {/* ── the group page it opens (what the user actually sees) ── */}
        <section id="your-group" className="group">
          <div className="kicker">Your group</div>
          <h2 className="group-title">Meet your group</h2>
          <p className="group-sub">{subtitle}</p>
          <p className="group-theme">{themeLine}</p>

          <div className="roster">
            {members.map((p) => {
              const isMe = p.id === me.id;
              const isMentor = classify(p) === "mentor";
              const shared = isMe ? [] : sharedWith(me, p);
              return (
                <div key={p.id} className="member">
                  <div className="m-top">
                    <span className="m-name">
                      {isMentor && <span className="m-dot" aria-hidden />}
                      {p.name}
                      {isMe && <span className="m-you">you</span>}
                    </span>
                    <span className="m-role">{roleLabel[p.role]}</span>
                  </div>
                  <div className="m-area">{p.researchArea}</div>
                  <div className="m-field">{p.field}</div>
                  {!isMe &&
                    (shared.length > 0 ? (
                      <div className="m-int">
                        <span className="m-int-pre">you both like </span>
                        <span className="m-int-hit">{shared.join(", ")}</span>
                      </div>
                    ) : p.interests.length > 0 ? (
                      <div className="m-int m-int-muted">into {p.interests.join(", ")}</div>
                    ) : null)}
                </div>
              );
            })}
          </div>

          {members.length > 1 && (
            <a href="#your-group" className="msg">
              Message the group ▸
            </a>
          )}
        </section>

        <p className="foot">
          Internal preview over {roster.length} synthetic people. The algorithm lives in
          lib/mentorMatch.ts; full rankings stay in data/match-report.csv, never shown to users.
        </p>
      </div>
      <Styles />
    </main>
  );
}

function Styles() {
  return (
    <style>{`
      main { color: var(--ink); }
      .kicker { font-size: 12px; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; color: var(--accent); }

      .topbar {
        position: sticky; top: 0; z-index: 20;
        display: flex; align-items: center; justify-content: space-between;
        max-width: 430px; margin: 0 auto; padding: 10px 20px;
        background: color-mix(in srgb, var(--bg) 86%, transparent);
        backdrop-filter: blur(8px);
        border-bottom: 1px solid var(--line);
      }
      .topbar-tag { font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-3); }

      .page { max-width: 430px; margin: 0 auto; padding: 24px 20px 64px; }

      /* Home promo — editorial block bounded by hairlines, not a grey card */
      .promo {
        display: flex; align-items: center; gap: 16px;
        padding: 20px 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line);
        transition: opacity 0.15s ease;
      }
      .promo-text { min-width: 0; }
      .promo-head { font-family: var(--font-display); font-size: 22px; font-weight: 800; letter-spacing: -0.02em; margin-top: 6px; }
      .promo-sub { color: var(--ink-2); font-size: 14px; margin-top: 6px; line-height: 1.5; }
      .promo-chev { flex-shrink: 0; color: var(--accent); font-size: 20px; font-weight: 700; transition: transform 0.15s ease; }
      .promo:hover .promo-chev { transform: translateX(4px); }
      .promo:active { opacity: 0.7; }

      /* Preview-as switcher — de-boxed to text links, active is persimmon underline */
      .switch { margin-top: 32px; }
      .switch-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-3); margin-bottom: 4px; }
      .names { display: flex; flex-wrap: wrap; column-gap: 16px; }
      .pick {
        display: inline-flex; align-items: center; min-height: 44px;
        font-size: 14px; color: var(--ink-2);
        border-bottom: 2px solid transparent;
        transition: color 0.12s ease;
      }
      .pick:hover { color: var(--ink); }
      .pick-on { color: var(--accent); font-weight: 700; border-bottom-color: var(--accent); }

      /* The group */
      .group { margin-top: 48px; }
      .group-title { font-family: var(--font-display); font-size: 32px; font-weight: 800; letter-spacing: -0.03em; margin-top: 6px; line-height: 1.02; }
      .group-sub { font-size: 15px; color: var(--ink); margin-top: 14px; line-height: 1.5; }
      .group-theme { font-size: 14px; color: var(--ink-2); margin-top: 4px; }

      .roster { margin-top: 24px; }
      .member { padding: 20px 0; border-top: 1px solid var(--line); }
      .member:last-of-type { border-bottom: 1px solid var(--line); }
      .m-top { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
      .m-name { font-family: var(--font-display); font-size: 20px; font-weight: 700; letter-spacing: -0.01em; display: inline-flex; align-items: baseline; gap: 8px; min-width: 0; }
      .m-dot { align-self: center; width: 7px; height: 7px; border-radius: 999px; background: var(--accent); flex-shrink: 0; }
      .m-you { font-size: 11px; font-weight: 600; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.06em; }
      .m-role { flex-shrink: 0; font-size: 13px; color: var(--ink-3); }
      .m-area { font-size: 15px; color: var(--ink-2); margin-top: 8px; }
      .m-field { font-size: 13px; color: var(--ink-3); margin-top: 2px; }
      .m-int { font-size: 14px; margin-top: 10px; }
      .m-int-pre { color: var(--ink-3); }
      .m-int-hit { color: var(--accent); font-weight: 600; }
      .m-int-muted { color: var(--ink-3); }

      .msg {
        display: inline-flex; align-items: center; min-height: 44px; margin-top: 24px;
        font-size: 16px; font-weight: 700; color: var(--accent);
        transition: opacity 0.15s ease;
      }
      .msg:hover { text-decoration: underline; text-underline-offset: 3px; }
      .msg:active { opacity: 0.6; }

      .foot { font-size: 11px; color: var(--ink-3); margin-top: 44px; line-height: 1.6; }
    `}</style>
  );
}
