import { z } from "zod";

import { uuidSchema } from "./common";

export const appointmentStatusSchema = z.enum([
  "scheduled",
  "confirmed",
  "checked_in",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
]);
export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;

export const slotsQuerySchema = z.object({
  doctorId: uuidSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date."),
});
export type SlotsQueryInput = z.infer<typeof slotsQuerySchema>;

export const bookAppointmentSchema = z.object({
  patientId: uuidSchema,
  doctorId: uuidSchema,
  scheduledStart: z.string().min(1, "Pick a slot."),
  scheduledEnd: z.string().min(1),
  reasonForVisit: z.string().trim().max(500).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type BookAppointmentInput = z.infer<typeof bookAppointmentSchema>;

export const rescheduleAppointmentSchema = z.object({
  id: uuidSchema,
  scheduledStart: z.string().min(1, "Pick a slot."),
  scheduledEnd: z.string().min(1),
});
export type RescheduleAppointmentInput = z.infer<typeof rescheduleAppointmentSchema>;

export const cancelAppointmentSchema = z.object({
  id: uuidSchema,
  reason: z.string().trim().min(1, "Give a reason for cancelling.").max(500),
});
export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>;

export const setStatusSchema = z.object({
  id: uuidSchema,
  status: appointmentStatusSchema,
});
export type SetStatusInput = z.infer<typeof setStatusSchema>;

export const listAppointmentsSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  doctorId: uuidSchema.optional(),
  patientId: uuidSchema.optional(),
});
export type ListAppointmentsInput = z.infer<typeof listAppointmentsSchema>;
