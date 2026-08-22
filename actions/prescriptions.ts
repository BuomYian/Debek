"use server";

import { revalidatePath } from "next/cache";

import { requireRoleForAction } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { ActionResult, Pagination } from "@/lib/validations/common";
import {
  createPrescriptionSchema,
  setPrescriptionStatusSchema,
  type CreatePrescriptionInput,
  type SetPrescriptionStatusInput,
} from "@/lib/validations/prescriptions";

export type Prescription = Database["public"]["Tables"]["prescriptions"]["Row"];
export type PrescriptionItem = Database["public"]["Tables"]["prescription_items"]["Row"];

export type PrescriptionWithDetails = Prescription & {
  patient: { id: string; first_name: string; last_name: string; patient_number: string; date_of_birth: string } | null;
  doctor: { id: string; specialization: string; license_number: string; profile: { full_name: string } | null } | null;
  items: PrescriptionItem[];
};

const WITH_DETAILS =
  "*, patient:patients(id, first_name, last_name, patient_number, date_of_birth), doctor:doctors(id, specialization, license_number, profile:profiles(full_name)), items:prescription_items(*)";

async function getOwnDoctorId(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  profileId: string,
): Promise<string | null> {
  const { data } = await supabase.from("doctors").select("id").eq("profile_id", profileId).single();
  return data?.id ?? null;
}

/**
 * Section 5.6: "Flag potential duplicate active prescriptions of the
 * same medication for the same patient." Non-blocking — callers show
 * this as a warning, never as a hard rejection.
 */
export async function checkDuplicateActiveMedications(
  patientId: string,
  medicationNames: string[],
): Promise<ActionResult<{ medicationName: string; prescriptionId: string; issuedDate: string }[]>> {
  const auth = await requireRoleForAction(["doctor"]);
  if (!auth.ok) return { success: false, error: auth.error };

  const names = medicationNames.map((n) => n.trim()).filter(Boolean);
  if (names.length === 0) return { success: true, data: [] };

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("prescriptions")
      .select("id, issued_date, items:prescription_items(medication_name)")
      .eq("patient_id", patientId)
      .eq("status", "active");
    if (error) throw error;

    const lowerNames = new Set(names.map((n) => n.toLowerCase()));
    const matches: { medicationName: string; prescriptionId: string; issuedDate: string }[] = [];
    for (const rx of data ?? []) {
      for (const item of rx.items) {
        if (lowerNames.has(item.medication_name.trim().toLowerCase())) {
          matches.push({ medicationName: item.medication_name, prescriptionId: rx.id, issuedDate: rx.issued_date });
        }
      }
    }
    return { success: true, data: matches };
  } catch (err) {
    console.error("checkDuplicateActiveMedications failed", err);
    return { success: true, data: [] };
  }
}

export async function createPrescription(input: CreatePrescriptionInput): Promise<ActionResult<{ id: string }>> {
  const auth = await requireRoleForAction(["doctor"]);
  if (!auth.ok) return { success: false, error: auth.error };

  const parsed = createPrescriptionSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    const supabase = await createServerSupabaseClient();
    const doctorId = await getOwnDoctorId(supabase, auth.user.id);
    if (!doctorId) return { success: false, error: "No doctor profile is linked to your account." };

    const { data: prescription, error: prescriptionError } = await supabase
      .from("prescriptions")
      .insert({
        medical_record_id: parsed.data.medicalRecordId,
        patient_id: parsed.data.patientId,
        doctor_id: doctorId,
        notes: parsed.data.notes || null,
      })
      .select("id")
      .single();
    if (prescriptionError) throw prescriptionError;

    const { error: itemsError } = await supabase.from("prescription_items").insert(
      parsed.data.items.map((item) => ({
        prescription_id: prescription.id,
        medication_name: item.medicationName,
        dosage: item.dosage,
        frequency: item.frequency,
        duration: item.duration,
        route: item.route || null,
        instructions: item.instructions || null,
      })),
    );
    if (itemsError) throw itemsError;

    revalidatePath(`/medical-records/${parsed.data.medicalRecordId}`);
    revalidatePath(`/patients/${parsed.data.patientId}`);
    revalidatePath("/prescriptions");
    return { success: true, data: { id: prescription.id } };
  } catch (err) {
    console.error("createPrescription failed", err);
    return { success: false, error: "Couldn't save the prescription. Please try again." };
  }
}

export async function setPrescriptionStatus(input: SetPrescriptionStatusInput): Promise<ActionResult<null>> {
  const auth = await requireRoleForAction(["doctor"]);
  if (!auth.ok) return { success: false, error: auth.error };

  const parsed = setPrescriptionStatusSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from("prescriptions").update({ status: parsed.data.status }).eq("id", parsed.data.id);
    if (error) throw error;

    revalidatePath(`/prescriptions/${parsed.data.id}`);
    revalidatePath("/prescriptions");
    return { success: true, data: null };
  } catch (err) {
    console.error("setPrescriptionStatus failed", err);
    return { success: false, error: "Couldn't update that prescription — you may only edit your own." };
  }
}

export async function getPrescription(id: string): Promise<ActionResult<PrescriptionWithDetails>> {
  const auth = await requireRoleForAction(["admin", "doctor"]);
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from("prescriptions").select(WITH_DETAILS).eq("id", id).single();
    if (error) throw error;
    return { success: true, data: data as PrescriptionWithDetails };
  } catch (err) {
    console.error("getPrescription failed", err);
    return { success: false, error: "That prescription couldn't be found." };
  }
}

export async function listPrescriptionsForRecord(medicalRecordId: string): Promise<ActionResult<PrescriptionWithDetails[]>> {
  const auth = await requireRoleForAction(["admin", "doctor"]);
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("prescriptions")
      .select(WITH_DETAILS)
      .eq("medical_record_id", medicalRecordId)
      .order("issued_date", { ascending: false });
    if (error) throw error;
    return { success: true, data: (data ?? []) as PrescriptionWithDetails[] };
  } catch (err) {
    console.error("listPrescriptionsForRecord failed", err);
    return { success: false, error: "Couldn't load prescriptions." };
  }
}

export async function listPatientPrescriptions(patientId: string): Promise<ActionResult<PrescriptionWithDetails[]>> {
  const auth = await requireRoleForAction(["admin", "doctor"]);
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("prescriptions")
      .select(WITH_DETAILS)
      .eq("patient_id", patientId)
      .order("issued_date", { ascending: false });
    if (error) throw error;
    return { success: true, data: (data ?? []) as PrescriptionWithDetails[] };
  } catch (err) {
    console.error("listPatientPrescriptions failed", err);
    return { success: false, error: "Couldn't load prescriptions." };
  }
}

export async function listPrescriptions(input: {
  page: number;
  pageSize: number;
}): Promise<ActionResult<{ prescriptions: PrescriptionWithDetails[]; total: number; pagination: Pagination }>> {
  const auth = await requireRoleForAction(["admin", "doctor"]);
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const supabase = await createServerSupabaseClient();
    const from = (input.page - 1) * input.pageSize;
    const { data, error, count } = await supabase
      .from("prescriptions")
      .select(WITH_DETAILS, { count: "exact" })
      .order("issued_date", { ascending: false })
      .range(from, from + input.pageSize - 1);
    if (error) throw error;

    return {
      success: true,
      data: {
        prescriptions: (data ?? []) as PrescriptionWithDetails[],
        total: count ?? 0,
        pagination: { page: input.page, pageSize: input.pageSize },
      },
    };
  } catch (err) {
    console.error("listPrescriptions failed", err);
    return { success: false, error: "Couldn't load prescriptions. Please try again." };
  }
}
