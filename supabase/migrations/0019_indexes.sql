-- A few remaining filter-column indexes that don't belong to any one
-- table's own migration file as naturally as the ones already created
-- alongside each table (Section 4: "indexes on all foreign keys and on
-- frequently filtered columns").

-- Admin's staff list and the login/session flow filter on active status.
create index profiles_is_active_idx on public.profiles (is_active);

-- "Filter doctors by specialization" (Section 5.3) combined with whether
-- they're currently bookable at all.
create index doctors_accepting_idx on public.doctors (is_accepting_appointments) where is_accepting_appointments;
