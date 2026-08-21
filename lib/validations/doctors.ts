import { z } from "zod";

import { uuidSchema } from "./common";

export const doctorProfileSchema = z.object({
  specialization: z.string().trim().min(1, "Specialization is required.").max(200),
  licenseNumber: z.string().trim().min(1, "License number is required.").max(100),
  qualifications: z.string().trim().max(500).optional().or(z.literal("")),
  consultationFee: z.coerce.number().min(0, "Consultation fee can't be negative.").max(1_000_000),
  bio: z.string().trim().max(2000).optional().or(z.literal("")),
  isAcceptingAppointments: z.boolean(),
});
export type DoctorProfileInput = z.infer<typeof doctorProfileSchema>;

export const createDoctorSchema = doctorProfileSchema.extend({
  profileId: uuidSchema,
});
export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;

export const updateDoctorSchema = doctorProfileSchema.extend({
  id: uuidSchema,
});
export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;

const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a valid time (HH:MM).");

export const availabilityRowSchema = z
  .object({
    doctorId: uuidSchema,
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    startTime: timeString,
    endTime: timeString,
    slotDurationMinutes: z.coerce.number().int().min(5, "At least 5 minutes.").max(240),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "End time must be after start time.",
    path: ["endTime"],
  });
export type AvailabilityRowInput = z.infer<typeof availabilityRowSchema>;

export const timeOffSchema = z
  .object({
    doctorId: uuidSchema,
    startDatetime: z.string().min(1, "Start is required."),
    endDatetime: z.string().min(1, "End is required."),
    reason: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .refine((data) => new Date(data.endDatetime) > new Date(data.startDatetime), {
    message: "End must be after start.",
    path: ["endDatetime"],
  });
export type TimeOffInput = z.infer<typeof timeOffSchema>;

export const listDoctorsSchema = z.object({
  specialization: z.string().trim().max(200).optional(),
});
export type ListDoctorsInput = z.infer<typeof listDoctorsSchema>;
