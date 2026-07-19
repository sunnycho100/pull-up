"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Phase = "default" | "sending" | "sent" | "error";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<Phase>("default");
  const [errorMsg, setErrorMsg] = useState("");

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setPhase("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setErrorMsg(error.message);
      setPhase("error");
    } else {
      setPhase("sent");
    }
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 24px",
        maxWidth: 430,
        margin: "0 auto",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="UKC Social" height={40} width={93} style={{ display: "block" }} />
      <p style={{ color: "var(--ink-2)", marginTop: 12, fontSize: 16 }}>
        Find your table at UKC 2026 — dinners, rides, and people worth meeting.
      </p>

      {phase === "sent" ? (
        <div
          style={{
            marginTop: 28,
            padding: "16px 18px",
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 12,
          }}
        >
          <p style={{ fontWeight: 600 }}>Check your email</p>
          <p style={{ color: "var(--ink-2)", marginTop: 4, fontSize: 14 }}>
            We sent a sign-in link to {email}. Tap it on this device.
          </p>
        </div>
      ) : (
        <form onSubmit={sendLink} style={{ marginTop: 28 }}>
          <label
            htmlFor="email"
            style={{ display: "block", fontSize: 13, fontWeight: 600 }}
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@university.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              marginTop: 6,
              width: "100%",
              padding: "12px 14px",
              fontSize: 16,
              border: "1px solid var(--line)",
              borderRadius: 10,
              background: "var(--bg)",
              color: "var(--ink)",
            }}
          />
          {phase === "error" && (
            <p style={{ color: "var(--danger)", fontSize: 13, marginTop: 8 }}>
              Couldn&apos;t send the link — {errorMsg}. Try again.
            </p>
          )}
          <button
            type="submit"
            disabled={phase === "sending"}
            style={{
              marginTop: 14,
              width: "100%",
              padding: "13px 16px",
              fontSize: 15,
              fontWeight: 600,
              color: "var(--accent-ink)",
              background: "var(--accent)",
              border: 0,
              borderRadius: 10,
              opacity: phase === "sending" ? 0.7 : 1,
            }}
          >
            {phase === "sending" ? "Sending…" : "Send sign-in link"}
          </button>
        </form>
      )}
    </main>
  );
}
