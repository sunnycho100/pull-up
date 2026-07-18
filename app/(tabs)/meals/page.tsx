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
    .select("slot_id, user_id, group_size_pref, notes");

  const counts: Record<string, number> = {};
  const mine: Record<string, { groupSizePref: number | null; notes: string }> = {};
  for (const s of signups ?? []) {
    counts[s.slot_id] = (counts[s.slot_id] ?? 0) + 1;
    if (s.user_id === user.id) {
      mine[s.slot_id] = { groupSizePref: s.group_size_pref, notes: s.notes ?? "" };
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
