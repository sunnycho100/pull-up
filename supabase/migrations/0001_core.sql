-- UKC Social core schema
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null default '',
  photo_url text,
  school text not null default '',
  position text not null default '',
  interests text[] not null default '{}',
  bio text not null default '',
  kakao text not null default '',
  linkedin text not null default '',
  dietary text not null default '',
  dinners_wanted uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
create table slots (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  starts_at timestamptz not null,
  area text not null default '',
  join_deadline timestamptz not null,
  kind text not null default 'meal'
);
create table signups (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references slots on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  group_size_pref int,
  notes text not null default '',
  unique (slot_id, user_id)
);
create table groups (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references slots on delete cascade,
  name text not null,
  rationale text not null default '',
  suggested_place text not null default '',
  meet_time timestamptz
);
create table group_members (
  group_id uuid not null references groups on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  primary key (group_id, user_id)
);
create table ride_pools (
  id uuid primary key default gen_random_uuid(),
  direction text not null check (direction in ('arrival','departure')),
  pickup_at timestamptz not null,
  capacity int not null default 4,
  status text not null default 'open',
  meet_point text not null default ''
);
create table ride_members (
  pool_id uuid not null references ride_pools on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  flight_no text not null default '',
  flight_at timestamptz,
  ready_at timestamptz not null,
  luggage bool not null default true,
  primary key (pool_id, user_id)
);
create table messages (
  id uuid primary key default gen_random_uuid(),
  channel_type text not null check (channel_type in ('meal','ride')),
  channel_id uuid not null,
  user_id uuid not null references profiles on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create or replace function shares_channel(a uuid, b uuid) returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from group_members g1 join group_members g2 using (group_id)
    where g1.user_id = a and g2.user_id = b
  ) or exists (
    select 1 from ride_members r1 join ride_members r2 using (pool_id)
    where r1.user_id = a and r2.user_id = b
  );
$$;

alter table profiles enable row level security;
alter table slots enable row level security;
alter table signups enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table ride_pools enable row level security;
alter table ride_members enable row level security;
alter table messages enable row level security;

create policy p_sel on profiles for select using (auth.role() = 'authenticated');
create policy p_ins on profiles for insert with check (auth.uid() = id);
create policy p_upd on profiles for update using (auth.uid() = id);
create policy s_sel on slots for select using (auth.role() = 'authenticated');
create policy su_sel on signups for select using (auth.role() = 'authenticated');
create policy su_ins on signups for insert with check (auth.uid() = user_id);
create policy su_del on signups for delete using (auth.uid() = user_id);
create policy g_sel on groups for select using (
  exists (select 1 from group_members m where m.group_id = id and m.user_id = auth.uid()));
create policy gm_sel on group_members for select using (
  exists (select 1 from group_members m where m.group_id = group_members.group_id
          and m.user_id = auth.uid()));
create policy rp_sel on ride_pools for select using (auth.role() = 'authenticated');
create policy rm_sel on ride_members for select using (auth.role() = 'authenticated');
create policy rm_ins on ride_members for insert with check (auth.uid() = user_id);
create policy rm_del on ride_members for delete using (auth.uid() = user_id);
create policy m_sel on messages for select using (
  (channel_type = 'meal' and exists (select 1 from group_members m
     where m.group_id = channel_id and m.user_id = auth.uid()))
  or (channel_type = 'ride' and exists (select 1 from ride_members r
     where r.pool_id = channel_id and r.user_id = auth.uid())));
create policy m_ins on messages for insert with check (
  auth.uid() = user_id and (
    (channel_type = 'meal' and exists (select 1 from group_members m
       where m.group_id = channel_id and m.user_id = auth.uid()))
    or (channel_type = 'ride' and exists (select 1 from ride_members r
       where r.pool_id = channel_id and r.user_id = auth.uid()))));

insert into storage.buckets (id, name, public) values ('avatars','avatars', true)
  on conflict do nothing;
create policy av_ins on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy av_sel on storage.objects for select using (bucket_id = 'avatars');
