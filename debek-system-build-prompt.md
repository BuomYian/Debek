# Build Prompt — Debek Medical Appointment & Patient Management System

---

## 1. Role and Objective

You are a senior full-stack engineer. Build a production-quality, **web-based Medical Appointment and Patient Management System** called **Debek**, designed for small to medium-sized clinics that currently rely on paper registers, appointment books, and physical filing cabinets.

This is a final-year Computer Science project (Starford International University). The code must be clean, commented where non-obvious, and structured well enough to be read and defended by a student in an oral examination. Favour clarity and conventional patterns over clever abstractions.

**Core problem being solved:** long patient waiting times, double-booked appointments, misplaced or duplicated paper records, no fast way to check doctor availability, and no timely management visibility into visits, revenue, or doctor workload.

---

## 2. Mandatory Technology Stack

Do not substitute any of these:

| Layer              | Technology                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| Framework          | **Next.js (App Router, latest stable)**                                                                       |
| Language           | **TypeScript** (strict mode on, no `any`)                                                                     |
| Database           | **PostgreSQL hosted on Supabase**                                                                             |
| Auth               | **Supabase Auth** (email + password)                                                                          |
| File/image storage | **Cloudinary** (signed uploads only)                                                                          |
| Styling            | **Tailwind CSS** + **shadcn/ui** components                                                                   |
| Forms & validation | **react-hook-form** + **Zod**                                                                                 |
| Data fetching      | Next.js Server Components + Server Actions; TanStack Query only where client-side caching is genuinely needed |
| Tables             | TanStack Table                                                                                                |
| Charts             | Recharts                                                                                                      |
| Dates              | date-fns                                                                                                      |
| Version control    | Git (produce a sensible `.gitignore`)                                                                         |

**Architecture to implement:**

```
User → Web Browser → Next.js Application → Supabase / PostgreSQL
                            ↓
                       Cloudinary (files & images)
```

---

## 3. User Roles and Permissions

Exactly three operational roles. Patients are **records**, not users — they do not log in (no self-service portal in v1).

| Capability                              |     Admin      |         Doctor         |     Receptionist      |
| --------------------------------------- | :------------: | :--------------------: | :-------------------: |
| Manage staff users & roles              |       ✅       |           ❌           |          ❌           |
| Register / edit patients                |       ✅       |       View only        |          ✅           |
| Manage doctor profiles                  |       ✅       |    Own profile only    |       View only       |
| Set doctor availability                 |       ✅       |   Own schedule only    |       View only       |
| Book / reschedule / cancel appointments |       ✅       |    Own appointments    |          ✅           |
| Create & edit medical records           | ❌ (view only) | ✅ (own consultations) |          ❌           |
| Issue prescriptions                     | ❌ (view only) |           ✅           |          ❌           |
| Create invoices / record payments       |       ✅       |           ❌           |          ✅           |
| Upload patient files                    |       ✅       |           ✅           |          ✅           |
| View reports & dashboards               |       ✅       |   Own workload only    | Limited (daily queue) |
| View audit log                          |       ✅       |           ❌           |          ❌           |

Enforce authorization in **three places**: Next.js middleware (route protection), server actions (re-check role before every mutation), and **Postgres Row Level Security policies** (defence in depth — never trust the client). RLS is a required deliverable, not optional.

---

## 4. Database Schema (PostgreSQL / Supabase)

Generate SQL migration files. Use `uuid` primary keys (`gen_random_uuid()`), `timestamptz` for all timestamps, and `created_at` / `updated_at` on every table with an `updated_at` trigger.

**Tables:**

1. **`profiles`** — extends `auth.users`. `id` (FK → auth.users), `full_name`, `role` (enum: `admin` | `doctor` | `receptionist`), `phone`, `avatar_url`, `is_active`, timestamps.

2. **`patients`** — `id`, `patient_number` (auto-generated, human-readable, e.g. `DBK-2026-00042`, unique), `first_name`, `last_name`, `date_of_birth`, `gender` (enum), `phone`, `email` (nullable), `address`, `national_id` (nullable), `blood_group` (nullable), `allergies` (text), `chronic_conditions` (text), `emergency_contact_name`, `emergency_contact_phone`, `registered_by` (FK → profiles), `is_active`, timestamps.

3. **`doctors`** — `id`, `profile_id` (FK → profiles, unique), `specialization`, `license_number`, `qualifications`, `consultation_fee` (numeric), `bio`, `is_accepting_appointments` (bool), timestamps.

4. **`doctor_availability`** — `id`, `doctor_id`, `day_of_week` (0–6), `start_time`, `end_time`, `slot_duration_minutes` (default 30), `is_active`. Recurring weekly template.

5. **`doctor_time_off`** — `id`, `doctor_id`, `start_datetime`, `end_datetime`, `reason`. Blocks generated slots.

6. **`appointments`** — `id`, `appointment_number` (unique, human-readable), `patient_id`, `doctor_id`, `scheduled_start` (timestamptz), `scheduled_end`, `status` (enum: `scheduled` | `confirmed` | `checked_in` | `in_progress` | `completed` | `cancelled` | `no_show`), `reason_for_visit`, `notes`, `booked_by` (FK → profiles), `cancelled_reason`, `rescheduled_from` (self-FK, nullable), timestamps.
   - **Critical:** add a Postgres `EXCLUDE` constraint using `btree_gist` so the same doctor cannot have two overlapping non-cancelled appointments. Double-booking must be impossible at the database level, not just in UI validation.

7. **`medical_records`** — `id`, `patient_id`, `doctor_id`, `appointment_id` (nullable), `visit_date`, `chief_complaint`, `symptoms`, `vital_signs` (jsonb: bp, temp, pulse, weight, height, respiratory rate, O₂ sat), `examination_findings`, `diagnosis`, `treatment_plan`, `clinical_notes`, `follow_up_date` (nullable), timestamps.

8. **`prescriptions`** — `id`, `medical_record_id`, `patient_id`, `doctor_id`, `issued_date`, `notes`, `status` (enum: `active` | `completed` | `cancelled`), timestamps.

9. **`prescription_items`** — `id`, `prescription_id`, `medication_name`, `dosage`, `frequency`, `duration`, `route` (nullable), `instructions`.

10. **`invoices`** — `id`, `invoice_number` (unique), `patient_id`, `appointment_id` (nullable), `issue_date`, `due_date`, `subtotal`, `discount`, `tax`, `total`, `amount_paid`, `balance` (generated column), `status` (enum: `unpaid` | `partially_paid` | `paid` | `cancelled`), `created_by`, timestamps.

11. **`invoice_items`** — `id`, `invoice_id`, `description`, `quantity`, `unit_price`, `line_total`.

12. **`payments`** — `id`, `invoice_id`, `amount`, `payment_method` (enum: `cash` | `mobile_money` | `card` | `bank_transfer` | `insurance`), `reference`, `paid_at`, `received_by`.

13. **`patient_files`** — `id`, `patient_id`, `medical_record_id` (nullable), `file_name`, `file_type`, `file_size`, `cloudinary_public_id`, `cloudinary_url`, `category` (enum: `lab_result` | `scan` | `referral` | `consent_form` | `id_document` | `other`), `description`, `uploaded_by`, timestamps.

14. **`audit_logs`** — `id`, `user_id`, `action`, `table_name`, `record_id`, `changes` (jsonb), `ip_address`, `created_at`. Write on every create/update/delete of clinical and financial data.

**Also produce:** indexes on all foreign keys and on frequently filtered columns (`appointments.scheduled_start`, `appointments.status`, `patients.patient_number`, `patients.last_name`); a full-text search index for patient name/phone/patient_number lookup; and a seed script with ~5 staff users, ~10 doctors, ~50 patients, ~200 appointments spread across past and future dates, plus matching records, prescriptions, and invoices, so every dashboard and report renders with realistic data.

---

## 5. Modules to Build

Build these nine modules, in this order.

### 5.1 Authentication & Authorization

Login page, password reset, session handling via Supabase Auth. Admin-only user management screen: invite staff, assign role, deactivate. Protected route groups per role. Auto-redirect to the correct dashboard after login. Session timeout after inactivity.

### 5.2 Patient Management

Register patients with full demographic and medical-alert fields. Auto-generate `patient_number`. Paginated, sortable, searchable patient list (search by name, phone, or patient number, debounced, server-side). Patient detail page with tabs: **Overview / Appointments / Medical Records / Prescriptions / Billing / Files**. Edit and soft-delete (deactivate). Warn on possible duplicate registration (same name + DOB or same phone).

### 5.3 Doctor Management

Doctor profiles with specialization, license number, qualifications, consultation fee. Weekly availability editor (per weekday: start time, end time, slot length). Time-off / leave entry that blocks slot generation. Filter doctors by specialization. Doctors can edit their own profile and schedule only.

### 5.4 Appointment Booking

The centrepiece module — give it the most care.

- Booking flow: select patient (with inline "register new patient" shortcut) → select doctor or specialization → pick date → **see live-generated available slots**, computed from `doctor_availability` minus existing appointments minus `doctor_time_off`.
- Prevent double-booking with the DB exclusion constraint; show a clear, friendly error if a race condition occurs.
- Calendar views: day, week, and month. Colour-coded by status.
- Full lifecycle: book → confirm → check in → in progress → complete, plus reschedule (preserving a link to the original) and cancel with reason.
- Today's queue view for reception: who's waiting, who's with a doctor, expected wait.
- Doctor's own "My schedule" view with a one-click jump into the consultation form.

### 5.5 Electronic Medical Records

Consultation form launched from an appointment: chief complaint, vitals (structured, with basic range warnings), examination findings, diagnosis, treatment plan, clinical notes, follow-up date. Records are **append-only in spirit** — edits allowed but every change written to `audit_logs`. Chronological patient history timeline. Attach files to a record. Print-friendly view.

### 5.6 Prescription Management

Issued by doctors from within a consultation. One prescription holds many medication line items (drug, dosage, frequency, duration, route, instructions). Printable prescription slip with clinic header, patient details, doctor name, license number, and date. Flag potential duplicate active prescriptions of the same medication for the same patient.

### 5.7 Billing Management

Auto-draft an invoice when an appointment is completed, seeded with the doctor's consultation fee. Add line items (procedures, lab, supplies). Discounts and tax. Record full or partial payments with method and reference; `status` and `balance` update automatically. Printable invoice / receipt. Outstanding-balances list.

### 5.8 File Management (Cloudinary)

Upload lab results, scans, referrals, consent forms, ID documents. **Signed uploads only** — generate the signature in a server action; never expose the Cloudinary API secret to the browser. Restrict MIME types (PDF, JPG, PNG, WEBP) and cap file size (e.g. 10 MB). Thumbnail previews for images, icon + filename for PDFs. Store the `public_id` so files can be deleted properly. Delete requires admin or the uploading user.

### 5.9 Reports & Dashboards

Role-aware dashboards plus a reports section with date-range filters and CSV export:

- **Appointments:** volume over time, by status, by doctor, by specialization; no-show rate; cancellation rate.
- **Patients:** new registrations over time, total active, age/gender distribution, returning vs new.
- **Revenue:** total billed, total collected, outstanding balance, revenue by doctor, revenue by payment method.
- **Doctor workload:** consultations per doctor, average consultations per working day, utilisation against available slots.

Admin dashboard: today's appointments, patients seen today, revenue today, outstanding balance, upcoming week's load. Doctor dashboard: today's schedule, patients seen this week, next appointment. Receptionist dashboard: today's queue, check-in actions, quick-book button.

---

## 6. UI/UX Requirements

- **Clinic-appropriate, not flashy.** Calm palette, high contrast, generous spacing, large tap targets. Staff use this all day under pressure.
- Fully **responsive** — must work on a reception desktop, a doctor's laptop, and a tablet.
- Persistent sidebar navigation that shows only what the current role can access.
- Loading skeletons for all data views; optimistic UI for status changes.
- Toast notifications for every mutation, success and failure.
- Confirmation dialogs before destructive or clinically significant actions (cancel appointment, deactivate patient, delete file).
- Empty states with a clear next action, never a blank panel.
- Keyboard-accessible; visible focus rings; correct labels on every input; ARIA where needed (WCAG 2.1 AA as the target).
- Print stylesheets for prescriptions, invoices, and medical record summaries.
- Global search (⌘K / Ctrl+K) for patients and appointments.

---

## 7. Non-Functional Requirements

- **Security:** RLS on every table; server-side role checks on every mutation; Zod validation on all inputs (client _and_ server); no secrets in client bundles; parameterised queries only; rate-limit login attempts; secure headers; HTTPS assumed in deployment.
- **Data integrity:** foreign keys with sensible `ON DELETE` behaviour (restrict on clinical data, never silently cascade a patient's history away); the appointment overlap exclusion constraint; check constraints on money (non-negative) and on `scheduled_end > scheduled_start`.
- **Performance:** server-side pagination everywhere (default 20 rows); indexed queries; no N+1 fetching; images served through Cloudinary transformations.
- **Reliability:** typed error handling in server actions returning `{ success, data?, error? }`; no unhandled promise rejections; graceful degradation if Cloudinary is unreachable.
- **Maintainability:** feature-based folder structure, shared Zod schemas as the single source of truth for types, generated Supabase types, `.env.example` documenting every variable.

---

## 8. Project Structure

```
/app
  /(auth)/login, /forgot-password
  /(dashboard)
    /dashboard            → role-aware landing
    /patients             → list, [id], new
    /doctors              → list, [id], schedule
    /appointments         → calendar, new, [id], queue
    /medical-records      → [id], new
    /prescriptions        → list, [id]
    /billing              → invoices, [id], payments
    /reports              → appointments, patients, revenue, workload
    /admin                → users, audit-log, settings
  /api                    → cloudinary signature, webhooks
/components
  /ui                     → shadcn primitives
  /features               → per-module components
/lib
  /supabase               → server & browser clients, generated types
  /cloudinary
  /validations            → Zod schemas
  /utils
/actions                  → server actions, one file per module
/supabase/migrations      → numbered SQL migrations
/supabase/seed.sql
```

---

## 9. Deliverables

Alongside working code, produce:

1. `README.md` — project overview, feature list, setup instructions, environment variables, how to run migrations and seed, default login credentials for each role.
2. `.env.example` with every required key (Supabase URL, anon key, service role key, Cloudinary cloud name / API key / API secret).
3. All SQL migrations + RLS policies + seed script.
4. **Entity-Relationship Diagram** and **system architecture diagram** as Mermaid code in `/docs`.
5. **Use-case diagram** (Mermaid or PlantUML) covering all three roles.
6. A `/docs/testing.md` listing test cases per module with expected results, suitable for the User Acceptance Testing chapter of the report.
7. Seed data rich enough that every chart and report is populated on first run.

---

## 10. Build Sequence

Work in this order and **stop after each phase for review** rather than generating everything at once:

1. Project scaffold, Tailwind + shadcn, Supabase clients, env config, folder structure.
2. Full SQL schema, enums, constraints, indexes, RLS policies, triggers, seed script.
3. Authentication, middleware route protection, role-aware layout and sidebar, admin user management.
4. Patient Management (full CRUD, search, detail page shell with tabs).
5. Doctor Management, availability editor, time-off.
6. Appointment Booking — slot generation, booking flow, calendar views, status lifecycle, reception queue.
7. Electronic Medical Records + consultation form + patient history timeline.
8. Prescription Management + printable slip.
9. Billing: invoices, line items, payments, printable receipt, outstanding balances.
10. Cloudinary file upload with signed uploads, previews, deletion.
11. Reports and role-aware dashboards with charts and CSV export.
12. Audit logging, polish pass, accessibility check, README and docs, ER/architecture/use-case diagrams.

---

## 11. Acceptance Criteria

The build is complete when all of the following are true:

- [ ] Each of the three roles can log in and sees only permitted navigation and data.
- [ ] A receptionist can register a new patient and book them an appointment in under a minute.
- [ ] Available slots reflect the doctor's real availability, existing bookings, and time off.
- [ ] Attempting to double-book a doctor fails at the database level with a clear user-facing message.
- [ ] A doctor can open today's schedule, record a consultation with vitals and diagnosis, and issue a prescription.
- [ ] Completing an appointment produces a draft invoice; recording a partial payment updates status and balance correctly.
- [ ] A lab result PDF can be uploaded against a patient and viewed later from the patient detail page.
- [ ] Every report renders populated charts from seed data and exports to CSV.
- [ ] Attempting to reach another role's route or call another role's server action is blocked.
- [ ] Prescriptions and invoices print cleanly on A4.
- [ ] `npm run build` completes with zero TypeScript errors and zero ESLint errors.

---

## 12. Constraints — Explicitly Out of Scope

Do not build: a patient self-service portal, AI or predictive scheduling, integration with insurance systems or national health databases, telemedicine/video consultation, SMS or email notification infrastructure, pharmacy inventory management, or laboratory equipment interfaces. Keep v1 focused on the twelve tables and nine modules above.

---

**Begin with Phase 1. Before writing code, state your understanding of the requirements in five bullet points and flag any assumption you intend to make, then proceed.**
