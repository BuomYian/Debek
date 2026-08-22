-- Reschedule = cancel the original appointment + insert a new one linked
-- via rescheduled_from (Section 5.4: "reschedule (preserving a link to
-- the original)"). Doing this as a single Postgres function rather than
-- two separate client calls is what makes it atomic: if the new slot
-- was just taken by someone else, the whole function aborts and the
-- original booking is NOT left cancelled with nothing to replace it.
--
-- SECURITY INVOKER (the default, named explicitly): runs with the
-- caller's own privileges, so RLS on appointments still applies to both
-- the UPDATE and the INSERT inside it — an admin/receptionist can
-- reschedule anyone, a doctor only their own, exactly as
-- 0020_rls_policies.sql already defines. This function adds atomicity,
-- not a privilege escalation.
create or replace function public.reschedule_appointment(
  p_appointment_id uuid,
  p_new_start timestamptz,
  p_new_end timestamptz
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_original record;
  v_new_id uuid;
  v_updated integer;
begin
  select * into v_original from public.appointments where id = p_appointment_id;
  if not found then
    raise exception 'Appointment not found';
  end if;

  if v_original.status in ('completed', 'cancelled', 'no_show') then
    raise exception 'This appointment can no longer be rescheduled';
  end if;

  update public.appointments
  set status = 'cancelled', cancelled_reason = 'Rescheduled'
  where id = p_appointment_id;

  -- Belt-and-suspenders: appointments_select and appointments_update
  -- share the same ownership predicate today, so this can't actually
  -- happen — but if that ever drifts, fail loudly instead of silently
  -- inserting an orphaned replacement for a booking that was never
  -- actually cancelled.
  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'You do not have permission to reschedule this appointment';
  end if;

  -- auth.uid(), not a caller-supplied parameter: booked_by must be
  -- whoever is actually making this request, not whatever the client
  -- claims.
  insert into public.appointments (
    patient_id, doctor_id, scheduled_start, scheduled_end,
    reason_for_visit, booked_by, rescheduled_from
  ) values (
    v_original.patient_id, v_original.doctor_id, p_new_start, p_new_end,
    v_original.reason_for_visit, auth.uid(), v_original.id
  )
  returning id into v_new_id;

  return v_new_id;
end;
$$;

grant execute on function public.reschedule_appointment(uuid, timestamptz, timestamptz) to authenticated;
