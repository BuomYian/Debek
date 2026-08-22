import { z } from "zod";

import { uuidSchema } from "./common";

export const prescriptionItemFormSchema = z.object({
  medicationName: z.string().trim().min(1, "Medication name is required.").max(200),
  dosage: z.string().trim().min(1, "Dosage is required.").max(100),
  frequency: z.string().trim().min(1, "Frequency is required.").max(100),
  duration: z.string().trim().min(1, "Duration is required.").max(100),
  route: z.string().trim().max(50).optional().or(z.literal("")),
  instructions: z.string().trim().max(500).optional().or(z.literal("")),
});
export type PrescriptionItemFormInput = z.infer<typeof prescriptionItemFormSchema>;

export const createPrescriptionSchema = z.object({
  medicalRecordId: uuidSchema,
  patientId: uuidSchema,
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  items: z.array(prescriptionItemFormSchema).min(1, "Add at least one medication."),
});
export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;

export const prescriptionStatusSchema = z.enum(["active", "completed", "cancelled"]);
export type PrescriptionStatus = z.infer<typeof prescriptionStatusSchema>;

export const setPrescriptionStatusSchema = z.object({
  id: uuidSchema,
  status: prescriptionStatusSchema,
});
export type SetPrescriptionStatusInput = z.infer<typeof setPrescriptionStatusSchema>;
