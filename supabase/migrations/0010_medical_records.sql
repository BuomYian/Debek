-- medical_records: consultation notes (Section 4, table 7; Section 5.5).
-- Append-only in spirit: edits are allowed (RLS restricts them to the
-- authoring doctor) but every change is captured in audit_logs via the
-- trigger added in 0018_audit_triggers.sql.

create table public.medical_records (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete restrict,
  doctor_id uuid not null references public.doctors (id) on delete restrict,
  appointment_id uuid references public.appointments (id) on delete set null,
  visit_date date not null default current_date,
  chief_complaint text not null,
  symptoms text,
  -- Structured vitals: bp, temp, pulse, weight, height, respiratory_rate,
  -- o2_sat (Section 4). Kept as jsonb rather than one column per vital so
  -- the client-side Zod schema stays the single source of truth for
  -- shape/range validation (Section 7) without a migration per field.
  vital_signs jsonb,
  examination_findings text,
  diagnosis text,
  treatment_plan text,
  clinical_notes text,
  follow_up_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.medical_records is 'One row per consultation. Edits are audit-logged, not blocked.';

create trigger trg_medical_records_updated_at
  before update on public.medical_records
  for each row execute function public.set_updated_at();

create index medical_records_patient_id_idx on public.medical_records (patient_id);
create index medical_records_doctor_id_idx on public.medical_records (doctor_id);
create index medical_records_appointment_id_idx on public.medical_records (appointment_id);
-- Powers the patient history timeline (Section 5.5), newest visit first.
create index medical_records_patient_visit_date_idx on public.medical_records (patient_id, visit_date desc);
