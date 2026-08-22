import { z } from "zod";

import { uuidSchema } from "./common";

export const invoiceItemFormSchema = z.object({
  description: z.string().trim().min(1, "Description is required.").max(300),
  quantity: z.coerce.number().positive("Quantity must be greater than 0.").max(10000),
  unitPrice: z.coerce.number().min(0, "Unit price can't be negative.").max(1_000_000),
});
export type InvoiceItemFormInput = z.infer<typeof invoiceItemFormSchema>;

export const addInvoiceItemSchema = invoiceItemFormSchema.extend({ invoiceId: uuidSchema });
export type AddInvoiceItemInput = z.infer<typeof addInvoiceItemSchema>;

export const updateInvoiceChargesSchema = z.object({
  id: uuidSchema,
  discount: z.coerce.number().min(0, "Discount can't be negative.").max(1_000_000),
  tax: z.coerce.number().min(0, "Tax can't be negative.").max(1_000_000),
  dueDate: z.string().optional().or(z.literal("")),
});
export type UpdateInvoiceChargesInput = z.infer<typeof updateInvoiceChargesSchema>;

export const paymentMethodSchema = z.enum(["cash", "mobile_money", "card", "bank_transfer", "insurance"]);

export const recordPaymentSchema = z.object({
  invoiceId: uuidSchema,
  amount: z.coerce.number().positive("Amount must be greater than 0."),
  paymentMethod: paymentMethodSchema,
  reference: z.string().trim().max(200).optional().or(z.literal("")),
});
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export const invoiceStatusSchema = z.enum(["unpaid", "partially_paid", "paid", "cancelled"]);
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;

export const listInvoicesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: invoiceStatusSchema.optional(),
  search: z.string().trim().max(200).optional(),
});
export type ListInvoicesInput = z.infer<typeof listInvoicesSchema>;
