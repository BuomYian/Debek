-- patient_files: metadata for files stored in Cloudinary (Section 4,
-- table 13; Section 5.8). Only metadata lives here — the actual bytes
-- live in Cloudinary, referenced by cloudinary_public_id so they can be
-- deleted properly from both places together.
--
-- patient_id is ON DELETE RESTRICT, not CASCADE: per Section 7, clinical
-- data must never be silently cascaded away when a patient row is
-- touched. In practice patients are only ever soft-deleted (is_active =
-- false), so this restrict is a safety net, not a day-to-day obstacle.

create table public.patient_files (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete restrict,
  medical_record_id uuid references public.medical_records (id) on delete set null,
  file_name text not null,
  file_type text not null,
  file_size integer not null check (file_size > 0),
  cloudinary_public_id text not null unique,
  cloudinary_url text not null,
  category public.file_category_type not null,
  description text,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_patient_files_updated_at
  before update on public.patient_files
  for each row execute function public.set_updated_at();

create index patient_files_patient_id_idx on public.patient_files (patient_id);
create index patient_files_medical_record_id_idx on public.patient_files (medical_record_id);
create index patient_files_category_idx on public.patient_files (category);
