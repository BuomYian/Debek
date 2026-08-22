# Debek — Medical Appointment & Patient Management System

A web-based Medical Appointment and Patient Management System for small
to medium-sized clinics, built as a final-year Computer Science project
(Starford International University). Debek replaces paper registers,
appointment books and physical filing cabinets with a single system for
booking, electronic medical records, prescriptions, billing and patient
file storage.

> **Status:** Phases 1–10 of the build (scaffold, database schema, auth
> & role-aware shell, patient management, doctor management,
> appointment booking, electronic medical records, prescription
> management, billing, file uploads) are complete. See
> [Build phases](#build-phases) below for what's
> implemented so far. The live Supabase project referenced in
> `.env.local` is migrated and seeded — see the credentials table above.

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) |
| Language | TypeScript (strict) |
| Database | PostgreSQL on Supabase |
| Auth | Supabase Auth (email + password) |
| File/image storage | Cloudinary (signed uploads only) |
| Styling | Tailwind CSS v4 + shadcn/ui (Radix primitives) |
| Forms & validation | react-hook-form + Zod |
| Data fetching | Server Components + Server Actions; TanStack Query where needed client-side |
| Tables | TanStack Table |
| Charts | Recharts |
| Dates | date-fns |

## Roles

Three staff roles — **Admin**, **Doctor**, **Receptionist**. Patients are
records, not logins; there is no patient self-service portal in v1. See
the permissions matrix in the build spec (`debek-system-build-prompt.md`,
Section 3) for exactly what each role can do.

## Getting started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- A [Cloudinary](https://cloudinary.com) account

### Setup

```bash
npm install
cp .env.example .env.local
# fill in .env.local with your Supabase and Cloudinary credentials
```

### Running migrations & seeding

```bash
npx supabase db push               # apply migrations in supabase/migrations/, in order
node scripts/seed-users.mjs        # create the 15 seed staff/doctor logins (Admin API)
psql "$DATABASE_URL" -f supabase/seed.sql   # patients, doctors, appointments, records, billing
```

Regenerate `lib/supabase/types.ts` after any migration change:

```bash
npx supabase gen types typescript --db-url "$DATABASE_URL" --schema public > lib/supabase/types.ts
```

### Development

```bash
npm run dev
```

### Default login credentials (seeded)

All seeded accounts share the password `Debek@2026` — this is throwaway
academic-project data, not a real deployment. The seed creates 2 admins,
3 receptionists and 10 doctors (`doctor1@debek.local` … `doctor10@debek.local`,
one per specialization); the primary one to demo with per role:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@debek.local` | `Debek@2026` |
| Doctor | `doctor1@debek.local` (Dr. James Mwangi, General Medicine) | `Debek@2026` |
| Receptionist | `reception@debek.local` | `Debek@2026` |

## Environment variables

See [`.env.example`](.env.example) for the full list with descriptions:
Supabase URL / anon key / service role key, and Cloudinary cloud name /
API key / API secret.

## Email templates (Supabase dashboard)

Password reset and staff-invite emails both land on
[`app/auth/confirm/route.ts`](app/auth/confirm/route.ts), which expects
`token_hash`, `type`, and `next` query params — Supabase's default email
templates don't link there out of the box, so this needs a one-time
manual step per project: **Supabase dashboard → Authentication → Email
Templates**, set the link in both templates to:

- **Reset Password**: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password`
- **Invite user**: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/reset-password`

(Same destination for both — an invited user sets their initial
password on the same form a password reset uses.)

## Project structure

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
  /api                    → cloudinary signature
/components
  /ui                     → shadcn primitives (unmodified)
  /features               → per-module components
/lib
  /supabase               → server & browser clients, generated types
  /cloudinary
  /validations            → Zod schemas
/actions                  → server actions, one file per module
/supabase/migrations      → numbered SQL migrations
/supabase/seed.sql
/docs                     → ER diagram, architecture diagram, use-case diagram, UAT test cases
```

One deliberate deviation from the spec's literal tree: shared helpers
live in `lib/*.ts` (e.g. `lib/utils.ts`) rather than a `lib/utils/`
folder, because shadcn/ui's generated components hard-import
`@/lib/utils` — a directory of that name would collide with it.

## Build phases

Built in the order defined in the spec (Section 10), pausing for review
after each phase:

- [x] **Phase 1** — Project scaffold, Tailwind + shadcn/ui, Supabase
      client stubs, Cloudinary config stub, env config, folder structure.
- [x] **Phase 2** — Full SQL schema (20 migrations), enums, constraints,
      indexes, RLS policies, triggers, seed script. Tested end-to-end
      against a disposable Supabase-Postgres container — see
      [supabase/migrations/README.md](supabase/migrations/README.md).
- [x] **Phase 3** — Authentication (login, forgot/reset password, staff
      invites), `proxy.ts` route protection, role-aware layout/sidebar,
      session timeout, admin user management. Global search (⌘K) from
      Section 6 is deliberately deferred to Phase 4/6 — there's no
      patient or appointment data to search yet.
- [x] **Phase 4** — Patient Management: register/edit, server-side
      paginated + debounced search, soft-delete, duplicate-registration
      warning, patient detail page with tabs (Overview real; the rest
      placeholder until their own phase), ⌘K global search.
- [x] **Phase 5** — Doctor Management: directory with specialization
      filter, admin links a doctor profile to an invited Doctor-role
      staff account, weekly availability editor (with an app-level
      overlap check — see actions/doctors.ts), time-off entries. One
      shared profile/availability/time-off view powers both
      `/doctors/[id]` (admin, or a doctor viewing themself) and
      `/doctors/schedule` (a doctor's own shortcut).
- [x] **Phase 6** — Appointment Booking (the spec's own "give it the
      most care" module): live slot generation (`lib/scheduling/slots.ts`,
      unit-verified standalone), booking flow with inline patient
      registration, day/week/month calendar views colour-coded by
      status, the full scheduled→confirmed→checked_in→in_progress→completed
      lifecycle plus cancel-with-reason, reschedule via a new atomic
      `reschedule_appointment` Postgres function (0021 — verified this
      one can't lose the original booking on a race), and the reception
      queue. Also wired the patient detail page's Appointments tab to
      real data now that it exists.
- [x] **Phase 7** — Electronic Medical Records: consultation form
      (chief complaint, structured vitals with basic range warnings —
      `lib/vitals.ts`, examination, diagnosis, treatment plan, follow-up
      date), saving a consultation completes its linked appointment,
      edits are audit-logged automatically (the DB trigger from Phase
      2, no extra code needed), chronological patient timeline,
      print-friendly view (sidebar/topbar hidden via `print:` utilities).
      Admin is view-only; receptionist doesn't see this tab at all.
- [x] **Phase 8** — Prescription Management: issued from within a
      consultation (medical record page), dynamic medication line
      items, non-blocking duplicate-active-medication warning, printable
      slip with clinic header/patient details/doctor license/date,
      patient-tab and standalone list integration.
- [x] **Phase 9** — Billing: completing an appointment (either the
      manual button or saving a consultation) auto-drafts an invoice
      seeded with the doctor's fee — one shared helper
      (`lib/billing/draft-invoice.ts`), called from both places,
      deliberately running as the service-role client since a doctor
      triggers one of those two paths but has zero RLS access to
      invoices; see that file's comment for why that's not a
      contradiction. Line items, discount/tax, payments (amount_paid /
      status / balance all recompute via the Phase 2 triggers — no new
      code needed for that part), printable invoice/receipt, outstanding
      balances list.
- [x] **Phase 10** — Cloudinary file upload: signed direct-to-Cloudinary
      uploads (the file never passes through our server — `/api/cloudinary/sign`
      only ever returns a signature, never the secret), MIME/size
      restricted both client-side and in the signed request itself
      (`allowed_formats`), thumbnail previews for images vs.
      icon+filename for PDFs, delete requires admin or the uploader.
      Verified the full round trip (sign → upload → destroy) against
      the real Cloudinary account, not just build/lint.
- [ ] **Phase 11** — Reports & dashboards.
- [ ] **Phase 12** — Audit logging, polish, accessibility, docs.

## A note on "middleware"

The spec (and Next.js docs generally, as of your training data) call
this layer **Middleware**. As of Next.js 16 — the version this project
scaffolded on — the convention was renamed **Proxy** (`proxy.ts`,
exported function `proxy`); the functionality is identical. Phase 3
implements route protection as `proxy.ts`, not `middleware.ts`.

## License

Academic project — no license granted for reuse.
