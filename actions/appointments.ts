"use server";

import { revalidatePath } from "next/cache";

import { requireRoleForAction } from "@/lib/auth/guards";
import { computeAvailableSlots } from "@/lib/scheduling/slots";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { ActionResult } from "@/lib/validations/common";
import {
  bookAppointmentSchema,
  cancelAppointmentSchema,
  listAppointmentsSchema,
  rescheduleAppointmentSchema,
  setStatusSchema,
  slotsQuerySchema,
  type AppointmentStatus,
  type BookAppointmentInput,
  type CancelAppointmentInput,
  type ListAppointmentsInput,
  type RescheduleAppointmentInput,
  type SetStatusInput,
  type SlotsQueryInput,
} from "@/lib/validations/appointments";

export type Appointment = Database["public"]["Tables"]["appointments"]["Row"];

export type AppointmentWithNames = Appointment & {
  patient: { id: string; first_name: string; last_name: string; patient_number: string } | null;
  doctor: { id: string; specialization: string; profile: { full_name: string } | null } | null;
};

const WITH_NAMES = "*, patient:patients(id, first_name, last_name, patient_number), doctor:doctors(id, specialization, profile:profiles(full_name))";

/** Section 5.4: forward-only lifecycle. Cancel/no-show are reachable from any non-terminal state via their own actions. */
const ALLOWED_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  scheduled: ["confirmed", "cancelled", "no_show"],
  confirmed: ["checked_in", "cancelled", "no_show"],
  checked_in: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
  no_show: [],
};

function isExclusionViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "23P01";
}

// ── Slot generation (Section 5.4) ───────────────────────────────────

export async function getAvailableSlots(
  input: SlotsQueryInput,
): Promise<ActionResult<{ start: string; end: string }[]>> {
  const auth = await requireRoleForAction(["admin", "doctor", "receptionist"]);
  if (!auth.ok) return { success: false, error: auth.error };

  const parsed = slotsQuerySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid request." };
  const { doctorId, date } = parsed.data;

  try {
    const supabase = await createServerSupabaseClient();
    const dayStart = `${date}T00:00:00`;
    const dayEnd = `${date}T23:59:59`;

    const [{ data: availability, error: availError }, { data: timeOff, error: timeOffError }, { data: booked, error: bookedError }] =
      await Promise.all([
        supabase.from("doctor_availability").select("day_of_week, start_time, end_time, slot_duration_minutes, is_active").eq("doctor_id", doctorId),
        supabase.from("doctor_time_off").select("start_datetime, end_datetime").eq("doctor_id", doctorId).lte("start_datetime", dayEnd).gte("end_datetime", dayStart),
        supabase
          .from("appointments")
          .select("scheduled_start, scheduled_end")
          .eq("doctor_id", doctorId)
          .neq("status", "cancelled")
          .gte("scheduled_start", dayStart)
          .lte("scheduled_start", dayEnd),
      ]);
    if (availError) throw availError;
    if (timeOffError) throw timeOffError;
    if (bookedError) throw bookedError;

    // Parsed as a local calendar date (not UTC-shifted) — see the
    // timezone note in lib/scheduling/slots.ts.
    const [y, m, d] = date.split("-").map(Number);
    const targetDate = new Date(y!, (m ?? 1) - 1, d);
    const today = new Date();
    const isToday = targetDate.toDateString() === today.toDateString();

    const slots = computeAvailableSlots({
      date: targetDate,
      availability: availability ?? [],
      timeOff: timeOff ?? [],
      booked: booked ?? [],
      now: isToday ? today : undefined,
    });

    return {
      success: true,
      data: slots.map((s) => ({ start: s.start.toISOString(), end: s.end.toISOString() })),
    };
  } catch (err) {
    console.error("getAvailableSlots failed", err);
    return { success: false, error: "Couldn't load available slots. Please try again." };
  }
}

// ── Booking ──────────────────────────────────────────────────────────

export async function bookAppointment(input: BookAppointmentInput): Promise<ActionResult<{ id: string }>> {
  const auth = await requireRoleForAction(["admin", "doctor", "receptionist"]);
  if (!auth.ok) return { success: false, error: auth.error };

  const parsed = bookAppointmentSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("appointments")
      .insert({
        patient_id: parsed.data.patientId,
        doctor_id: parsed.data.doctorId,
        scheduled_start: parsed.data.scheduledStart,
        scheduled_end: parsed.data.scheduledEnd,
        reason_for_visit: parsed.data.reasonForVisit || null,
        notes: parsed.data.notes || null,
        booked_by: auth.user.id,
      })
      .select("id")
      .single();

    if (error) {
      if (isExclusionViolation(error)) {
        return { success: false, error: "That slot was just booked by someone else. Please pick another." };
      }
      throw error;
    }

    revalidatePath("/appointments");
    revalidatePath("/appointments/queue");
    return { success: true, data: { id: data.id } };
  } catch (err) {
    console.error("bookAppointment failed", err);
    return { success: false, error: "Couldn't book that appointment. Please try again." };
  }
}

// ── Listing / detail ─────────────────────────────────────────────────

export async function listAppointments(input: ListAppointmentsInput): Promise<ActionResult<AppointmentWithNames[]>> {
  const auth = await requireRoleForAction(["admin", "doctor", "receptionist"]);
  if (!auth.ok) return { success: false, error: auth.error };

  const parsed = listAppointmentsSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid request." };

  try {
    const supabase = await createServerSupabaseClient();
    let query = supabase
      .from("appointments")
      .select(WITH_NAMES)
      .gte("scheduled_start", parsed.data.from)
      .lt("scheduled_start", parsed.data.to)
      .order("scheduled_start", { ascending: true });

    if (parsed.data.doctorId) query = query.eq("doctor_id", parsed.data.doctorId);
    if (parsed.data.patientId) query = query.eq("patient_id", parsed.data.patientId);

    const { data, error } = await query;
    if (error) throw error;
    return { success: true, data: (data ?? []) as AppointmentWithNames[] };
  } catch (err) {
    console.error("listAppointments failed", err);
    return { success: false, error: "Couldn't load appointments. Please try again." };
  }
}

export async function getAppointment(id: string): Promise<ActionResult<AppointmentWithNames>> {
  const auth = await requireRoleForAction(["admin", "doctor", "receptionist"]);
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from("appointments").select(WITH_NAMES).eq("id", id).single();
    if (error) throw error;
    return { success: true, data: data as AppointmentWithNames };
  } catch (err) {
    console.error("getAppointment failed", err);
    return { success: false, error: "That appointment couldn't be found." };
  }
}

/** Today's reception queue (Section 5.4): every doctor, today only. */
export async function listTodaysQueue(): Promise<ActionResult<AppointmentWithNames[]>> {
  const auth = await requireRoleForAction(["admin", "receptionist"]);
  if (!auth.ok) return { success: false, error: auth.error };

  const todayStr = new Date().toISOString().slice(0, 10);
  return listAppointments({ from: `${todayStr}T00:00:00`, to: `${todayStr}T23:59:59` });
}

// ── Lifecycle ────────────────────────────────────────────────────────

export async function setAppointmentStatus(input: SetStatusInput): Promise<ActionResult<null>> {
  const auth = await requireRoleForAction(["admin", "doctor", "receptionist"]);
  if (!auth.ok) return { success: false, error: auth.error };

  const parsed = setStatusSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    const supabase = await createServerSupabaseClient();
    const { data: current, error: fetchError } = await supabase
      .from("appointments")
      .select("status")
      .eq("id", parsed.data.id)
      .single();
    if (fetchError) throw fetchError;

    if (!ALLOWED_TRANSITIONS[current.status].includes(parsed.data.status)) {
      return { success: false, error: `Can't move an appointment from "${current.status}" to "${parsed.data.status}".` };
    }

    const { error } = await supabase.from("appointments").update({ status: parsed.data.status }).eq("id", parsed.data.id);
    if (error) throw error;

    revalidatePath("/appointments");
    revalidatePath(`/appointments/${parsed.data.id}`);
    revalidatePath("/appointments/queue");
    return { success: true, data: null };
  } catch (err) {
    console.error("setAppointmentStatus failed", err);
    return { success: false, error: "Couldn't update that appointment. Please try again." };
  }
}

export async function cancelAppointment(input: CancelAppointmentInput): Promise<ActionResult<null>> {
  const auth = await requireRoleForAction(["admin", "doctor", "receptionist"]);
  if (!auth.ok) return { success: false, error: auth.error };

  const parsed = cancelAppointmentSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from("appointments")
      .update({ status: "cancelled", cancelled_reason: parsed.data.reason })
      .eq("id", parsed.data.id);
    if (error) throw error;

    revalidatePath("/appointments");
    revalidatePath(`/appointments/${parsed.data.id}`);
    revalidatePath("/appointments/queue");
    return { success: true, data: null };
  } catch (err) {
    console.error("cancelAppointment failed", err);
    return { success: false, error: "Couldn't cancel that appointment. Please try again." };
  }
}

export async function rescheduleAppointment(input: RescheduleAppointmentInput): Promise<ActionResult<{ id: string }>> {
  const auth = await requireRoleForAction(["admin", "doctor", "receptionist"]);
  if (!auth.ok) return { success: false, error: auth.error };

  const parsed = rescheduleAppointmentSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc("reschedule_appointment", {
      p_appointment_id: parsed.data.id,
      p_new_start: parsed.data.scheduledStart,
      p_new_end: parsed.data.scheduledEnd,
    });

    if (error) {
      if (isExclusionViolation(error)) {
        return { success: false, error: "That slot was just booked by someone else. Please pick another." };
      }
      if (error.message.includes("no longer be rescheduled") || error.message.includes("do not have permission")) {
        return { success: false, error: error.message };
      }
      throw error;
    }

    revalidatePath("/appointments");
    revalidatePath(`/appointments/${parsed.data.id}`);
    revalidatePath("/appointments/queue");
    return { success: true, data: { id: data as string } };
  } catch (err) {
    console.error("rescheduleAppointment failed", err);
    return { success: false, error: "Couldn't reschedule that appointment. Please try again." };
  }
}
