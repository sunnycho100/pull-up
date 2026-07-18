-- Directory: a security-definer view exposing only public profile fields to all
-- authenticated users (raw profiles RLS keeps kakao/linkedin private).
create view directory_profiles with (security_invoker = false) as
  select id, name, photo_url, school, position, interests, bio from profiles;
grant select on directory_profiles to authenticated;

-- Can the current user see `target`'s contacts? True iff they share a table or ride.
create or replace function can_see_contact(target uuid) returns boolean
language sql stable security definer as $$
  select shares_channel(auth.uid(), target);
$$;
grant execute on function can_see_contact to authenticated;
