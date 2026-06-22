-- Trigger: after a profile is inserted, create the role-specific record automatically.
-- The register page also calls /api/auth/complete-profile for extra fields;
-- this trigger is the safety net that ensures rows always exist.

create or replace function public.handle_new_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'professional' then
    insert into public.professionals (profile_id)
    values (new.id)
    on conflict (profile_id) do nothing;

  elsif new.role = 'organization' then
    insert into public.organizations (profile_id, name, type)
    values (new.id, coalesce(new.full_name, 'Unnamed'), 'hospital')
    on conflict (profile_id) do nothing;

  elsif new.role = 'client' then
    insert into public.clients (profile_id)
    values (new.id)
    on conflict (profile_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_profile_created on public.profiles;

create trigger on_profile_created
  after insert on public.profiles
  for each row execute procedure public.handle_new_profile();

-- Add provider_reference column to payments if missing (used by verify endpoint)
alter table public.payments
  add column if not exists provider_reference text;

-- Ensure Paystack/Stripe callback URLs resolve to the app
-- (No SQL needed — these are configured in the provider dashboards)
