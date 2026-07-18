import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import Chat from "@/components/Chat";

export default async function GroupChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, supabase } = await requireUser();

  // RLS gives members-only access — a non-member gets null → 404.
  const { data: group } = await supabase
    .from("groups")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();
  if (!group) notFound();

  return (
    <Chat
      channelType="meal"
      channelId={group.id}
      currentUserId={user.id}
      title={group.name}
      subtitle="Group chat"
    />
  );
}
