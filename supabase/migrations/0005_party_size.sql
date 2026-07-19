-- Party size ("come as a group"): each signup carries a headcount including the signer.
-- Replaces the ambiguous group_size_pref (a cosmetic 4/5/6 table preference the matcher
-- ignored). party_size is 1 for a solo signup; the matcher packs tables by total headcount
-- and never splits a party. UI offers 1-4; DB allows up to 6 (one party can fill a table).
alter table signups add column party_size int not null default 1
  check (party_size between 1 and 6);
alter table signups drop column group_size_pref;
