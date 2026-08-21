import { z } from "zod";

/**
 * Shared Zod primitives reused across every module's validation schema.
 * Per Section 7, Zod schemas are the single source of truth for types —
 * infer TypeScript types from these with `z.infer<typeof schema>` rather
 * than hand-writing parallel interfaces.
 */

/** Server-side pagination, default page size 20 (Section 7 performance requirement). */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type Pagination = z.infer<typeof paginationSchema>;

export const sortDirectionSchema = z.enum(["asc", "desc"]).default("asc");

/** Standard shape every server action returns (Section 7 reliability requirement). */
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export const uuidSchema = z.string().uuid();

export const phoneSchema = z
  .string()
  .trim()
  .min(7, "Enter a valid phone number.")
  .max(20, "Enter a valid phone number.");
