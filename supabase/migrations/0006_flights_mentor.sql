-- Rides + mentor opt-in. Both additive and non-destructive.
--
-- `flights`: each person posts at most one arrival and one departure. The rides
-- board reads these and buckets them by time (lib/flights.ts) so people landing
-- in the same window can split a car. This is the light "post your flight, get
-- matched" model — distinct from the never-wired ride_pools/ride_members tables
-- (candidates for later cleanup).
create table flights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  direction text not null check (direction in ('arrival','departure')),
  airport text not null,                 -- IATA of the shared airport, e.g. MCO
  flight_no text not null default '',
  airline text not null default '',
  other_city text not null default '',   -- origin (arrival) or destination (departure)
  other_iata text not null default '',
  scheduled_at timestamptz not null,     -- arrival/departure time (tz-aware)
  luggage bool not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, direction)
);
alter table flights enable row level security;
create policy f_sel on flights for select using (auth.role() = 'authenticated');
create policy f_ins on flights for insert with check (auth.uid() = user_id);
create policy f_upd on flights for update using (auth.uid() = user_id);
create policy f_del on flights for delete using (auth.uid() = user_id);

-- Mentor/mentee 1:1 opt-in. Role (mentor vs mentee) is derived from `position`
-- at match time; this flag is just "yes, include me in the daily 1:1 pool".
alter table profiles add column mentor_optin boolean not null default false;
