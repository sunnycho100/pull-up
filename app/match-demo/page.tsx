// Public demo of the mentor–mentee matching workflow over the 30 synthetic people.
// Not wired to auth/DB on purpose — this is a visual test of lib/mentorMatch.ts.
// View as a different person: /match-demo?me=<id>  (ids in data/synthetic-people.json)
import Link from "next/link";
import raw from "@/data/synthetic-people.json";
import {
  type Person,
  type PairScore,
  classify,
  scorePair,
  assignMentees,
  suggestGroups,
} from "@/lib/mentorMatch";

const roster = raw as Person[];
const byId = new Map(roster.map((p) => [p.id, p]));
const pct = (n: number) => Math.round(n * 100);
const roleLabel: Record<Person["role"], string> = {
  undergrad: "Undergrad",
  masters: "Master's",
  phd: "PhD",
  industry: "Industry",
};

function sharedInterests(a: Person, b: Person) {
  const bl = b.interests.map((x) => x.toLowerCase());
  return a.interests.filter((i) => bl.includes(i.toLowerCase()));
}

function why(me: Person, other: Person, s: PairScore) {
  const bits: string[] = [];
  if (s.field) bits.push("same field");
  if (s.research === 1) bits.push("same research area");
  else if (s.research === 0.5) bits.push("adjacent area");
  const shared = sharedInterests(me, other);
  if (shared.length) bits.push(`${shared.length} shared: ${shared.join(", ")}`);
  if (s.crossSchool) bits.push("different school");
  return bits.length ? bits.join(" · ") : "no overlap";
}

export default async function MatchDemo({
  searchParams,
}: {
  searchParams: Promise<{ me?: string }>;
}) {
  const sp = await searchParams;
  const me = byId.get(sp.me ?? "") ?? byId.get("u01")!;
  const iAmMentee = classify(me) === "mentee";

  const others = roster
    .filter((p) => p.id !== me.id)
    .map((p) => ({ p, s: scorePair(me, p) }))
    .sort((a, b) => b.s.total - a.s.total);
  const topMatches = others.slice(0, 6);

  const assignments = assignMentees(roster);
  const myPairs = assignments.filter((a) => a.menteeId === me.id || a.mentorId === me.id);
  const groups = suggestGroups(assignments, roster);
  const myGroup = groups.find((g) => g.memberIds.includes(me.id));

  return (
    <main style={{ maxWidth: 430, margin: "0 auto", padding: "28px 20px 64px" }}>
      {/* ── the Home promo card ("little ad") ── */}
      <div className="promo">
        <div className="kicker">Now open</div>
        <h1 className="promo-title">Find your people</h1>
        <p className="promo-sub">
          {iAmMentee
            ? "Mentors who share your field are here. See who lines up."
            : "Students in your area want to meet. See who lines up."}
        </p>
        <span className="cta">See your matches ▸</span>
      </div>

      {/* ── view-as switcher (demo only) ── */}
      <div className="switch">
        <div className="switch-label">Viewing as</div>
        <div className="chips">
          {roster.map((p) => (
            <Link
              key={p.id}
              href={`/match-demo?me=${p.id}`}
              className={p.id === me.id ? "chip chip-on" : "chip"}
            >
              {p.name.split(" ")[0]}
            </Link>
          ))}
        </div>
        <div className="me-line">
          <strong>{me.name}</strong> · {roleLabel[me.role]} · {me.field} / {me.researchArea} ·{" "}
          {me.school}
          <span className={iAmMentee ? "tag tag-mentee" : "tag tag-mentor"}>
            {classify(me)}
          </span>
        </div>
      </div>

      {/* ── step 1: ranked matches ── */}
      <section>
        <div className="kicker">Your matches</div>
        <h2 className="h2">Ranked by shared field, research &amp; interests</h2>
        <div className="board">
          {topMatches.map(({ p, s }) => (
            <div key={p.id} className="row">
              <div className="score">{pct(s.total)}%</div>
              <div className="body">
                <div className="name">
                  {p.name}
                  <span className={`pill pill-${s.pairType}`}>
                    {s.pairType === "mentorship" ? classify(p) : "peer"}
                  </span>
                </div>
                <div className="meta">
                  {roleLabel[p.role]} · {p.field} / {p.researchArea}
                </div>
                <div className="why">{why(me, p, s)}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── step 2: the 1:1 assignment ── */}
      <section>
        <div className="kicker">{iAmMentee ? "Your mentor" : "Your mentees"}</div>
        {myPairs.length ? (
          <div className="board">
            {myPairs.map((a) => {
              const otherId = iAmMentee ? a.mentorId : a.menteeId;
              const o = byId.get(otherId)!;
              return (
                <div key={otherId} className="row">
                  <div className="score">{pct(a.score)}%</div>
                  <div className="body">
                    <div className="name">{o.name}</div>
                    <div className="meta">
                      {roleLabel[o.role]} · {o.field} / {o.researchArea} · {o.school}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="empty">No 1:1 match this round (mentor seats filled up).</p>
        )}
      </section>

      {/* ── step 3: the suggested group of 4 ── */}
      <section>
        <div className="kicker">Your group</div>
        <h2 className="h2">Two pairs, grouped to meet up</h2>
        {myGroup ? (
          <div className="group">
            <div className="group-affinity">
              {myGroup.memberIds.length === 4
                ? `${pct(myGroup.affinity)}% group fit`
                : "Waiting for a second pair"}
            </div>
            {myGroup.memberIds.map((id) => {
              const p = byId.get(id)!;
              return (
                <div key={id} className={id === me.id ? "gm gm-me" : "gm"}>
                  <span className="gm-name">
                    {p.name}
                    {id === me.id ? " (you)" : ""}
                  </span>
                  <span className="gm-role">{roleLabel[p.role]}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="empty">Not grouped this round.</p>
        )}
      </section>

      <p className="foot">
        Demo over {roster.length} synthetic people · algorithm in lib/mentorMatch.ts · not wired to
        the live app yet
      </p>
      <Styles />
    </main>
  );
}

function Styles() {
  return (
    <style>{`
      main { color: var(--ink); }
      .kicker { font-size: 12px; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; color: var(--accent); }
      .h2 { font-family: var(--font-display); font-size: 19px; font-weight: 700; margin-top: 6px; margin-bottom: 14px; line-height: 1.15; }
      section { margin-top: 34px; }

      .promo { padding: 20px; border-radius: 16px; background: var(--surface); border: 1px solid var(--line); }
      .promo-title { font-family: var(--font-display); font-size: 34px; font-weight: 800; letter-spacing: -0.03em; margin-top: 8px; line-height: 1; }
      .promo-sub { color: var(--ink-2); font-size: 15px; margin-top: 10px; line-height: 1.45; }
      .cta { display: inline-block; margin-top: 16px; font-size: 15px; font-weight: 700; color: var(--accent); }

      .switch { margin-top: 24px; }
      .switch-label { font-size: 12px; color: var(--ink-3); margin-bottom: 8px; }
      .chips { display: flex; flex-wrap: wrap; gap: 6px; }
      .chip { font-size: 12px; padding: 5px 10px; border-radius: 999px; border: 1px solid var(--line); color: var(--ink-2); }
      .chip-on { border-color: var(--accent); color: var(--accent); background: color-mix(in srgb, var(--accent) 10%, transparent); }
      .me-line { font-size: 13px; color: var(--ink-2); margin-top: 14px; line-height: 1.5; }

      .tag { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 2px 7px; border-radius: 999px; margin-left: 8px; }
      .tag-mentor { background: color-mix(in srgb, var(--accent) 16%, transparent); color: var(--accent); }
      .tag-mentee { background: var(--surface); color: var(--ink-2); border: 1px solid var(--line); }

      .board { border-top: 1px solid var(--line); }
      .row { display: grid; grid-template-columns: 52px 1fr; gap: 12px; align-items: start; padding: 14px 0; border-bottom: 1px solid var(--line); }
      .score { font-family: var(--font-display); font-size: 22px; font-weight: 800; font-variant-numeric: tabular-nums; color: var(--ink); letter-spacing: -0.02em; }
      .name { font-size: 15px; font-weight: 700; display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
      .meta { font-size: 13px; color: var(--ink-2); margin-top: 2px; }
      .why { font-size: 12px; color: var(--ink-3); margin-top: 4px; }

      .pill { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; padding: 2px 6px; border-radius: 999px; }
      .pill-mentorship { background: color-mix(in srgb, var(--accent) 14%, transparent); color: var(--accent); }
      .pill-peer { background: var(--surface); color: var(--ink-3); border: 1px solid var(--line); }

      .group { margin-top: 4px; border: 1px solid var(--line); border-radius: 14px; overflow: hidden; }
      .group-affinity { font-size: 12px; font-weight: 700; color: var(--accent); padding: 12px 16px; background: color-mix(in srgb, var(--accent) 7%, transparent); }
      .gm { display: flex; justify-content: space-between; align-items: center; padding: 13px 16px; border-top: 1px solid var(--line); }
      .gm-me { background: color-mix(in srgb, var(--accent) 6%, transparent); }
      .gm-name { font-size: 15px; font-weight: 600; }
      .gm-role { font-size: 12px; color: var(--ink-2); }

      .empty { font-size: 14px; color: var(--ink-3); margin-top: 6px; }
      .foot { font-size: 11px; color: var(--ink-3); margin-top: 40px; line-height: 1.5; }
    `}</style>
  );
}
