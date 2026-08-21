import { z } from "zod";

import { paginationSchema, phoneSchema, uuidSchema } from "./common";

export const genderSchema = z.enum(["male", "female", "other"]);

export const bloodGroupSchema = z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]);

/** Mirrors the CHECK/NOT NULL constraints on public.patients (0005_patients.sql). */
export const patientFormSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(100),
  lastName: z.string().trim().min(1, "Last name is required.").max(100),
  dateOfBirth: z
    .string()
    .min(1, "Date of birth is required.")
    .refine((val) => !Number.isNaN(Date.parse(val)), "Enter a valid date.")
    .refine((val) => new Date(val) <= new Date(), "Date of birth can't be in the future."),
  gender: genderSchema,
  phone: phoneSchema,
  email: z.string().trim().email("Enter a valid email address.").optional().or(z.literal("")),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  nationalId: z.string().trim().max(50).optional().or(z.literal("")),
  bloodGroup: bloodGroupSchema.optional(),
  allergies: z.string().trim().max(1000).optional().or(z.literal("")),
  chronicConditions: z.string().trim().max(1000).optional().or(z.literal("")),
  emergencyContactName: z.string().trim().max(200).optional().or(z.literal("")),
  emergencyContactPhone: z
    .string()
    .trim()
    .max(20)
    .optional()
    .or(z.literal("")),
});
export type PatientFormInput = z.infer<typeof patientFormSchema>;

export const createPatientSchema = patientFormSchema;
export type CreatePatientInput = z.infer<typeof createPatientSchema>;

export const updatePatientSchema = patientFormSchema.extend({ id: uuidSchema });
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;

export const listPatientsSchema = paginationSchema.extend({
  search: z.string().trim().max(200).optional(),
});
export type ListPatientsInput = z.infer<typeof listPatientsSchema>;

export const duplicateCheckSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  dateOfBirth: z.string().min(1),
  phone: z.string().trim().optional(),
  excludeId: uuidSchema.optional(),
});
export type DuplicateCheckInput = z.infer<typeof duplicateCheckSchema>;
