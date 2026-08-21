-- doctor_availability: recurring weekly template a doctor's bookable
-- slots are generated from (Section 4, table 4; Section 5.4 slot generation).

create table public.doctor_availability (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  slot_duration_minutes integer not null default 30 check (slot_duration_minutes > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint doctor_availability_time_order check (end_time > start_time),
  -- Prevent an admin/doctor from accidentally saving the same weekday
  -- template twice.
  constraint doctor_availability_unique_slot unique (doctor_id, day_of_week, start_time, end_time)
);

comment on table public.doctor_availability is 'Recurring weekly availability template. 0 = Sunday .. 6 = Saturday.';

create trigger trg_doctor_availability_updated_at
  before update on public.doctor_availability
  for each row execute function public.set_updated_at();

create index doctor_availability_doctor_id_idx on public.doctor_availability (doctor_id);
create index doctor_availability_day_idx on public.doctor_availability (doctor_id, day_of_week) where is_active;
