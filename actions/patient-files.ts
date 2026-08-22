"use server";

import { revalidatePath } from "next/cache";

import { requireRoleForAction } from "@/lib/auth/guards";
import { cloudinary } from "@/lib/cloudinary/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { ActionResult } from "@/lib/validations/common";
import { createPatientFileSchema, type CreatePatientFileInput } from "@/lib/validations/patient-files";

export type PatientFile = Database["public"]["Tables"]["patient_files"]["Row"];

const STAFF_ROLES = ["admin", "doctor", "receptionist"] as const;

export async function createPatientFile(input: CreatePatientFileInput): Promise<ActionResult<{ id: string }>> {
  const auth = await requireRoleForAction([...STAFF_ROLES]);
  if (!auth.ok) return { success: false, error: auth.error };

  const parsed = createPatientFileSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("patient_files")
      .insert({
        patient_id: parsed.data.patientId,
        medical_record_id: parsed.data.medicalRecordId ?? null,
        file_name: parsed.data.fileName,
        file_type: parsed.data.fileType,
        file_size: parsed.data.fileSize,
        cloudinary_public_id: parsed.data.cloudinaryPublicId,
        cloudinary_url: parsed.data.cloudinaryUrl,
        category: parsed.data.category,
        description: parsed.data.description || null,
        uploaded_by: auth.user.id,
      })
      .select("id")
      .single();
    if (error) throw error;

    revalidatePath(`/patients/${parsed.data.patientId}`);
    return { success: true, data: { id: data.id } };
  } catch (err) {
    console.error("createPatientFile failed", err);
    return { success: false, error: "The file uploaded, but saving it to the patient record failed. Please try again." };
  }
}

export async function listPatientFiles(patientId: string): Promise<ActionResult<PatientFile[]>> {
  const auth = await requireRoleForAction([...STAFF_ROLES]);
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("patient_files")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return { success: true, data: data ?? [] };
  } catch (err) {
    console.error("listPatientFiles failed", err);
    return { success: false, error: "Couldn't load files." };
  }
}

/** Section 5.8: "Delete requires admin or the uploading user." Removes from both Cloudinary and the DB. */
export async function deletePatientFile(id: string, patientId: string): Promise<ActionResult<null>> {
  const auth = await requireRoleForAction([...STAFF_ROLES]);
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const supabase = await createServerSupabaseClient();
    const { data: file, error: fetchError } = await supabase
      .from("patient_files")
      .select("cloudinary_public_id, uploaded_by")
      .eq("id", id)
      .single();
    if (fetchError) throw fetchError;

    if (auth.user.role !== "admin" && file.uploaded_by !== auth.user.id) {
      return { success: false, error: "Only an admin or the person who uploaded this file can delete it." };
    }

    // DB row first: RLS (patient_files_delete_admin_or_uploader) is the
    // actual authority on who may delete which row — let it reject
    // before we touch Cloudinary, so a blocked delete never orphans a
    // file that's still referenced by a DB row that failed to go away.
    const { error: deleteError } = await supabase.from("patient_files").delete().eq("id", id);
    if (deleteError) throw deleteError;

    // Best-effort: the DB row is already gone regardless of whether
    // this succeeds, since Cloudinary storage isn't the source of truth
    // for what the app shows. A failure here just leaves an orphaned
    // blob in Cloudinary rather than a broken record in the app.
    try {
      await cloudinary.uploader.destroy(file.cloudinary_public_id, { resource_type: "image" });
    } catch (cloudinaryErr) {
      console.error("Cloudinary destroy failed (DB row already removed)", cloudinaryErr);
    }

    revalidatePath(`/patients/${patientId}`);
    return { success: true, data: null };
  } catch (err) {
    console.error("deletePatientFile failed", err);
    return { success: false, error: "Couldn't delete that file. Please try again." };
  }
}
