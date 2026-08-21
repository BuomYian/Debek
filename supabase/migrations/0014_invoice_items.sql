-- invoice_items: billable line items (procedures, lab, supplies, the
-- doctor's consultation fee, ...) for an invoice (Section 4, table 11).
-- line_total is generated so it can never drift from quantity * unit_price.

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  description text not null,
  quantity numeric(10, 2) not null default 1 check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  line_total numeric(12, 2) generated always as (quantity * unit_price) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_invoice_items_updated_at
  before update on public.invoice_items
  for each row execute function public.set_updated_at();

create index invoice_items_invoice_id_idx on public.invoice_items (invoice_id);

-- Keeps invoices.subtotal in sync with sum(line_total). Writing to
-- invoices here also re-fires trg_invoices_compute_total_and_status
-- (0013), which recomputes total/status/balance from the new subtotal.
create or replace function public.recalculate_invoice_subtotal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice_id uuid := coalesce(new.invoice_id, old.invoice_id);
  v_subtotal numeric(12, 2);
begin
  select coalesce(sum(line_total), 0) into v_subtotal
  from public.invoice_items
  where invoice_id = v_invoice_id;

  update public.invoices set subtotal = v_subtotal where id = v_invoice_id;

  return coalesce(new, old);
end;
$$;

create trigger trg_invoice_items_recalculate_subtotal
  after insert or update or delete on public.invoice_items
  for each row execute function public.recalculate_invoice_subtotal();
