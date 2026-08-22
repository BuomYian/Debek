import { eachDayOfInterval, endOfWeek, format, isSameDay, isToday, startOfWeek } from "date-fns";

import type { AppointmentWithNames } from "@/actions/appointments";
import { AppointmentRow } from "@/components/features/appointments/appointment-row";
import { cn } from "@/lib/utils";

export function WeekView({ date, appointments }: { date: Date; appointments: AppointmentWithNames[] }) {
  const days = eachDayOfInterval({
    start: startOfWeek(date, { weekStartsOn: 1 }),
    end: endOfWeek(date, { weekStartsOn: 1 }),
  });

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-7">
      {days.map((day) => {
        const dayAppointments = appointments.filter((a) => isSameDay(new Date(a.scheduled_start), day));
        return (
          <div key={day.toISOString()} className="flex flex-col gap-2">
            <div className={cn("flex items-baseline gap-1.5 border-b pb-1.5", isToday(day) && "text-primary")}>
              <span className="text-xs font-medium uppercase">{format(day, "EEE")}</span>
              <span className="text-sm font-semibold">{format(day, "d")}</span>
            </div>
            {dayAppointments.length === 0 ? (
              <p className="text-xs text-muted-foreground">—</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {dayAppointments.map((a) => (
                  <AppointmentRow key={a.id} appointment={a} showDoctor={false} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
