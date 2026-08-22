# Entity-Relationship Diagram

Covers all 14 tables from Section 4 of the build spec. `auth.users` is
Supabase-managed (not one of ours) but shown for context, since
`profiles` extends it 1:1.

```mermaid
erDiagram
    AUTH_USERS ||--|| PROFILES : "extends"
    PROFILES ||--o| DOCTORS : "is a"
    PROFILES ||--o{ PATIENTS : registers
    PROFILES ||--o{ APPOINTMENTS : books
    PROFILES ||--o{ INVOICES : creates
    PROFILES ||--o{ PATIENT_FILES : uploads
    PROFILES ||--o{ PAYMENTS : receives
    PROFILES ||--o{ AUDIT_LOGS : "acted as"

    DOCTORS ||--o{ DOCTOR_AVAILABILITY : has
    DOCTORS ||--o{ DOCTOR_TIME_OFF : has
    DOCTORS ||--o{ APPOINTMENTS : sees
    DOCTORS ||--o{ MEDICAL_RECORDS : authors
    DOCTORS ||--o{ PRESCRIPTIONS : issues

    PATIENTS ||--o{ APPOINTMENTS : books
    PATIENTS ||--o{ MEDICAL_RECORDS : has
    PATIENTS ||--o{ PRESCRIPTIONS : has
    PATIENTS ||--o{ INVOICES : billed
    PATIENTS ||--o{ PATIENT_FILES : owns

    APPOINTMENTS |o--o{ APPOINTMENTS : "rescheduled_from"
    APPOINTMENTS |o--o| MEDICAL_RECORDS : "consultation for"
    APPOINTMENTS |o--o| INVOICES : "auto-drafts"

    MEDICAL_RECORDS ||--o{ PRESCRIPTIONS : "issued from"
    MEDICAL_RECORDS |o--o{ PATIENT_FILES : "attached to"

    PRESCRIPTIONS ||--|{ PRESCRIPTION_ITEMS : contains

    INVOICES ||--|{ INVOICE_ITEMS : contains
    INVOICES ||--o{ PAYMENTS : "paid by"

    AUTH_USERS {
        uuid id PK
        text email
    }
    PROFILES {
        uuid id PK "FK to auth.users"
        text full_name
        enum role "admin | doctor | receptionist"
        text phone
        boolean is_active
    }
    DOCTORS {
        uuid id PK
        uuid profile_id FK "unique"
        text specialization
        text license_number "unique"
        numeric consultation_fee
        boolean is_accepting_appointments
    }
    DOCTOR_AVAILABILITY {
        uuid id PK
        uuid doctor_id FK
        smallint day_of_week "0-6"
        time start_time
        time end_time
        int slot_duration_minutes
    }
    DOCTOR_TIME_OFF {
        uuid id PK
        uuid doctor_id FK
        timestamptz start_datetime
        timestamptz end_datetime
        text reason
    }
    PATIENTS {
        uuid id PK
        text patient_number "unique, e.g. DBK-2026-00042"
        text first_name
        text last_name
        date date_of_birth
        enum gender
        text phone
        text allergies
        text chronic_conditions
        uuid registered_by FK
        boolean is_active
    }
    APPOINTMENTS {
        uuid id PK
        text appointment_number "unique"
        uuid patient_id FK
        uuid doctor_id FK
        timestamptz scheduled_start
        timestamptz scheduled_end
        enum status "7 states"
        uuid booked_by FK
        uuid rescheduled_from FK "self-reference"
    }
    MEDICAL_RECORDS {
        uuid id PK
        uuid patient_id FK
        uuid doctor_id FK
        uuid appointment_id FK "nullable"
        date visit_date
        text chief_complaint
        jsonb vital_signs
        text diagnosis
        text treatment_plan
    }
    PRESCRIPTIONS {
        uuid id PK
        uuid medical_record_id FK
        uuid patient_id FK
        uuid doctor_id FK
        date issued_date
        enum status "active | completed | cancelled"
    }
    PRESCRIPTION_ITEMS {
        uuid id PK
        uuid prescription_id FK
        text medication_name
        text dosage
        text frequency
        text duration
    }
    INVOICES {
        uuid id PK
        text invoice_number "unique"
        uuid patient_id FK
        uuid appointment_id FK "nullable"
        numeric subtotal
        numeric discount
        numeric tax
        numeric total
        numeric amount_paid
        numeric balance "generated: total - amount_paid"
        enum status "unpaid | partially_paid | paid | cancelled"
    }
    INVOICE_ITEMS {
        uuid id PK
        uuid invoice_id FK
        text description
        numeric quantity
        numeric unit_price
        numeric line_total "generated: quantity * unit_price"
    }
    PAYMENTS {
        uuid id PK
        uuid invoice_id FK
        numeric amount
        enum payment_method
        text reference
        uuid received_by FK
    }
    PATIENT_FILES {
        uuid id PK
        uuid patient_id FK
        uuid medical_record_id FK "nullable"
        text cloudinary_public_id "unique"
        text cloudinary_url
        enum category
        uuid uploaded_by FK
    }
    AUDIT_LOGS {
        uuid id PK
        uuid user_id FK "nullable"
        text action "INSERT | UPDATE | DELETE"
        text table_name
        uuid record_id
        jsonb changes
        timestamptz created_at
    }
```

## Notes not obvious from the diagram alone

- **`appointments_no_overlap`** (0009): a Postgres `EXCLUDE USING gist`
  constraint, not representable in an ER diagram's cardinality notation
  — no two non-cancelled appointments for the same `doctor_id` can have
  overlapping `[scheduled_start, scheduled_end)` ranges. This is what
  makes double-booking impossible at the database level (Section 4,
  Acceptance Criteria).
- **`rescheduled_from`** is a nullable self-reference on `appointments`:
  rescheduling cancels the original row and inserts a new one linked
  back to it (0021's `reschedule_appointment` function), rather than
  mutating the original's time in place.
- **`balance` and `line_total`** are Postgres generated columns, not
  application-computed — they can never drift from `total - amount_paid`
  / `quantity * unit_price`.
- Every foreign key from a clinical/financial table back to `patients`
  is `ON DELETE RESTRICT`, not `CASCADE` — Section 7's "never silently
  cascade a patient's history away." Patients are soft-deleted
  (`is_active = false`) instead.
