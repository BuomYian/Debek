-- profiles: extends auth.users with the staff data the app actually
-- needs (Section 4, table 1). One row per staff member (admin, doctor,
-- receptionist) — patients never get a row here.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role public.user_role not null,
  phone text,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Staff accounts (admin/doctor/receptionist). Extends auth.users 1:1.';

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row whenever a new auth.users row is created
-- (e.g. via supabase.auth.admin.inviteUserByEmail in the Phase 3 admin
-- invite flow). Role and full name are read from the invite's user
-- metadata; role defaults to the least-privileged role if omitted.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'receptionist'),
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Defence in depth against privilege escalation: RLS (0020) lets a staff
-- member update their own profile row (e.g. phone, avatar), but only an
-- admin may change `role` or `is_active` — even for their own row.
--
-- This only fires when auth.uid() is set, i.e. the write is coming
-- through a real user session (PostgREST/Supabase client with a JWT).
-- Writes with no JWT context — the service-role client, the seed
-- script, a migration — are exactly the trusted server-side paths RLS
-- itself already lets bypass these checks, so this trigger stands aside
-- for them too rather than blocking, say, an admin server action that
-- (correctly) uses the service-role client to deactivate a user.
create or replace function public.prevent_self_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and public.current_user_role() is distinct from 'admin' then
    if new.role is distinct from old.role or new.is_active is distinct from old.is_active then
      raise exception 'Only an admin can change role or active status.';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_profiles_prevent_privilege_escalation
  before update on public.profiles
  for each row execute function public.prevent_self_role_change();

create index profiles_role_idx on public.profiles (role);
