"use server";

import { createServerSupabase } from "@/lib/supabase/server";

type SentMessage = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
};

type Result = { ok: boolean; error?: string; message?: SentMessage };

export async function sendMessage(
  channelType: "meal" | "ride",
  channelId: string,
  body: string,
): Promise<Result> {
  const trimmed = body.trim();
  if (!trimmed) return { ok: false, error: "Message is empty" };
  if (trimmed.length > 2000) return { ok: false, error: "Message too long" };

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  // RLS enforces channel membership on insert.
  const { data, error } = await supabase
    .from("messages")
    .insert({
      channel_type: channelType,
      channel_id: channelId,
      user_id: user.id,
      body: trimmed,
    })
    .select("id, user_id, body, created_at")
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, message: data as SentMessage };
}
