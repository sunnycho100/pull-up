"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { sendMessage } from "@/app/actions/messages";

type Msg = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  pending?: boolean;
  failed?: boolean;
};

type Profile = { name: string; photo_url: string | null };

export default function Chat({
  channelType,
  channelId,
  currentUserId,
  title,
  subtitle,
}: {
  channelType: "meal" | "ride";
  channelId: string;
  currentUserId: string;
  title: string;
  subtitle?: string;
}) {
  const router = useRouter();
  const supabase = useRef(createClient()).current;
  const [messages, setMessages] = useState<Msg[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load the names/photos for a set of user_ids we don't already have.
  const loadProfiles = useCallback(
    async (ids: string[]) => {
      const missing = ids.filter((id) => id && !profiles[id]);
      if (!missing.length) return;
      const { data } = await supabase
        .from("profiles")
        .select("id, name, photo_url")
        .in("id", missing);
      if (data?.length) {
        setProfiles((prev) => {
          const next = { ...prev };
          for (const p of data as any[])
            next[p.id] = { name: p.name, photo_url: p.photo_url };
          return next;
        });
      }
    },
    [profiles, supabase],
  );

  // Initial load: last 100 messages (RLS gates reads).
  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("messages")
        .select("id, user_id, body, created_at")
        .eq("channel_id", channelId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (!active || !data) return;
      const rows = (data as Msg[]).slice().reverse();
      setMessages(rows);
      loadProfiles([...new Set(rows.map((m) => m.user_id))]);
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]);

  // Realtime: new INSERTs on this channel. Dedupe by id against optimistic rows.
  useEffect(() => {
    const channel = supabase
      .channel(`msgs-${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          const m = payload.new as Msg;
          setMessages((prev) =>
            prev.some((x) => x.id === m.id) ? prev : [...prev, m],
          );
          loadProfiles([m.user_id]);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]);

  // Auto-scroll to bottom when messages change.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  async function deliver(tempId: string, body: string) {
    const res = await sendMessage(channelType, channelId, body);
    setMessages((prev) => {
      if (res.ok && res.message) {
        // Replace optimistic row with the real one; drop if realtime beat us to it.
        const real = res.message;
        if (prev.some((m) => m.id === real.id))
          return prev.filter((m) => m.id !== tempId);
        return prev.map((m) => (m.id === tempId ? { ...real } : m));
      }
      return prev.map((m) =>
        m.id === tempId ? { ...m, pending: false, failed: true } : m,
      );
    });
  }

  async function submit() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    const tempId = `tmp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        user_id: currentUserId,
        body,
        created_at: new Date().toISOString(),
        pending: true,
      },
    ]);
    setDraft("");
    await deliver(tempId, body);
    setSending(false);
  }

  function retry(m: Msg) {
    setMessages((prev) =>
      prev.map((x) =>
        x.id === m.id ? { ...x, pending: true, failed: false } : x,
      ),
    );
    deliver(m.id, m.body);
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 16px calc(12px + env(safe-area-inset-top))",
          borderBottom: "1px solid var(--line)",
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => router.back()}
          aria-label="Back"
          style={{
            border: "none",
            background: "none",
            padding: 4,
            cursor: "pointer",
            color: "var(--ink-2)",
            fontSize: 20,
            lineHeight: 1,
          }}
        >
          ‹
        </button>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{title}</div>
          {subtitle && (
            <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{subtitle}</div>
          )}
        </div>
      </header>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              margin: "auto",
              color: "var(--ink-3)",
              fontSize: 15,
              textAlign: "center",
            }}
          >
            Say hi and share who you are 👋
          </div>
        ) : (
          messages.map((m, i) => {
            const mine = m.user_id === currentUserId;
            const prev = messages[i - 1];
            const showName = !mine && (!prev || prev.user_id !== m.user_id);
            return (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: mine ? "flex-end" : "flex-start",
                  marginTop: showName ? 8 : 0,
                }}
              >
                {showName && (
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: "var(--accent)",
                      margin: "0 0 2px 4px",
                    }}
                  >
                    {profiles[m.user_id]?.name ?? "…"}
                  </span>
                )}
                <div
                  style={{
                    maxWidth: "78%",
                    padding: "9px 13px",
                    borderRadius: 18,
                    fontSize: 15,
                    lineHeight: 1.35,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    opacity: m.pending ? 0.6 : 1,
                    background: mine ? "var(--accent)" : "var(--surface)",
                    color: mine ? "var(--accent-ink)" : "var(--ink)",
                    borderBottomRightRadius: mine ? 4 : 18,
                    borderBottomLeftRadius: mine ? 18 : 4,
                  }}
                >
                  {m.body}
                </div>
                {m.failed && (
                  <button
                    onClick={() => retry(m)}
                    style={{
                      marginTop: 3,
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: "var(--danger)",
                      background: "none",
                      border: "none",
                      padding: "0 4px",
                      cursor: "pointer",
                    }}
                  >
                    Failed. Retry
                  </button>
                )}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div
        style={{
          flexShrink: 0,
          display: "flex",
          gap: 8,
          padding: "10px 12px calc(10px + env(safe-area-inset-bottom))",
          borderTop: "1px solid var(--line)",
          background: "var(--bg)",
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Message"
          maxLength={2000}
          style={{
            flex: 1,
            padding: "11px 14px",
            border: "1px solid var(--line)",
            borderRadius: 22,
            fontSize: 15,
            outline: "none",
            background: "var(--surface)",
            color: "var(--ink)",
          }}
        />
        <button
          onClick={submit}
          disabled={!draft.trim() || sending}
          style={{
            flexShrink: 0,
            padding: "0 18px",
            border: "none",
            borderRadius: 22,
            fontSize: 15,
            fontWeight: 600,
            color: "var(--accent-ink)",
            background: "var(--accent)",
            opacity: !draft.trim() || sending ? 0.4 : 1,
            cursor: !draft.trim() || sending ? "default" : "pointer",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
