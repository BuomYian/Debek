# Debek — Medical Appointment & Patient Management System

A web-based Medical Appointment and Patient Management System for small
to medium-sized clinics, built as a final-year Computer Science project
(Starford International University). Debek replaces paper registers,
appointment books and physical filing cabinets with a single system for
booking, electronic medical records, prescriptions, billing and patient
file storage.

> **Status:** Phases 1–2 of the build (scaffold + database schema) are
> complete. See [Build phases](#build-phases) below for what's
> implemented so far.

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
  /api                    → cloudinary signature, webhooks (Phase 10)
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
- [ ] **Phase 3** — Authentication, middleware (Proxy) route protection,
      role-aware layout and sidebar, admin user management.
- [ ] **Phase 4** — Patient Management.
- [ ] **Phase 5** — Doctor Management, availability, time-off.
- [ ] **Phase 6** — Appointment Booking, calendars, queue.
- [ ] **Phase 7** — Electronic Medical Records.
- [ ] **Phase 8** — Prescription Management.
- [ ] **Phase 9** — Billing.
- [ ] **Phase 10** — Cloudinary file upload.
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
