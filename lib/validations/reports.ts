import { z } from "zod";

export const dateRangeSchema = z
  .object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date."),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date."),
  })
  .refine((data) => data.from <= data.to, { message: "Start date must be before end date.", path: ["to"] });
export type DateRangeInput = z.infer<typeof dateRangeSchema>;
