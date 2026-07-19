-- Realtime: postgres_changes only broadcasts for tables in the supabase_realtime
-- publication. New tables aren't added automatically, so group/ride chat never
-- pushed live inserts. Add messages (RLS still gates who receives each row).
alter publication supabase_realtime add table messages;
