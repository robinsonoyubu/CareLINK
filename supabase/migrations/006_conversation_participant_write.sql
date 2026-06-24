-- Allow conversation participants (not just admins) to start and touch
-- conversations. Previously only `conversations_participant` (SELECT) and
-- `conversations_admin` (ALL) existed, so a professional could neither
-- create a new conversation nor bump updated_at when sending a message.

-- A user may create a conversation as long as they include themselves
-- in the participant list.
drop policy if exists "conversations_insert_participant" on conversations;
create policy "conversations_insert_participant" on conversations
  for insert with check (auth.uid() = any(participant_ids));

-- A participant may update a conversation they belong to (e.g. updated_at,
-- adding members) but cannot remove themselves out of their own access.
drop policy if exists "conversations_update_participant" on conversations;
create policy "conversations_update_participant" on conversations
  for update
  using (auth.uid() = any(participant_ids))
  with check (auth.uid() = any(participant_ids));
