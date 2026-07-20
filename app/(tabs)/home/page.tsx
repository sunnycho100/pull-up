import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";

const HOUR = 3600_000;

const timeFmt = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/New_York",
});
const dateFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  timeZone: "America/New_York",
});

const ms = (s: string) => new Date(s).getTime();
const one = <T,>(v: T | T[] | null | undefined): T | null =>
  Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
const firstName = (name: string) => name.trim().split(/\s+/)[0] || "Someone";

type Slot = { id: string; title: string; starts_at: string; area: string; join_deadline: string };
type Group = {
  id: string;
  name: string;
  suggested_place: string;
  meet_time: string | null;
  slot: Slot | null;
};

export default async function HomePage() {
  const { user, supabase } = await requireUser();
  const now = Date.now();

  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) redirect("/welcome");

  const { data: groupRows } = await supabase
    .from("group_members")
    .select(
      "group:groups(id, name, suggested_place, meet_time, slot:slots(id, title, starts_at, area, join_deadline))",
    )
    .eq("user_id", user.id);

  const myGroups: Group[] = (groupRows ?? [])
    .map((r: any) => {
      const g = one<any>(r.group);
      return g ? ({ ...g, slot: one<Slot>(g.slot) } as Group) : null;
    })
    .filter((g: Group | null): g is Group => !!g && !!g.slot);

  // Earliest group whose slot hasn't long passed (allow 3h grace after start).
  const nextGroup =
    myGroups
      .filter((g) => ms(g.slot!.starts_at) >= now - 3 * HOUR)
      .sort((a, b) => ms(a.slot!.starts_at) - ms(b.slot!.starts_at))[0] ?? null;

  const memberNames: string[] = [];
  if (nextGroup) {
    const { data: memberRows } = await supabase
      .from("group_members")
      .select("profile:profiles(name)")
      .eq("group_id", nextGroup.id);
    for (const r of memberRows ?? []) {
      const p = one<{ name: string }>((r as any).profile);
      if (p) memberNames.push(firstName(p.name));
    }
  }

  const { data: signupRows } = await supabase
    .from("signups")
    .select("slot:slots(id, title, starts_at, area, join_deadline)")
    .eq("user_id", user.id);
  const signupSlots: Slot[] = (signupRows ?? [])
    .map((r: any) => one<Slot>(r.slot))
    .filter((s: Slot | null): s is Slot => !!s);
  const nextSignup =
    signupSlots
      .filter((s) => ms(s.starts_at) >= now)
      .sort((a, b) => ms(a.starts_at) - ms(b.starts_at))[0] ?? null;

  // How many have signed up for the slot you're waiting on (for the waiting-state momentum).
  let waitingCount = 0;
  if (nextSignup) {
    const { count } = await supabase
      .from("signups")
      .select("*", { count: "exact", head: true })
      .eq("slot_id", nextSignup.id);
    waitingCount = count ?? 0;
  }

  const dayOf = nextGroup && ms(nextGroup.slot!.starts_at) - now <= 3 * HOUR;

  return (
    <section style={{ padding: "24px 20px" }}>
      <header style={{ marginBottom: 24 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="UKC Social" height={44} width={102} style={{ display: "block" }} />
        <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 6 }}>
          {dateFmt.format(new Date(now))}
        </div>
      </header>

      {dayOf && nextGroup ? (
        <DayOf group={nextGroup} names={memberNames} />
      ) : nextGroup ? (
        <Revealed group={nextGroup} names={memberNames} />
      ) : nextSignup ? (
        <JoinedWaiting slot={nextSignup} count={waitingCount} />
      ) : (
        <Fresh name={profile.name} />
      )}
      <LinkStyles />
    </section>
  );
}

function Fresh({ name }: { name: string }) {
  const greeting = name.trim() ? `Hey ${firstName(name)}` : "Welcome";
  return (
    <div>
      <div className="eyebrow">UKC 2026</div>
      <h1 style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.03em", marginTop: 10, lineHeight: 1 }}>
        {greeting}
      </h1>
      <p style={{ color: "var(--ink-2)", marginTop: 12, fontSize: 15 }}>
        Nothing on your plate yet. Let&apos;s find your people for tonight.
      </p>
      <div style={{ marginTop: 24, borderBottom: "1px solid var(--line)" }}>
        <CtaCard
          href="/meals"
          title="Find your table"
          sub="Join a dinner and get matched by interests. Come solo or bring your crew."
        />
        <CtaCard
          href="/people"
          title="See who's here"
          sub="Browse everyone at UKC 2026 and find people worth meeting."
        />
      </div>
    </div>
  );
}

function CtaCard({ href, title, sub }: { href: string; title: string; sub: string }) {
  return (
    <Link href={href} className="cta-row">
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>{title}</div>
        <div style={{ fontSize: 14, color: "var(--ink-2)", marginTop: 4 }}>{sub}</div>
      </div>
      <span className="cta-chev" aria-hidden>▸</span>
    </Link>
  );
}

function JoinedWaiting({ slot, count }: { slot: Slot; count: number }) {
  return (
    <div>
      <div className="eyebrow">You&apos;re in</div>
      <h1 style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.03em", marginTop: 10, lineHeight: 1 }}>
        {slot.title}
      </h1>
      <p style={{ color: "var(--ink-2)", marginTop: 12, fontSize: 15 }}>
        {timeFmt.format(new Date(slot.starts_at))}
        {slot.area ? ` · ${slot.area}` : ""}
      </p>

      {count > 0 && (
        <div style={{ marginTop: 24 }}>
          {/* Anonymized: momentum without exposing who joined. */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            {Array.from({ length: Math.min(count, 14) }).map((_, i) => (
              <span key={i} style={{ width: 9, height: 9, borderRadius: 999, background: "var(--ink-3)" }} />
            ))}
            {count > 14 && (
              <span style={{ fontSize: 12, color: "var(--ink-3)", marginLeft: 2 }}>+{count - 14}</span>
            )}
          </div>
          <div style={{ fontSize: 14, color: "var(--ink-2)", marginTop: 10 }}>
            <strong style={{ color: "var(--ink)" }}>{count}</strong>{" "}
            {count === 1 ? "person is" : "people are"} in so far.
          </div>
        </div>
      )}

      <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
        <div style={{ fontSize: 15, color: "var(--ink)" }}>
          Tables assigned at{" "}
          <strong>{timeFmt.format(new Date(slot.join_deadline))}</strong>
        </div>
        <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 4 }}>
          We&apos;ll seat you with people worth meeting.
        </div>
      </div>
      <Link href="/meals" className="text-link">
        Change plans
      </Link>
    </div>
  );
}

function Revealed({ group, names }: { group: Group; names: string[] }) {
  return (
    <div>
      <div className="eyebrow">Your table is set</div>
      <h1 style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.03em", marginTop: 10, lineHeight: 1 }}>
        {group.name}
      </h1>
      {names.length > 0 && (
        <p style={{ fontSize: 15, color: "var(--ink-2)", marginTop: 12 }}>{names.join(", ")}</p>
      )}
      {group.suggested_place && (
        <p style={{ fontSize: 14, color: "var(--ink-2)", marginTop: 6 }}>📍 {group.suggested_place}</p>
      )}
      <Link href={`/groups/${group.id}`} className="cta-line">
        Meet your table <span aria-hidden>▸</span>
      </Link>
    </div>
  );
}

function DayOf({ group, names }: { group: Group; names: string[] }) {
  const meet = group.meet_time ?? group.slot?.starts_at ?? null;
  return (
    <div>
      <div className="eyebrow">Tonight</div>
      <h1 style={{ fontSize: 48, fontWeight: 800, letterSpacing: "-0.03em", marginTop: 10, lineHeight: 1 }}>
        {meet ? timeFmt.format(new Date(meet)) : "Soon"}
      </h1>
      {group.suggested_place && (
        <p style={{ fontSize: 17, color: "var(--ink)", marginTop: 8, fontWeight: 600 }}>
          📍 {group.suggested_place}
        </p>
      )}
      <p style={{ fontSize: 14, color: "var(--ink-2)", marginTop: 10 }}>
        {group.name}
        {names.length ? ` · ${names.join(", ")}` : ""}
      </p>
      <Link
        href={`/groups/${group.id}/chat`}
        style={{
          display: "block",
          textAlign: "center",
          marginTop: 24,
          padding: "15px",
          borderRadius: 999,
          fontSize: 16,
          fontWeight: 700,
          border: "1px solid var(--accent)",
          color: "var(--accent)",
        }}
      >
        Open chat ▸
      </Link>
    </div>
  );
}

function LinkStyles() {
  return (
    <style>{`
      .eyebrow {
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--accent);
      }
      .text-link {
        display: inline-block;
        margin-top: 18px;
        font-size: 15px;
        font-weight: 600;
        color: var(--accent);
      }
      .cta-line {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        min-height: 44px;
        margin-top: 16px;
        font-size: 15px;
        font-weight: 700;
        color: var(--accent);
      }
      .cta-line span { display: inline-block; transition: transform 0.15s ease; }
      .cta-line:hover span { transform: translateX(3px); }
      .cta-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 18px 0;
        border-top: 1px solid var(--line);
      }
      .cta-chev { flex-shrink: 0; color: var(--accent); font-weight: 700; transition: transform 0.15s ease; }
      .cta-row:hover .cta-chev { transform: translateX(3px); }
    `}</style>
  );
}
