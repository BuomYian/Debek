-- Debek seed data.
--
-- Run AFTER migrations, and AFTER scripts/seed-users.mjs has created the
-- staff/doctor logins (this file can't create auth.users itself — see
-- the comment at the top of that script for why):
--
--   node scripts/seed-users.mjs
--   psql "$DATABASE_URL" -f supabase/seed.sql
--
-- (`npx supabase db reset` runs this file automatically after
-- migrations, but seed-users.mjs must still be run manually first, or
-- the guard below stops this file early with a clear error.)
--
-- Produces: 5 non-doctor staff (2 admin, 3 receptionist) + 10 doctors
-- across 10 specializations, 50 patients, ~200 appointments spread
-- across the past 60 / next 30 days, and matching medical records,
-- prescriptions and invoices for every completed visit — enough that
-- every dashboard, chart and report in Section 5.9 renders with real
-- data on first run. Meant to run once against a freshly-migrated,
-- otherwise-empty database.
--
-- A note on "random per row" throughout this file: `(select ... order
-- by random() limit 1)` as a scalar subquery, or `cross join lateral
-- (select random() ...)` with no reference to the outer row, both look
-- like they pick a fresh random value per output row — they don't get
-- re-run per row, and neither reliably does even once you force a
-- reference to an outer column (`... as _corr`) into them: an `ORDER BY
-- random() LIMIT 1` subquery was observed to stay cached across every
-- row regardless, while the exact same trick worked fine on a bare
-- `random()` target-list expression. Rather than lean on exactly which
-- shapes Postgres happens to cache, every "pick a random X" below is
-- either (a) a bare expression like `arr[1 + floor(random() * n)::int]`
-- indexing an array pulled in via a plain CROSS JOIN, or (b) — when
-- several columns need to agree on the same pick (e.g. a medication's
-- name/dosage/frequency must all come from the same pool row) — several
-- parallel arrays sharing one shared index computed the same way, via a
-- LATERAL that references an outer column. No `ORDER BY ... LIMIT`
-- appears anywhere a value needs to vary row to row. Verified against a
-- throwaway database before trusting it here — see the Phase 2 build
-- notes.

begin;

do $$
begin
  if not exists (select 1 from auth.users where email = 'admin@debek.local') then
    raise exception 'Seed users not found. Run "node scripts/seed-users.mjs" first (see this file''s header).';
  end if;
end $$;

-- ── 1. Doctors ───────────────────────────────────────────────────────
-- Consultation fees are in South Sudanese Pounds (SSP) — round figures
-- typical of a private clinic in Juba, not a $-to-SSP conversion.
insert into public.doctors (profile_id, specialization, license_number, qualifications, consultation_fee, bio)
select p.id, d.specialization, d.license_number, d.qualifications, d.fee, d.bio
from (
  values
    ('doctor1@debek.local', 'General Medicine', 'LIC-1001', 'MBChB, MMed (Family Medicine)', 5000.00, 'General practitioner with 10 years of clinic experience.'),
    ('doctor2@debek.local', 'Pediatrics', 'LIC-1002', 'MBChB, MMed (Paediatrics)', 6000.00, 'Focuses on child and adolescent health.'),
    ('doctor3@debek.local', 'Obstetrics & Gynaecology', 'LIC-1003', 'MBChB, MMed (O&G)', 8000.00, 'Maternal health and reproductive care.'),
    ('doctor4@debek.local', 'Internal Medicine', 'LIC-1004', 'MBChB, MMed (Internal Medicine)', 7000.00, 'Adult chronic disease management.'),
    ('doctor5@debek.local', 'Dermatology', 'LIC-1005', 'MBChB, Dip. Dermatology', 7500.00, 'Skin, hair and nail conditions.'),
    ('doctor6@debek.local', 'ENT', 'LIC-1006', 'MBChB, MMed (ENT)', 7000.00, 'Ear, nose and throat specialist.'),
    ('doctor7@debek.local', 'Orthopedics', 'LIC-1007', 'MBChB, MMed (Orthopaedics)', 9000.00, 'Musculoskeletal injuries and disorders.'),
    ('doctor8@debek.local', 'Cardiology', 'LIC-1008', 'MBChB, MMed (Cardiology)', 10000.00, 'Heart and cardiovascular health.'),
    ('doctor9@debek.local', 'Psychiatry', 'LIC-1009', 'MBChB, MMed (Psychiatry)', 8000.00, 'Mental health and counselling.'),
    ('doctor10@debek.local', 'Dentistry', 'LIC-1010', 'BDS', 5500.00, 'General and restorative dental care.')
) as d(email, specialization, license_number, qualifications, fee, bio)
join auth.users u on u.email = d.email
join public.profiles p on p.id = u.id;

-- ── 2. Doctor availability ──────────────────────────────────────────
-- Every doctor: Mon-Fri, 09:00-12:00 and 13:00-17:00 (lunch break),
-- 30-minute slots.
insert into public.doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes)
select d.id, v.dow, v.st::time, v.et::time, 30
from public.doctors d
cross join (
  values
    (1, '09:00', '12:00'), (1, '13:00', '17:00'),
    (2, '09:00', '12:00'), (2, '13:00', '17:00'),
    (3, '09:00', '12:00'), (3, '13:00', '17:00'),
    (4, '09:00', '12:00'), (4, '13:00', '17:00'),
    (5, '09:00', '12:00'), (5, '13:00', '17:00')
) as v(dow, st, et);

-- A couple of doctors also take Saturday morning appointments.
insert into public.doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes)
select id, 6, '09:00', '13:00', 30
from public.doctors
where license_number in ('LIC-1001', 'LIC-1003');

-- ── 3. Doctor time off ──────────────────────────────────────────────
insert into public.doctor_time_off (doctor_id, start_datetime, end_datetime, reason)
select id, now() - interval '20 days', now() - interval '17 days', 'Annual leave'
from public.doctors where license_number = 'LIC-1002'
union all
select id, now() + interval '10 days', now() + interval '12 days', 'Conference'
from public.doctors where license_number = 'LIC-1005';

-- ── Reusable pools ───────────────────────────────────────────────────
-- One-row temp tables holding arrays, cross-joined wherever a random
-- pick is needed. See the header note on why this is done via bare
-- array-subscript expressions rather than `(select ... limit 1)`.
create temporary table reception_pool on commit drop as
select array_agg(pr.id) as ids
from public.profiles pr
join auth.users u on u.id = pr.id
where u.email like 'reception%@debek.local';

-- ── 4. Patients (50) ────────────────────────────────────────────────
-- Names drawn from common South Sudanese given/family names across
-- several ethnic groups (Dinka, Nuer, Bari, Equatorian) — overlap
-- between the two lists is deliberate, not a bug: South Sudanese names
-- are commonly patronymic chains (a person's own name followed by their
-- father's and grandfather's), so the same name pool legitimately
-- supplies both "first" and "last" position.
with names as (
  select
    fn as first_name,
    ln as last_name,
    row_number() over () as n
  from
    unnest(array[
      'James','Mary','Peter','Grace','John','Faith','David','Ruth','Samuel','Joyce',
      'Daniel','Esther','Deng','Nyandeng','Joseph','Ann','Paul','Achol','Stephen','Diana',
      'Emmanuel','Beatrice','Santino','Winnie','Garang','Irene','Simon','Caroline','Victor','Agnes',
      'Gabriel','Mercy','Charles','Elizabeth','Anthony','Abuk','George','Susan','Francis','Nyanhial',
      'Robert','Jane','Thomas','Margaret','Isaac','Rose','Moses','Christine','Yel','Judith'
    ]) with ordinality as t1(fn, ord1)
    join unnest(array[
      'Deng','Garang','Malong','Akec','Bol','Chol','Kuol','Kur','Mabior','Athian',
      'Ajak','Manyang','Madut','Wani','Lado','Modi','Taban','Lomude','Gatkuoth','Gatluak',
      'Riek','Nyibol','Ayen','Majok','Nyanhial','Adau','Abuk','Nyandeng','Achol','Puok',
      'Gai','Wal','Kir','Deu','Yak','Anei','Piol','Awan','Bul','Dhieu',
      'Ring','Machot','Manyok','Aleu','Biar','Dut','Kon','Nhial','Thiik','Ajang'
    ]) with ordinality as t2(ln, ord2) on ord1 = ord2
)
insert into public.patients (
  first_name, last_name, date_of_birth, gender, phone, email, address, national_id,
  blood_group, allergies, chronic_conditions, emergency_contact_name, emergency_contact_phone,
  registered_by, created_at
)
select
  names.first_name,
  names.last_name,
  (date '1950-01-01' + (floor(random() * (365 * 70)))::int * interval '1 day')::date,
  case when random() < 0.48 then 'male' when random() < 0.96 then 'female' else 'other' end::public.gender_type,
  '09' || lpad((10000000 + names.n * 137)::text, 8, '0'),
  case when random() < 0.4 then lower(names.first_name || '.' || names.last_name || names.n || '@example.com') else null end,
  (array['Juba', 'Wau', 'Malakal', 'Yei', 'Bor', 'Rumbek', 'Torit', 'Aweil', 'Yambio', 'Bentiu'])[1 + floor(random() * 10)::int] || ', South Sudan',
  case when random() < 0.6 then (20000000 + names.n * 91)::text else null end,
  case when random() < 0.5 then (array['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])[1 + floor(random() * 8)::int] else null end,
  case when random() < 0.25 then (array['Penicillin', 'Sulfa drugs', 'Peanuts', 'Latex', 'None known'])[1 + floor(random() * 5)::int] else null end,
  case when random() < 0.2 then (array['Hypertension', 'Type 2 Diabetes', 'Asthma', 'Chronic back pain'])[1 + floor(random() * 4)::int] else null end,
  names.first_name || ' Family Contact',
  '09' || lpad((30000000 + names.n * 271)::text, 8, '0'),
  rp.ids[1 + floor(random() * array_length(rp.ids, 1))::int],
  now() - (floor(random() * 180))::int * interval '1 day'
from names
cross join reception_pool rp;

create temporary table patient_pool on commit drop as
select array_agg(id) as ids from public.patients;

-- ── 5. Appointments (~200), non-overlapping by construction ────────
-- Every (doctor, slot) below comes from that doctor's own availability
-- template, walked out in fixed slot_duration_minutes increments, minus
-- anything inside their doctor_time_off — the same set of non-
-- overlapping slots the booking UI's slot generator computes at
-- runtime (Section 5.4). Because the pool itself has no overlaps for a
-- given doctor, any subset of it is automatically safe to insert
-- without touching the appointments_no_overlap exclusion constraint.
create temporary table candidate_slots on commit drop as
with expanded as (
  select
    da.doctor_id,
    gs.day::date as slot_date,
    da.start_time,
    da.slot_duration_minutes,
    n as slot_index
  from public.doctor_availability da
  cross join generate_series(current_date - 60, current_date + 30, interval '1 day') as gs(day)
  cross join lateral generate_series(
    0,
    (extract(epoch from (da.end_time - da.start_time)) / 60 / da.slot_duration_minutes)::int - 1
  ) as n
  where da.is_active
    and extract(dow from gs.day)::smallint = da.day_of_week
)
select
  e.doctor_id,
  (e.slot_date + e.start_time)::timestamptz + (e.slot_index * e.slot_duration_minutes) * interval '1 minute' as slot_start,
  (e.slot_date + e.start_time)::timestamptz + ((e.slot_index + 1) * e.slot_duration_minutes) * interval '1 minute' as slot_end
from expanded e
where not exists (
  select 1 from public.doctor_time_off t
  where t.doctor_id = e.doctor_id
    and tstzrange(t.start_datetime, t.end_datetime, '[)') && tstzrange(
      (e.slot_date + e.start_time)::timestamptz + (e.slot_index * e.slot_duration_minutes) * interval '1 minute',
      (e.slot_date + e.start_time)::timestamptz + ((e.slot_index + 1) * e.slot_duration_minutes) * interval '1 minute',
      '[)'
    )
);

create temporary table seed_appointments on commit drop as
select
  cs.doctor_id,
  pp.ids[1 + floor(random() * array_length(pp.ids, 1))::int] as patient_id,
  cs.slot_start,
  cs.slot_end,
  (
    case
      -- A past day: mostly completed, a handful cancelled/no-show
      -- (populates the no-show/cancellation-rate reports).
      when cs.slot_start::date < current_date then
        (array['completed', 'completed', 'completed', 'completed', 'completed', 'completed', 'completed', 'cancelled', 'no_show', 'completed'])[1 + floor(random() * 10)::int]
      -- Today, earlier than right now: a realistic in-flight queue.
      when cs.slot_start::date = current_date and cs.slot_start < now() then
        (array['completed', 'completed', 'checked_in', 'in_progress', 'no_show', 'completed'])[1 + floor(random() * 6)::int]
      -- Today (later) or a future day: still upcoming.
      else
        (array['scheduled', 'scheduled', 'confirmed', 'confirmed', 'scheduled'])[1 + floor(random() * 5)::int]
    end
  )::public.appointment_status as status
from (select * from candidate_slots order by random() limit 200) cs
cross join patient_pool pp;

insert into public.appointments (patient_id, doctor_id, scheduled_start, scheduled_end, status, reason_for_visit, booked_by, cancelled_reason)
select
  sa.patient_id,
  sa.doctor_id,
  sa.slot_start,
  sa.slot_end,
  sa.status,
  (array['General checkup', 'Follow-up visit', 'Fever and headache', 'Persistent cough', 'Routine antenatal visit', 'Skin rash', 'Joint pain', 'Annual physical', 'Vaccination', 'Blood pressure review'])[1 + floor(random() * 10)::int],
  rp.ids[1 + floor(random() * array_length(rp.ids, 1))::int],
  case when sa.status = 'cancelled' then (array['Patient requested reschedule', 'Doctor unavailable', 'Patient no longer needs appointment'])[1 + floor(random() * 3)::int] else null end
from seed_appointments sa
cross join reception_pool rp;

-- ── 6. Medical records for every completed visit ────────────────────
create temporary table completed_appointments on commit drop as
select id as appointment_id, patient_id, doctor_id, scheduled_start::date as visit_date
from public.appointments
where status = 'completed';

-- `order by random() limit 1` turned out to have the exact same
-- always-cached problem as a scalar subquery — even with a dummy
-- outer-column reference — so single picks use the array+index
-- technique too, not just multi-row picks. Parallel arrays, one shared
-- random index, per the header note.
create temporary table complaint_pool on commit drop as
select
  array['Fever and chills', 'Persistent cough', 'Routine checkup', 'Joint pain', 'Skin rash', 'Antenatal review', 'High blood pressure', 'Toothache', 'Anxiety and low mood', 'Ear pain'] as complaints,
  array['Fatigue, mild headache', 'Cough for 5 days, mild chest discomfort', 'None reported', 'Pain in both knees, worse in the morning', 'Itchy rash on arms for 3 days', 'None reported', 'Occasional dizziness', 'Pain in lower right molar', 'Difficulty sleeping, low energy for 2 weeks', 'Right ear pain and reduced hearing'] as symptoms,
  array['No signs of distress. Temperature elevated.', 'Chest clear on auscultation.', 'Within normal limits.', 'Mild swelling in left knee.', 'Erythematous papules on forearms.', 'Fundal height appropriate for gestational age.', 'Blood pressure elevated on repeat measurement.', 'Localized swelling and tenderness.', 'Alert and oriented, mood-congruent affect.', 'Tympanic membrane inflamed.'] as findings,
  array['Malaria (suspected)', 'Upper respiratory tract infection', 'No acute findings', 'Osteoarthritis', 'Contact dermatitis', 'Normal antenatal visit', 'Hypertension (newly diagnosed)', 'Dental caries', 'Generalised anxiety with mild depressive features', 'Acute otitis media'] as diagnoses,
  array['Antimalarial course, rest, fluids', 'Antibiotics, cough syrup, follow-up in 5 days', 'Continue healthy lifestyle, review in 6 months', 'NSAIDs, physiotherapy referral', 'Antihistamines, topical steroid cream', 'Continue prenatal vitamins, review in 4 weeks', 'Start antihypertensive, lifestyle counselling, review in 2 weeks', 'Extraction/filling recommended, dental follow-up', 'Counselling referral, review in 2 weeks', 'Antibiotic ear drops, analgesia, review if not improved in a week'] as treatments;

insert into public.medical_records (
  patient_id, doctor_id, appointment_id, visit_date, chief_complaint, symptoms,
  vital_signs, examination_findings, diagnosis, treatment_plan, clinical_notes
)
select
  ca.patient_id, ca.doctor_id, ca.appointment_id, ca.visit_date,
  cp.complaints[pick.idx], cp.symptoms[pick.idx],
  jsonb_build_object(
    'bp', (100 + floor(random() * 40))::int || '/' || (60 + floor(random() * 20))::int,
    'temp', round((36.2 + random() * 2.3)::numeric, 1),
    'pulse', (60 + floor(random() * 40))::int,
    'weight', round((50 + random() * 40)::numeric, 1),
    'height', round((150 + random() * 40)::numeric, 1),
    'respiratory_rate', (14 + floor(random() * 10))::int,
    'o2_sat', (94 + floor(random() * 6))::int
  ),
  cp.findings[pick.idx], cp.diagnoses[pick.idx], cp.treatments[pick.idx],
  'Patient tolerated examination well. Reviewed findings with patient and advised on next steps.'
from completed_appointments ca
cross join complaint_pool cp
cross join lateral (select ca.appointment_id as _corr, 1 + floor(random() * 10)::int as idx) pick;

-- ── 7. Prescriptions for ~65% of completed visits ───────────────────
insert into public.prescriptions (medical_record_id, patient_id, doctor_id, issued_date, status)
select mr.id, mr.patient_id, mr.doctor_id, mr.visit_date, 'active'
from public.medical_records mr
where random() < 0.65;

create temporary table medication_pool on commit drop as
select
  array['Paracetamol', 'Amoxicillin', 'Artemether-Lumefantrine', 'Ibuprofen', 'Cetirizine', 'Omeprazole', 'Amlodipine', 'Metformin'] as names,
  array['500mg', '500mg', '80/480mg', '400mg', '10mg', '20mg', '5mg', '500mg'] as dosages,
  array['Every 6-8 hours', 'Three times daily', 'Twice daily', 'Every 8 hours', 'Once daily', 'Once daily', 'Once daily', 'Twice daily'] as frequencies,
  array['5 days', '7 days', '3 days', '5 days', '7 days', '14 days', '30 days', '30 days'] as durations,
  array['Oral', 'Oral', 'Oral', 'Oral', 'Oral', 'Oral', 'Oral', 'Oral'] as routes,
  array['Take after meals', 'Complete the full course', 'Take with fatty food', 'Take with food', 'May cause drowsiness', 'Take before breakfast', 'Take at the same time each day', 'Take with meals'] as instructions;

-- Every prescription gets one medication line...
insert into public.prescription_items (prescription_id, medication_name, dosage, frequency, duration, route, instructions)
select rx.id, mp.names[pick.idx], mp.dosages[pick.idx], mp.frequencies[pick.idx], mp.durations[pick.idx], mp.routes[pick.idx], mp.instructions[pick.idx]
from public.prescriptions rx
cross join medication_pool mp
cross join lateral (select rx.id as _corr, 1 + floor(random() * 8)::int as idx) pick;

-- ...and ~50% get a second (Section 5.6: "one prescription holds many
-- medication line items").
insert into public.prescription_items (prescription_id, medication_name, dosage, frequency, duration, route, instructions)
select rx.id, mp.names[pick.idx], mp.dosages[pick.idx], mp.frequencies[pick.idx], mp.durations[pick.idx], mp.routes[pick.idx], mp.instructions[pick.idx]
from public.prescriptions rx
cross join medication_pool mp
cross join lateral (select rx.id as _corr, 1 + floor(random() * 8)::int as idx) pick
where random() < 0.5;

-- ── 8. Invoices auto-drafted for every completed appointment ───────
-- (Section 5.7: "Auto-draft an invoice when an appointment is
-- completed, seeded with the doctor's consultation fee.")
insert into public.invoices (patient_id, appointment_id, issue_date, discount, tax, created_by)
select
  ca.patient_id, ca.appointment_id, ca.visit_date,
  case when random() < 0.15 then round((random() * 500)::numeric, 2) else 0 end,
  0,
  rp.ids[1 + floor(random() * array_length(rp.ids, 1))::int]
from completed_appointments ca
cross join reception_pool rp;

insert into public.invoice_items (invoice_id, description, quantity, unit_price)
select inv.id, 'Consultation - ' || doc.specialization, 1, doc.consultation_fee
from public.invoices inv
join public.appointments a on a.id = inv.appointment_id
join public.doctors doc on doc.id = a.doctor_id;

create temporary table extra_item_pool on commit drop as
select
  array['Lab test - Malaria RDT', 'Lab test - Full blood count', 'Wound dressing', 'Vaccination'] as descriptions,
  array[800.00, 1200.00, 500.00, 700.00] as prices;

insert into public.invoice_items (invoice_id, description, quantity, unit_price)
select inv.id, eip.descriptions[pick.idx], 1, eip.prices[pick.idx]
from public.invoices inv
cross join extra_item_pool eip
cross join lateral (select inv.id as _corr, 1 + floor(random() * 4)::int as idx) pick
where random() < 0.3;

-- ── 9. Payments: ~70% paid in full, ~20% partial, ~10% unpaid ──────
-- (Both `random()` calls below are bare expressions in the SELECT/WHERE
-- list against real invoice rows — no subquery wrapper — so, per the
-- header note, they're safely re-evaluated per row.)
insert into public.payments (invoice_id, amount, payment_method, reference, paid_at, received_by)
select
  inv.id,
  case when random() < (7.0 / 9.0) then inv.total else round((inv.total * (0.3 + random() * 0.4))::numeric, 2) end,
  (array['cash', 'mobile_money', 'card', 'bank_transfer', 'insurance'])[1 + floor(random() * 5)::int]::public.payment_method_type,
  case when random() < 0.5 then 'RCT-' || lpad(floor(random() * 999999)::text, 6, '0') else null end,
  inv.issue_date + (floor(random() * 72))::int * interval '1 hour',
  rp.ids[1 + floor(random() * array_length(rp.ids, 1))::int]
from public.invoices inv
cross join reception_pool rp
where random() < 0.9;

commit;

-- ── Summary ──────────────────────────────────────────────────────────
select 'profiles' as table_name, count(*) from public.profiles
union all select 'doctors', count(*) from public.doctors
union all select 'patients', count(*) from public.patients
union all select 'appointments', count(*) from public.appointments
union all select 'medical_records', count(*) from public.medical_records
union all select 'prescriptions', count(*) from public.prescriptions
union all select 'invoices', count(*) from public.invoices
union all select 'payments', count(*) from public.payments;
