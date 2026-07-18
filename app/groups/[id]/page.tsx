import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import GroupReveal from "@/components/GroupReveal";

export default async function GroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireUser();

  // RLS restricts groups/group_members to members — a non-member gets null → 404.
  const { data: group } = await supabase
    .from("groups")
    .select("id, name, rationale, suggested_place, meet_time, slot:slots(title, starts_at, area)")
    .eq("id", id)
    .maybeSingle();
  if (!group) notFound();

  const { data: rows } = await supabase
    .from("group_members")
    .select("user_id, profile:profiles(name, photo_url, school, position, interests, kakao, linkedin)")
    .eq("group_id", id);

  const members = (rows ?? []).map((r: any) => ({
    userId: r.user_id as string,
    ...r.profile,
  }));

  const slot = Array.isArray((group as any).slot)
    ? (group as any).slot[0]
    : (group as any).slot;

  return (
    <GroupReveal
      groupId={group.id}
      name={group.name}
      rationale={group.rationale}
      suggestedPlace={group.suggested_place}
      meetTime={group.meet_time}
      slotTitle={slot?.title ?? ""}
      slotStartsAt={slot?.starts_at ?? null}
      slotArea={slot?.area ?? ""}
      members={members}
    />
  );
}
