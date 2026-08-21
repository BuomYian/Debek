-- payments: money actually received against an invoice (Section 4,
-- table 12; Section 5.7). Recording a payment here keeps
-- invoices.amount_paid / status / balance in sync automatically — the
-- app never writes to those columns directly.

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  payment_method public.payment_method_type not null,
  reference text,
  paid_at timestamptz not null default now(),
  received_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

create index payments_invoice_id_idx on public.payments (invoice_id);
create index payments_payment_method_idx on public.payments (payment_method);

-- Keeps invoices.amount_paid in sync with sum(payments.amount). Writing
-- to invoices here re-fires trg_invoices_compute_total_and_status
-- (0013), which recomputes total/status/balance from the new amount_paid.
create or replace function public.recalculate_invoice_amount_paid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice_id uuid := coalesce(new.invoice_id, old.invoice_id);
  v_paid numeric(12, 2);
begin
  select coalesce(sum(amount), 0) into v_paid
  from public.payments
  where invoice_id = v_invoice_id;

  update public.invoices set amount_paid = v_paid where id = v_invoice_id;

  return coalesce(new, old);
end;
$$;

create trigger trg_payments_recalculate_amount_paid
  after insert or update or delete on public.payments
  for each row execute function public.recalculate_invoice_amount_paid();
