import { z } from "zod";

import { uuidSchema } from "./common";

export const fileCategorySchema = z.enum([
  "lab_result",
  "scan",
  "referral",
  "consent_form",
  "id_document",
  "other",
]);
export type FileCategory = z.infer<typeof fileCategorySchema>;

/** Persists metadata for a file already uploaded straight to Cloudinary from the browser. */
export const createPatientFileSchema = z.object({
  patientId: uuidSchema,
  medicalRecordId: uuidSchema.optional(),
  fileName: z.string().trim().min(1).max(300),
  fileType: z.string().trim().min(1).max(100),
  fileSize: z.coerce.number().int().positive(),
  cloudinaryPublicId: z.string().trim().min(1).max(500),
  cloudinaryUrl: z.string().trim().url(),
  category: fileCategorySchema,
  description: z.string().trim().max(500).optional().or(z.literal("")),
});
export type CreatePatientFileInput = z.infer<typeof createPatientFileSchema>;
