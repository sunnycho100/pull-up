"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Member = {
  userId: string;
  name?: string;
  photo_url?: string | null;
  school?: string;
  position?: string;
  interests?: string[];
  kakao?: string;
  linkedin?: string;
};

const EASE = "cubic-bezier(0.16,1,0.3,1)";
const TZ = "America/New_York";

function initials(name?: string) {
  const n = (name ?? "").trim();
  if (!n) return "?";
  const parts = n.split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

function fmtContext(startsAt: string | null, area: string) {
  if (!startsAt) return area;
  const d = new Date(startsAt);
  const when = d.toLocaleString("en-US", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: TZ,
  });
  return area ? `${when} · ${area}` : when;
}

function fmtTime(t: string | null) {
  if (!t) return "";
  return new Date(t).toLocaleString("en-US", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: TZ,
  });
}

export default function GroupReveal({
  groupId,
  name,
  rationale,
  suggestedPlace,
  meetTime,
  slotTitle,
  slotStartsAt,
  slotArea,
  members,
}: {
  groupId: string;
  name: string;
  rationale: string;
  suggestedPlace: string;
  meetTime: string | null;
  slotTitle: string;
  slotStartsAt: string | null;
  slotArea: string;
  members: Member[];
}) {
  // First-visit-only reveal: cards spring-stagger in. Repeat visits and
  // reduced-motion render instantly (no transition).
  const [visible, setVisible] = useState(false);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const key = `revealed-${groupId}`;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const firstVisit = !localStorage.getItem(key);
    if (firstVisit && !reduce) {
      setAnimate(true);
      requestAnimationFrame(() => setVisible(true));
      localStorage.setItem(key, "1");
    } else {
      setVisible(true);
    }
  }, [groupId]);

  const context = [slotTitle, fmtContext(slotStartsAt, slotArea)]
    .filter(Boolean)
    .join(" · ");

  return (
    <section style={{ padding: "28px 20px 40px", maxWidth: 480, margin: "0 auto" }}>
      <p
        style={{
          fontSize: 12,
          color: "var(--ink-3)",
          letterSpacing: "0.01em",
          margin: 0,
        }}
      >
        {context}
      </p>

      <h1 style={{ fontSize: 30, fontWeight: 700, margin: "10px 0 0" }}>
        Meet your table
      </h1>
      <p style={{ fontSize: 15, color: "var(--ink-2)", margin: "6px 0 0" }}>
        <span style={{ fontWeight: 600, color: "var(--ink)" }}>{name}</span> ·{" "}
        {members.length} {members.length === 1 ? "person" : "people"}
      </p>

      <div style={{ display: "grid", gap: 10, marginTop: 24 }}>
        {members.map((m, i) => (
          <div
            key={m.userId}
            style={{
              display: "flex",
              gap: 12,
              padding: 14,
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: 16,
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(12px)",
              transition: animate
                ? `opacity 400ms ${EASE} ${i * 60}ms, transform 400ms ${EASE} ${i * 60}ms`
                : "none",
            }}
          >
            {m.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={m.photo_url}
                alt={m.name ?? ""}
                width={56}
                height={56}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  objectFit: "cover",
                  flexShrink: 0,
                }}
              />
            ) : (
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: "var(--accent)",
                  color: "var(--accent-ink)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  fontWeight: 600,
                }}
              >
                {initials(m.name)}
              </div>
            )}

            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{m.name}</div>
              {(m.school || m.position) && (
                <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 1 }}>
                  {[m.school, m.position].filter(Boolean).join(" · ")}
                </div>
              )}

              {m.interests && m.interests.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 5,
                    marginTop: 8,
                  }}
                >
                  {m.interests.map((it) => (
                    <span
                      key={it}
                      style={{
                        fontSize: 11,
                        color: "var(--ink-2)",
                        background: "var(--bg)",
                        border: "1px solid var(--line)",
                        borderRadius: 999,
                        padding: "2px 8px",
                      }}
                    >
                      {it}
                    </span>
                  ))}
                </div>
              )}

              {(m.kakao || m.linkedin) && (
                <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
                  {m.kakao && (
                    <a
                      href={m.kakao}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)" }}
                    >
                      KakaoTalk
                    </a>
                  )}
                  {m.linkedin && (
                    <a
                      href={m.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)" }}
                    >
                      LinkedIn
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {rationale && (
        <div
          style={{
            marginTop: 20,
            padding: 16,
            background: "rgba(99,91,255,0.06)",
            border: "1px solid rgba(99,91,255,0.28)",
            borderRadius: 16,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.06em",
              color: "var(--accent)",
            }}
          >
            WHY THIS TABLE
          </div>
          <p
            style={{
              fontSize: 14.5,
              lineHeight: 1.5,
              color: "var(--ink-2)",
              margin: "8px 0 0",
            }}
          >
            {rationale}
          </p>
        </div>
      )}

      {(suggestedPlace || meetTime) && (
        <div
          style={{
            marginTop: 16,
            padding: "14px 16px",
            border: "1px solid var(--line)",
            borderRadius: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          {suggestedPlace && (
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{suggestedPlace}</div>
              <div style={{ fontSize: 12, color: "var(--ink-3)" }}>suggested spot</div>
            </div>
          )}
          {meetTime && (
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--accent)", whiteSpace: "nowrap" }}>
              {fmtTime(meetTime)}
            </div>
          )}
        </div>
      )}

      <Link
        href={`/groups/${groupId}/chat`}
        style={{
          display: "block",
          marginTop: 24,
          padding: "15px 20px",
          background: "var(--accent)",
          color: "var(--accent-ink)",
          borderRadius: 14,
          textAlign: "center",
          fontSize: 16,
          fontWeight: 600,
        }}
      >
        Open group chat
      </Link>
    </section>
  );
}
