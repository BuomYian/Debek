-- Reusable functions shared by later migrations: the updated_at trigger
-- and the human-readable document number generator.
--
-- The RLS helper functions (current_user_role() etc.) are NOT defined
-- here even though they're conceptually "shared infrastructure" too —
-- they SELECT from public.profiles / public.doctors, which don't exist
-- yet at this point in the migration order. They're defined at the top
-- of 0020_rls_policies.sql instead, once those tables exist.

-- ── updated_at trigger ───────────────────────────────────────────────────
-- Attached to every table that has an updated_at column (Section 4:
-- "created_at / updated_at on every table with an updated_at trigger").
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── Human-readable document numbers ──────────────────────────────────────
-- Backs patient_number ("DBK-2026-00042"), appointment_number ("APT-...")
-- and invoice_number ("INV-..."). One counter per (scope, calendar year),
-- incremented atomically via INSERT ... ON CONFLICT DO UPDATE ... RETURNING
-- so concurrent requests never hand out the same number.
create table public.document_number_counters (
  scope text not null,
  year integer not null,
  last_value integer not null default 0,
  primary key (scope, year)
);

create or replace function public.next_document_number(p_scope text, p_prefix text, p_pad integer default 5)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year integer := extract(year from now())::integer;
  v_next integer;
begin
  insert into public.document_number_counters (scope, year, last_value)
  values (p_scope, v_year, 1)
  on conflict (scope, year)
  do update set last_value = public.document_number_counters.last_value + 1
  returning last_value into v_next;

  return p_prefix || '-' || v_year || '-' || lpad(v_next::text, p_pad, '0');
end;
$$;
