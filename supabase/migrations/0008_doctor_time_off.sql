-- doctor_time_off: one-off leave/blocks that remove otherwise-available
-- slots (Section 4, table 5; Section 5.3 time-off entry).

create table public.doctor_time_off (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors (id) on delete cascade,
  start_datetime timestamptz not null,
  end_datetime timestamptz not null,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint doctor_time_off_time_order check (end_datetime > start_datetime)
);

comment on table public.doctor_time_off is 'Blocks appointment slot generation for the given doctor and window.';

create trigger trg_doctor_time_off_updated_at
  before update on public.doctor_time_off
  for each row execute function public.set_updated_at();

create index doctor_time_off_doctor_id_idx on public.doctor_time_off (doctor_id);
create index doctor_time_off_window_idx on public.doctor_time_off using gist (
  doctor_id,
  tstzrange(start_datetime, end_datetime, '[)')
);
