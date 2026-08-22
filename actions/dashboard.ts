"use server";

import { eachDayOfInterval, endOfDay, endOfWeek, format, startOfDay, startOfWeek, subDays } from "date-fns";

import { STATUS_LABEL } from "@/components/features/appointments/appointment-status-badge";
import { requireRoleForAction } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/validations/common";
import type { AppointmentStatus } from "@/lib/validations/appointments";

function iso(date: Date): string {
  return date.toISOString();
}

function bucketByDay(dates: string[], start: Date, end: Date): { date: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const d of dates) counts.set(d.slice(0, 10), (counts.get(d.slice(0, 10)) ?? 0) + 1);
  return eachDayOfInterval({ start, end }).map((day) => {
    const key = format(day, "yyyy-MM-dd");
    return { date: key, count: counts.get(key) ?? 0 };
  });
}

function bucketByStatus(statuses: string[]): { label: string; value: number }[] {
  const counts = new Map<string, number>();
  for (const s of statuses) counts.set(s, (counts.get(s) ?? 0) + 1);
  return Array.from(counts.entries())
    .map(([status, value]) => ({ label: STATUS_LABEL[status as AppointmentStatus] ?? status, value }))
    .sort((a, b) => b.value - a.value);
}

// ── Admin dashboard (Section 5.9) ───────────────────────────────────

export type AdminDashboard = {
  todaysAppointments: number;
  patientsSeenToday: number;
  revenueToday: number;
  outstandingBalance: number;
  upcomingWeekLoad: number;
  appointmentTrend: { date: string; count: number }[];
  revenueTrend: { date: string; count: number }[];
  statusBreakdownToday: { label: string; value: number }[];
};

export async function getAdminDashboard(): Promise<ActionResult<AdminDashboard>> {
  const auth = await requireRoleForAction(["admin"]);
  if (!auth.ok) return { success: false, error: auth.error };

  const now = new Date();
  const todayStart = iso(startOfDay(now));
  const todayEnd = iso(endOfDay(now));
  const weekEnd = iso(endOfWeek(now, { weekStartsOn: 1 }));
  const trendStart = startOfDay(subDays(now, 6));
  const trendStartIso = iso(trendStart);

  try {
    const supabase = await createServerSupabaseClient();
    const [todaysAppts, completedToday, paymentsToday, outstanding, weekAppts, trendAppts, trendPayments] = await Promise.all([
      supabase.from("appointments").select("id, status", { count: "exact" }).gte("scheduled_start", todayStart).lte("scheduled_start", todayEnd),
      supabase.from("appointments").select("patient_id").eq("status", "completed").gte("scheduled_start", todayStart).lte("scheduled_start", todayEnd),
      supabase.from("payments").select("amount").gte("paid_at", todayStart).lte("paid_at", todayEnd),
      supabase.from("invoices").select("balance").in("status", ["unpaid", "partially_paid"]),
      supabase.from("appointments").select("id", { count: "exact", head: true }).gte("scheduled_start", todayStart).lte("scheduled_start", weekEnd).neq("status", "cancelled"),
      supabase.from("appointments").select("scheduled_start").gte("scheduled_start", trendStartIso).lte("scheduled_start", todayEnd).neq("status", "cancelled"),
      supabase.from("payments").select("amount, paid_at").gte("paid_at", trendStartIso).lte("paid_at", todayEnd),
    ]);
    if (todaysAppts.error) throw todaysAppts.error;
    if (completedToday.error) throw completedToday.error;
    if (paymentsToday.error) throw paymentsToday.error;
    if (outstanding.error) throw outstanding.error;
    if (weekAppts.error) throw weekAppts.error;
    if (trendAppts.error) throw trendAppts.error;
    if (trendPayments.error) throw trendPayments.error;

    const revenueByDay = new Map<string, number>();
    for (const p of trendPayments.data ?? []) {
      const key = p.paid_at.slice(0, 10);
      revenueByDay.set(key, (revenueByDay.get(key) ?? 0) + p.amount);
    }
    const revenueTrend = eachDayOfInterval({ start: trendStart, end: now }).map((day) => {
      const key = format(day, "yyyy-MM-dd");
      return { date: key, count: Math.round((revenueByDay.get(key) ?? 0) * 100) / 100 };
    });

    return {
      success: true,
      data: {
        todaysAppointments: todaysAppts.count ?? 0,
        patientsSeenToday: new Set((completedToday.data ?? []).map((a) => a.patient_id)).size,
        revenueToday: Math.round((paymentsToday.data ?? []).reduce((sum, p) => sum + p.amount, 0) * 100) / 100,
        outstandingBalance: Math.round((outstanding.data ?? []).reduce((sum, inv) => sum + (inv.balance ?? 0), 0) * 100) / 100,
        upcomingWeekLoad: weekAppts.count ?? 0,
        appointmentTrend: bucketByDay((trendAppts.data ?? []).map((a) => a.scheduled_start), trendStart, now),
        revenueTrend,
        statusBreakdownToday: bucketByStatus((todaysAppts.data ?? []).map((a) => a.status)),
      },
    };
  } catch (err) {
    console.error("getAdminDashboard failed", err);
    return { success: false, error: "Couldn't load dashboard data." };
  }
}

// ── Doctor dashboard (Section 5.9) ──────────────────────────────────

export type DoctorDashboard = {
  todaysSchedule: {
    id: string;
    scheduledStart: string;
    scheduledEnd: string;
    status: string;
    patientName: string;
  }[];
  patientsSeenThisWeek: number;
  nextAppointment: { id: string; scheduledStart: string; patientName: string } | null;
  weeklyTrend: { date: string; count: number }[];
  statusBreakdownThisWeek: { label: string; value: number }[];
};

export async function getDoctorDashboard(): Promise<ActionResult<DoctorDashboard>> {
  const auth = await requireRoleForAction(["doctor"]);
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const supabase = await createServerSupabaseClient();
    const { data: doctor } = await supabase.from("doctors").select("id").eq("profile_id", auth.user.id).single();
    if (!doctor) return { success: false, error: "No doctor profile is linked to your account." };

    const now = new Date();
    const todayStart = iso(startOfDay(now));
    const todayEnd = iso(endOfDay(now));
    const weekStart = iso(startOfWeek(now, { weekStartsOn: 1 }));
    const weekEnd = iso(endOfWeek(now, { weekStartsOn: 1 }));

    const [todaysAppts, weekCompleted, nextAppt] = await Promise.all([
      supabase
        .from("appointments")
        .select("id, scheduled_start, scheduled_end, status, patient:patients(first_name, last_name)")
        .eq("doctor_id", doctor.id)
        .gte("scheduled_start", todayStart)
        .lte("scheduled_start", todayEnd)
        .order("scheduled_start", { ascending: true }),
      supabase
        .from("appointments")
        .select("patient_id, status, scheduled_start")
        .eq("doctor_id", doctor.id)
        .gte("scheduled_start", weekStart)
        .lte("scheduled_start", weekEnd)
        .neq("status", "cancelled"),
      supabase
        .from("appointments")
        .select("id, scheduled_start, patient:patients(first_name, last_name)")
        .eq("doctor_id", doctor.id)
        .in("status", ["scheduled", "confirmed"])
        .gte("scheduled_start", iso(now))
        .order("scheduled_start", { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);
    if (todaysAppts.error) throw todaysAppts.error;
    if (weekCompleted.error) throw weekCompleted.error;
    if (nextAppt.error) throw nextAppt.error;

    const weekRows = weekCompleted.data ?? [];
    const completedThisWeek = weekRows.filter((a) => a.status === "completed");

    return {
      success: true,
      data: {
        todaysSchedule: (todaysAppts.data ?? []).map((a) => ({
          id: a.id,
          scheduledStart: a.scheduled_start,
          scheduledEnd: a.scheduled_end,
          status: a.status,
          patientName: a.patient ? `${a.patient.first_name} ${a.patient.last_name}` : "Unknown patient",
        })),
        patientsSeenThisWeek: new Set(completedThisWeek.map((a) => a.patient_id)).size,
        nextAppointment: nextAppt.data
          ? {
              id: nextAppt.data.id,
              scheduledStart: nextAppt.data.scheduled_start,
              patientName: nextAppt.data.patient
                ? `${nextAppt.data.patient.first_name} ${nextAppt.data.patient.last_name}`
                : "Unknown patient",
            }
          : null,
        weeklyTrend: bucketByDay(
          completedThisWeek.map((a) => a.scheduled_start),
          new Date(weekStart),
          new Date(weekEnd),
        ),
        statusBreakdownThisWeek: bucketByStatus(weekRows.map((a) => a.status)),
      },
    };
  } catch (err) {
    console.error("getDoctorDashboard failed", err);
    return { success: false, error: "Couldn't load dashboard data." };
  }
}
