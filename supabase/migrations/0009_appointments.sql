-- appointments: the centrepiece table (Section 4, table 6; Section 5.4).
--
-- The EXCLUDE constraint below is what makes double-booking a doctor
-- impossible at the database level, not just something the UI/server
-- action happens to check first (Section 4 "Critical", Section 7 data
-- integrity, Acceptance Criteria). A `unique` index or a server-side
-- "check first, then insert" is not equivalent to this: it still has a
-- race window between the check and the write, and EXCLUDE closes that.

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  appointment_number text not null unique default public.next_document_number('appointment', 'APT'),
  patient_id uuid not null references public.patients (id) on delete restrict,
  doctor_id uuid not null references public.doctors (id) on delete restrict,
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  status public.appointment_status not null default 'scheduled',
  reason_for_visit text,
  notes text,
  booked_by uuid references public.profiles (id) on delete set null,
  cancelled_reason text,
  rescheduled_from uuid references public.appointments (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_time_order check (scheduled_end > scheduled_start),
  -- Same doctor cannot hold two overlapping appointments unless one of
  -- them has been cancelled. (Literal reading of Section 4: only
  -- "non-cancelled" appointments are excluded from the check — a
  -- no_show still blocks the slot it occupied. If your clinic wants a
  -- no_show slot to become reusable immediately, widen this predicate to
  -- `where (status not in ('cancelled', 'no_show'))`.)
  constraint appointments_no_overlap exclude using gist (
    doctor_id with =,
    tstzrange(scheduled_start, scheduled_end, '[)') with &&
  ) where (status <> 'cancelled')
);

comment on table public.appointments is 'Bookings. Overlap for the same doctor is enforced at the DB level via appointments_no_overlap.';

create trigger trg_appointments_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();

-- Section 4: index scheduled_start and status explicitly, plus the FKs.
create index appointments_scheduled_start_idx on public.appointments (scheduled_start);
create index appointments_status_idx on public.appointments (status);
create index appointments_patient_id_idx on public.appointments (patient_id);
create index appointments_doctor_id_idx on public.appointments (doctor_id);
-- Powers "today's queue" and "doctor's day/week/month calendar" views.
create index appointments_doctor_start_idx on public.appointments (doctor_id, scheduled_start);
