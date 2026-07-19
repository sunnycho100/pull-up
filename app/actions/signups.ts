"use server";

import { requireUser } from "@/lib/supabase/server";

type Result = { ok: boolean; error?: string };

export async function joinSlot(
  slotId: string,
  opts: { partySize?: number; notes?: string },
): Promise<Result> {
  const { user, supabase } = await requireUser();

  const { data: slot } = await supabase
    .from("slots")
    .select("join_deadline")
    .eq("id", slotId)
    .single();
  if (!slot) return { ok: false, error: "not_found" };
  if (new Date(slot.join_deadline).getTime() <= Date.now()) {
    return { ok: false, error: "closed" };
  }

  // Clamp to the DB check (1-6); default solo.
  const partySize = Math.min(6, Math.max(1, Math.round(opts.partySize ?? 1)));
  const { error } = await supabase.from("signups").upsert(
    {
      slot_id: slotId,
      user_id: user.id,
      party_size: partySize,
      notes: opts.notes ?? "",
    },
    { onConflict: "slot_id,user_id" },
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function leaveSlot(slotId: string): Promise<Result> {
  const { user, supabase } = await requireUser();
  const { error } = await supabase
    .from("signups")
    .delete()
    .eq("slot_id", slotId)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
