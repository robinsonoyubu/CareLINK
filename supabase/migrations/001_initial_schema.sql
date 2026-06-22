-- careLINK by RAFFATI — Database Schema
-- Run: supabase db push

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm"; -- for fuzzy text search

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table profiles (
  id            uuid references auth.users(id) on delete cascade primary key,
  email         text unique not null,
  full_name     text not null,
  role          text not null check (role in ('admin', 'professional', 'organization', 'client')),
  avatar_url    text,
  phone         text,
  date_of_birth date,
  address       text,
  gender        text check (gender in ('male', 'female', 'other')),
  nin           text unique,
  is_verified   boolean not null default false,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============================================================
-- PROFESSIONALS
-- ============================================================
create table professionals (
  id                    uuid primary key default uuid_generate_v4(),
  profile_id            uuid references profiles(id) on delete cascade unique not null,
  profession            text not null check (profession in ('nurse', 'nurse_assistant', 'caregiver', 'physiotherapist', 'doctor')),
  specialty             text,
  years_of_experience   int not null default 0,
  preferred_location    text,
  notification_number   text,
  bio                   text,
  workforce_status      text not null default 'available' check (
    workforce_status in ('available', 'assigned', 'on_leave', 'under_review', 'resigned', 'contract_completed', 'suspended')
  ),
  availability          text[] not null default '{}',
  rating                numeric(3, 2),
  total_assignments     int not null default 0,
  is_verified           boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index idx_professionals_status on professionals(workforce_status);
create index idx_professionals_profession on professionals(profession);

-- ============================================================
-- GUARANTORS
-- ============================================================
create table guarantors (
  id                   uuid primary key default uuid_generate_v4(),
  professional_id      uuid references professionals(id) on delete cascade not null,
  full_name            text not null,
  phone                text not null,
  residential_address  text not null,
  occupation           text not null,
  relationship         text not null,
  government_id_url    text,
  passport_url         text,
  created_at           timestamptz not null default now()
);

-- ============================================================
-- ORGANIZATIONS
-- ============================================================
create table organizations (
  id                  uuid primary key default uuid_generate_v4(),
  profile_id          uuid references profiles(id) on delete cascade unique not null,
  org_type            text not null check (org_type in ('hospital', 'clinic', 'hmo', 'ngo', 'school', 'nursing_home')),
  organization_name   text not null,
  registration_number text,
  website             text,
  contact_person      text not null,
  is_verified         boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ============================================================
-- CLIENTS
-- ============================================================
create table clients (
  id                      uuid primary key default uuid_generate_v4(),
  profile_id              uuid references profiles(id) on delete cascade unique not null,
  emergency_contact_name  text,
  emergency_contact_phone text,
  medical_notes           text,
  is_verified             boolean not null default false,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- ============================================================
-- ASSIGNMENTS
-- ============================================================
create table assignments (
  id              uuid primary key default uuid_generate_v4(),
  professional_id uuid references professionals(id) on delete set null,
  client_id       uuid references clients(id) on delete set null,
  organization_id uuid references organizations(id) on delete set null,
  service_type    text not null check (service_type in ('home_care', 'nursing', 'caregiver', 'physiotherapy', 'staffing', 'outsourcing')),
  duration_type   text not null check (duration_type in ('hourly', 'daily', 'weekly', 'monthly', 'live_in')),
  title           text not null,
  description     text,
  start_date      date not null,
  end_date        date,
  status          text not null default 'pending' check (status in ('pending', 'active', 'completed', 'cancelled')),
  hourly_rate     numeric(10, 2),
  total_cost      numeric(10, 2),
  location        text not null,
  notes           text,
  assigned_by     uuid references profiles(id) not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint assignments_has_recipient check (client_id is not null or organization_id is not null)
);

create index idx_assignments_professional on assignments(professional_id);
create index idx_assignments_status on assignments(status);
create index idx_assignments_start_date on assignments(start_date);

-- ============================================================
-- SCHEDULES
-- ============================================================
create table schedules (
  id              uuid primary key default uuid_generate_v4(),
  assignment_id   uuid references assignments(id) on delete cascade not null,
  professional_id uuid references professionals(id) on delete cascade not null,
  date            date not null,
  start_time      time not null,
  end_time        time not null,
  status          text not null default 'scheduled' check (status in ('scheduled', 'completed', 'missed', 'cancelled')),
  notes           text,
  created_at      timestamptz not null default now()
);

create index idx_schedules_date on schedules(date);
create index idx_schedules_professional on schedules(professional_id);

-- ============================================================
-- SCORECARDS
-- ============================================================
create table scorecards (
  id                   uuid primary key default uuid_generate_v4(),
  professional_id      uuid references professionals(id) on delete cascade not null,
  assignment_id        uuid references assignments(id) on delete set null,
  period_month         int not null check (period_month between 1 and 12),
  period_year          int not null check (period_year >= 2020),
  attendance           numeric(5,2) not null check (attendance between 0 and 100),
  punctuality          numeric(5,2) not null check (punctuality between 0 and 100),
  professionalism      numeric(5,2) not null check (professionalism between 0 and 100),
  communication        numeric(5,2) not null check (communication between 0 and 100),
  clinical_competence  numeric(5,2) not null check (clinical_competence between 0 and 100),
  teamwork             numeric(5,2) not null check (teamwork between 0 and 100),
  patient_care         numeric(5,2) not null check (patient_care between 0 and 100),
  overall_score        numeric(5,2) generated always as (
    (attendance + punctuality + professionalism + communication + clinical_competence + teamwork + patient_care) / 7
  ) stored,
  notes                text,
  created_by           uuid references profiles(id) not null,
  created_at           timestamptz not null default now(),
  unique(professional_id, period_month, period_year)
);

-- ============================================================
-- RECOMMENDATIONS
-- ============================================================
create table recommendations (
  id              uuid primary key default uuid_generate_v4(),
  professional_id uuid references professionals(id) on delete cascade not null,
  created_by      uuid references profiles(id) not null,
  title           text not null,
  content         text not null,
  letter_url      text,
  is_public       boolean not null default false,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- DOCUMENTS
-- ============================================================
create table documents (
  id             uuid primary key default uuid_generate_v4(),
  owner_id       uuid references profiles(id) on delete cascade not null,
  document_type  text not null check (document_type in (
    'certificate', 'license', 'recommendation', 'government_id', 'passport', 'cv', 'cover_letter', 'other'
  )),
  name           text not null,
  file_url       text not null,
  is_verified    boolean not null default false,
  expires_at     date,
  created_at     timestamptz not null default now()
);

create index idx_documents_owner on documents(owner_id);

-- ============================================================
-- CONVERSATIONS + MESSAGES
-- ============================================================
create table conversations (
  id              uuid primary key default uuid_generate_v4(),
  type            text not null check (type in ('direct', 'group', 'assignment_team')),
  name            text,
  assignment_id   uuid references assignments(id) on delete set null,
  participant_ids uuid[] not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table messages (
  id              uuid primary key default uuid_generate_v4(),
  conversation_id uuid references conversations(id) on delete cascade not null,
  sender_id       uuid references profiles(id) on delete cascade not null,
  content         text not null,
  message_type    text not null default 'text' check (message_type in ('text', 'file', 'system')),
  file_url        text,
  is_read         boolean not null default false,
  created_at      timestamptz not null default now()
);

create index idx_messages_conversation on messages(conversation_id);
create index idx_messages_created_at on messages(created_at desc);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table notifications (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references profiles(id) on delete cascade not null,
  title       text not null,
  body        text not null,
  type        text not null check (type in ('assignment', 'booking', 'payment', 'reminder', 'system')),
  is_read     boolean not null default false,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

create index idx_notifications_user on notifications(user_id, is_read);

-- ============================================================
-- PAYMENTS
-- ============================================================
create table payments (
  id                  uuid primary key default uuid_generate_v4(),
  client_id           uuid references clients(id) on delete set null,
  organization_id     uuid references organizations(id) on delete set null,
  assignment_id       uuid references assignments(id) on delete set null,
  amount              numeric(12, 2) not null,
  currency            text not null default 'NGN',
  status              text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  provider            text not null check (provider in ('stripe', 'paystack')),
  provider_reference  text,
  invoice_url         text,
  paid_at             timestamptz,
  created_at          timestamptz not null default now()
);

create index idx_payments_status on payments(status);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
create table audit_logs (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid references profiles(id) on delete set null,
  action         text not null,
  resource_type  text,
  resource_id    uuid,
  old_values     jsonb,
  new_values     jsonb,
  ip_address     inet,
  created_at     timestamptz not null default now()
);

create index idx_audit_logs_user on audit_logs(user_id);
create index idx_audit_logs_created_at on audit_logs(created_at desc);

-- ============================================================
-- BLOG POSTS
-- ============================================================
create table blog_posts (
  id              uuid primary key default uuid_generate_v4(),
  slug            text unique not null,
  title           text not null,
  excerpt         text,
  content         text not null,
  cover_image_url text,
  category        text,
  tags            text[] default '{}',
  author_id       uuid references profiles(id),
  is_published    boolean not null default false,
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_blog_posts_slug on blog_posts(slug);
create index idx_blog_posts_published on blog_posts(is_published, published_at desc);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create profile on user signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'client')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- updated_at trigger
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at before update on profiles for each row execute function update_updated_at();
create trigger trg_professionals_updated_at before update on professionals for each row execute function update_updated_at();
create trigger trg_organizations_updated_at before update on organizations for each row execute function update_updated_at();
create trigger trg_clients_updated_at before update on clients for each row execute function update_updated_at();
create trigger trg_assignments_updated_at before update on assignments for each row execute function update_updated_at();
create trigger trg_conversations_updated_at before update on conversations for each row execute function update_updated_at();
create trigger trg_blog_posts_updated_at before update on blog_posts for each row execute function update_updated_at();
