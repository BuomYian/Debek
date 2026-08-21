-- Generic audit trigger, attached below to every clinical and financial
-- table (Section 4: "Write on every create/update/delete of clinical and
-- financial data"). SECURITY DEFINER so it can insert into audit_logs
-- even though no role has an INSERT policy on that table directly
-- (0020_rls_policies.sql) — the only way a row lands in audit_logs is
-- through this trigger.

create or replace function public.log_audit_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_changes jsonb;
  v_record_id uuid;
begin
  if tg_op = 'INSERT' then
    v_changes := jsonb_build_object('new', to_jsonb(new));
    v_record_id := new.id;
  elsif tg_op = 'UPDATE' then
    v_changes := jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new));
    v_record_id := new.id;
  elsif tg_op = 'DELETE' then
    v_changes := jsonb_build_object('old', to_jsonb(old));
    v_record_id := old.id;
  end if;

  insert into public.audit_logs (user_id, action, table_name, record_id, changes)
  values (auth.uid(), tg_op, tg_table_name, v_record_id, v_changes);

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- Clinical data.
create trigger trg_audit_patients
  after insert or update or delete on public.patients
  for each row execute function public.log_audit_event();

create trigger trg_audit_appointments
  after insert or update or delete on public.appointments
  for each row execute function public.log_audit_event();

create trigger trg_audit_medical_records
  after insert or update or delete on public.medical_records
  for each row execute function public.log_audit_event();

create trigger trg_audit_prescriptions
  after insert or update or delete on public.prescriptions
  for each row execute function public.log_audit_event();

create trigger trg_audit_prescription_items
  after insert or update or delete on public.prescription_items
  for each row execute function public.log_audit_event();

-- Financial data.
create trigger trg_audit_invoices
  after insert or update or delete on public.invoices
  for each row execute function public.log_audit_event();

create trigger trg_audit_invoice_items
  after insert or update or delete on public.invoice_items
  for each row execute function public.log_audit_event();

create trigger trg_audit_payments
  after insert or update or delete on public.payments
  for each row execute function public.log_audit_event();

-- Files are part of the clinical record.
create trigger trg_audit_patient_files
  after insert or update or delete on public.patient_files
  for each row execute function public.log_audit_event();
