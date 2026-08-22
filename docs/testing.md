# User Acceptance Testing

Test cases per module, for the report's UAT chapter. Each case names the
role to test as, the steps, and the expected result. Default seeded
credentials (`README.md`): `admin@debek.local`, `doctor1@debek.local`,
`reception@debek.local`, password `Debek@2026` for all.

## 1. Authentication & Authorization

| # | Role | Steps | Expected result |
|---|---|---|---|
| 1.1 | Any | Go to `/login`, enter valid credentials, submit. | Redirected to `/dashboard`; sidebar shows only that role's links. |
| 1.2 | Any | Go to `/login`, enter an incorrect password. | Generic "Incorrect email or password" error — doesn't reveal whether the email exists. |
| 1.3 | Any | While signed out, visit `/patients` directly. | Redirected to `/login?next=/patients`; after signing in, lands back on `/patients`. |
| 1.4 | Receptionist | While signed in, visit `/admin/users`. | Redirected to `/dashboard` — not an error page, a silent bounce to somewhere they *can* see. |
| 1.5 | Admin | `/admin/users` → Invite staff → fill form, submit. | Invite email sent (check Inbucket/mail catcher in dev); new row appears in the staff table on refresh. |
| 1.6 | Admin | Deactivate another admin's account, then have that admin try any action mid-session. | Their next request is treated as signed out — `is_active` is checked on every request, not just at login. |
| 1.7 | Admin | Try to deactivate your own account. | Blocked with "You can't deactivate your own account." |
| 1.8 | Any | Sit idle on any page for 29 minutes. | A toast warns "signed out in 1 minute due to inactivity" at the 29-minute mark. |
| 1.9 | Any | Forgot password → submit a real and a fake email in turn. | Both show the same "check your email" message — no account enumeration. |

## 2. Patient Management

| # | Role | Steps | Expected result |
|---|---|---|---|
| 2.1 | Receptionist | `/patients/new` → fill required fields → submit. | Redirected to the new patient's detail page; `patient_number` auto-generated as `DBK-YYYY-NNNNN`. |
| 2.2 | Receptionist | Register a patient with the same first/last name and DOB as an existing one. | Amber warning banner appears before submit, linking to the existing record; submission is still allowed. |
| 2.3 | Doctor | Visit `/patients`. | List loads (view access), but no "Register patient" button, and `/patients/new` redirects away if visited directly. |
| 2.4 | Receptionist | `/patients`, type a partial phone number into search. | Results filter after ~300ms, without a full page reload. |
| 2.5 | Admin | Open a patient, click Edit, change phone number, save. | Change persists; an `audit_logs` row is written automatically (no app code needed for this). |
| 2.6 | Receptionist | Open a patient, Deactivate, confirm. | Patient badge flips to "Inactive"; patient no longer selectable in new appointment bookings. |
| 2.7 | Doctor | Open a patient's detail page. | Tabs shown: Overview, Appointments, Medical Records, Prescriptions, Files — **no Billing tab** (doctor has zero billing access). |
| 2.8 | Receptionist | Open a patient's detail page. | Tabs shown: Overview, Appointments, Billing, Files — **no Medical Records or Prescriptions tabs**. |

## 3. Doctor Management

| # | Role | Steps | Expected result |
|---|---|---|---|
| 3.1 | Admin | `/doctors` → Add doctor → pick an invited Doctor-role account, fill specialization/license/fee. | New doctor profile created; visible in the directory. |
| 3.2 | Admin | `/doctors`, filter by specialization. | List narrows to matching doctors only. |
| 3.3 | Doctor | `/doctors/schedule` → Add slot: Monday 09:00–12:00, 30 min. | Slot appears under Monday; saved. |
| 3.4 | Doctor | Add a second Monday slot that overlaps the first (e.g. 10:00–13:00). | Rejected: "That overlaps a slot already on the schedule for that day." |
| 3.5 | Doctor | Add time off covering next Monday. | Time off listed; Monday's slots for that date stop appearing in the booking flow's slot picker. |
| 3.6 | Doctor B | Try to edit Doctor A's availability via `/doctors/[A's id]`. | No Edit controls rendered; a direct mutation attempt is rejected by RLS regardless. |
| 3.7 | Receptionist | Open any doctor's profile. | Profile, availability, and time off are all visible but read-only — no Edit/Add controls. |

## 4. Appointment Booking

| # | Role | Steps | Expected result |
|---|---|---|---|
| 4.1 | Receptionist | `/appointments/new` → pick patient → pick doctor → pick a date → pick a slot → book. | Appointment created with status `scheduled`; redirected to its detail page. |
| 4.2 | Receptionist | On the booking form, click "Register a new patient" mid-flow. | Dialog opens; on save, the new patient is selected automatically without leaving the booking form. |
| 4.3 | Two sessions | Open the same doctor+date+slot in two browser sessions; submit both within a few seconds of each other. | One booking succeeds; the second gets "That slot was just booked by someone else. Please pick another," not a crash or a double-booked doctor. |
| 4.4 | Receptionist | `/appointments`, switch between Day / Week / Month views. | Each view loads appointments for its range, colour-coded by status. |
| 4.5 | Admin/Receptionist | Open an appointment, walk it through Confirm → Check-in → Start consultation → Mark complete. | Status badge updates at each step; each transition is only offered when valid for the current status. |
| 4.6 | Any staff | Try to skip a step (e.g. force `scheduled` → `completed` directly). | Rejected: "Can't move an appointment from 'scheduled' to 'completed'." |
| 4.7 | Receptionist | Open a `scheduled` appointment → Reschedule → pick a new slot. | Original appointment shows status `cancelled`, reason "Rescheduled"; a new appointment is created linked back via "Rescheduled from." |
| 4.8 | Receptionist | Cancel an appointment, providing a reason. | Status → `cancelled`; reason stored and visible on the detail page. |
| 4.9 | Receptionist | `/appointments/queue`, click "Check in" on an upcoming appointment. | Row moves to the "Waiting" column **immediately** (optimistic UI), before the network request resolves. |

## 5. Electronic Medical Records

| # | Role | Steps | Expected result |
|---|---|---|---|
| 5.1 | Doctor | Open an `in_progress` appointment → Start consultation. | Consultation form opens, patient pre-filled and locked. |
| 5.2 | Doctor | Enter a pulse of 130, tab out of the field. | Inline warning: "High — possible tachycardia." Does not block submission. |
| 5.3 | Doctor | Fill chief complaint, vitals, diagnosis, treatment plan → save. | Record saved; **the linked appointment's status flips to `completed`**, and an invoice is auto-drafted (see Billing 7.1). |
| 5.4 | Admin | Open the same medical record. | Fully viewable, **no Edit button** (admin is view-only for clinical records). |
| 5.5 | Doctor B | Try to open Doctor A's medical record for a shared patient via direct URL. | RLS blocks the read entirely — 404, not a permission-denied page that confirms the record exists. |
| 5.6 | Doctor | Edit an existing record's diagnosis, save. | Change persists; audit-logged automatically. |
| 5.7 | Doctor | Open a record, click Print. | Sidebar/topbar disappear from the print preview; the record content is clean, single-column, A4-appropriate. |
| 5.8 | Admin/Doctor | Open a patient's Medical Records tab. | Chronological list, newest visit first, each entry linking to its full record. |

## 6. Prescription Management

| # | Role | Steps | Expected result |
|---|---|---|---|
| 6.1 | Doctor | From a medical record → Issue prescription → add 2 medication lines → submit. | Prescription created with both line items; visible from the record and the patient's Prescriptions tab. |
| 6.2 | Doctor | Issue a prescription for "Amoxicillin" to a patient who already has an *active* prescription containing "Amoxicillin." | Amber warning shown before submit, linking to the existing active prescription; submission still allowed. |
| 6.3 | Doctor | Open a prescription → Print. | Clinic header, patient details, prescribing doctor + license number, and date all present; prints cleanly. |
| 6.4 | Receptionist | Try to visit `/prescriptions` or any `/prescriptions/[id]` directly. | Redirected away — receptionist has no access to prescriptions at all, not even view. |
| 6.5 | Doctor | Mark a prescription "Completed" via its status control. | Status updates; reflected in the patient's Prescriptions tab. |

## 7. Billing Management

| # | Role | Steps | Expected result |
|---|---|---|---|
| 7.1 | (system) | Complete an appointment (via 4.5 or 5.3). | A new invoice appears at `/billing/invoices`, pre-filled with one line item: "Consultation - {specialization}" at the doctor's `consultation_fee`. |
| 7.2 | Admin/Receptionist | Open the drafted invoice → Add line item (e.g. "Lab test", qty 1, $8). | Subtotal and total recompute automatically; no manual math. |
| 7.3 | Admin/Receptionist | Set a discount of $5 and tax of $2, save. | Total recomputes to `subtotal - discount + tax`; status recomputes too if it changes the paid/unpaid boundary. |
| 7.4 | Admin/Receptionist | Record a partial payment less than the balance. | `amount_paid` and `balance` update; status → `partially_paid`. |
| 7.5 | Admin/Receptionist | Record a second payment that brings `amount_paid` to the full total. | Status → `paid` automatically. |
| 7.6 | Doctor | Try to visit `/billing/invoices` or any invoice detail page directly. | Redirected away — doctor has zero billing access, not even view. |
| 7.7 | Admin/Receptionist | `/billing/payments` (Outstanding Balances). | Lists every `unpaid`/`partially_paid` invoice with its balance; an invoice past its due date is flagged "Overdue." |
| 7.8 | Admin/Receptionist | Open an invoice → Print. | Clinic header, line items, subtotal/discount/tax/total/paid/balance, and payment history all present; prints cleanly on A4. |

## 8. File Management (Cloudinary)

| # | Role | Steps | Expected result |
|---|---|---|---|
| 8.1 | Any staff | Patient detail → Files tab → Upload → pick a PDF lab result, category "Lab result" → upload. | File appears as an icon + filename card; clicking it opens the file in a new tab. |
| 8.2 | Any staff | Upload a JPG. | Appears as a thumbnail preview (not an icon). |
| 8.3 | Any staff | Try to select a `.docx` file. | Client-side rejection before any upload starts: "Only PDF, JPG, PNG, or WEBP files are allowed." |
| 8.4 | Any staff | Try to select a file larger than 10 MB. | Client-side rejection: "File is too large — the limit is 10 MB." |
| 8.5 | Receptionist A | Try to delete a file uploaded by Receptionist B. | Delete option not offered; a direct action call would be rejected ("Only an admin or the person who uploaded this file can delete it."). |
| 8.6 | Admin | Delete any staff member's uploaded file. | Removed from both the patient's file list and Cloudinary. |

## 9. Reports & Dashboards

| # | Role | Steps | Expected result |
|---|---|---|---|
| 9.1 | Admin | `/dashboard`. | Shows today's appointments, patients seen today, revenue today, outstanding balance, this week's load. |
| 9.2 | Doctor | `/dashboard`. | Shows today's schedule, patients seen this week, next appointment — no financial figures. |
| 9.3 | Receptionist | `/dashboard`. | Shows today's queue (Waiting / With doctor / Next up) and a Quick Book button. |
| 9.4 | Admin | `/reports/appointments`, change the date range via a preset. | Charts and stat tiles refresh for the new range; URL reflects `?from=&to=`. |
| 9.5 | Admin | Any report page → Export CSV. | A `.csv` file downloads with the report's underlying rows. |
| 9.6 | Doctor/Receptionist | Try to visit `/reports` or any sub-report directly. | Redirected away — reports are admin-only. |
| 9.7 | Admin | `/admin/audit-log`, filter by table = `invoices`, action = `UPDATE`. | List narrows accordingly; each row's "View" opens the full before/after JSON diff. |
| 9.8 | Doctor/Receptionist | Try to visit `/admin/audit-log` directly. | Redirected away. |

## Cross-cutting checks

| # | Check |
|---|---|
| C.1 | `npm run build` completes with zero TypeScript errors and zero ESLint errors. |
| C.2 | Every list view (patients, doctors, appointments, prescriptions, invoices, audit log) shows a loading skeleton on first navigation, not a blank screen. |
| C.3 | Every destructive action (cancel appointment, deactivate patient/staff, delete file, cancel invoice) requires a confirmation dialog. |
| C.4 | Every mutation shows a success or error toast — none fail silently. |
| C.5 | Tab through any form using only the keyboard — focus order is logical, focus rings are visible, every input has an associated label. |
| C.6 | Resize the browser to a tablet width (~768px) on the patients list, the booking form, and the queue board — all remain usable without horizontal scrolling of the page body. |
