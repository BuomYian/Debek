# supabase/migrations/

Numbered SQL migration files, applied in order, built in Phase 2:

```
0001_extensions.sql        -- pgcrypto, btree_gist
0002_enums.sql
0003_profiles.sql
0004_patients.sql
0005_doctors.sql
0006_doctor_availability.sql
0007_doctor_time_off.sql
0008_appointments.sql      -- incl. the EXCLUDE ... USING gist overlap constraint
0009_medical_records.sql
0010_prescriptions.sql
0011_billing.sql           -- invoices, invoice_items, payments
0012_patient_files.sql
0013_audit_logs.sql
0014_indexes.sql
0015_rls_policies.sql
0016_triggers.sql          -- updated_at, audit log triggers
```

Apply with the Supabase CLI:

```bash
npx supabase db push
```

or, against a local Postgres instance:

```bash
npx supabase db reset
```
