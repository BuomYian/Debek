import { endOfMonth, endOfWeek, startOfDay, endOfDay, startOfMonth, startOfWeek } from "date-fns";

import { listAppointments } from "@/actions/appointments";
import { listDoctors } from "@/actions/doctors";
import { CalendarToolbar, type CalendarView } from "@/components/features/appointments/calendar-toolbar";
import { DayView } from "@/components/features/appointments/day-view";
import { DoctorFilter } from "@/components/features/appointments/doctor-filter";
import { MonthView } from "@/components/features/appointments/month-view";
import { WeekView } from "@/components/features/appointments/week-view";
import { requireUser } from "@/lib/auth/guards";

export const metadata = { title: "Appointments" };

function parseDate(value: string | undefined): Date {
  if (!value) return new Date();
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

function rangeFor(view: CalendarView, date: Date): { from: Date; to: Date } {
  if (view === "day") return { from: startOfDay(date), to: endOfDay(date) };
  if (view === "week") return { from: startOfWeek(date, { weekStartsOn: 1 }), to: endOfWeek(date, { weekStartsOn: 1 }) };
  return { from: startOfMonth(date), to: endOfMonth(date) };
}

export default async function AppointmentsCalendarPage(props: PageProps<"/appointments">) {
  const user = await requireUser();
  const searchParams = await props.searchParams;

  const view: CalendarView = searchParams.view === "week" || searchParams.view === "month" ? searchParams.view : "day";
  const date = parseDate(typeof searchParams.date === "string" ? searchParams.date : undefined);
  const doctorId = typeof searchParams.doctorId === "string" ? searchParams.doctorId : undefined;

  const { from, to } = rangeFor(view, date);

  const [appointmentsResult, doctorsResult] = await Promise.all([
    listAppointments({ from: from.toISOString(), to: to.toISOString(), doctorId }),
    user.role !== "doctor" ? listDoctors() : Promise.resolve(null),
  ]);

  const appointments = appointmentsResult.success ? appointmentsResult.data : [];
  const canBook = user.role === "admin" || user.role === "receptionist";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Appointments</h1>
          <p className="text-sm text-muted-foreground">
            {user.role === "doctor" ? "Your schedule." : "Clinic-wide calendar."}
          </p>
        </div>
        {doctorsResult?.success && <DoctorFilter doctors={doctorsResult.data} />}
      </div>

      <CalendarToolbar view={view} date={date} canBook={canBook} />

      {!appointmentsResult.success ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {appointmentsResult.error}
        </p>
      ) : view === "day" ? (
        <DayView appointments={appointments} />
      ) : view === "week" ? (
        <WeekView date={date} appointments={appointments} />
      ) : (
        <MonthView
          date={date}
          appointments={appointments}
          buildDayHref={(day) => {
            const params = new URLSearchParams();
            params.set("view", "day");
            params.set("date", day.toISOString().slice(0, 10));
            if (doctorId) params.set("doctorId", doctorId);
            return `/appointments?${params.toString()}`;
          }}
        />
      )}
    </div>
  );
}
