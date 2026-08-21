-- prescriptions: header row for a set of medication line items
-- (Section 4, table 8; Section 5.6). Issued by a doctor from within a
-- consultation.

create table public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  medical_record_id uuid not null references public.medical_records (id) on delete restrict,
  patient_id uuid not null references public.patients (id) on delete restrict,
  doctor_id uuid not null references public.doctors (id) on delete restrict,
  issued_date date not null default current_date,
  notes text,
  status public.prescription_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.prescriptions is 'Prescription header; line items live in prescription_items.';

create trigger trg_prescriptions_updated_at
  before update on public.prescriptions
  for each row execute function public.set_updated_at();

create index prescriptions_medical_record_id_idx on public.prescriptions (medical_record_id);
create index prescriptions_patient_id_idx on public.prescriptions (patient_id);
create index prescriptions_doctor_id_idx on public.prescriptions (doctor_id);
create index prescriptions_status_idx on public.prescriptions (status);
-- Powers the "duplicate active prescription" check (Section 5.6).
create index prescriptions_patient_status_idx on public.prescriptions (patient_id, status);
