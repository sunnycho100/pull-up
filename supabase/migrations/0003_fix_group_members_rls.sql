-- Fix: the original gm_sel policy selected from group_members inside its own
-- USING clause → "infinite recursion detected in policy for relation
-- group_members". That silently nulled every RLS-bound read of groups /
-- group_members / messages (home reveal, group page, chat membership).
-- A SECURITY DEFINER helper runs as the table owner (BYPASSRLS), so its inner
-- read does not re-trigger the policy. Same pattern as shares_channel().

create or replace function is_group_member(gid uuid) returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from group_members
    where group_id = gid and user_id = auth.uid()
  );
$$;
grant execute on function is_group_member to authenticated;

drop policy if exists gm_sel on group_members;
create policy gm_sel on group_members for select using (is_group_member(group_id));
