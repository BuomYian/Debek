-- prescription_items: medication line items for a prescription
-- (Section 4, table 9).

create table public.prescription_items (
  id uuid primary key default gen_random_uuid(),
  prescription_id uuid not null references public.prescriptions (id) on delete cascade,
  medication_name text not null,
  dosage text not null,
  frequency text not null,
  duration text not null,
  route text,
  instructions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_prescription_items_updated_at
  before update on public.prescription_items
  for each row execute function public.set_updated_at();

create index prescription_items_prescription_id_idx on public.prescription_items (prescription_id);
-- Powers the "duplicate active medication" check (Section 5.6).
create index prescription_items_medication_name_idx on public.prescription_items (medication_name);
