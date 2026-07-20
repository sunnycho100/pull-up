"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { downscale } from "@/lib/avatar";

type Basics = { name: string; school: string; position: string; birthday: string; photo_url: string };

const field: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  fontSize: 16,
  border: "1px solid var(--line)",
  borderRadius: 12,
  background: "var(--bg)",
  color: "var(--ink)",
  marginTop: 8,
};

function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  return (p[0]?.[0] ?? "") + (p[1]?.[0] ?? "");
}

export default function StepBasics({
  userId,
  value,
  onChange,
  onContinue,
  busy,
  error,
}: {
  userId: string;
  value: Basics;
  onChange: (p: Partial<Basics>) => void;
  onContinue: () => void;
  busy: boolean;
  error: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [upload, setUpload] = useState<"idle" | "uploading" | "error">("idle");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUpload("uploading");
    try {
      const blob = await downscale(file);
      const supabase = createClient();
      const path = `${userId}/avatar.jpg`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      onChange({ photo_url: `${data.publicUrl}?t=${Date.now()}` });
      setUpload("idle");
    } catch {
      setUpload("error");
    }
  }

  const nameValid = value.name.trim().length > 0;

  return (
    <>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Let&apos;s set you up</h1>
      <p style={{ color: "var(--ink-2)", marginTop: 6, fontSize: 15 }}>
        Takes under a minute.
      </p>

      <div style={{ display: "flex", justifyContent: "center", margin: "28px 0" }}>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          aria-label="Add profile photo"
          style={{
            position: "relative",
            width: 104,
            height: 104,
            borderRadius: "50%",
            border: "1px solid var(--line)",
            background: value.photo_url
              ? `center/cover no-repeat url("${value.photo_url}")`
              : "var(--surface)",
            color: "var(--ink-2)",
            fontSize: 30,
            fontWeight: 600,
            cursor: "pointer",
            overflow: "hidden",
          }}
        >
          {!value.photo_url &&
            (initials(value.name) || (
              <span style={{ fontSize: 13, fontWeight: 500 }}>Add photo</span>
            ))}
          {upload === "uploading" && (
            <span
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                placeItems: "center",
                background: "rgba(0,0,0,0.6)",
                fontSize: 13,
                color: "var(--ink)",
              }}
            >
              Uploading…
            </span>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={handleFile}
        />
      </div>
      {upload === "error" && (
        <p
          style={{
            textAlign: "center",
            fontSize: 14,
            color: "var(--ink-2)",
            marginTop: -12,
            marginBottom: 12,
          }}
        >
          Upload failed.{" "}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            style={{ color: "var(--accent)", fontWeight: 600 }}
          >
            Retry
          </button>{" "}
          or skip, we&apos;ll use your initials.
        </p>
      )}

      <label style={{ fontSize: 14, fontWeight: 600 }}>Name</label>
      <input
        style={field}
        value={value.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder="이름 / Your name"
        autoFocus
      />
      <label style={{ fontSize: 14, fontWeight: 600, marginTop: 16, display: "block" }}>
        School / Company
      </label>
      <input
        style={field}
        value={value.school}
        onChange={(e) => onChange({ school: e.target.value })}
        placeholder="Enter here"
      />
      <label style={{ fontSize: 14, fontWeight: 600, marginTop: 16, display: "block" }}>
        Position
      </label>
      <input
        style={field}
        value={value.position}
        onChange={(e) => onChange({ position: e.target.value })}
        placeholder="PhD, Software Engineer, …"
      />
      <label style={{ fontSize: 14, fontWeight: 600, marginTop: 16, display: "block" }}>
        Birthday <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>· optional</span>
      </label>
      <input
        type="date"
        style={{ ...field, colorScheme: "dark" }}
        value={value.birthday}
        max={new Date().toISOString().slice(0, 10)}
        onChange={(e) => onChange({ birthday: e.target.value })}
      />

      {error && (
        <p style={{ color: "var(--danger)", fontSize: 14, marginTop: 16 }}>{error}</p>
      )}

      <button
        type="button"
        onClick={onContinue}
        disabled={!nameValid || busy || upload === "uploading"}
        style={{
          marginTop: 28,
          padding: "14px",
          borderRadius: 12,
          fontSize: 16,
          fontWeight: 600,
          background: "var(--accent)",
          color: "var(--accent-ink)",
          opacity: !nameValid || busy || upload === "uploading" ? 0.5 : 1,
          transition: "opacity 180ms ease-out",
        }}
      >
        {busy ? "Saving…" : "Continue"}
      </button>
    </>
  );
}
