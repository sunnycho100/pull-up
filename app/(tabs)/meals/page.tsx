import { requireUser } from "@/lib/supabase/server";
import MealsList from "@/components/MealsList";

export default async function MealsPage() {
  const { user, supabase } = await requireUser();

  const { data: slots } = await supabase
    .from("slots")
    .select("id, title, starts_at, area, join_deadline")
    .eq("kind", "meal")
    .order("starts_at");

  const { data: signups } = await supabase
    .from("signups")
    .select("slot_id, user_id, party_size, notes");

  // "N people in" counts real seats: a party of 3 counts as 3.
  const counts: Record<string, number> = {};
  const mine: Record<string, { partySize: number; notes: string }> = {};
  for (const s of signups ?? []) {
    counts[s.slot_id] = (counts[s.slot_id] ?? 0) + (s.party_size ?? 1);
    if (s.user_id === user.id) {
      mine[s.slot_id] = { partySize: s.party_size ?? 1, notes: s.notes ?? "" };
    }
  }

  return (
    <section style={{ padding: "24px 20px" }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 600 }}>Meals</h1>
        <p style={{ color: "var(--ink-2)", marginTop: 6, fontSize: 15 }}>
          Grab dinner with people worth meeting.
        </p>
      </header>

      {!slots?.length ? (
        <p style={{ color: "var(--ink-2)", fontSize: 15, paddingTop: 8 }}>
          Slots open soon.
        </p>
      ) : (
        <MealsList slots={slots} counts={counts} mine={mine} nowMs={Date.now()} />
      )}
    </section>
  );
}
