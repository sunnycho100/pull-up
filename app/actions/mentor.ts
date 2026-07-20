"use server";

import { requireUser } from "@/lib/supabase/server";

type Result = { ok: boolean; error?: string };

// Toggle the current user's 1:1 mentor/mentee matching opt-in.
export async function setMentorOptin(optin: boolean): Promise<Result> {
  const { user, supabase } = await requireUser();
  const { error } = await supabase
    .from("profiles")
    .update({ mentor_optin: optin })
    .eq("id", user.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
