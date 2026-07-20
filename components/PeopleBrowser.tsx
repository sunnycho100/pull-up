"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type Person = {
  id: string;
  name: string;
  photo_url: string | null;
  school: string;
  position: string;
  interests: string[];
  bio: string;
};

function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase() || "·";
}

function Avatar({ person, size }: { person: Person; size: number }) {
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: "50%",
        border: "1px solid var(--line)",
        background: person.photo_url
          ? `center/cover no-repeat url("${person.photo_url}")`
          : "var(--surface)",
        color: "var(--ink-2)",
        display: "grid",
        placeItems: "center",
        fontSize: size * 0.36,
        fontWeight: 600,
        overflow: "hidden",
      }}
    >
      {!person.photo_url && initials(person.name)}
    </div>
  );
}

type Contacts =
  | { state: "loading" }
  | { state: "locked" }
  | { state: "unlocked"; kakao: string; linkedin: string };

export default function PeopleBrowser({
  people,
  meId,
}: {
  people: Person[];
  meId: string;
}) {
  const [query, setQuery] = useState("");
  const [activeInterest, setActiveInterest] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contacts>({ state: "loading" });

  const allInterests = useMemo(() => {
    const set = new Set<string>();
    for (const p of people) for (const i of p.interests) set.add(i);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [people]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people.filter((p) => {
      if (activeInterest && !p.interests.includes(activeInterest)) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) || p.school.toLowerCase().includes(q)
      );
    });
  }, [people, query, activeInterest]);

  const active = people.find((p) => p.id === openId) ?? null;

  if (people.length === 0) {
    return (
      <div style={{ padding: "40px 0", textAlign: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/empty-people.svg"
          alt=""
          width={140}
          height={105}
          style={{ display: "block", margin: "0 auto" }}
        />
        <p style={{ fontSize: 17, fontWeight: 600, marginTop: 16 }}>You&apos;re early</p>
        <p style={{ fontSize: 14, color: "var(--ink-2)", marginTop: 6, lineHeight: 1.5 }}>
          No one else has set up a profile yet. Check back soon. This fills up as
          people arrive for UKC 2026.
        </p>
      </div>
    );
  }

  async function openSheet(person: Person) {
    setOpenId(person.id);
    if (person.id === meId) {
      setContacts({ state: "locked" });
      return;
    }
    setContacts({ state: "loading" });
    const supabase = createClient();
    const { data: canSee } = await supabase.rpc("can_see_contact", {
      target: person.id,
    });
    if (!canSee) {
      setContacts({ state: "locked" });
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("kakao, linkedin")
      .eq("id", person.id)
      .maybeSingle();
    setContacts({
      state: "unlocked",
      kakao: data?.kakao ?? "",
      linkedin: data?.linkedin ?? "",
    });
  }

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search name or school"
        aria-label="Search people"
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "12px 14px",
          fontSize: 16,
          border: "1px solid var(--line)",
          borderRadius: 12,
          background: "var(--bg)",
          color: "var(--ink)",
        }}
      />

      {allInterests.length > 0 && (
        <div className="chip-row">
          {allInterests.map((interest) => {
            const on = activeInterest === interest;
            return (
              <button
                key={interest}
                type="button"
                aria-pressed={on}
                onClick={() => setActiveInterest(on ? null : interest)}
                className={on ? "fchip fchip--on" : "fchip"}
              >
                {interest}
              </button>
            );
          })}
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ padding: "40px 0", textAlign: "center" }}>
          <p style={{ color: "var(--ink-2)", fontSize: 15 }}>
            No one matches. Clear filters
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setActiveInterest(null);
            }}
            style={{
              marginTop: 14,
              padding: "10px 18px",
              borderRadius: 999,
              fontSize: 14,
              fontWeight: 600,
              border: "1px solid var(--line)",
              color: "var(--ink)",
            }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div>
          {filtered.map((person) => (
            <button
              key={person.id}
              type="button"
              onClick={() => openSheet(person)}
              className="person-row"
            >
              <Avatar person={person} size={48} />
              <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)" }}
                  >
                    {person.name || "Someone"}
                  </span>
                  {person.id === meId && <span className="you-tag">You</span>}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--ink-2)",
                    marginTop: 3,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {[person.school, person.position].filter(Boolean).join(" · ") ||
                    "Not set"}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {active && (
        <div
          className="sheet-backdrop"
          onClick={() => setOpenId(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="grabber" />
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <Avatar person={active} size={64} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 20, fontWeight: 700 }}>
                  {active.name || "Someone"}
                  {active.id === meId && <span className="you-tag"> You</span>}
                </div>
                <div
                  style={{ fontSize: 14, color: "var(--ink-2)", marginTop: 2 }}
                >
                  {[active.school, active.position].filter(Boolean).join(" · ") ||
                    "Not set"}
                </div>
              </div>
            </div>

            {active.interests.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 18 }}>
                {active.interests.map((i) => (
                  <span key={i} className="tag">
                    {i}
                  </span>
                ))}
              </div>
            )}

            {active.bio && (
              <p style={{ fontSize: 15, color: "var(--ink)", marginTop: 16, lineHeight: 1.5 }}>
                {active.bio}
              </p>
            )}

            <div style={{ marginTop: 22 }}>
              <div className="field-label">Contacts</div>
              {contacts.state === "loading" && (
                <div className="skel" style={{ height: 20, width: "60%" }} />
              )}
              {contacts.state === "locked" && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: "var(--ink-2)",
                    fontSize: 14,
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Join a table or ride together to connect
                </div>
              )}
              {contacts.state === "unlocked" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {contacts.kakao ? (
                    <div style={{ fontSize: 15 }}>
                      <span style={{ color: "var(--ink-2)" }}>KakaoTalk · </span>
                      <span style={{ color: "var(--ink)", fontWeight: 600 }}>
                        {contacts.kakao}
                      </span>
                    </div>
                  ) : null}
                  {contacts.linkedin ? (
                    <a
                      href={
                        contacts.linkedin.startsWith("http")
                          ? contacts.linkedin
                          : `https://${contacts.linkedin}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 15, color: "var(--accent)", fontWeight: 600 }}
                    >
                      LinkedIn
                    </a>
                  ) : null}
                  {!contacts.kakao && !contacts.linkedin && (
                    <span style={{ fontSize: 14, color: "var(--ink-2)" }}>
                      No contacts added yet.
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .chip-row {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding: 14px 0 4px;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .chip-row::-webkit-scrollbar { display: none; }
        .fchip {
          flex-shrink: 0;
          padding: 8px 14px;
          border-radius: 999px;
          font-size: 14px;
          font-weight: 500;
          border: 1px solid var(--line);
          background: var(--surface);
          color: var(--ink);
          cursor: pointer;
          transition: background 150ms ease-out, color 150ms ease-out;
        }
        .fchip--on {
          border-color: var(--accent);
          background: var(--accent);
          color: var(--accent-ink);
        }
        .person-row {
          display: flex;
          align-items: center;
          gap: 14px;
          width: 100%;
          padding: 14px 0;
          border-bottom: 1px solid var(--line);
          background: none;
          cursor: pointer;
        }
        .person-row:last-child { border-bottom: none; }
        .you-tag {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          color: var(--accent);
        }
        .tag {
          font-size: 13px;
          font-weight: 500;
          padding: 6px 12px;
          border-radius: 999px;
          background: var(--surface);
          color: var(--ink);
          border: 1px solid var(--line);
        }
        .field-label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.02em;
          text-transform: uppercase;
          color: var(--ink-3);
          margin-bottom: 10px;
        }
        .skel {
          border-radius: 8px;
          background: linear-gradient(90deg, var(--surface) 25%, var(--line) 37%, var(--surface) 63%);
          background-size: 400% 100%;
          animation: shimmer 1.4s ease-in-out infinite;
        }
        @keyframes shimmer { from { background-position: 100% 0; } to { background-position: -100% 0; } }
        .sheet-backdrop {
          position: fixed;
          inset: 0;
          z-index: 100;
          background: var(--overlay);
          display: flex;
          align-items: flex-end;
          animation: sheet-fade 200ms ease-out;
        }
        .sheet {
          width: 100%;
          background: var(--bg);
          border-radius: 16px 16px 0 0;
          padding: 8px 20px calc(24px + env(safe-area-inset-bottom));
          box-shadow: 0 -8px 40px rgba(0, 0, 0, 0.5);
          animation: sheet-up 300ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        .grabber {
          width: 36px;
          height: 5px;
          border-radius: 999px;
          background: var(--line);
          margin: 6px auto 18px;
        }
        @keyframes sheet-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes sheet-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) {
          .sheet-backdrop, .sheet, .skel { animation: none; }
          .fchip { transition: none; }
        }
      `}</style>
    </div>
  );
}
