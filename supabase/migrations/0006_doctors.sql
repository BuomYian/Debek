-- doctors: clinical profile for staff whose profiles.role = 'doctor'
-- (Section 4, table 3).

create table public.doctors (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  specialization text not null,
  license_number text not null unique,
  qualifications text,
  consultation_fee numeric(10, 2) not null default 0 check (consultation_fee >= 0),
  bio text,
  is_accepting_appointments boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.doctors is 'One row per doctor, 1:1 with a profiles row whose role = doctor.';

create trigger trg_doctors_updated_at
  before update on public.doctors
  for each row execute function public.set_updated_at();

-- Data-integrity guard: a doctors row must point at a profile that is
-- actually role = 'doctor'. Catches the case where an admin links the
-- wrong profile when creating/re-pointing a doctor record.
create or replace function public.ensure_doctor_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles where id = new.profile_id and role = 'doctor'
  ) then
    raise exception 'profile_id must reference a profile with role = doctor';
  end if;
  return new;
end;
$$;

create trigger trg_doctors_profile_role_check
  before insert or update of profile_id on public.doctors
  for each row execute function public.ensure_doctor_profile_role();

create index doctors_specialization_idx on public.doctors (specialization);
