"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { saveProfile, setDinnerSignups } from "@/app/actions/profile";
import StepBasics from "./StepBasics";
import StepInterests from "./StepInterests";
import StepPlans from "./StepPlans";

type Data = {
  name: string;
  school: string;
  position: string;
  birthday: string;
  photo_url: string;
  interests: string[];
  slotIds: string[];
};

export default function OnboardingClient({ userId }: { userId: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const step = Math.min(3, Math.max(1, Number(params.get("step")) || 1));

  const EMPTY: Data = {
    name: "",
    school: "",
    position: "",
    birthday: "",
    photo_url: "",
    interests: [],
    slotIds: [],
  };
  // Draft survives a refresh / backgrounded tab (only `step` is in the URL).
  // Same localStorage idiom StepPlans already uses for flight info.
  const [data, setData] = useState<Data>(() => {
    if (typeof window === "undefined") return EMPTY;
    try {
      const raw = localStorage.getItem("ukc-onboarding");
      return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
    } catch {
      return EMPTY;
    }
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem("ukc-onboarding", JSON.stringify(data));
    } catch {
      /* quota / private mode — draft just won't persist */
    }
  }, [data]);

  const patch = (p: Partial<Data>) => setData((d) => ({ ...d, ...p }));
  const goto = (s: number) => router.replace(`/welcome?step=${s}`);

  async function save(fields: Parameters<typeof saveProfile>[0], next: number) {
    setBusy(true);
    setError("");
    const r = await saveProfile(fields);
    setBusy(false);
    if (!r.ok) return setError(r.error ?? "Could not save");
    goto(next);
  }

  async function finish() {
    setBusy(true);
    setError("");
    const a = await saveProfile({ dinners_wanted: data.slotIds });
    const b = await setDinnerSignups(data.slotIds);
    setBusy(false);
    if (!a.ok || !b.ok)
      return setError(a.error ?? b.error ?? "Could not finish");
    try {
      localStorage.removeItem("ukc-onboarding");
    } catch {
      /* ignore */
    }
    router.push("/home");
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        maxWidth: 430,
        margin: "0 auto",
        padding: "24px 24px 40px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={3}
        aria-valuenow={step}
        aria-label={`Step ${step} of 3`}
        style={{ display: "flex", gap: 6, marginBottom: 28 }}
      >
        {[1, 2, 3].map((s) => (
          <span
            key={s}
            aria-hidden
            style={{
              height: 4,
              flex: 1,
              borderRadius: 2,
              background: s <= step ? "var(--accent)" : "var(--line)",
              transition: "background 200ms ease-out",
            }}
          />
        ))}
      </div>

      {step === 1 && (
        <StepBasics
          userId={userId}
          value={data}
          onChange={patch}
          busy={busy}
          error={error}
          onContinue={() =>
            save(
              {
                name: data.name.trim(),
                school: data.school.trim(),
                position: data.position.trim(),
                birthday: data.birthday || null,
                photo_url: data.photo_url,
              },
              2,
            )
          }
        />
      )}
      {step === 2 && (
        <StepInterests
          value={data.interests}
          onChange={(interests) => patch({ interests })}
          busy={busy}
          error={error}
          onBack={() => goto(1)}
          onContinue={() => save({ interests: data.interests }, 3)}
        />
      )}
      {step === 3 && (
        <StepPlans
          value={data.slotIds}
          onChange={(slotIds) => patch({ slotIds })}
          busy={busy}
          error={error}
          onBack={() => goto(2)}
          onFinish={finish}
        />
      )}
    </main>
  );
}
