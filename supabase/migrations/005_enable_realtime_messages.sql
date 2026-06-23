-- Enable Supabase Realtime for the messaging feature.
-- The Workforce Hub subscribes to INSERTs on `messages` so new messages
-- appear live for every participant without a manual refresh.

-- Add messages to the realtime publication (idempotent).
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

-- Also publish conversations so list ordering can react to updated_at changes.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'conversations'
  ) then
    alter publication supabase_realtime add table public.conversations;
  end if;
end $$;

-- Ensure full row data is sent on changes (needed for filtered subscriptions).
alter table public.messages replica identity full;
alter table public.conversations replica identity full;
