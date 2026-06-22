-- Migration 003: Align column names with application code + add missing columns

-- ============================================================
-- ORGANIZATIONS: rename org_type → type, organization_name → name
-- add contact_email, contact_phone, address, city, state, country
-- ============================================================
alter table organizations rename column org_type to type;
alter table organizations rename column organization_name to name;
alter table organizations add column if not exists contact_email text;
alter table organizations add column if not exists contact_phone text;
alter table organizations add column if not exists address text;
alter table organizations add column if not exists city text;
alter table organizations add column if not exists state text;
alter table organizations add column if not exists country text default 'Nigeria';

-- Migrate contact_person → keep as-is (may be used elsewhere)

-- ============================================================
-- NOTIFICATIONS: rename user_id → profile_id, body → message
-- add link_url column
-- ============================================================
alter table notifications rename column user_id to profile_id;
alter table notifications rename column body to message;
alter table notifications add column if not exists link_url text;

-- Widen type constraint to include new types used in app
alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in ('assignment', 'booking', 'payment', 'reminder', 'system', 'performance', 'message', 'alert'));

-- Update index to use new column name
drop index if exists idx_notifications_user;
create index if not exists idx_notifications_profile on notifications(profile_id, is_read);

-- ============================================================
-- PAYMENTS: rename provider → payment_method, add payer_id column
-- ============================================================
alter table payments rename column provider to payment_method;
alter table payments add column if not exists payer_id uuid references profiles(id) on delete set null;

alter table payments drop constraint if exists payments_provider_check;
alter table payments add constraint payments_payment_method_check
  check (payment_method in ('stripe', 'paystack', 'bank_transfer', 'cash'));

-- ============================================================
-- ASSIGNMENTS: add requirements column (used by AI match feature)
-- ============================================================
alter table assignments add column if not exists requirements text;

-- ============================================================
-- PROFESSIONALS: rename notification_number → phone_number (typo)
-- ============================================================
alter table professionals rename column notification_number to phone_number;
