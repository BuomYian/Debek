-- Row Level Security policies (Section 3: RLS is "defence in depth —
-- never trust the client", required alongside route middleware/proxy
-- guards and server action role re-checks).
--
-- Conventions used throughout this file:
--   - `anon` (unauthenticated) gets nothing, ever — patients are records,
--     not users, and there is no public-facing surface in v1.
--   - `authenticated` gets table-level GRANTs (below); RLS policies then
--     narrow that down per role, per Section 3's permissions matrix.
--   - public.current_user_role() / public.current_doctor_id() below are
--     SECURITY DEFINER, so policies can check the caller's role without
--     recursively re-evaluating RLS on profiles/doctors.

-- ── Lock out anon entirely ──────────────────────────────────────────────
-- Supabase's project bootstrap grants `anon` and `authenticated` broad
-- default privileges on every table in `public` (visible via
-- information_schema.role_table_grants) — RLS is what's meant to narrow
-- that down. That's functionally fine (an anon SELECT against a
-- policy-protected table just returns zero rows), but this project's
-- spec is explicit that patients never log in and anon should have no
-- foothold at all (Section 3). Revoking anon's table grants here makes
-- that fail-closed and explicit — an anon query gets a permission error,
-- not a silently-empty result — rather than relying solely on every
-- future table remembering to enable RLS correctly.
revoke all on all tables in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;

-- ── RLS helper functions ────────────────────────────────────────────────
-- Defined here (not in 0003 with the other shared functions) because
-- they SELECT from public.profiles / public.doctors, which don't exist
-- until 0004 / 0006. SECURITY DEFINER lets them read those tables
-- without recursively re-triggering those tables' own RLS policies below.
-- Each one only ever returns information about the calling user (derived
-- from auth.uid()), so bypassing RLS here does not leak other users' data.

-- Returns null (not just the role) when the caller's profile has been
-- deactivated, so every RLS policy built on this function locks a
-- deactivated staff member out immediately — no `in (...)` role check
-- can ever match null, and no `= 'admin'` comparison can either. This
-- matters because a deactivated user's Supabase session/JWT can still be
-- valid; is_active is the kill switch, checked on every request.
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and is_active;
$$;

create or replace function public.is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_active from public.profiles where id = auth.uid()), false);
$$;

-- Returns the doctors.id row for the signed-in doctor, or null if the
-- caller isn't a doctor or has been deactivated. Used to scope "own
-- appointments" / "own schedule" / "own consultations" policies.
create or replace function public.current_doctor_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select d.id
  from public.doctors d
  join public.profiles p on p.id = d.profile_id
  where d.profile_id = auth.uid() and p.is_active;
$$;

-- ── Base table grants ─────────────────────────────────────────────────
-- RLS narrows access; it doesn't grant it. Every table below still needs
-- a base GRANT before RLS policies have anything to work with.
grant usage on schema public to authenticated;

grant select, insert, update on
  public.profiles,
  public.patients,
  public.doctors,
  public.doctor_availability,
  public.doctor_time_off,
  public.appointments,
  public.medical_records,
  public.prescriptions,
  public.prescription_items,
  public.invoices,
  public.invoice_items,
  public.payments,
  public.patient_files
  to authenticated;

grant delete on
  public.doctor_availability,
  public.doctor_time_off,
  public.prescription_items,
  public.invoice_items,
  public.patient_files
  to authenticated;

-- audit_logs: read-only for everyone at the grant level. Rows are only
-- ever written by the SECURITY DEFINER trigger in 0018, which runs as
-- the function owner and therefore doesn't need this grant.
grant select on public.audit_logs to authenticated;

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_active_staff() to authenticated;
grant execute on function public.current_doctor_id() to authenticated;
grant execute on function public.next_document_number(text, text, integer) to authenticated;

alter table public.profiles enable row level security;
alter table public.patients enable row level security;
alter table public.doctors enable row level security;
alter table public.doctor_availability enable row level security;
alter table public.doctor_time_off enable row level security;
alter table public.appointments enable row level security;
alter table public.medical_records enable row level security;
alter table public.prescriptions enable row level security;
alter table public.prescription_items enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payments enable row level security;
alter table public.patient_files enable row level security;
alter table public.audit_logs enable row level security;

-- ── profiles ─────────────────────────────────────────────────────────
-- Every signed-in staff member can read the staff directory (needed to
-- show "Dr. Jane Doe" on an appointment, "booked by ..." etc). Only an
-- admin can create rows directly or change someone else's row; a user
-- may update their own row, but trg_profiles_prevent_privilege_escalation
-- (0004) still blocks them from touching role/is_active on themselves.
create policy "profiles_select_authenticated" on public.profiles
  for select using (auth.uid() is not null);

create policy "profiles_insert_admin" on public.profiles
  for insert with check (public.current_user_role() = 'admin');

create policy "profiles_update_self_or_admin" on public.profiles
  for update using (
    (id = auth.uid() and public.is_active_staff()) or public.current_user_role() = 'admin'
  )
  with check (
    (id = auth.uid() and public.is_active_staff()) or public.current_user_role() = 'admin'
  );

-- ── patients ─────────────────────────────────────────────────────────
-- Register/edit: admin + receptionist. Doctors: view only. No delete
-- policy at all for any role — patients are only ever soft-deleted via
-- UPDATE (is_active = false), matching Section 7's "never silently
-- cascade a patient's history away".
create policy "patients_select_staff" on public.patients
  for select using (public.current_user_role() in ('admin', 'doctor', 'receptionist'));

create policy "patients_insert_admin_reception" on public.patients
  for insert with check (public.current_user_role() in ('admin', 'receptionist'));

create policy "patients_update_admin_reception" on public.patients
  for update using (public.current_user_role() in ('admin', 'receptionist'))
  with check (public.current_user_role() in ('admin', 'receptionist'));

-- ── doctors ──────────────────────────────────────────────────────────
-- Everyone can see the doctor directory. Only admin creates doctor
-- profiles; a doctor may update their own row (Section 3: "Own profile
-- only").
create policy "doctors_select_staff" on public.doctors
  for select using (public.current_user_role() in ('admin', 'doctor', 'receptionist'));

create policy "doctors_insert_admin" on public.doctors
  for insert with check (public.current_user_role() = 'admin');

create policy "doctors_update_admin_or_self" on public.doctors
  for update using (public.current_user_role() = 'admin' or profile_id = auth.uid())
  with check (public.current_user_role() = 'admin' or profile_id = auth.uid());

-- ── doctor_availability / doctor_time_off ───────────────────────────
-- Admin manages any doctor's schedule; a doctor manages only their own
-- (Section 3: "Set doctor availability ... Own schedule only").
create policy "availability_select_staff" on public.doctor_availability
  for select using (public.current_user_role() in ('admin', 'doctor', 'receptionist'));

create policy "availability_insert_admin_or_own" on public.doctor_availability
  for insert with check (public.current_user_role() = 'admin' or doctor_id = public.current_doctor_id());

create policy "availability_update_admin_or_own" on public.doctor_availability
  for update using (public.current_user_role() = 'admin' or doctor_id = public.current_doctor_id())
  with check (public.current_user_role() = 'admin' or doctor_id = public.current_doctor_id());

create policy "availability_delete_admin_or_own" on public.doctor_availability
  for delete using (public.current_user_role() = 'admin' or doctor_id = public.current_doctor_id());

create policy "time_off_select_staff" on public.doctor_time_off
  for select using (public.current_user_role() in ('admin', 'doctor', 'receptionist'));

create policy "time_off_insert_admin_or_own" on public.doctor_time_off
  for insert with check (public.current_user_role() = 'admin' or doctor_id = public.current_doctor_id());

create policy "time_off_update_admin_or_own" on public.doctor_time_off
  for update using (public.current_user_role() = 'admin' or doctor_id = public.current_doctor_id())
  with check (public.current_user_role() = 'admin' or doctor_id = public.current_doctor_id());

create policy "time_off_delete_admin_or_own" on public.doctor_time_off
  for delete using (public.current_user_role() = 'admin' or doctor_id = public.current_doctor_id());

-- ── appointments ─────────────────────────────────────────────────────
-- Admin + receptionist see/manage every appointment. A doctor sees and
-- manages only their own (Section 3: "Own appointments").
create policy "appointments_select" on public.appointments
  for select using (
    public.current_user_role() in ('admin', 'receptionist')
    or doctor_id = public.current_doctor_id()
  );

create policy "appointments_insert" on public.appointments
  for insert with check (
    public.current_user_role() in ('admin', 'receptionist')
    or doctor_id = public.current_doctor_id()
  );

create policy "appointments_update" on public.appointments
  for update using (
    public.current_user_role() in ('admin', 'receptionist')
    or doctor_id = public.current_doctor_id()
  )
  with check (
    public.current_user_role() in ('admin', 'receptionist')
    or doctor_id = public.current_doctor_id()
  );

-- ── medical_records ──────────────────────────────────────────────────
-- Section 3: Admin is view-only, Doctor creates/edits their own
-- consultations, Receptionist has no access at all (clinical
-- confidentiality — not even read).
create policy "medical_records_select" on public.medical_records
  for select using (
    public.current_user_role() = 'admin'
    or doctor_id = public.current_doctor_id()
  );

create policy "medical_records_insert_doctor" on public.medical_records
  for insert with check (doctor_id = public.current_doctor_id());

create policy "medical_records_update_doctor" on public.medical_records
  for update using (doctor_id = public.current_doctor_id())
  with check (doctor_id = public.current_doctor_id());

-- ── prescriptions / prescription_items ──────────────────────────────
-- Same shape as medical_records: admin view-only, doctor owns their own,
-- receptionist has no access.
create policy "prescriptions_select" on public.prescriptions
  for select using (
    public.current_user_role() = 'admin'
    or doctor_id = public.current_doctor_id()
  );

create policy "prescriptions_insert_doctor" on public.prescriptions
  for insert with check (doctor_id = public.current_doctor_id());

create policy "prescriptions_update_doctor" on public.prescriptions
  for update using (doctor_id = public.current_doctor_id())
  with check (doctor_id = public.current_doctor_id());

create policy "prescription_items_select" on public.prescription_items
  for select using (
    exists (
      select 1 from public.prescriptions p
      where p.id = prescription_items.prescription_id
        and (public.current_user_role() = 'admin' or p.doctor_id = public.current_doctor_id())
    )
  );

create policy "prescription_items_insert_doctor" on public.prescription_items
  for insert with check (
    exists (
      select 1 from public.prescriptions p
      where p.id = prescription_items.prescription_id
        and p.doctor_id = public.current_doctor_id()
    )
  );

create policy "prescription_items_update_doctor" on public.prescription_items
  for update using (
    exists (
      select 1 from public.prescriptions p
      where p.id = prescription_items.prescription_id
        and p.doctor_id = public.current_doctor_id()
    )
  )
  with check (
    exists (
      select 1 from public.prescriptions p
      where p.id = prescription_items.prescription_id
        and p.doctor_id = public.current_doctor_id()
    )
  );

create policy "prescription_items_delete_doctor" on public.prescription_items
  for delete using (
    exists (
      select 1 from public.prescriptions p
      where p.id = prescription_items.prescription_id
        and p.doctor_id = public.current_doctor_id()
    )
  );

-- ── invoices / invoice_items / payments ─────────────────────────────
-- Section 3: "Create invoices / record payments" is Admin + Receptionist
-- only — Doctor has no access at all, not even to view.
create policy "invoices_select" on public.invoices
  for select using (public.current_user_role() in ('admin', 'receptionist'));

create policy "invoices_insert" on public.invoices
  for insert with check (public.current_user_role() in ('admin', 'receptionist'));

create policy "invoices_update" on public.invoices
  for update using (public.current_user_role() in ('admin', 'receptionist'))
  with check (public.current_user_role() in ('admin', 'receptionist'));

create policy "invoice_items_select" on public.invoice_items
  for select using (public.current_user_role() in ('admin', 'receptionist'));

create policy "invoice_items_insert" on public.invoice_items
  for insert with check (public.current_user_role() in ('admin', 'receptionist'));

create policy "invoice_items_update" on public.invoice_items
  for update using (public.current_user_role() in ('admin', 'receptionist'))
  with check (public.current_user_role() in ('admin', 'receptionist'));

create policy "invoice_items_delete" on public.invoice_items
  for delete using (public.current_user_role() in ('admin', 'receptionist'));

create policy "payments_select" on public.payments
  for select using (public.current_user_role() in ('admin', 'receptionist'));

create policy "payments_insert" on public.payments
  for insert with check (public.current_user_role() in ('admin', 'receptionist'));

create policy "payments_update" on public.payments
  for update using (public.current_user_role() in ('admin', 'receptionist'))
  with check (public.current_user_role() in ('admin', 'receptionist'));

-- ── patient_files ────────────────────────────────────────────────────
-- Section 3: all three roles can upload. Section 5.8: "Delete requires
-- admin or the uploading user."
create policy "patient_files_select_staff" on public.patient_files
  for select using (public.current_user_role() in ('admin', 'doctor', 'receptionist'));

create policy "patient_files_insert_staff" on public.patient_files
  for insert with check (public.current_user_role() in ('admin', 'doctor', 'receptionist'));

create policy "patient_files_delete_admin_or_uploader" on public.patient_files
  for delete using (public.current_user_role() = 'admin' or uploaded_by = auth.uid());

-- ── audit_logs ───────────────────────────────────────────────────────
-- Section 3: "View audit log: Admin only." No insert/update/delete
-- policy exists for any role — the only writer is the SECURITY DEFINER
-- trigger in 0018, which bypasses RLS as the function owner.
create policy "audit_logs_select_admin" on public.audit_logs
  for select using (public.current_user_role() = 'admin');
