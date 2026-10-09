-- MedLINK by RGH — Master Workflow v8
-- Adds: service providers (hospitals, diagnostics, pharmacies, ambulance),
-- unified bookings + transfer payments, provider chats, ratings, Dispute Centre,
-- Earn (ads, coins, OPay withdrawals), games, Health Gist, secure attendance
-- (dynamic QR + geofence + facial), Google Calendar links, professional
-- registration/verification and facility workforce delegation.

-- ============================================================
-- ROLES
-- 'admin' = RGH personnel. 'provider' = hospital / diagnostic / pharmacy /
-- ambulance partner staff managing their own services.
-- ============================================================
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('admin', 'professional', 'organization', 'client', 'provider'));

-- ============================================================
-- PRE-EXISTING FIXES (found while validating v8 against a real Postgres)
-- 1. profiles_professional_view queried profiles from inside a profiles policy,
--    so every authenticated read of profiles failed with "infinite recursion".
-- 2. The signup trigger (004) inserts professionals without a profession, which
--    violated NOT NULL and broke professional sign-ups. Default it to 'other';
--    /api/auth/complete-profile sets the real profession.
-- 3. The same trigger inserts organizations without contact_person (NOT NULL),
--    which broke organization sign-ups.
-- ============================================================
alter table organizations alter column contact_person drop not null;

create or replace function my_role()
returns text language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

drop policy if exists "profiles_professional_view" on profiles;
create policy "profiles_professional_view" on profiles
  for select using (role = 'professional' and my_role() in ('admin', 'professional'));

drop policy if exists "professionals_peer_view" on professionals;
create policy "professionals_peer_view" on professionals
  for select using (my_role() = 'professional');

-- ============================================================
-- PROFESSIONAL REGISTRATION & VERIFICATION
-- Sensitive identity/credential data lives in professional_credentials, which
-- only the professional and RGH can read. Public/facility views see the
-- non-sensitive professionals row and the RGH Verified badge.
-- ============================================================
alter table professionals add column if not exists marital_status text
  check (marital_status in ('single', 'married', 'divorced', 'widowed', 'other'));
alter table professionals add column if not exists application_status text not null default 'submitted'
  check (application_status in ('submitted', 'under_review', 'rgh_verification', 'verified', 'rejected'));
alter table professionals add column if not exists rejection_reason text;
alter table professionals add column if not exists reviewed_by uuid references profiles(id);
alter table professionals add column if not exists reviewed_at timestamptz;
alter table professionals add column if not exists skills text[] not null default '{}';
alter table professionals add column if not exists qualifications text[] not null default '{}';
alter table professionals add column if not exists verified_medlink_months int not null default 0;
alter table professionals add column if not exists rating_count int not null default 0;

alter table professionals drop constraint if exists professionals_profession_check;
alter table professionals add constraint professionals_profession_check check (profession in (
  'nurse', 'nurse_assistant', 'caregiver', 'physiotherapist', 'doctor',
  'pharmacist', 'laboratory_scientist', 'paramedic', 'occupational_therapist', 'other'
));
alter table professionals alter column profession set default 'other';

create table if not exists professional_credentials (
  professional_id             uuid primary key references professionals(id) on delete cascade,
  nin                         text,
  government_id_url           text,
  passport_photo_url          text,
  -- Nurses: professional licence OR notification number (+ practising licence expiry)
  license_kind                text check (license_kind in ('professional_license', 'notification_number')),
  license_number              text,
  license_document_url        text,
  license_expiry_date         date,
  -- Caregivers / nurse assistants: training OR competency certificate
  certificate_kind            text check (certificate_kind in ('training_certificate', 'competency_certificate')),
  certificate_url             text,
  updated_at                  timestamptz not null default now()
);

-- Move NIN off the broadly readable profiles row.
insert into professional_credentials (professional_id, nin)
  select pr.id, p.nin from professionals pr join profiles p on p.id = pr.profile_id where p.nin is not null
  on conflict (professional_id) do update set nin = excluded.nin;
update profiles set nin = null where nin is not null and id in (select profile_id from professionals);

alter table guarantors add column if not exists email text;

create table if not exists professional_application_events (
  id               uuid primary key default uuid_generate_v4(),
  professional_id  uuid not null references professionals(id) on delete cascade,
  actor_id         uuid references profiles(id),
  from_status      text,
  to_status        text not null,
  note             text,
  created_at       timestamptz not null default now()
);

-- ============================================================
-- FACILITY WORKFORCE, DELEGATION & ASSIGNMENT PIPELINE
-- ============================================================
create table if not exists organization_members (
  id               uuid primary key default uuid_generate_v4(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  profile_id       uuid not null references profiles(id) on delete cascade,
  member_role      text not null check (member_role in ('org_admin', 'attendance_admin')),
  granted_by       uuid references profiles(id),
  created_at       timestamptz not null default now(),
  unique (organization_id, profile_id, member_role)
);

create table if not exists facility_staff (
  id                      uuid primary key default uuid_generate_v4(),
  organization_id         uuid not null references organizations(id) on delete cascade,
  professional_id         uuid not null references professionals(id) on delete cascade,
  assignment_id           uuid references assignments(id) on delete set null,
  facility_status         text not null default 'active' check (facility_status in ('active', 'on_leave', 'suspended', 'inactive')),
  facility_verified_at    timestamptz,
  facility_verified_by    uuid references profiles(id),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (organization_id, professional_id)
);

alter table assignments add column if not exists stage text not null default 'request' check (stage in (
  'request', 'rgh_review', 'matching', 'candidate_selection', 'rgh_assignment',
  'facility_verification', 'staff_assigned', 'service_delivery', 'completed', 'cancelled'
));

-- Helpers used by RLS
create or replace function is_org_admin(org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from organizations where id = org and profile_id = auth.uid())
      or exists (select 1 from organization_members where organization_id = org and profile_id = auth.uid() and member_role = 'org_admin');
$$;

create or replace function can_manage_attendance(org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select is_admin() or is_org_admin(org)
      or exists (select 1 from organization_members where organization_id = org and profile_id = auth.uid() and member_role = 'attendance_admin');
$$;

create or replace function my_professional_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from professionals where profile_id = auth.uid();
$$;

-- ============================================================
-- SERVICE PROVIDERS
-- ============================================================
create table if not exists service_providers (
  id                     uuid primary key default uuid_generate_v4(),
  kind                   text not null check (kind in ('hospital', 'diagnostic', 'pharmacy', 'ambulance')),
  name                   text not null,
  description            text,
  address                text,
  city                   text,
  state                  text,
  lat                    double precision,
  lng                    double precision,
  phone                  text,
  email                  text,
  logo_url               text,
  organization_id        uuid references organizations(id) on delete set null,
  offers_home_collection boolean not null default false,
  service_area           text,
  is_emergency_partner   boolean not null default false,
  emergency_phone        text,
  -- Payment instructions shown after an order is placed (bank transfer)
  bank_name              text,
  bank_account_name      text,
  bank_account_number    text,
  is_verified            boolean not null default false,
  is_active              boolean not null default true,
  rating_avg             numeric(3, 2),
  rating_count           int not null default 0,
  avg_response_minutes   int,
  response_sample_size   int not null default 0,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index if not exists idx_providers_kind on service_providers(kind, is_active);

create table if not exists provider_members (
  provider_id  uuid not null references service_providers(id) on delete cascade,
  profile_id   uuid not null references profiles(id) on delete cascade,
  member_role  text not null default 'staff' check (member_role in ('owner', 'staff', 'pharmacist', 'dispatcher')),
  primary key (provider_id, profile_id)
);

create or replace function is_provider_member(p uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from provider_members where provider_id = p and profile_id = auth.uid());
$$;

-- Departments (hospital), tests (diagnostics), products (pharmacy), vehicles (ambulance)
create table if not exists provider_services (
  id                     uuid primary key default uuid_generate_v4(),
  provider_id            uuid not null references service_providers(id) on delete cascade,
  category               text not null check (category in ('department', 'test', 'product', 'vehicle', 'service')),
  name                   text not null,
  description            text,
  price                  numeric(12, 2),
  currency               text not null default 'NGN',
  requires_payment       boolean not null default true,
  -- pharmacy
  strength               text,
  requires_prescription  boolean not null default false,
  in_stock               boolean not null default true,
  -- diagnostics
  home_collection        boolean not null default false,
  turnaround_hours       int,
  -- ambulance
  vehicle_type           text check (vehicle_type in ('basic_life_support', 'advanced_life_support', 'patient_transport', 'neonatal', 'other')),
  equipment              text[] not null default '{}',
  is_available           boolean not null default true,
  is_active              boolean not null default true,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index if not exists idx_provider_services_provider on provider_services(provider_id, category);

create table if not exists provider_doctors (
  id             uuid primary key default uuid_generate_v4(),
  provider_id    uuid not null references service_providers(id) on delete cascade,
  department_id  uuid references provider_services(id) on delete set null,
  professional_id uuid references professionals(id) on delete set null,
  full_name      text not null,
  specialty      text,
  is_active      boolean not null default true
);

create table if not exists provider_availability (
  id            uuid primary key default uuid_generate_v4(),
  provider_id   uuid not null references service_providers(id) on delete cascade,
  service_id    uuid references provider_services(id) on delete cascade,
  doctor_id     uuid references provider_doctors(id) on delete cascade,
  weekday       int not null check (weekday between 0 and 6),
  start_time    time not null,
  end_time      time not null,
  slot_minutes  int not null default 30 check (slot_minutes between 5 and 480),
  capacity      int not null default 1
);

-- ============================================================
-- BOOKINGS — single hub
-- ============================================================
create table if not exists bookings (
  id                  uuid primary key default uuid_generate_v4(),
  reference           text unique not null,
  kind                text not null check (kind in ('professional_care', 'hospital', 'diagnostic', 'pharmacy', 'ambulance')),
  booker_id           uuid not null references profiles(id) on delete cascade,
  provider_id         uuid references service_providers(id) on delete set null,
  service_id          uuid references provider_services(id) on delete set null,
  doctor_id           uuid references provider_doctors(id) on delete set null,
  assignment_id       uuid references assignments(id) on delete set null,
  professional_id     uuid references professionals(id) on delete set null,
  status              text not null default 'pending' check (status in (
    'pending', 'payment_pending', 'payment_verification', 'confirmed', 'in_progress', 'completed', 'cancelled',
    'declined', 'waitlisted', 'rgh_review', 'matching', 'sample_collected', 'results_ready', 'processing',
    'out_for_delivery', 'dispatched'
  )),
  payment_status      text not null default 'not_required' check (payment_status in (
    'not_required', 'awaiting_quote', 'awaiting_transfer', 'proof_submitted', 'verified', 'rejected', 'refunded'
  )),
  is_emergency        boolean not null default false,
  scheduled_at        timestamptz,
  ends_at             timestamptz,
  recurrence_rule     text,
  collection_method   text check (collection_method in ('in_centre', 'home')),
  pickup_address      text,
  pickup_lat          double precision,
  pickup_lng          double precision,
  destination_address text,
  patient_details     jsonb not null default '{}',
  items               jsonb not null default '[]',
  notes               text,
  amount              numeric(12, 2),
  currency            text not null default 'NGN',
  prescription_url    text,
  result_url          text,
  cancellation_reason text,
  completed_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_bookings_booker on bookings(booker_id, created_at desc);
create index if not exists idx_bookings_provider on bookings(provider_id, status);

create table if not exists booking_events (
  id           uuid primary key default uuid_generate_v4(),
  booking_id   uuid not null references bookings(id) on delete cascade,
  actor_id     uuid references profiles(id),
  from_status  text,
  to_status    text,
  note         text,
  created_at   timestamptz not null default now()
);

create or replace function can_see_booking(b bookings)
returns boolean language sql stable security definer set search_path = public as $$
  select b.booker_id = auth.uid() or is_admin() or (b.provider_id is not null and is_provider_member(b.provider_id));
$$;

-- Status history is written by trigger, never by hand.
create or replace function stamp_booking_completion()
returns trigger language plpgsql as $$
begin
  if new.status = 'completed' and new.completed_at is null then
    new.completed_at := now();
  end if;
  return new;
end;
$$;
drop trigger if exists trg_bookings_completion on bookings;
create trigger trg_bookings_completion before insert or update on bookings
  for each row execute function stamp_booking_completion();

create or replace function log_booking_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into booking_events (booking_id, actor_id, from_status, to_status)
    values (new.id, auth.uid(), case when tg_op = 'UPDATE' then old.status end, new.status);
  end if;
  return null;
end;
$$;
drop trigger if exists trg_bookings_status on bookings;
create trigger trg_bookings_status after insert or update on bookings
  for each row execute function log_booking_status();

-- ============================================================
-- PAYMENTS — Bank Transfer / Transfer Payment with proof + verification
-- ============================================================
create table if not exists transfer_payments (
  id                     uuid primary key default uuid_generate_v4(),
  booking_id             uuid not null references bookings(id) on delete cascade,
  payer_id               uuid not null references profiles(id),
  method                 text not null check (method in ('bank_transfer', 'transfer_payment')),
  amount                 numeric(12, 2) not null check (amount > 0),
  currency               text not null default 'NGN',
  transaction_reference  text,
  proof_url              text,
  status                 text not null default 'proof_submitted' check (status in ('proof_submitted', 'verified', 'rejected')),
  verified_by            uuid references profiles(id),
  verified_at            timestamptz,
  rejection_reason       text,
  created_at             timestamptz not null default now()
);
create index if not exists idx_transfer_payments_booking on transfer_payments(booking_id);

-- ============================================================
-- HUMAN CHAT — conversations linked to provider / product / booking context
-- ============================================================
alter table conversations drop constraint if exists conversations_type_check;
alter table conversations add constraint conversations_type_check
  check (type in ('direct', 'group', 'assignment_team', 'provider'));
alter table conversations add column if not exists chat_kind text check (chat_kind in ('pharmacist', 'diagnostic', 'hospital', 'ambulance'));
alter table conversations add column if not exists provider_id uuid references service_providers(id) on delete set null;
alter table conversations add column if not exists booking_id uuid references bookings(id) on delete set null;
alter table conversations add column if not exists service_id uuid references provider_services(id) on delete set null;
alter table conversations add column if not exists context_label text;

-- ============================================================
-- RATINGS & REVIEWS — only after a completed MedLINK transaction
-- ============================================================
create table if not exists reviews (
  id               uuid primary key default uuid_generate_v4(),
  booking_id       uuid not null references bookings(id) on delete cascade,
  reviewer_id      uuid not null references profiles(id) on delete cascade,
  provider_id      uuid references service_providers(id) on delete cascade,
  professional_id  uuid references professionals(id) on delete cascade,
  rating           int not null check (rating between 1 and 5),
  criteria         jsonb not null default '{}', -- professionalism, punctuality, communication, respect, reliability, …
  comment          text,
  is_hidden        boolean not null default false,
  created_at       timestamptz not null default now(),
  unique (booking_id, reviewer_id)
);

create or replace function enforce_review_eligibility()
returns trigger language plpgsql security definer set search_path = public as $$
declare b bookings;
begin
  select * into b from bookings where id = new.booking_id;
  if b.id is null or b.booker_id <> new.reviewer_id or b.status <> 'completed' then
    raise exception 'Reviews are only available for your own completed MedLINK bookings';
  end if;
  new.provider_id := coalesce(new.provider_id, b.provider_id);
  new.professional_id := coalesce(new.professional_id, b.professional_id);
  return new;
end;
$$;
drop trigger if exists trg_reviews_eligibility on reviews;
create trigger trg_reviews_eligibility before insert on reviews
  for each row execute function enforce_review_eligibility();

create or replace function refresh_rating_aggregates()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.provider_id is not null then
    update service_providers sp set
      rating_avg = (select round(avg(rating)::numeric, 2) from reviews where provider_id = sp.id and not is_hidden),
      rating_count = (select count(*) from reviews where provider_id = sp.id and not is_hidden)
    where sp.id = new.provider_id;
  end if;
  if new.professional_id is not null then
    update professionals pr set
      rating = (select round(avg(rating)::numeric, 2) from reviews where professional_id = pr.id and not is_hidden),
      rating_count = (select count(*) from reviews where professional_id = pr.id and not is_hidden)
    where pr.id = new.professional_id;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_reviews_aggregate on reviews;
create trigger trg_reviews_aggregate after insert or update on reviews
  for each row execute function refresh_rating_aggregates();

-- ============================================================
-- DISPUTE CENTRE
-- ============================================================
create table if not exists disputes (
  id            uuid primary key default uuid_generate_v4(),
  reference     text unique not null,
  opened_by     uuid not null references profiles(id),
  booking_id    uuid references bookings(id) on delete set null,
  category      text not null check (category in (
    'payment', 'provider_issue', 'no_show', 'pharmacy_order', 'diagnostic', 'appointment', 'ambulance', 'other'
  )),
  subject       text not null,
  description   text not null,
  status        text not null default 'open' check (status in (
    'open', 'under_review', 'investigating', 'awaiting_response', 'resolved', 'closed'
  )),
  resolution    text,
  assigned_to   uuid references profiles(id),
  resolved_at   timestamptz,
  closed_at     timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists dispute_events (
  id            uuid primary key default uuid_generate_v4(),
  dispute_id    uuid not null references disputes(id) on delete cascade,
  actor_id      uuid references profiles(id),
  kind          text not null check (kind in ('comment', 'evidence', 'status_change')),
  body          text,
  evidence_url  text,
  from_status   text,
  to_status     text,
  created_at    timestamptz not null default now()
);

create or replace function log_dispute_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    insert into dispute_events (dispute_id, actor_id, kind, from_status, to_status)
    values (new.id, auth.uid(), 'status_change', old.status, new.status);
    if new.status = 'resolved' then new.resolved_at := coalesce(new.resolved_at, now()); end if;
    if new.status = 'closed' then new.closed_at := coalesce(new.closed_at, now()); end if;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_disputes_status on disputes;
create trigger trg_disputes_status before update on disputes
  for each row execute function log_dispute_status();

-- ============================================================
-- EARN — adverts, coins, OPay withdrawals
-- ============================================================
create table if not exists earn_settings (
  id                      int primary key default 1 check (id = 1),
  min_withdrawal_coins    int not null default 100,
  naira_per_coin          numeric(10, 4), -- MUST be configured by RGH before withdrawals open
  daily_ad_cap_per_user   int not null default 20,
  withdrawals_enabled     boolean not null default false,
  updated_at              timestamptz not null default now()
);
insert into earn_settings (id) values (1) on conflict do nothing;

create table if not exists ad_campaigns (
  id                    uuid primary key default uuid_generate_v4(),
  name                  text not null,
  advertiser            text not null,
  category              text not null, -- moderated; sensitive health targeting is not allowed
  headline              text not null,
  body                  text,
  creative_url          text,
  click_url             text,
  min_view_seconds      int not null default 15 check (min_view_seconds between 5 and 120),
  earn_eligible         boolean not null default true,
  placements            text[] not null default '{earn_feed,game_break,rewarded_game}',
  daily_cap_per_user    int not null default 3,
  total_completions_cap int,
  completions           int not null default 0,
  is_active             boolean not null default true,
  starts_at             timestamptz not null default now(),
  ends_at               timestamptz,
  created_at            timestamptz not null default now()
);

create table if not exists ad_impressions (
  id             uuid primary key default uuid_generate_v4(),
  campaign_id    uuid not null references ad_campaigns(id) on delete cascade,
  profile_id     uuid not null references profiles(id) on delete cascade,
  placement      text not null check (placement in ('earn_feed', 'game_break', 'rewarded_game')),
  game_slug      text,
  started_at     timestamptz not null default now(),
  completed_at   timestamptz,
  status         text not null default 'started' check (status in ('started', 'completed', 'rejected')),
  reject_reason  text,
  coin_awarded   boolean not null default false
);
create index if not exists idx_ad_impressions_profile on ad_impressions(profile_id, started_at desc);

create table if not exists payout_accounts (
  profile_id      uuid primary key references profiles(id) on delete cascade,
  provider        text not null default 'opay' check (provider = 'opay'),
  account_name    text not null,
  account_number  text not null,
  is_verified     boolean not null default false,
  verified_at     timestamptz,
  updated_at      timestamptz not null default now()
);

create table if not exists coin_wallets (
  profile_id  uuid primary key references profiles(id) on delete cascade,
  balance     int not null default 0 check (balance >= 0),
  cycle       int not null default 1,
  updated_at  timestamptz not null default now()
);

create table if not exists withdrawals (
  id                uuid primary key default uuid_generate_v4(),
  reference         text unique not null,
  profile_id        uuid not null references profiles(id) on delete cascade,
  coins             int not null check (coins > 0),
  naira_per_coin    numeric(10, 4) not null,
  amount            numeric(12, 2) not null,
  account_name      text not null,
  account_masked    text not null,
  status            text not null default 'processing' check (status in ('processing', 'successful', 'failed')),
  cycle             int not null,
  failure_reason    text,
  processed_by      uuid references profiles(id),
  requested_at      timestamptz not null default now(),
  processed_at      timestamptz
);

create table if not exists coin_ledger (
  id             uuid primary key default uuid_generate_v4(),
  profile_id     uuid not null references profiles(id) on delete cascade,
  delta          int not null,
  reason         text not null check (reason in ('ad_reward', 'withdrawal', 'withdrawal_reversal', 'adjustment')),
  impression_id  uuid unique references ad_impressions(id),  -- one coin per impression, ever
  withdrawal_id  uuid references withdrawals(id),
  note           text,
  created_at     timestamptz not null default now()
);

-- Start an advert view. Server timestamps the start so completion can be timed.
create or replace function start_ad_impression(p_campaign uuid, p_placement text, p_game text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare imp uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from ad_campaigns where id = p_campaign and is_active
                 and starts_at <= now() and (ends_at is null or ends_at > now())
                 and p_placement = any(placements)) then
    raise exception 'advert unavailable';
  end if;
  insert into ad_impressions (campaign_id, profile_id, placement, game_slug)
  values (p_campaign, auth.uid(), p_placement, p_game) returning id into imp;
  return imp;
end;
$$;

-- Complete an advert view. 1 valid completed eligible advert = 1 coin.
-- Rejects: too fast, already completed, campaign/daily caps, non-eligible placement.
create or replace function complete_ad_impression(p_impression uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  imp ad_impressions;
  camp ad_campaigns;
  settings earn_settings;
  today_rewards int;
  today_campaign int;
  awarded boolean := false;
  v_reason text;
begin
  select * into imp from ad_impressions where id = p_impression and profile_id = auth.uid() for update;
  if imp.id is null then raise exception 'impression not found'; end if;
  if imp.status <> 'started' then return jsonb_build_object('status', imp.status, 'coin_awarded', imp.coin_awarded); end if;

  select * into camp from ad_campaigns where id = imp.campaign_id for update;
  select * into settings from earn_settings where id = 1;

  if now() - imp.started_at < make_interval(secs => camp.min_view_seconds) then
    v_reason := 'viewed_too_briefly';
  end if;

  if v_reason is null and camp.earn_eligible and imp.placement in ('earn_feed', 'game_break') then
    select count(*) into today_rewards from coin_ledger
      where profile_id = auth.uid() and reason = 'ad_reward' and created_at >= date_trunc('day', now());
    select count(*) into today_campaign from ad_impressions
      where profile_id = auth.uid() and campaign_id = camp.id and coin_awarded and started_at >= date_trunc('day', now());
    if today_rewards >= settings.daily_ad_cap_per_user then
      v_reason := 'daily_cap_reached';
    elsif today_campaign >= camp.daily_cap_per_user then
      v_reason := 'campaign_daily_cap_reached';
    elsif camp.total_completions_cap is not null and camp.completions >= camp.total_completions_cap then
      v_reason := 'campaign_cap_reached';
    else
      awarded := true;
    end if;
  end if;

  if v_reason = 'viewed_too_briefly' then
    update ad_impressions set status = 'rejected', reject_reason = v_reason, completed_at = now() where id = imp.id;
    return jsonb_build_object('status', 'rejected', 'reason', v_reason, 'coin_awarded', false);
  end if;

  update ad_impressions set status = 'completed', completed_at = now(), coin_awarded = awarded, reject_reason = v_reason
    where id = imp.id;
  update ad_campaigns set completions = completions + 1 where id = camp.id;

  if awarded then
    insert into coin_wallets (profile_id) values (auth.uid()) on conflict do nothing;
    insert into coin_ledger (profile_id, delta, reason, impression_id) values (auth.uid(), 1, 'ad_reward', imp.id);
    update coin_wallets set balance = balance + 1, updated_at = now() where profile_id = auth.uid();
  end if;

  return jsonb_build_object('status', 'completed', 'coin_awarded', awarded, 'reason', v_reason);
end;
$$;

-- Withdraw the whole balance to the verified OPay account. Wallet resets to 0.
create or replace function request_withdrawal(p_reference text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  w coin_wallets;
  acct payout_accounts;
  settings earn_settings;
  wid uuid;
  masked text;
begin
  select * into settings from earn_settings where id = 1;
  if not settings.withdrawals_enabled or settings.naira_per_coin is null then
    raise exception 'Withdrawals are not open yet';
  end if;
  select * into acct from payout_accounts where profile_id = auth.uid();
  if acct.profile_id is null or not acct.is_verified then
    raise exception 'A verified OPay account is required';
  end if;
  select * into w from coin_wallets where profile_id = auth.uid() for update;
  if w.profile_id is null or w.balance < settings.min_withdrawal_coins then
    raise exception 'Minimum withdrawal is % coins', settings.min_withdrawal_coins;
  end if;
  if exists (select 1 from withdrawals where profile_id = auth.uid() and status = 'processing') then
    raise exception 'A withdrawal is already processing';
  end if;

  masked := repeat('*', greatest(length(acct.account_number) - 4, 0)) || right(acct.account_number, 4);
  insert into withdrawals (reference, profile_id, coins, naira_per_coin, amount, account_name, account_masked, cycle)
  values (p_reference, auth.uid(), w.balance, settings.naira_per_coin, round(w.balance * settings.naira_per_coin, 2),
          acct.account_name, masked, w.cycle)
  returning id into wid;

  insert into coin_ledger (profile_id, delta, reason, withdrawal_id) values (auth.uid(), -w.balance, 'withdrawal', wid);
  update coin_wallets set balance = 0, cycle = cycle + 1, updated_at = now() where profile_id = auth.uid();
  return wid;
end;
$$;

-- ============================================================
-- GAMES — sessions and perks (perks are separate from the Earn wallet)
-- ============================================================
create table if not exists game_sessions (
  id           uuid primary key default uuid_generate_v4(),
  profile_id   uuid not null references profiles(id) on delete cascade,
  game_slug    text not null,
  started_at   timestamptz not null default now(),
  ended_at     timestamptz,
  score        int,
  level        int,
  outcome      text check (outcome in ('completed', 'failed', 'quit'))
);
create index if not exists idx_game_sessions_slug on game_sessions(game_slug, score desc);

create table if not exists game_perks (
  profile_id  uuid not null references profiles(id) on delete cascade,
  game_slug   text not null,
  perk        text not null check (perk in ('extra_life', 'hint', 'continue_token')),
  quantity    int not null default 0 check (quantity >= 0),
  primary key (profile_id, game_slug, perk)
);

-- ============================================================
-- HEALTH GIST — community posts (not medically verified)
-- ============================================================
create table if not exists gist_posts (
  id                 uuid primary key default uuid_generate_v4(),
  author_id          uuid not null references profiles(id) on delete cascade,
  category           text not null check (category in ('experience', 'wellness_tip', 'question', 'story', 'education')),
  title              text not null,
  body               text not null,
  moderation_status  text not null default 'visible' check (moderation_status in ('visible', 'under_review', 'removed')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists idx_gist_posts_created on gist_posts(created_at desc);

create table if not exists gist_reactions (
  post_id     uuid not null references gist_posts(id) on delete cascade,
  profile_id  uuid not null references profiles(id) on delete cascade,
  value       smallint not null check (value in (-1, 1)),
  created_at  timestamptz not null default now(),
  primary key (post_id, profile_id)
);

create table if not exists gist_comments (
  id                 uuid primary key default uuid_generate_v4(),
  post_id            uuid not null references gist_posts(id) on delete cascade,
  author_id          uuid not null references profiles(id) on delete cascade,
  body               text not null,
  moderation_status  text not null default 'visible' check (moderation_status in ('visible', 'under_review', 'removed')),
  created_at         timestamptz not null default now()
);

create table if not exists gist_follows (
  follower_id  uuid not null references profiles(id) on delete cascade,
  followee_id  uuid not null references profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create table if not exists gist_reports (
  id           uuid primary key default uuid_generate_v4(),
  post_id      uuid references gist_posts(id) on delete cascade,
  comment_id   uuid references gist_comments(id) on delete cascade,
  reporter_id  uuid not null references profiles(id) on delete cascade,
  reason       text not null check (reason in ('misinformation', 'harassment', 'scam', 'privacy', 'other')),
  details      text,
  status       text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  reviewed_by  uuid references profiles(id),
  created_at   timestamptz not null default now(),
  check (post_id is not null or comment_id is not null)
);

create or replace view gist_post_stats with (security_invoker = true) as
  select p.id as post_id,
         count(*) filter (where r.value = 1)  as thumbs_up,
         count(*) filter (where r.value = -1) as thumbs_down,
         (select count(*) from gist_comments c where c.post_id = p.id and c.moderation_status = 'visible') as comments
  from gist_posts p left join gist_reactions r on r.post_id = p.id
  group by p.id;

-- ============================================================
-- SECURE STAFF ATTENDANCE — dynamic QR + geofence + facial/liveness
-- ============================================================
create table if not exists facility_sites (
  id                    uuid primary key default uuid_generate_v4(),
  organization_id       uuid not null references organizations(id) on delete cascade,
  name                  text not null,
  lat                   double precision not null,
  lng                   double precision not null,
  radius_m              int not null default 150 check (radius_m between 20 and 2000),
  max_accuracy_m        int not null default 50 check (max_accuracy_m between 5 and 500),
  qr_ttl_seconds        int not null default 30 check (qr_ttl_seconds between 10 and 120),
  is_active             boolean not null default true,
  created_at            timestamptz not null default now()
);

create table if not exists shifts (
  id               uuid primary key default uuid_generate_v4(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  site_id          uuid not null references facility_sites(id) on delete restrict,
  professional_id  uuid not null references professionals(id) on delete cascade,
  assignment_id    uuid references assignments(id) on delete set null,
  starts_at        timestamptz not null,
  ends_at          timestamptz not null,
  status           text not null default 'scheduled' check (status in ('scheduled', 'in_progress', 'completed', 'missed', 'cancelled')),
  clock_in_at      timestamptz,
  clock_out_at     timestamptz,
  duration_minutes int,
  has_exceptions   boolean not null default false,
  created_at       timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists idx_shifts_professional on shifts(professional_id, starts_at);

create table if not exists face_enrollments (
  professional_id      uuid primary key references professionals(id) on delete cascade,
  reference_image_path text not null, -- private storage bucket path; never public
  consent_at           timestamptz not null,
  enrolled_by          uuid references profiles(id),
  enrolled_at          timestamptz not null default now(),
  retention_until      date
);

-- Immutable audit log of every attempt (accepted, rejected or manual exception).
create table if not exists attendance_events (
  id                 uuid primary key default uuid_generate_v4(),
  shift_id           uuid not null references shifts(id) on delete restrict,
  professional_id    uuid not null references professionals(id) on delete restrict,
  organization_id    uuid not null references organizations(id) on delete restrict,
  site_id            uuid not null references facility_sites(id) on delete restrict,
  event_type         text not null check (event_type in ('clock_in', 'clock_out')),
  server_ts          timestamptz not null default now(),
  outcome            text not null check (outcome in ('accepted', 'rejected', 'manual_exception')),
  qr_result          text not null,
  qr_nonce           text,
  geofence_result    text not null,
  distance_m         int,
  accuracy_m         numeric(8, 2),
  face_result        text not null,
  face_score         numeric(5, 4),
  liveness_score     numeric(5, 4),
  device_info        jsonb not null default '{}', -- only what is justified: platform, app version, session id
  rejection_reasons  text[] not null default '{}',
  admin_id           uuid references profiles(id),
  exception_reason   text check (exception_reason in ('camera_failure', 'gps_failure', 'device_failure', 'connectivity_failure', 'false_rejection', 'other')),
  supporting_note    text,
  flagged            boolean not null default false
);
create index if not exists idx_attendance_events_shift on attendance_events(shift_id, server_ts);
-- A QR code can be used by a staff member once per event type: replay protection.
create unique index if not exists uq_attendance_qr_replay
  on attendance_events(professional_id, qr_nonce, event_type) where qr_nonce is not null and outcome = 'accepted';

create table if not exists attendance_corrections (
  id            uuid primary key default uuid_generate_v4(),
  event_id      uuid not null references attendance_events(id) on delete restrict,
  admin_id      uuid not null references profiles(id),
  old_status    text not null,
  new_status    text not null,
  reason        text not null,
  created_at    timestamptz not null default now()
);

create or replace function forbid_mutation()
returns trigger language plpgsql as $$
begin
  raise exception '% is append-only', tg_table_name;
end;
$$;
drop trigger if exists trg_attendance_events_immutable on attendance_events;
create trigger trg_attendance_events_immutable before update or delete on attendance_events
  for each row execute function forbid_mutation();
drop trigger if exists trg_attendance_corrections_immutable on attendance_corrections;
create trigger trg_attendance_corrections_immutable before update or delete on attendance_corrections
  for each row execute function forbid_mutation();

-- ============================================================
-- GOOGLE CALENDAR — tokens are server-only (no client policies)
-- ============================================================
create table if not exists calendar_integrations (
  profile_id     uuid primary key references profiles(id) on delete cascade,
  provider       text not null default 'google' check (provider = 'google'),
  google_email   text,
  access_token   text not null,
  refresh_token  text,
  expires_at     timestamptz,
  calendar_id    text not null default 'primary',
  auto_add       boolean not null default true,
  connected_at   timestamptz not null default now()
);

create table if not exists calendar_event_links (
  booking_id       uuid not null references bookings(id) on delete cascade,
  profile_id       uuid not null references profiles(id) on delete cascade,
  google_event_id  text not null,
  synced_at        timestamptz not null default now(),
  primary key (booking_id, profile_id)
);

-- ============================================================
-- PRIVACY CONSENTS (facial + precise location notices)
-- ============================================================
create table if not exists privacy_consents (
  profile_id   uuid not null references profiles(id) on delete cascade,
  consent      text not null check (consent in ('facial_verification', 'precise_location', 'marketing_ads', 'calendar_sync')),
  granted      boolean not null,
  notice_version text not null default 'v8',
  updated_at   timestamptz not null default now(),
  primary key (profile_id, consent)
);

-- ============================================================
-- NOTIFICATIONS — widen types for the central alert hub
-- ============================================================
alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check check (type in (
  'assignment', 'booking', 'payment', 'reminder', 'system', 'performance', 'message', 'alert',
  'chat', 'result', 'prescription', 'order', 'dispatch', 'waitlist', 'earn', 'attendance', 'dispute', 'verification'
));

-- updated_at triggers
create trigger trg_service_providers_updated_at before update on service_providers for each row execute function update_updated_at();
create trigger trg_provider_services_updated_at before update on provider_services for each row execute function update_updated_at();
create trigger trg_bookings_updated_at before update on bookings for each row execute function update_updated_at();
create trigger trg_disputes_updated_at before update on disputes for each row execute function update_updated_at();
create trigger trg_gist_posts_updated_at before update on gist_posts for each row execute function update_updated_at();
create trigger trg_facility_staff_updated_at before update on facility_staff for each row execute function update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table professional_credentials enable row level security;
alter table professional_application_events enable row level security;
alter table organization_members enable row level security;
alter table facility_staff enable row level security;
alter table service_providers enable row level security;
alter table provider_members enable row level security;
alter table provider_services enable row level security;
alter table provider_doctors enable row level security;
alter table provider_availability enable row level security;
alter table bookings enable row level security;
alter table booking_events enable row level security;
alter table transfer_payments enable row level security;
alter table reviews enable row level security;
alter table disputes enable row level security;
alter table dispute_events enable row level security;
alter table earn_settings enable row level security;
alter table ad_campaigns enable row level security;
alter table ad_impressions enable row level security;
alter table payout_accounts enable row level security;
alter table coin_wallets enable row level security;
alter table withdrawals enable row level security;
alter table coin_ledger enable row level security;
alter table game_sessions enable row level security;
alter table game_perks enable row level security;
alter table gist_posts enable row level security;
alter table gist_reactions enable row level security;
alter table gist_comments enable row level security;
alter table gist_follows enable row level security;
alter table gist_reports enable row level security;
alter table facility_sites enable row level security;
alter table shifts enable row level security;
alter table face_enrollments enable row level security;
alter table attendance_events enable row level security;
alter table attendance_corrections enable row level security;
alter table calendar_integrations enable row level security;
alter table calendar_event_links enable row level security;
alter table privacy_consents enable row level security;

-- Professional credentials & application history: the professional and RGH only.
create policy "credentials_own" on professional_credentials for all
  using (professional_id = my_professional_id()) with check (professional_id = my_professional_id());
create policy "credentials_rgh" on professional_credentials for all using (is_admin());
create policy "application_events_read" on professional_application_events for select
  using (is_admin() or professional_id = my_professional_id());
create policy "application_events_rgh" on professional_application_events for insert with check (is_admin());

-- Professionals: facilities may read non-sensitive rows of staff assigned to them.
create policy "professionals_facility_view" on professionals for select using (
  exists (select 1 from facility_staff fs where fs.professional_id = professionals.id and is_org_admin(fs.organization_id))
);

-- Facility workforce & delegation
create policy "org_members_read" on organization_members for select
  using (is_admin() or profile_id = auth.uid() or is_org_admin(organization_id));
create policy "org_members_manage" on organization_members for all
  using (is_admin() or is_org_admin(organization_id)) with check (is_admin() or is_org_admin(organization_id));
create policy "facility_staff_read" on facility_staff for select
  using (is_admin() or can_manage_attendance(organization_id) or professional_id = my_professional_id());
create policy "facility_staff_manage" on facility_staff for all
  using (is_admin() or is_org_admin(organization_id)) with check (is_admin() or is_org_admin(organization_id));

-- Providers & catalogue: public read of active listings; members manage their own.
create policy "providers_public_read" on service_providers for select using (is_active or is_admin() or is_provider_member(id));
create policy "providers_member_update" on service_providers for update using (is_provider_member(id) or is_admin());
create policy "providers_rgh_insert" on service_providers for insert with check (is_admin());
create policy "provider_members_read" on provider_members for select using (profile_id = auth.uid() or is_admin() or is_provider_member(provider_id));
create policy "provider_members_rgh" on provider_members for all using (is_admin());
create policy "provider_services_read" on provider_services for select using (is_active or is_provider_member(provider_id) or is_admin());
create policy "provider_services_manage" on provider_services for all
  using (is_provider_member(provider_id) or is_admin()) with check (is_provider_member(provider_id) or is_admin());
create policy "provider_doctors_read" on provider_doctors for select using (true);
create policy "provider_doctors_manage" on provider_doctors for all
  using (is_provider_member(provider_id) or is_admin()) with check (is_provider_member(provider_id) or is_admin());
create policy "provider_availability_read" on provider_availability for select using (true);
create policy "provider_availability_manage" on provider_availability for all
  using (is_provider_member(provider_id) or is_admin()) with check (is_provider_member(provider_id) or is_admin());

-- Bookings
create policy "bookings_read" on bookings for select using (can_see_booking(bookings));
-- Booking writes go through the API (service role) so status moves are validated.
create policy "booking_events_read" on booking_events for select
  using (exists (select 1 from bookings b where b.id = booking_id and can_see_booking(b)));

-- Transfer payments: payer submits proof; provider (or RGH for professional care) verifies.
create policy "transfer_payments_read" on transfer_payments for select
  using (exists (select 1 from bookings b where b.id = booking_id and can_see_booking(b)));
-- Proof submission and verification go through the API (service role).

-- Reviews
create policy "reviews_public_read" on reviews for select using (not is_hidden or reviewer_id = auth.uid() or is_admin());
create policy "reviews_insert_own" on reviews for insert with check (reviewer_id = auth.uid());
create policy "reviews_rgh_moderate" on reviews for update using (is_admin());

-- Disputes
create policy "disputes_read" on disputes for select using (
  opened_by = auth.uid() or is_admin()
  or exists (select 1 from bookings b where b.id = booking_id and b.provider_id is not null and is_provider_member(b.provider_id))
);
create policy "disputes_rgh_update" on disputes for update using (is_admin());
create policy "dispute_events_read" on dispute_events for select
  using (exists (select 1 from disputes d where d.id = dispute_id));
create policy "dispute_events_add" on dispute_events for insert with check (
  actor_id = auth.uid() and kind in ('comment', 'evidence') and exists (select 1 from disputes d where d.id = dispute_id)
);

-- Earn: users read their own; all writes go through security-definer functions.
create policy "earn_settings_read" on earn_settings for select using (true);
create policy "earn_settings_rgh" on earn_settings for update using (is_admin());
create policy "ad_campaigns_read" on ad_campaigns for select using (is_active or is_admin());
create policy "ad_campaigns_rgh" on ad_campaigns for all using (is_admin());
create policy "ad_impressions_own" on ad_impressions for select using (profile_id = auth.uid() or is_admin());
create policy "payout_accounts_own_read" on payout_accounts for select using (profile_id = auth.uid() or is_admin());
create policy "payout_accounts_own_write" on payout_accounts for insert with check (profile_id = auth.uid() and not is_verified);
create policy "payout_accounts_own_update" on payout_accounts for update
  using (profile_id = auth.uid() or is_admin()) with check (is_admin() or not is_verified);
create policy "coin_wallets_own" on coin_wallets for select using (profile_id = auth.uid() or is_admin());
create policy "coin_ledger_own" on coin_ledger for select using (profile_id = auth.uid() or is_admin());
create policy "withdrawals_own" on withdrawals for select using (profile_id = auth.uid() or is_admin());
create policy "withdrawals_rgh" on withdrawals for update using (is_admin());

-- Games
create policy "game_sessions_own" on game_sessions for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "game_sessions_leaderboard" on game_sessions for select using (score is not null);
create policy "game_perks_own" on game_perks for select using (profile_id = auth.uid());

-- Health Gist
create policy "gist_posts_read" on gist_posts for select using (moderation_status = 'visible' or author_id = auth.uid() or is_admin());
create policy "gist_posts_write" on gist_posts for insert with check (author_id = auth.uid() and moderation_status = 'visible');
create policy "gist_posts_edit_own" on gist_posts for update using (author_id = auth.uid() or is_admin());
create policy "gist_posts_delete_own" on gist_posts for delete using (author_id = auth.uid() or is_admin());
create policy "gist_reactions_read" on gist_reactions for select using (true);
create policy "gist_reactions_own" on gist_reactions for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "gist_comments_read" on gist_comments for select using (moderation_status = 'visible' or author_id = auth.uid() or is_admin());
create policy "gist_comments_write" on gist_comments for insert with check (author_id = auth.uid());
create policy "gist_comments_moderate" on gist_comments for update using (is_admin() or author_id = auth.uid());
create policy "gist_follows_read" on gist_follows for select using (true);
create policy "gist_follows_own" on gist_follows for all using (follower_id = auth.uid()) with check (follower_id = auth.uid());
create policy "gist_reports_submit" on gist_reports for insert with check (reporter_id = auth.uid());
create policy "gist_reports_read" on gist_reports for select using (reporter_id = auth.uid() or is_admin());
create policy "gist_reports_rgh" on gist_reports for update using (is_admin());

-- Attendance: facility admins/delegates manage; staff see their own. Events are
-- inserted only by the server (service role) after QR + geofence + face checks.
create policy "sites_read" on facility_sites for select using (
  can_manage_attendance(organization_id)
  or exists (select 1 from shifts s where s.site_id = facility_sites.id and s.professional_id = my_professional_id())
);
create policy "sites_manage" on facility_sites for all
  using (is_admin() or is_org_admin(organization_id)) with check (is_admin() or is_org_admin(organization_id));
create policy "shifts_read" on shifts for select using (professional_id = my_professional_id() or can_manage_attendance(organization_id));
create policy "shifts_manage" on shifts for all
  using (can_manage_attendance(organization_id)) with check (can_manage_attendance(organization_id));
create policy "face_enrollments_rgh" on face_enrollments for select using (is_admin());
create policy "attendance_events_read" on attendance_events for select
  using (professional_id = my_professional_id() or can_manage_attendance(organization_id));
create policy "attendance_corrections_read" on attendance_corrections for select using (
  is_admin() or exists (select 1 from attendance_events e where e.id = event_id
                        and (e.professional_id = my_professional_id() or can_manage_attendance(e.organization_id)))
);

-- Calendar: tokens never readable from the client.
create policy "calendar_links_own" on calendar_event_links for select using (profile_id = auth.uid());

create policy "privacy_consents_own" on privacy_consents for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- Realtime for provider chats and booking updates
do $$ begin
  alter publication supabase_realtime add table bookings;
exception when others then null; end $$;

-- ============================================================
-- PRIVATE FILE STORAGE (prescriptions, payment proofs, results, evidence,
-- credentials). Users write only under their own folder; others get access
-- through short-lived signed URLs issued by the API after an access check.
-- ============================================================
do $$ begin
  insert into storage.buckets (id, name, public) values ('medlink-private', 'medlink-private', false)
    on conflict (id) do nothing;
  create policy "medlink_private_own_write" on storage.objects for insert to authenticated
    with check (bucket_id = 'medlink-private' and (storage.foldername(name))[1] = auth.uid()::text);
  create policy "medlink_private_own_read" on storage.objects for select to authenticated
    using (bucket_id = 'medlink-private' and (storage.foldername(name))[1] = auth.uid()::text);
exception when undefined_table or invalid_schema_name or duplicate_object then
  raise notice 'storage schema not available; create the medlink-private bucket manually';
end $$;

-- ============================================================
-- NEW-MESSAGE NOTIFICATIONS (one unread alert per conversation per person)
-- ============================================================
create or replace function notify_new_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  conv conversations;
  recipient uuid;
  label text;
begin
  select * into conv from conversations where id = new.conversation_id;
  label := coalesce(conv.context_label, conv.name, 'a conversation');
  foreach recipient in array conv.participant_ids loop
    continue when recipient = new.sender_id;
    if not exists (select 1 from notifications where profile_id = recipient and type = 'chat' and not is_read
                   and link_url = '/chats?c=' || conv.id) then
      insert into notifications (profile_id, type, title, message, link_url)
      values (recipient, 'chat', 'New message', 'New message in ' || label, '/chats?c=' || conv.id);
    end if;
  end loop;
  return new;
end;
$$;
drop trigger if exists trg_messages_notify on messages;
create trigger trg_messages_notify after insert on messages for each row execute function notify_new_message();

-- ============================================================
-- HEALTH GIST author display names (profiles stay private under RLS)
-- ============================================================
alter table gist_posts add column if not exists author_name text;
alter table gist_comments add column if not exists author_name text;

create or replace function set_gist_author_name()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select split_part(full_name, ' ', 1) || coalesce(' ' || left(nullif(split_part(full_name, ' ', 2), ''), 1) || '.', '')
    into new.author_name from profiles where id = new.author_id;
  return new;
end;
$$;
drop trigger if exists trg_gist_posts_author on gist_posts;
create trigger trg_gist_posts_author before insert on gist_posts for each row execute function set_gist_author_name();
drop trigger if exists trg_gist_comments_author on gist_comments;
create trigger trg_gist_comments_author before insert on gist_comments for each row execute function set_gist_author_name();

-- ============================================================
-- Facility admins may see the basic profile of staff assigned to them.
-- (security definer avoids RLS recursion between profiles/professionals)
-- ============================================================
create or replace function facility_can_see_profile(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from facility_staff fs join professionals pr on pr.id = fs.professional_id
    where pr.profile_id = pid and can_manage_attendance(fs.organization_id)
  ) or exists (
    select 1 from organization_members m where m.profile_id = pid and is_org_admin(m.organization_id)
  );
$$;
create policy "profiles_facility_view" on profiles for select using (facility_can_see_profile(id));

-- Delegated members can read the organization they belong to.
create policy "organizations_member_read" on organizations for select using (
  exists (select 1 from organization_members m where m.organization_id = organizations.id and m.profile_id = auth.uid())
);

-- ============================================================
-- COLUMN GUARDS — row policies allow these updates, but some columns are
-- reserved for RGH or for the server (service role has no auth.uid()).
-- ============================================================
create or replace function guard_provider_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not is_admin() then
    new.is_verified := old.is_verified;
    new.is_active := old.is_active;
    new.kind := old.kind;
    new.rating_avg := old.rating_avg;
    new.rating_count := old.rating_count;
    new.avg_response_minutes := old.avg_response_minutes;
    new.response_sample_size := old.response_sample_size;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_guard_provider on service_providers;
create trigger trg_guard_provider before update on service_providers for each row execute function guard_provider_columns();

create or replace function guard_moderation_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not is_admin() then
    new.moderation_status := old.moderation_status;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_guard_gist_posts on gist_posts;
create trigger trg_guard_gist_posts before update on gist_posts for each row execute function guard_moderation_status();
drop trigger if exists trg_guard_gist_comments on gist_comments;
create trigger trg_guard_gist_comments before update on gist_comments for each row execute function guard_moderation_status();

-- Clock state changes only through the audited attendance APIs.
create or replace function guard_shift_clock()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    if tg_op = 'INSERT' then
      new.status := 'scheduled'; new.clock_in_at := null; new.clock_out_at := null;
      new.duration_minutes := null; new.has_exceptions := false;
    else
      new.clock_in_at := old.clock_in_at; new.clock_out_at := old.clock_out_at;
      new.duration_minutes := old.duration_minutes; new.has_exceptions := old.has_exceptions;
      if new.status is distinct from old.status and not (old.status = 'scheduled' and new.status in ('cancelled', 'missed')) then
        new.status := old.status;
      end if;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_guard_shift_clock on shifts;
create trigger trg_guard_shift_clock before insert or update on shifts for each row execute function guard_shift_clock();

-- Facility admins manage facility status/verification, not who is assigned.
create or replace function guard_facility_staff()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not is_admin() then
    if tg_op = 'INSERT' then raise exception 'Staff are assigned by RGH'; end if;
    new.organization_id := old.organization_id; new.professional_id := old.professional_id; new.assignment_id := old.assignment_id;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_guard_facility_staff on facility_staff;
create trigger trg_guard_facility_staff before insert or update on facility_staff for each row execute function guard_facility_staff();
