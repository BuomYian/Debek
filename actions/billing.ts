"use server";

import { revalidatePath } from "next/cache";

import { requireRoleForAction } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { ActionResult, Pagination } from "@/lib/validations/common";
import {
  addInvoiceItemSchema,
  listInvoicesSchema,
  recordPaymentSchema,
  updateInvoiceChargesSchema,
  type AddInvoiceItemInput,
  type ListInvoicesInput,
  type RecordPaymentInput,
  type UpdateInvoiceChargesInput,
} from "@/lib/validations/billing";

export type Invoice = Database["public"]["Tables"]["invoices"]["Row"];
export type InvoiceItem = Database["public"]["Tables"]["invoice_items"]["Row"];
export type Payment = Database["public"]["Tables"]["payments"]["Row"];

export type InvoiceWithDetails = Invoice & {
  patient: { id: string; first_name: string; last_name: string; patient_number: string } | null;
  items: InvoiceItem[];
  payments: Payment[];
};

const WITH_DETAILS =
  "*, patient:patients(id, first_name, last_name, patient_number), items:invoice_items(*), payments(*)";

const BILLING_ROLES = ["admin", "receptionist"] as const;

export async function listInvoices(
  input: ListInvoicesInput,
): Promise<ActionResult<{ invoices: InvoiceWithDetails[]; total: number; pagination: Pagination }>> {
  const auth = await requireRoleForAction([...BILLING_ROLES]);
  if (!auth.ok) return { success: false, error: auth.error };

  const parsed = listInvoicesSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid request." };
  const { page, pageSize, status, search } = parsed.data;

  try {
    const supabase = await createServerSupabaseClient();
    let query = supabase
      .from("invoices")
      .select(WITH_DETAILS, { count: "exact" })
      .order("issue_date", { ascending: false });

    if (status) query = query.eq("status", status);
    if (search) query = query.ilike("invoice_number", `%${search.replace(/[,()%]/g, "")}%`);

    const from = (page - 1) * pageSize;
    const { data, error, count } = await query.range(from, from + pageSize - 1);
    if (error) throw error;

    return {
      success: true,
      data: { invoices: (data ?? []) as InvoiceWithDetails[], total: count ?? 0, pagination: { page, pageSize } },
    };
  } catch (err) {
    console.error("listInvoices failed", err);
    return { success: false, error: "Couldn't load invoices. Please try again." };
  }
}

/** Section 5.7: "Outstanding-balances list." */
export async function listOutstandingInvoices(): Promise<ActionResult<InvoiceWithDetails[]>> {
  const auth = await requireRoleForAction([...BILLING_ROLES]);
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("invoices")
      .select(WITH_DETAILS)
      .in("status", ["unpaid", "partially_paid"])
      .order("due_date", { ascending: true, nullsFirst: false });
    if (error) throw error;
    return { success: true, data: (data ?? []) as InvoiceWithDetails[] };
  } catch (err) {
    console.error("listOutstandingInvoices failed", err);
    return { success: false, error: "Couldn't load outstanding balances." };
  }
}

export async function listPatientInvoices(patientId: string): Promise<ActionResult<InvoiceWithDetails[]>> {
  const auth = await requireRoleForAction([...BILLING_ROLES]);
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("invoices")
      .select(WITH_DETAILS)
      .eq("patient_id", patientId)
      .order("issue_date", { ascending: false });
    if (error) throw error;
    return { success: true, data: (data ?? []) as InvoiceWithDetails[] };
  } catch (err) {
    console.error("listPatientInvoices failed", err);
    return { success: false, error: "Couldn't load invoices." };
  }
}

export async function getInvoice(id: string): Promise<ActionResult<InvoiceWithDetails>> {
  const auth = await requireRoleForAction([...BILLING_ROLES]);
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from("invoices").select(WITH_DETAILS).eq("id", id).single();
    if (error) throw error;
    return { success: true, data: data as InvoiceWithDetails };
  } catch (err) {
    console.error("getInvoice failed", err);
    return { success: false, error: "That invoice couldn't be found." };
  }
}

export async function addInvoiceItem(input: AddInvoiceItemInput): Promise<ActionResult<null>> {
  const auth = await requireRoleForAction([...BILLING_ROLES]);
  if (!auth.ok) return { success: false, error: auth.error };

  const parsed = addInvoiceItemSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from("invoice_items").insert({
      invoice_id: parsed.data.invoiceId,
      description: parsed.data.description,
      quantity: parsed.data.quantity,
      unit_price: parsed.data.unitPrice,
    });
    if (error) throw error;

    revalidatePath(`/billing/${parsed.data.invoiceId}`);
    return { success: true, data: null };
  } catch (err) {
    console.error("addInvoiceItem failed", err);
    return { success: false, error: "Couldn't add that line item. Please try again." };
  }
}

export async function removeInvoiceItem(id: string, invoiceId: string): Promise<ActionResult<null>> {
  const auth = await requireRoleForAction([...BILLING_ROLES]);
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from("invoice_items").delete().eq("id", id);
    if (error) throw error;

    revalidatePath(`/billing/${invoiceId}`);
    return { success: true, data: null };
  } catch (err) {
    console.error("removeInvoiceItem failed", err);
    return { success: false, error: "Couldn't remove that line item." };
  }
}

/** Discount/tax editing — total & status recompute automatically (0013_invoices.sql's trigger, no extra code needed). */
export async function updateInvoiceCharges(input: UpdateInvoiceChargesInput): Promise<ActionResult<null>> {
  const auth = await requireRoleForAction([...BILLING_ROLES]);
  if (!auth.ok) return { success: false, error: auth.error };

  const parsed = updateInvoiceChargesSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from("invoices")
      .update({ discount: parsed.data.discount, tax: parsed.data.tax, due_date: parsed.data.dueDate || null })
      .eq("id", parsed.data.id);
    if (error) throw error;

    revalidatePath(`/billing/${parsed.data.id}`);
    return { success: true, data: null };
  } catch (err) {
    console.error("updateInvoiceCharges failed", err);
    return { success: false, error: "Couldn't save those changes. Please try again." };
  }
}

/** amount_paid / status / balance all recompute automatically (0015_payments.sql's trigger). */
export async function recordPayment(input: RecordPaymentInput): Promise<ActionResult<null>> {
  const auth = await requireRoleForAction([...BILLING_ROLES]);
  if (!auth.ok) return { success: false, error: auth.error };

  const parsed = recordPaymentSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from("payments").insert({
      invoice_id: parsed.data.invoiceId,
      amount: parsed.data.amount,
      payment_method: parsed.data.paymentMethod,
      reference: parsed.data.reference || null,
      received_by: auth.user.id,
    });
    if (error) throw error;

    revalidatePath(`/billing/${parsed.data.invoiceId}`);
    revalidatePath("/billing/invoices");
    revalidatePath("/billing/payments");
    return { success: true, data: null };
  } catch (err) {
    console.error("recordPayment failed", err);
    return { success: false, error: "Couldn't record that payment. Please try again." };
  }
}

export async function cancelInvoice(id: string): Promise<ActionResult<null>> {
  const auth = await requireRoleForAction(["admin"]);
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from("invoices").update({ status: "cancelled" }).eq("id", id);
    if (error) throw error;

    revalidatePath(`/billing/${id}`);
    revalidatePath("/billing/invoices");
    return { success: true, data: null };
  } catch (err) {
    console.error("cancelInvoice failed", err);
    return { success: false, error: "Couldn't cancel that invoice." };
  }
}
