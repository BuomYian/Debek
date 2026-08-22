# supabase/migrations/

20 numbered SQL migrations, applied in order:

```
0001_extensions.sql          -- pgcrypto, btree_gist, pg_trgm
0002_enums.sql
0003_helper_functions.sql    -- set_updated_at(), next_document_number()
0004_profiles.sql            -- + auth.users trigger, privilege-escalation guard
0005_patients.sql            -- + full-text & trigram search indexes
0006_doctors.sql             -- + profile-role integrity trigger
0007_doctor_availability.sql
0008_doctor_time_off.sql
0009_appointments.sql        -- the EXCLUDE ... USING gist overlap constraint
0010_medical_records.sql
0011_prescriptions.sql
0012_prescription_items.sql
0013_invoices.sql            -- total/status auto-computed from subtotal/discount/tax/amount_paid
0014_invoice_items.sql       -- keeps invoices.subtotal in sync
0015_payments.sql            -- keeps invoices.amount_paid in sync
0016_patient_files.sql
0017_audit_logs.sql
0018_audit_triggers.sql      -- generic audit trigger, attached to clinical + financial tables
0019_indexes.sql             -- a few cross-cutting indexes
0020_rls_policies.sql        -- RLS helper functions + every table's policies
0021_reschedule_function.sql -- atomic cancel-original + insert-new, SECURITY INVOKER so RLS still applies
```

Apply against a Supabase project:

```bash
npx supabase db push
```

Apply directly with psql (e.g. a local/disposable Postgres for testing):

```bash
for f in supabase/migrations/*.sql; do psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"; done
```

## Design notes worth knowing before reading the SQL

- **Double-booking is impossible at the DB level**, not just checked by
  the app: `appointments_no_overlap` in 0009 is a Postgres `EXCLUDE
  USING gist` constraint over `(doctor_id, tstzrange(scheduled_start,
  scheduled_end))`, requiring the `btree_gist` extension. A race between
  two reception desks booking the same slot fails at INSERT time with an
  `exclusion_violation`, not a lost-update bug.
- **Money fields are never written directly by the app.** `invoices.total`
  and `.status` are recomputed by a trigger on the `invoices` table
  itself (0013) whenever `subtotal`/`discount`/`tax`/`amount_paid`
  change; `subtotal` is kept in sync from `invoice_items` (0014) and
  `amount_paid` from `payments` (0015) by their own triggers writing
  back to `invoices`. `balance` is a generated column
  (`total - amount_paid`). Each derived value has exactly one writer.
- **RLS is the last of three enforcement layers** (route middleware/proxy
  and server-action role checks are the other two — see Section 3 of the
  build spec). `current_user_role()` / `current_doctor_id()` (top of
  0020) are `SECURITY DEFINER` so policies can check the caller's role
  without recursive RLS on `profiles`/`doctors`, and both return `null`
  the moment a profile's `is_active` flips to `false` — a deactivated
  staff member loses access mid-session, not just at next login.
- **`anon` gets nothing.** Supabase's project bootstrap grants `anon` and
  `authenticated` broad table privileges by default and relies on RLS to
  narrow them — 0020 explicitly revokes all of `anon`'s table grants
  instead, so an anonymous request gets a hard permission error rather
  than a silently-empty, policy-filtered result.
- **`audit_logs` has no update/delete policy for any role**, and no
  insert policy either — the only writer is the `SECURITY DEFINER`
  trigger in 0018, which bypasses RLS as the function's owner. Nothing
  short of superuser/service-role access can alter or erase an audit
  entry.

All of the above was verified against a disposable
`supabase/postgres` Docker container (migrations apply cleanly end to
end; the overlap constraint, invoice triggers, and RLS policies were
exercised directly with role-switching `SET LOCAL "request.jwt.claim.sub"`
tests) before being treated as done.
