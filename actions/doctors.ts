"use server";

import { revalidatePath } from "next/cache";

import { requireRoleForAction } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { ActionResult } from "@/lib/validations/common";
import {
  availabilityRowSchema,
  createDoctorSchema,
  listDoctorsSchema,
  timeOffSchema,
  updateDoctorSchema,
  type AvailabilityRowInput,
  type CreateDoctorInput,
  type ListDoctorsInput,
  type TimeOffInput,
  type UpdateDoctorInput,
} from "@/lib/validations/doctors";

export type Doctor = Database["public"]["Tables"]["doctors"]["Row"];
export type DoctorAvailability = Database["public"]["Tables"]["doctor_availability"]["Row"];
export type DoctorTimeOff = Database["public"]["Tables"]["doctor_time_off"]["Row"];

export type DoctorWithProfile = Doctor & {
  profile: { full_name: string; phone: string | null; avatar_url: string | null } | null;
};

function toDbInput(input: CreateDoctorInput | UpdateDoctorInput) {
  return {
    specialization: input.specialization,
    license_number: input.licenseNumber,
    qualifications: input.qualifications || null,
    consultation_fee: input.consultationFee,
    bio: input.bio || null,
    is_accepting_appointments: input.isAcceptingAppointments,
  };
}

export async function listDoctors(input: ListDoctorsInput = {}): Promise<ActionResult<DoctorWithProfile[]>> {
  const auth = await requireRoleForAction(["admin", "doctor", "receptionist"]);
  if (!auth.ok) return { success: false, error: auth.error };

  const parsed = listDoctorsSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid filter." };

  try {
    const supabase = await createServerSupabaseClient();
    let query = supabase
      .from("doctors")
      .select("*, profile:profiles(full_name, phone, avatar_url)")
      .order("specialization", { ascending: true });

    if (parsed.data.specialization) {
      query = query.eq("specialization", parsed.data.specialization);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { success: true, data: (data ?? []) as DoctorWithProfile[] };
  } catch (err) {
    console.error("listDoctors failed", err);
    return { success: false, error: "Couldn't load doctors. Please try again." };
  }
}

export async function listSpecializations(): Promise<ActionResult<string[]>> {
  const auth = await requireRoleForAction(["admin", "doctor", "receptionist"]);
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from("doctors").select("specialization");
    if (error) throw error;
    const unique = Array.from(new Set((data ?? []).map((d) => d.specialization))).sort();
    return { success: true, data: unique };
  } catch (err) {
    console.error("listSpecializations failed", err);
    return { success: false, error: "Couldn't load specializations." };
  }
}

export async function getDoctor(id: string): Promise<ActionResult<DoctorWithProfile>> {
  const auth = await requireRoleForAction(["admin", "doctor", "receptionist"]);
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("doctors")
      .select("*, profile:profiles(full_name, phone, avatar_url)")
      .eq("id", id)
      .single();
    if (error) throw error;
    return { success: true, data: data as DoctorWithProfile };
  } catch (err) {
    console.error("getDoctor failed", err);
    return { success: false, error: "That doctor couldn't be found." };
  }
}

/** Resolves the signed-in doctor's own doctors.id, for the "My Schedule" page. */
export async function getMyDoctorRecord(): Promise<ActionResult<DoctorWithProfile>> {
  const auth = await requireRoleForAction(["doctor"]);
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("doctors")
      .select("*, profile:profiles(full_name, phone, avatar_url)")
      .eq("profile_id", auth.user.id)
      .single();
    if (error) throw error;
    return { success: true, data: data as DoctorWithProfile };
  } catch (err) {
    console.error("getMyDoctorRecord failed", err);
    return {
      success: false,
      error: "No doctor profile is linked to your account yet. Ask an admin to set one up.",
    };
  }
}

/** Profiles with role='doctor' that don't have a doctors row yet — candidates for "Add doctor". */
export async function listUnlinkedDoctorProfiles(): Promise<ActionResult<{ id: string; fullName: string }[]>> {
  const auth = await requireRoleForAction(["admin"]);
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const supabase = await createServerSupabaseClient();
    const [{ data: profiles, error: profilesError }, { data: doctors, error: doctorsError }] = await Promise.all([
      supabase.from("profiles").select("id, full_name").eq("role", "doctor").eq("is_active", true),
      supabase.from("doctors").select("profile_id"),
    ]);
    if (profilesError) throw profilesError;
    if (doctorsError) throw doctorsError;

    const linked = new Set((doctors ?? []).map((d) => d.profile_id));
    const unlinked = (profiles ?? [])
      .filter((p) => !linked.has(p.id))
      .map((p) => ({ id: p.id, fullName: p.full_name }));

    return { success: true, data: unlinked };
  } catch (err) {
    console.error("listUnlinkedDoctorProfiles failed", err);
    return { success: false, error: "Couldn't load available profiles." };
  }
}

export async function createDoctor(input: CreateDoctorInput): Promise<ActionResult<{ id: string }>> {
  const auth = await requireRoleForAction(["admin"]);
  if (!auth.ok) return { success: false, error: auth.error };

  const parsed = createDoctorSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("doctors")
      .insert({ ...toDbInput(parsed.data), profile_id: parsed.data.profileId })
      .select("id")
      .single();
    if (error) throw error;

    revalidatePath("/doctors");
    return { success: true, data: { id: data.id } };
  } catch (err) {
    console.error("createDoctor failed", err);
    return { success: false, error: "Couldn't create that doctor profile. Please try again." };
  }
}

/** Admin can edit any doctor; a doctor can edit their own — RLS is the actual authority here. */
export async function updateDoctor(input: UpdateDoctorInput): Promise<ActionResult<null>> {
  const auth = await requireRoleForAction(["admin", "doctor"]);
  if (!auth.ok) return { success: false, error: auth.error };

  const parsed = updateDoctorSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from("doctors").update(toDbInput(parsed.data)).eq("id", parsed.data.id);
    if (error) throw error;

    revalidatePath("/doctors");
    revalidatePath(`/doctors/${parsed.data.id}`);
    revalidatePath("/doctors/schedule");
    return { success: true, data: null };
  } catch (err) {
    console.error("updateDoctor failed", err);
    return { success: false, error: "Couldn't save those changes — you may only edit your own profile." };
  }
}

// ── Availability ─────────────────────────────────────────────────────

export async function listAvailability(doctorId: string): Promise<ActionResult<DoctorAvailability[]>> {
  const auth = await requireRoleForAction(["admin", "doctor", "receptionist"]);
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("doctor_availability")
      .select("*")
      .eq("doctor_id", doctorId)
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });
    if (error) throw error;
    return { success: true, data: data ?? [] };
  } catch (err) {
    console.error("listAvailability failed", err);
    return { success: false, error: "Couldn't load the schedule." };
  }
}

export async function addAvailabilityRow(input: AvailabilityRowInput): Promise<ActionResult<null>> {
  const auth = await requireRoleForAction(["admin", "doctor"]);
  if (!auth.ok) return { success: false, error: auth.error };

  const parsed = availabilityRowSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    const supabase = await createServerSupabaseClient();

    // The DB only rejects an exact duplicate row (doctor_availability_unique_slot
    // in 0007) — it doesn't stop two windows that merely overlap (e.g. 09:00-12:00
    // and 10:00-15:00), since a proper EXCLUDE constraint over a `time` column
    // needs a range type Postgres doesn't have built in. Checked here instead:
    // cheap (a handful of rows per doctor per day), and "HH:MM" strings compare
    // correctly with plain `<`/`>=`.
    const { data: existing, error: existingError } = await supabase
      .from("doctor_availability")
      .select("start_time, end_time")
      .eq("doctor_id", parsed.data.doctorId)
      .eq("day_of_week", parsed.data.dayOfWeek);
    if (existingError) throw existingError;

    const overlaps = (existing ?? []).some(
      (row) => parsed.data.startTime < row.end_time.slice(0, 5) && row.start_time.slice(0, 5) < parsed.data.endTime,
    );
    if (overlaps) {
      return { success: false, error: "That overlaps a slot already on the schedule for that day." };
    }

    const { error } = await supabase.from("doctor_availability").insert({
      doctor_id: parsed.data.doctorId,
      day_of_week: parsed.data.dayOfWeek,
      start_time: parsed.data.startTime,
      end_time: parsed.data.endTime,
      slot_duration_minutes: parsed.data.slotDurationMinutes,
    });
    if (error) throw error;

    revalidatePath(`/doctors/${parsed.data.doctorId}`);
    revalidatePath("/doctors/schedule");
    return { success: true, data: null };
  } catch (err) {
    console.error("addAvailabilityRow failed", err);
    return { success: false, error: "Couldn't add that slot. Please try again." };
  }
}

export async function removeAvailabilityRow(id: string, doctorId: string): Promise<ActionResult<null>> {
  const auth = await requireRoleForAction(["admin", "doctor"]);
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from("doctor_availability").delete().eq("id", id);
    if (error) throw error;

    revalidatePath(`/doctors/${doctorId}`);
    revalidatePath("/doctors/schedule");
    return { success: true, data: null };
  } catch (err) {
    console.error("removeAvailabilityRow failed", err);
    return { success: false, error: "Couldn't remove that slot." };
  }
}

// ── Time off ─────────────────────────────────────────────────────────

export async function listTimeOff(doctorId: string): Promise<ActionResult<DoctorTimeOff[]>> {
  const auth = await requireRoleForAction(["admin", "doctor", "receptionist"]);
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("doctor_time_off")
      .select("*")
      .eq("doctor_id", doctorId)
      .order("start_datetime", { ascending: false });
    if (error) throw error;
    return { success: true, data: data ?? [] };
  } catch (err) {
    console.error("listTimeOff failed", err);
    return { success: false, error: "Couldn't load time off." };
  }
}

export async function addTimeOff(input: TimeOffInput): Promise<ActionResult<null>> {
  const auth = await requireRoleForAction(["admin", "doctor"]);
  if (!auth.ok) return { success: false, error: auth.error };

  const parsed = timeOffSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from("doctor_time_off").insert({
      doctor_id: parsed.data.doctorId,
      start_datetime: parsed.data.startDatetime,
      end_datetime: parsed.data.endDatetime,
      reason: parsed.data.reason || null,
    });
    if (error) throw error;

    revalidatePath(`/doctors/${parsed.data.doctorId}`);
    revalidatePath("/doctors/schedule");
    return { success: true, data: null };
  } catch (err) {
    console.error("addTimeOff failed", err);
    return { success: false, error: "Couldn't add that time off. Please try again." };
  }
}

export async function removeTimeOff(id: string, doctorId: string): Promise<ActionResult<null>> {
  const auth = await requireRoleForAction(["admin", "doctor"]);
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from("doctor_time_off").delete().eq("id", id);
    if (error) throw error;

    revalidatePath(`/doctors/${doctorId}`);
    revalidatePath("/doctors/schedule");
    return { success: true, data: null };
  } catch (err) {
    console.error("removeTimeOff failed", err);
    return { success: false, error: "Couldn't remove that time off." };
  }
}
