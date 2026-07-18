"use server";

import { createClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  matchSlot,
  roundRobinGroups,
  validateAssignment,
  type SignupProfile,
  type MatchGroup,
} from "@/lib/matching";

type Result = { ok: boolean; groups?: number; flex?: boolean; error?: string };

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function runMatching(slotId: string): Promise<Result> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL)
    return { ok: false, error: "forbidden" };

  const svc = serviceClient();

  const { data: slot, error: slotErr } = await svc
    .from("slots")
    .select("id, starts_at")
    .eq("id", slotId)
    .single();
  if (slotErr || !slot) return { ok: false, error: slotErr?.message ?? "slot not found" };

  const { data: rows, error: sErr } = await svc
    .from("signups")
    .select("user_id, group_size_pref, notes, profiles(name, school, position, interests)")
    .eq("slot_id", slotId);
  if (sErr) return { ok: false, error: sErr.message };

  const signups: SignupProfile[] = (rows ?? []).map((r) => {
    // supabase types the joined relation as an array; it's a single row here.
    const p = (Array.isArray(r.profiles) ? r.profiles[0] : r.profiles) ?? {};
    return {
      userId: r.user_id as string,
      name: (p.name as string) ?? "",
      school: (p.school as string) ?? "",
      position: (p.position as string) ?? "",
      interests: (p.interests as string[]) ?? [],
      groupSizePref: (r.group_size_pref as number | null) ?? undefined,
      notes: (r.notes as string) ?? "",
    };
  });

  if (signups.length === 0) return { ok: true, groups: 0 };

  let groups: MatchGroup[];
  try {
    groups = await matchSlot(signups);
  } catch {
    groups = roundRobinGroups(signups); // ponytail: falls back on missing ANTHROPIC_API_KEY
  }
  if (!validateAssignment(signups.map((s) => s.userId), groups).ok)
    groups = roundRobinGroups(signups);

  // Idempotent: wipe prior groups for this slot (cascade drops group_members).
  const { error: delErr } = await svc.from("groups").delete().eq("slot_id", slotId);
  if (delErr) return { ok: false, error: delErr.message };

  const { data: inserted, error: gErr } = await svc
    .from("groups")
    .insert(
      groups.map((g) => ({
        slot_id: slotId,
        name: g.name,
        rationale: g.rationale,
        suggested_place: g.suggestedPlace,
        meet_time: slot.starts_at,
      })),
    )
    .select("id");
  if (gErr || !inserted) return { ok: false, error: gErr?.message ?? "insert failed" };

  const members = inserted.flatMap((row, i) =>
    groups[i].memberIds.map((user_id) => ({ group_id: row.id as string, user_id })),
  );
  const { error: mErr } = await svc.from("group_members").insert(members);
  if (mErr) return { ok: false, error: mErr.message };

  const flex = groups.length > 0 && Math.min(...groups.map((g) => g.memberIds.length)) < 4;
  return { ok: true, groups: groups.length, flex };
}
