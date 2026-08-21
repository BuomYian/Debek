import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required.").email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().min(1, "Email is required.").email("Enter a valid email address."),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

const passwordField = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password must be at most 72 characters.");

export const resetPasswordSchema = z
  .object({
    password: passwordField,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const staffRoleSchema = z.enum(["admin", "doctor", "receptionist"]);

export const inviteStaffSchema = z.object({
  email: z.string().trim().min(1, "Email is required.").email("Enter a valid email address."),
  fullName: z.string().trim().min(1, "Full name is required.").max(200),
  role: staffRoleSchema,
  phone: z
    .string()
    .trim()
    .max(20)
    .optional()
    .or(z.literal("")),
});
export type InviteStaffInput = z.infer<typeof inviteStaffSchema>;

export const updateStaffSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().trim().min(1, "Full name is required.").max(200),
  role: staffRoleSchema,
  phone: z
    .string()
    .trim()
    .max(20)
    .optional()
    .or(z.literal("")),
});
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
