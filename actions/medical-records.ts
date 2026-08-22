"use server";

import { revalidatePath } from "next/cache";

import { requireRoleForAction } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/types";
import type { ActionResult } from "@/lib/validations/common";
import {
  createMedicalRecordSchema,
  updateMedicalRecordSchema,
  type CreateMedicalRecordInput,
  type UpdateMedicalRecordInput,
  type VitalSignsFormInput,
} from "@/lib/validations/medical-records";

export type MedicalRecord = Database["public"]["Tables"]["medical_records"]["Row"];

export type MedicalRecordWithNames = MedicalRecord & {
  patient: { id: string; first_name: string; last_name: string; patient_number: string } | null;
  doctor: { id: string; specialization: string; profile: { full_name: string } | null } | null;
};

const WITH_NAMES =
  "*, patient:patients(id, first_name, last_name, patient_number), doctor:doctors(id, specialization, profile:profiles(full_name))";

function vitalsToJson(vitals: VitalSignsFormInput): Json | null {
  const entries: [string, number | string][] = [];
  if (vitals.systolic !== undefined && vitals.diastolic !== undefined) {
    // stored as "systolic/diastolic" to match the shape the Phase 2 seed
    // data and the dashboard's vitals display already use.
    entries.push(["bp", `${vitals.systolic}/${vitals.diastolic}`]);
  }
  if (vitals.temp !== undefined) entries.push(["temp", vitals.temp]);
  if (vitals.pulse !== undefined) entries.push(["pulse", vitals.pulse]);
  if (vitals.weight !== undefined) entries.push(["weight", vitals.weight]);
  if (vitals.height !== undefined) entries.push(["height", vitals.height]);
  if (vitals.respiratoryRate !== undefined) entries.push(["respiratory_rate", vitals.respiratoryRate]);
  if (vitals.o2Sat !== undefined) entries.push(["o2_sat", vitals.o2Sat]);
  if (entries.length === 0) return null;
  return Object.fromEntries(entries) as Json;
}

/** Resolves the signed-in doctor's own doctors.id — every write here is scoped to it. */
async function getOwnDoctorId(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  profileId: string,
): Promise<string | null> {
  const { data } = await supabase.from("doctors").select("id").eq("profile_id", profileId).single();
  return data?.id ?? null;
}

export async function createMedicalRecord(
  input: CreateMedicalRecordInput,
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireRoleForAction(["doctor"]);
  if (!auth.ok) return { success: false, error: auth.error };

  const parsed = createMedicalRecordSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    const supabase = await createServerSupabaseClient();
    const doctorId = await getOwnDoctorId(supabase, auth.user.id);
    if (!doctorId) return { success: false, error: "No doctor profile is linked to your account." };

    const { data, error } = await supabase
      .from("medical_records")
      .insert({
        patient_id: parsed.data.patientId,
        doctor_id: doctorId,
        appointment_id: parsed.data.appointmentId ?? null,
        visit_date: parsed.data.visitDate,
        chief_complaint: parsed.data.chiefComplaint,
        symptoms: parsed.data.symptoms || null,
        vital_signs: vitalsToJson(parsed.data.vitals),
        examination_findings: parsed.data.examinationFindings || null,
        diagnosis: parsed.data.diagnosis || null,
        treatment_plan: parsed.data.treatmentPlan || null,
        clinical_notes: parsed.data.clinicalNotes || null,
        follow_up_date: parsed.data.followUpDate || null,
      })
      .select("id")
      .single();
    if (error) throw error;

    // Saving the consultation is what actually completes the visit
    // (Section 5.4's "one-click jump into the consultation form") — only
    // if it's still in a state that makes sense to complete, and only
    // this doctor's own appointment (RLS backs this up regardless).
    if (parsed.data.appointmentId) {
      const { data: appt } = await supabase
        .from("appointments")
        .select("status")
        .eq("id", parsed.data.appointmentId)
        .single();
      if (appt && appt.status !== "completed" && appt.status !== "cancelled") {
        await supabase.from("appointments").update({ status: "completed" }).eq("id", parsed.data.appointmentId);
        revalidatePath(`/appointments/${parsed.data.appointmentId}`);
        revalidatePath("/appointments");
        revalidatePath("/appointments/queue");
      }
    }

    revalidatePath(`/patients/${parsed.data.patientId}`);
    return { success: true, data: { id: data.id } };
  } catch (err) {
    console.error("createMedicalRecord failed", err);
    return { success: false, error: "Couldn't save the consultation. Please try again." };
  }
}

export async function updateMedicalRecord(input: UpdateMedicalRecordInput): Promise<ActionResult<null>> {
  const auth = await requireRoleForAction(["doctor"]);
  if (!auth.ok) return { success: false, error: auth.error };

  const parsed = updateMedicalRecordSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    const supabase = await createServerSupabaseClient();
    // Edits are allowed but every change is written to audit_logs
    // (Section 5.5) — that's the trg_audit_medical_records trigger from
    // 0018_audit_triggers.sql, already firing on this UPDATE with no
    // extra code needed here.
    const { error } = await supabase
      .from("medical_records")
      .update({
        chief_complaint: parsed.data.chiefComplaint,
        symptoms: parsed.data.symptoms || null,
        vital_signs: vitalsToJson(parsed.data.vitals),
        examination_findings: parsed.data.examinationFindings || null,
        diagnosis: parsed.data.diagnosis || null,
        treatment_plan: parsed.data.treatmentPlan || null,
        clinical_notes: parsed.data.clinicalNotes || null,
        follow_up_date: parsed.data.followUpDate || null,
      })
      .eq("id", parsed.data.id);
    if (error) throw error;

    revalidatePath(`/medical-records/${parsed.data.id}`);
    revalidatePath(`/patients/${parsed.data.patientId}`);
    return { success: true, data: null };
  } catch (err) {
    console.error("updateMedicalRecord failed", err);
    return { success: false, error: "Couldn't save those changes — you may only edit your own consultations." };
  }
}

export async function getMedicalRecord(id: string): Promise<ActionResult<MedicalRecordWithNames>> {
  const auth = await requireRoleForAction(["admin", "doctor"]);
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from("medical_records").select(WITH_NAMES).eq("id", id).single();
    if (error) throw error;
    return { success: true, data: data as MedicalRecordWithNames };
  } catch (err) {
    console.error("getMedicalRecord failed", err);
    return { success: false, error: "That record couldn't be found." };
  }
}

/** Chronological patient history timeline (Section 5.5). */
export async function listPatientMedicalRecords(patientId: string): Promise<ActionResult<MedicalRecordWithNames[]>> {
  const auth = await requireRoleForAction(["admin", "doctor"]);
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("medical_records")
      .select(WITH_NAMES)
      .eq("patient_id", patientId)
      .order("visit_date", { ascending: false });
    if (error) throw error;
    return { success: true, data: (data ?? []) as MedicalRecordWithNames[] };
  } catch (err) {
    console.error("listPatientMedicalRecords failed", err);
    return { success: false, error: "Couldn't load medical records." };
  }
}
