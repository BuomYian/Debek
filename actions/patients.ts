"use server";

import { revalidatePath } from "next/cache";

import { requireRoleForAction } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { ActionResult, Pagination } from "@/lib/validations/common";
import {
  createPatientSchema,
  duplicateCheckSchema,
  listPatientsSchema,
  updatePatientSchema,
  type CreatePatientInput,
  type DuplicateCheckInput,
  type ListPatientsInput,
  type UpdatePatientInput,
} from "@/lib/validations/patients";

export type Patient = Database["public"]["Tables"]["patients"]["Row"];

/**
 * PostgREST's `.or()` takes a raw filter expression string — `,` and
 * `()` are syntax there, not literal characters. Real names/phone
 * numbers never contain them, so stripping rather than escaping keeps
 * this simple without changing what a legitimate search matches.
 */
function sanitizeSearchTerm(term: string): string {
  return term.replace(/[,()%]/g, "").trim();
}

function toDbInput(input: CreatePatientInput | UpdatePatientInput) {
  return {
    first_name: input.firstName,
    last_name: input.lastName,
    date_of_birth: input.dateOfBirth,
    gender: input.gender,
    phone: input.phone,
    email: input.email || null,
    address: input.address || null,
    national_id: input.nationalId || null,
    blood_group: input.bloodGroup || null,
    allergies: input.allergies || null,
    chronic_conditions: input.chronicConditions || null,
    emergency_contact_name: input.emergencyContactName || null,
    emergency_contact_phone: input.emergencyContactPhone || null,
  };
}

export async function listPatients(
  input: ListPatientsInput,
): Promise<ActionResult<{ patients: Patient[]; total: number; pagination: Pagination }>> {
  const auth = await requireRoleForAction(["admin", "doctor", "receptionist"]);
  if (!auth.ok) return { success: false, error: auth.error };

  const parsed = listPatientsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const { page, pageSize, search } = parsed.data;

  try {
    const supabase = await createServerSupabaseClient();
    let query = supabase.from("patients").select("*", { count: "exact" }).order("created_at", { ascending: false });

    const term = search ? sanitizeSearchTerm(search) : "";
    if (term) {
      query = query.or(
        `first_name.ilike.%${term}%,last_name.ilike.%${term}%,phone.ilike.%${term}%,patient_number.ilike.%${term}%`,
      );
    }

    const from = (page - 1) * pageSize;
    const { data, error, count } = await query.range(from, from + pageSize - 1);
    if (error) throw error;

    return {
      success: true,
      data: { patients: data ?? [], total: count ?? 0, pagination: { page, pageSize } },
    };
  } catch (err) {
    console.error("listPatients failed", err);
    return { success: false, error: "Couldn't load patients. Please try again." };
  }
}

/** Lightweight, uncapped-pagination lookup backing the ⌘K global search (Section 6). */
export async function searchPatients(term: string): Promise<ActionResult<Patient[]>> {
  const auth = await requireRoleForAction(["admin", "doctor", "receptionist"]);
  if (!auth.ok) return { success: false, error: auth.error };

  const clean = sanitizeSearchTerm(term);
  if (!clean) return { success: true, data: [] };

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .or(`first_name.ilike.%${clean}%,last_name.ilike.%${clean}%,phone.ilike.%${clean}%,patient_number.ilike.%${clean}%`)
      .order("created_at", { ascending: false })
      .limit(8);
    if (error) throw error;
    return { success: true, data: data ?? [] };
  } catch (err) {
    console.error("searchPatients failed", err);
    return { success: false, error: "Search failed. Please try again." };
  }
}

export async function getPatient(id: string): Promise<ActionResult<Patient>> {
  const auth = await requireRoleForAction(["admin", "doctor", "receptionist"]);
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from("patients").select("*").eq("id", id).single();
    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.error("getPatient failed", err);
    return { success: false, error: "That patient couldn't be found." };
  }
}

/**
 * Section 5.2: "Warn on possible duplicate registration (same name + DOB
 * or same phone)." Non-blocking by design — returns matches for the UI
 * to show as a warning, never rejects the request itself.
 */
export async function checkDuplicatePatient(input: DuplicateCheckInput): Promise<ActionResult<Patient[]>> {
  const auth = await requireRoleForAction(["admin", "receptionist"]);
  if (!auth.ok) return { success: false, error: auth.error };

  const parsed = duplicateCheckSchema.safeParse(input);
  if (!parsed.success) return { success: true, data: [] };
  const { firstName, lastName, dateOfBirth, phone, excludeId } = parsed.data;

  try {
    const supabase = await createServerSupabaseClient();
    let query = supabase
      .from("patients")
      .select("*")
      .or(
        `and(first_name.ilike.${sanitizeSearchTerm(firstName)},last_name.ilike.${sanitizeSearchTerm(lastName)},date_of_birth.eq.${dateOfBirth})${phone ? `,phone.eq.${sanitizeSearchTerm(phone)}` : ""}`,
      )
      .limit(5);

    if (excludeId) query = query.neq("id", excludeId);

    const { data, error } = await query;
    if (error) throw error;
    return { success: true, data: data ?? [] };
  } catch (err) {
    console.error("checkDuplicatePatient failed", err);
    // Non-critical — fail open rather than block registration on a
    // check that's only ever advisory.
    return { success: true, data: [] };
  }
}

export async function createPatient(input: CreatePatientInput): Promise<ActionResult<{ id: string }>> {
  const auth = await requireRoleForAction(["admin", "receptionist"]);
  if (!auth.ok) return { success: false, error: auth.error };

  const parsed = createPatientSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("patients")
      .insert({ ...toDbInput(parsed.data), registered_by: auth.user.id })
      .select("id")
      .single();
    if (error) throw error;

    revalidatePath("/patients");
    return { success: true, data: { id: data.id } };
  } catch (err) {
    console.error("createPatient failed", err);
    return { success: false, error: "Couldn't register that patient. Please try again." };
  }
}

export async function updatePatient(input: UpdatePatientInput): Promise<ActionResult<null>> {
  const auth = await requireRoleForAction(["admin", "receptionist"]);
  if (!auth.ok) return { success: false, error: auth.error };

  const parsed = updatePatientSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from("patients").update(toDbInput(parsed.data)).eq("id", parsed.data.id);
    if (error) throw error;

    revalidatePath("/patients");
    revalidatePath(`/patients/${parsed.data.id}`);
    return { success: true, data: null };
  } catch (err) {
    console.error("updatePatient failed", err);
    return { success: false, error: "Couldn't save those changes. Please try again." };
  }
}

export async function setPatientActive(id: string, isActive: boolean): Promise<ActionResult<null>> {
  const auth = await requireRoleForAction(["admin", "receptionist"]);
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from("patients").update({ is_active: isActive }).eq("id", id);
    if (error) throw error;

    revalidatePath("/patients");
    revalidatePath(`/patients/${id}`);
    return { success: true, data: null };
  } catch (err) {
    console.error("setPatientActive failed", err);
    return { success: false, error: "Couldn't update that patient. Please try again." };
  }
}
