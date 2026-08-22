import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Auto-drafts an invoice when an appointment is completed, seeded with
 * the doctor's consultation fee (Section 5.7). Called from both
 * completion paths — the manual "Mark complete" button
 * (actions/appointments.ts) and saving a consultation
 * (actions/medical-records.ts) — so it lives here rather than in
 * either action file.
 *
 * Uses the SERVICE ROLE client deliberately, not the caller's own
 * session: per Section 3, doctors have zero access to invoices — not
 * view, not create. But a doctor completing a consultation is exactly
 * one of the two paths that triggers this draft. That's not a
 * contradiction: the invoice isn't being created *by* the doctor as a
 * financial action, it's a system-triggered side effect of completing
 * a visit, the same category of thing as the handle_new_auth_user
 * trigger creating a profile regardless of who created the auth user.
 * The actual invoice CRUD a human performs (actions/billing.ts) still
 * goes through the normal RLS-respecting client.
 *
 * Idempotent: does nothing if an invoice already exists for this
 * appointment (both completion paths could theoretically fire for the
 * same appointment).
 */
export async function draftInvoiceForCompletedAppointment(appointmentId: string): Promise<void> {
  try {
    const supabase = await createServiceRoleClient();

    const { data: existing } = await supabase
      .from("invoices")
      .select("id")
      .eq("appointment_id", appointmentId)
      .maybeSingle();
    if (existing) return;

    const { data: appointment } = await supabase
      .from("appointments")
      .select("patient_id, doctor_id")
      .eq("id", appointmentId)
      .single();
    if (!appointment) return;

    const { data: doctor } = await supabase
      .from("doctors")
      .select("consultation_fee, specialization")
      .eq("id", appointment.doctor_id)
      .single();
    if (!doctor) return;

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        patient_id: appointment.patient_id,
        appointment_id: appointmentId,
        issue_date: new Date().toISOString().slice(0, 10),
      })
      .select("id")
      .single();
    if (invoiceError || !invoice) throw invoiceError;

    await supabase.from("invoice_items").insert({
      invoice_id: invoice.id,
      description: `Consultation - ${doctor.specialization}`,
      quantity: 1,
      unit_price: doctor.consultation_fee,
    });
  } catch (err) {
    // Deliberately swallowed: failing to auto-draft an invoice must
    // never block the appointment-completion or consultation-saving
    // flow that triggered it. Reception can still add the invoice by
    // hand from /billing/invoices.
    console.error("draftInvoiceForCompletedAppointment failed", err);
  }
}
