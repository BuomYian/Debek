import { z } from "zod";

import { uuidSchema } from "./common";

// Plain `z.number().optional()` — not `z.coerce`, and no empty-string
// transform. The form itself always holds `number | undefined` (see
// VitalsInput's onChange, which converts the native input's string
// value explicitly) so the schema's input and output types match
// exactly, which zodResolver requires to type-check against a single
// form values type.
const optionalNumber = z.number().optional();

export const vitalSignsFormSchema = z.object({
  systolic: optionalNumber,
  diastolic: optionalNumber,
  temp: optionalNumber,
  pulse: optionalNumber,
  weight: optionalNumber,
  height: optionalNumber,
  respiratoryRate: optionalNumber,
  o2Sat: optionalNumber,
});
export type VitalSignsFormInput = z.infer<typeof vitalSignsFormSchema>;

export const medicalRecordFormSchema = z.object({
  patientId: uuidSchema,
  appointmentId: uuidSchema.optional(),
  visitDate: z.string().min(1, "Visit date is required."),
  chiefComplaint: z.string().trim().min(1, "Chief complaint is required.").max(1000),
  symptoms: z.string().trim().max(2000).optional().or(z.literal("")),
  vitals: vitalSignsFormSchema,
  examinationFindings: z.string().trim().max(2000).optional().or(z.literal("")),
  diagnosis: z.string().trim().max(1000).optional().or(z.literal("")),
  treatmentPlan: z.string().trim().max(2000).optional().or(z.literal("")),
  clinicalNotes: z.string().trim().max(4000).optional().or(z.literal("")),
  followUpDate: z.string().optional().or(z.literal("")),
});
export type MedicalRecordFormInput = z.infer<typeof medicalRecordFormSchema>;

export const createMedicalRecordSchema = medicalRecordFormSchema;
export type CreateMedicalRecordInput = z.infer<typeof createMedicalRecordSchema>;

export const updateMedicalRecordSchema = medicalRecordFormSchema.extend({ id: uuidSchema });
export type UpdateMedicalRecordInput = z.infer<typeof updateMedicalRecordSchema>;
