-- audit_logs: append-only trail of every create/update/delete on
-- clinical and financial data (Section 4, table 14; Section 7 security).
-- No updated_at column by design — this table is never updated, only
-- inserted into (by the trigger in 0018) and read (by admins, via RLS).

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  action text not null,
  table_name text not null,
  record_id uuid,
  changes jsonb,
  -- Populated by server actions that have request context (Phase 3+);
  -- left null for changes captured purely by the DB trigger below, since
  -- a Postgres trigger has no visibility into the client's IP address.
  ip_address inet,
  created_at timestamptz not null default now()
);

comment on table public.audit_logs is 'Immutable audit trail. INSERT-only — see 0020_rls_policies.sql (no update/delete policy exists for any role).';

create index audit_logs_table_record_idx on public.audit_logs (table_name, record_id);
create index audit_logs_user_id_idx on public.audit_logs (user_id);
create index audit_logs_created_at_idx on public.audit_logs (created_at desc);
