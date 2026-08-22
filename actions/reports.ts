"use server";

import { eachDayOfInterval } from "date-fns";

import { requireRoleForAction } from "@/lib/auth/guards";
import { computeAvailableSlots } from "@/lib/scheduling/slots";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/validations/common";
import { dateRangeSchema, type DateRangeInput } from "@/lib/validations/reports";

function rangeBounds(from: string, to: string) {
  return { start: `${from}T00:00:00`, end: `${to}T23:59:59` };
}

function bucket<T>(items: T[], keyFn: (item: T) => string): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = keyFn(item);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

function toChartData(map: Map<string, number>): { label: string; value: number }[] {
  return Array.from(map.entries()).map(([label, value]) => ({ label, value }));
}

// ── Appointments report ─────────────────────────────────────────────

export type AppointmentsReport = {
  volumeOverTime: { date: string; count: number }[];
  byStatus: { label: string; value: number }[];
  byDoctor: { label: string; value: number }[];
  bySpecialization: { label: string; value: number }[];
  noShowRate: number;
  cancellationRate: number;
  total: number;
};

export async function getAppointmentsReport(input: DateRangeInput): Promise<ActionResult<AppointmentsReport>> {
  const auth = await requireRoleForAction(["admin"]);
  if (!auth.ok) return { success: false, error: auth.error };

  const parsed = dateRangeSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid date range." };
  const { start, end } = rangeBounds(parsed.data.from, parsed.data.to);

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("appointments")
      .select("status, scheduled_start, doctor:doctors(specialization, profile:profiles(full_name))")
      .gte("scheduled_start", start)
      .lte("scheduled_start", end);
    if (error) throw error;

    const rows = data ?? [];
    const total = rows.length;

    const byDate = bucket(rows, (r) => r.scheduled_start.slice(0, 10));
    const volumeOverTime = Array.from(byDate.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const byStatus = toChartData(bucket(rows, (r) => r.status));
    const byDoctor = toChartData(bucket(rows, (r) => r.doctor?.profile?.full_name ?? "Unknown"));
    const bySpecialization = toChartData(bucket(rows, (r) => r.doctor?.specialization ?? "Unknown"));

    const noShowCount = rows.filter((r) => r.status === "no_show").length;
    const cancelledCount = rows.filter((r) => r.status === "cancelled").length;

    return {
      success: true,
      data: {
        volumeOverTime,
        byStatus,
        byDoctor,
        bySpecialization,
        noShowRate: total ? Math.round((noShowCount / total) * 1000) / 10 : 0,
        cancellationRate: total ? Math.round((cancelledCount / total) * 1000) / 10 : 0,
        total,
      },
    };
  } catch (err) {
    console.error("getAppointmentsReport failed", err);
    return { success: false, error: "Couldn't load the appointments report." };
  }
}

// ── Patients report ──────────────────────────────────────────────────

export type PatientsReport = {
  registrationsOverTime: { date: string; count: number }[];
  totalActive: number;
  ageDistribution: { label: string; value: number }[];
  genderDistribution: { label: string; value: number }[];
  newCount: number;
  returningCount: number;
};

const AGE_BANDS: [number, number, string][] = [
  [0, 17, "0-17"],
  [18, 29, "18-29"],
  [30, 44, "30-44"],
  [45, 59, "45-59"],
  [60, 200, "60+"],
];

function ageBandFor(dob: string): string {
  const age = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  return AGE_BANDS.find(([lo, hi]) => age >= lo && age <= hi)?.[2] ?? "Unknown";
}

export async function getPatientsReport(input: DateRangeInput): Promise<ActionResult<PatientsReport>> {
  const auth = await requireRoleForAction(["admin"]);
  if (!auth.ok) return { success: false, error: auth.error };

  const parsed = dateRangeSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid date range." };
  const { start, end } = rangeBounds(parsed.data.from, parsed.data.to);

  try {
    const supabase = await createServerSupabaseClient();

    const [registeredInRange, activeSnapshot, appointmentsInRange] = await Promise.all([
      supabase.from("patients").select("created_at").gte("created_at", start).lte("created_at", end),
      supabase.from("patients").select("date_of_birth, gender").eq("is_active", true),
      supabase
        .from("appointments")
        .select("patient_id, patient:patients(id, created_at)")
        .gte("scheduled_start", start)
        .lte("scheduled_start", end),
    ]);
    if (registeredInRange.error) throw registeredInRange.error;
    if (activeSnapshot.error) throw activeSnapshot.error;
    if (appointmentsInRange.error) throw appointmentsInRange.error;

    const byDate = bucket(registeredInRange.data ?? [], (r) => r.created_at.slice(0, 10));
    const registrationsOverTime = Array.from(byDate.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const activePatients = activeSnapshot.data ?? [];
    const ageDistribution = toChartData(bucket(activePatients, (p) => ageBandFor(p.date_of_birth)));
    const genderDistribution = toChartData(bucket(activePatients, (p) => p.gender));

    const seenPatients = new Map<string, boolean>(); // patientId -> isNew
    for (const appt of appointmentsInRange.data ?? []) {
      if (!appt.patient || seenPatients.has(appt.patient.id)) continue;
      const isNew = appt.patient.created_at >= start && appt.patient.created_at <= end;
      seenPatients.set(appt.patient.id, isNew);
    }
    const newCount = Array.from(seenPatients.values()).filter(Boolean).length;
    const returningCount = seenPatients.size - newCount;

    return {
      success: true,
      data: {
        registrationsOverTime,
        totalActive: activePatients.length,
        ageDistribution,
        genderDistribution,
        newCount,
        returningCount,
      },
    };
  } catch (err) {
    console.error("getPatientsReport failed", err);
    return { success: false, error: "Couldn't load the patients report." };
  }
}

// ── Revenue report ───────────────────────────────────────────────────

export type RevenueReport = {
  totalBilled: number;
  totalCollected: number;
  outstandingBalance: number;
  revenueByDoctor: { label: string; value: number }[];
  revenueByMethod: { label: string; value: number }[];
};

export async function getRevenueReport(input: DateRangeInput): Promise<ActionResult<RevenueReport>> {
  const auth = await requireRoleForAction(["admin"]);
  if (!auth.ok) return { success: false, error: auth.error };

  const parsed = dateRangeSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid date range." };
  const { from, to } = parsed.data;
  const { start, end } = rangeBounds(from, to);

  try {
    const supabase = await createServerSupabaseClient();

    const [invoicesInRange, paymentsInRange, outstanding] = await Promise.all([
      supabase
        .from("invoices")
        .select("total, appointment:appointments(doctor:doctors(profile:profiles(full_name)))")
        .gte("issue_date", from)
        .lte("issue_date", to)
        .neq("status", "cancelled"),
      supabase
        .from("payments")
        .select("amount, payment_method")
        .gte("paid_at", start)
        .lte("paid_at", end),
      supabase.from("invoices").select("balance").in("status", ["unpaid", "partially_paid"]),
    ]);
    if (invoicesInRange.error) throw invoicesInRange.error;
    if (paymentsInRange.error) throw paymentsInRange.error;
    if (outstanding.error) throw outstanding.error;

    const invoiceRows = invoicesInRange.data ?? [];
    const totalBilled = invoiceRows.reduce((sum, inv) => sum + inv.total, 0);

    const byDoctor = new Map<string, number>();
    for (const inv of invoiceRows) {
      const name = inv.appointment?.doctor?.profile?.full_name ?? "Unknown";
      byDoctor.set(name, (byDoctor.get(name) ?? 0) + inv.total);
    }

    const paymentRows = paymentsInRange.data ?? [];
    const totalCollected = paymentRows.reduce((sum, p) => sum + p.amount, 0);
    const byMethod = new Map<string, number>();
    for (const p of paymentRows) {
      byMethod.set(p.payment_method, (byMethod.get(p.payment_method) ?? 0) + p.amount);
    }

    const outstandingBalance = (outstanding.data ?? []).reduce((sum, inv) => sum + (inv.balance ?? 0), 0);

    return {
      success: true,
      data: {
        totalBilled: Math.round(totalBilled * 100) / 100,
        totalCollected: Math.round(totalCollected * 100) / 100,
        outstandingBalance: Math.round(outstandingBalance * 100) / 100,
        revenueByDoctor: Array.from(byDoctor.entries()).map(([label, value]) => ({ label, value: Math.round(value * 100) / 100 })),
        revenueByMethod: Array.from(byMethod.entries()).map(([label, value]) => ({ label, value: Math.round(value * 100) / 100 })),
      },
    };
  } catch (err) {
    console.error("getRevenueReport failed", err);
    return { success: false, error: "Couldn't load the revenue report." };
  }
}

// ── Doctor workload report ──────────────────────────────────────────

export type WorkloadReport = {
  consultationsByDoctor: { label: string; value: number }[];
  avgPerWorkingDay: { label: string; value: number }[];
  utilization: { label: string; value: number }[];
};

export async function getWorkloadReport(input: DateRangeInput): Promise<ActionResult<WorkloadReport>> {
  const auth = await requireRoleForAction(["admin"]);
  if (!auth.ok) return { success: false, error: auth.error };

  const parsed = dateRangeSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid date range." };
  const { from, to } = parsed.data;
  const { start, end } = rangeBounds(from, to);

  try {
    const supabase = await createServerSupabaseClient();

    const [doctorsResult, appointmentsResult, availabilityResult, timeOffResult] = await Promise.all([
      supabase.from("doctors").select("id, profile:profiles(full_name)"),
      supabase
        .from("appointments")
        .select("doctor_id, status")
        .gte("scheduled_start", start)
        .lte("scheduled_start", end)
        .neq("status", "cancelled"),
      supabase.from("doctor_availability").select("doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active"),
      supabase.from("doctor_time_off").select("doctor_id, start_datetime, end_datetime"),
    ]);
    if (doctorsResult.error) throw doctorsResult.error;
    if (appointmentsResult.error) throw appointmentsResult.error;
    if (availabilityResult.error) throw availabilityResult.error;
    if (timeOffResult.error) throw timeOffResult.error;

    const doctors = doctorsResult.data ?? [];
    const appointments = appointmentsResult.data ?? [];
    const availability = availabilityResult.data ?? [];
    const timeOff = timeOffResult.data ?? [];

    const days = eachDayOfInterval({ start: new Date(`${from}T00:00:00`), end: new Date(`${to}T00:00:00`) });

    const consultationsByDoctor: { label: string; value: number }[] = [];
    const avgPerWorkingDay: { label: string; value: number }[] = [];
    const utilization: { label: string; value: number }[] = [];

    for (const doctor of doctors) {
      const name = doctor.profile?.full_name ?? "Unknown";
      const doctorAppointments = appointments.filter((a) => a.doctor_id === doctor.id);
      const completedCount = doctorAppointments.filter((a) => a.status === "completed").length;
      const bookedCount = doctorAppointments.length;

      const doctorAvailability = availability.filter((a) => a.doctor_id === doctor.id);
      const doctorTimeOff = timeOff.filter((t) => t.doctor_id === doctor.id);

      let totalCapacity = 0;
      let workingDays = 0;
      for (const day of days) {
        const slots = computeAvailableSlots({
          date: day,
          availability: doctorAvailability,
          timeOff: doctorTimeOff,
          booked: [], // raw capacity, not "still open" — we want the total, not what's left
        });
        if (slots.length > 0) {
          totalCapacity += slots.length;
          workingDays += 1;
        }
      }

      // Doctors with no availability template at all (or no appointments)
      // don't clutter the chart with a meaningless 0 row.
      if (bookedCount === 0 && totalCapacity === 0) continue;

      consultationsByDoctor.push({ label: name, value: completedCount });
      avgPerWorkingDay.push({ label: name, value: workingDays ? Math.round((completedCount / workingDays) * 10) / 10 : 0 });
      utilization.push({ label: name, value: totalCapacity ? Math.round((bookedCount / totalCapacity) * 1000) / 10 : 0 });
    }

    return { success: true, data: { consultationsByDoctor, avgPerWorkingDay, utilization } };
  } catch (err) {
    console.error("getWorkloadReport failed", err);
    return { success: false, error: "Couldn't load the workload report." };
  }
}
