-- invoices: billing header (Section 4, table 10; Section 5.7).
--
-- Derived-field ownership, so there is exactly one place that computes
-- each derived value, regardless of what changed:
--   - subtotal   is recomputed by the invoice_items trigger (0014) from
--                sum(line_total), then written to this row.
--   - amount_paid is recomputed by the payments trigger (0015) from
--                sum(payments.amount), then written to this row.
--   - total, status, and balance are always recomputed here, on this
--                table's own BEFORE INSERT/UPDATE trigger, from
--                whatever subtotal/discount/tax/amount_paid currently
--                are. This fires whether subtotal changed (via items),
--                amount_paid changed (via payments), or discount/tax
--                were edited directly on the invoice.
-- `balance` stays a generated column so it can never disagree with
-- total - amount_paid even under a bug elsewhere.

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique default public.next_document_number('invoice', 'INV'),
  patient_id uuid not null references public.patients (id) on delete restrict,
  appointment_id uuid references public.appointments (id) on delete set null,
  issue_date date not null default current_date,
  due_date date,
  subtotal numeric(12, 2) not null default 0 check (subtotal >= 0),
  discount numeric(12, 2) not null default 0 check (discount >= 0),
  tax numeric(12, 2) not null default 0 check (tax >= 0),
  total numeric(12, 2) not null default 0 check (total >= 0),
  amount_paid numeric(12, 2) not null default 0 check (amount_paid >= 0),
  balance numeric(12, 2) generated always as (total - amount_paid) stored,
  status public.invoice_status not null default 'unpaid',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoices_due_after_issue check (due_date is null or due_date >= issue_date)
);

comment on table public.invoices is 'Auto-drafted when an appointment is completed (Section 5.7).';

create trigger trg_invoices_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();

-- Recompute total and status. `status` is only ever hand-set to
-- 'cancelled' by the app (e.g. voiding an invoice) — every other value
-- is derived here from amount_paid vs total, so the app never has to
-- (and never should) set 'unpaid' / 'partially_paid' / 'paid' itself.
create or replace function public.compute_invoice_total_and_status()
returns trigger
language plpgsql
as $$
begin
  new.total := greatest(new.subtotal - new.discount + new.tax, 0);

  if new.status is distinct from 'cancelled' then
    if new.amount_paid <= 0 then
      new.status := 'unpaid';
    elsif new.amount_paid < new.total then
      new.status := 'partially_paid';
    else
      new.status := 'paid';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_invoices_compute_total_and_status
  before insert or update of subtotal, discount, tax, amount_paid, status on public.invoices
  for each row execute function public.compute_invoice_total_and_status();

create index invoices_patient_id_idx on public.invoices (patient_id);
create index invoices_appointment_id_idx on public.invoices (appointment_id);
create index invoices_status_idx on public.invoices (status);
-- Powers the outstanding-balances list (Section 5.7).
create index invoices_outstanding_idx on public.invoices (status, due_date) where status in ('unpaid', 'partially_paid');
