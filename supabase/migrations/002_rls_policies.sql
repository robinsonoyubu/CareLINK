-- careLINK by RAFFATI — Row Level Security Policies

-- ============================================================
-- Enable RLS on all tables
-- ============================================================
alter table profiles enable row level security;
alter table professionals enable row level security;
alter table guarantors enable row level security;
alter table organizations enable row level security;
alter table clients enable row level security;
alter table assignments enable row level security;
alter table schedules enable row level security;
alter table scorecards enable row level security;
alter table recommendations enable row level security;
alter table documents enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table notifications enable row level security;
alter table payments enable row level security;
alter table audit_logs enable row level security;
alter table blog_posts enable row level security;

-- Helper: is current user an admin?
create or replace function is_admin()
returns boolean language sql security definer as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ============================================================
-- PROFILES
-- ============================================================
create policy "profiles_self" on profiles
  for all using (id = auth.uid());

create policy "profiles_admin" on profiles
  for all using (is_admin());

-- Professionals can see other professionals' basic info (for messaging)
create policy "profiles_professional_view" on profiles
  for select using (
    role = 'professional' and
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'professional'))
  );

-- ============================================================
-- PROFESSIONALS
-- ============================================================
create policy "professionals_own" on professionals
  for all using (profile_id = auth.uid());

create policy "professionals_admin" on professionals
  for all using (is_admin());

-- Professionals can see each other (community hub)
create policy "professionals_peer_view" on professionals
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'professional')
  );

-- ============================================================
-- GUARANTORS
-- ============================================================
create policy "guarantors_own_professional" on guarantors
  for all using (
    exists (select 1 from professionals where id = professional_id and profile_id = auth.uid())
  );

create policy "guarantors_admin" on guarantors
  for all using (is_admin());

-- ============================================================
-- ORGANIZATIONS
-- ============================================================
create policy "organizations_own" on organizations
  for all using (profile_id = auth.uid());

create policy "organizations_admin" on organizations
  for all using (is_admin());

-- ============================================================
-- CLIENTS
-- ============================================================
create policy "clients_own" on clients
  for all using (profile_id = auth.uid());

create policy "clients_admin" on clients
  for all using (is_admin());

-- ============================================================
-- ASSIGNMENTS
-- ============================================================
-- Admins manage all
create policy "assignments_admin" on assignments
  for all using (is_admin());

-- Professionals see their own assignments
create policy "assignments_professional" on assignments
  for select using (
    exists (select 1 from professionals where id = professional_id and profile_id = auth.uid())
  );

-- Clients see their own assignments
create policy "assignments_client" on assignments
  for select using (
    exists (select 1 from clients where id = client_id and profile_id = auth.uid())
  );

-- Organizations see their own assignments
create policy "assignments_organization" on assignments
  for select using (
    exists (select 1 from organizations where id = organization_id and profile_id = auth.uid())
  );

-- ============================================================
-- SCHEDULES
-- ============================================================
create policy "schedules_admin" on schedules
  for all using (is_admin());

create policy "schedules_professional" on schedules
  for select using (
    exists (select 1 from professionals where id = professional_id and profile_id = auth.uid())
  );

-- ============================================================
-- SCORECARDS
-- ============================================================
create policy "scorecards_admin" on scorecards
  for all using (is_admin());

create policy "scorecards_professional_view" on scorecards
  for select using (
    exists (select 1 from professionals where id = professional_id and profile_id = auth.uid())
  );

-- ============================================================
-- DOCUMENTS
-- ============================================================
create policy "documents_own" on documents
  for all using (owner_id = auth.uid());

create policy "documents_admin" on documents
  for all using (is_admin());

-- ============================================================
-- MESSAGES & CONVERSATIONS
-- ============================================================
create policy "conversations_participant" on conversations
  for select using (auth.uid() = any(participant_ids));

create policy "conversations_admin" on conversations
  for all using (is_admin());

-- Professional-to-professional only for direct messages (enforced here + app layer)
create policy "messages_participant" on messages
  for select using (
    exists (
      select 1 from conversations
      where id = conversation_id and auth.uid() = any(participant_ids)
    )
  );

create policy "messages_send" on messages
  for insert with check (
    sender_id = auth.uid() and
    exists (
      select 1 from conversations
      where id = conversation_id and auth.uid() = any(participant_ids)
    )
  );

create policy "messages_admin" on messages
  for all using (is_admin());

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create policy "notifications_own" on notifications
  for all using (user_id = auth.uid());

create policy "notifications_admin_insert" on notifications
  for insert with check (is_admin());

-- ============================================================
-- PAYMENTS
-- ============================================================
create policy "payments_admin" on payments
  for all using (is_admin());

create policy "payments_client_view" on payments
  for select using (
    exists (select 1 from clients where id = client_id and profile_id = auth.uid())
  );

create policy "payments_org_view" on payments
  for select using (
    exists (select 1 from organizations where id = organization_id and profile_id = auth.uid())
  );

-- ============================================================
-- AUDIT LOGS
-- ============================================================
create policy "audit_logs_admin" on audit_logs
  for all using (is_admin());

-- ============================================================
-- BLOG POSTS
-- ============================================================
create policy "blog_posts_public_read" on blog_posts
  for select using (is_published = true);

create policy "blog_posts_admin" on blog_posts
  for all using (is_admin());
