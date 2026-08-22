-- Clears every seed-populated table so supabase/seed.sql can be
-- re-run cleanly (e.g. after changing what it seeds — Kenyan names to
-- South Sudanese, USD-scale fees to SSP-scale). Meant for this
-- project's demo/seed data only — see the header of supabase/seed.sql.
--
-- Why this can't just be `delete from ...`: appointments/medical_records
-- hold `on delete restrict` foreign keys to patients/doctors (0009,
-- 0010 — deliberately, so nothing accidentally cascades away a
-- patient's history in normal app use). TRUNCATE ... CASCADE ignores
-- that restriction — it's a DELETE-only semantic — and pulls in every
-- table that references the ones listed, so ordering doesn't matter
-- here the way it would for hand-ordered DELETEs.
--
-- Deliberately NOT included: public.profiles and public.doctors.
-- profiles.id references auth.users(id) on delete cascade
-- (0004_profiles.sql), so those two tables clear themselves once
-- scripts/reset-seed-users.mjs deletes the underlying auth.users rows —
-- doing it there (via the Admin API) rather than here keeps GoTrue's
-- own state (identities, sessions) from going stale. Run that script
-- either before or after this file; order between the two doesn't
-- matter since neither one depends on data the other clears.
--
-- Usage:
--   psql "$DATABASE_URL" -f supabase/reset-seed-data.sql
--   node scripts/reset-seed-users.mjs
--   node scripts/seed-users.mjs
--   psql "$DATABASE_URL" -f supabase/seed.sql

begin;

truncate table
  public.payments,
  public.invoice_items,
  public.invoices,
  public.prescription_items,
  public.prescriptions,
  public.patient_files,
  public.medical_records,
  public.appointments,
  public.doctor_time_off,
  public.doctor_availability,
  public.audit_logs,
  public.patients,
  public.document_number_counters
cascade;

commit;

select 'patients' as table_name, count(*) from public.patients
union all select 'appointments', count(*) from public.appointments
union all select 'invoices', count(*) from public.invoices
union all select 'profiles (staff/doctors — cleared separately)', count(*) from public.profiles;
