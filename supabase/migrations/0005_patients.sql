-- patients: the clinic's patient register (Section 4, table 2). Patients
-- are records, not users — no auth.users row, no login.

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  patient_number text not null unique default public.next_document_number('patient', 'DBK'),
  first_name text not null,
  last_name text not null,
  date_of_birth date not null,
  gender public.gender_type not null,
  phone text not null,
  email text,
  address text,
  national_id text,
  blood_group text,
  allergies text,
  chronic_conditions text,
  emergency_contact_name text,
  emergency_contact_phone text,
  registered_by uuid references public.profiles (id) on delete set null,
  is_active boolean not null default true,
  -- Full-text search over the fields Section 5.2 requires lookup by:
  -- name, phone, patient number.
  search_vector tsvector generated always as (
    to_tsvector(
      'simple',
      coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' ||
      coalesce(phone, '') || ' ' || coalesce(patient_number, '')
    )
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint patients_dob_not_future check (date_of_birth <= current_date),
  constraint patients_blood_group_valid check (
    blood_group is null or blood_group in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')
  )
);

comment on table public.patients is 'Patient register. Records, not users — never hard-deleted, only deactivated (is_active).';

create trigger trg_patients_updated_at
  before update on public.patients
  for each row execute function public.set_updated_at();

-- Section 4: indexes on frequently filtered columns + full-text search.
create index patients_last_name_idx on public.patients (last_name);
create index patients_phone_idx on public.patients (phone);
create index patients_is_active_idx on public.patients (is_active);
create index patients_search_vector_idx on public.patients using gin (search_vector);
-- Trigram indexes so partial/substring search (e.g. last 4 digits of a
-- phone number) stays index-backed instead of falling back to a seq scan.
create index patients_last_name_trgm_idx on public.patients using gin (last_name gin_trgm_ops);
create index patients_phone_trgm_idx on public.patients using gin (phone gin_trgm_ops);
