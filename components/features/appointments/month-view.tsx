import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import Link from "next/link";

import type { AppointmentWithNames } from "@/actions/appointments";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_VISIBLE = 3;

export function MonthView({
  date,
  appointments,
  buildDayHref,
}: {
  date: Date;
  appointments: AppointmentWithNames[];
  buildDayHref: (day: Date) => string;
}) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(date), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(date), { weekStartsOn: 1 }),
  });

  return (
    <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md border bg-border text-sm">
      {WEEKDAY_LABELS.map((label) => (
        <div key={label} className="bg-muted px-2 py-1.5 text-center text-xs font-medium text-muted-foreground">
          {label}
        </div>
      ))}
      {days.map((day) => {
        const dayAppointments = appointments.filter((a) => isSameDay(new Date(a.scheduled_start), day));
        const visible = dayAppointments.slice(0, MAX_VISIBLE);
        const overflow = dayAppointments.length - visible.length;

        return (
          <Link
            key={day.toISOString()}
            href={buildDayHref(day)}
            className={cn(
              "flex min-h-24 flex-col gap-1 bg-background p-1.5 hover:bg-accent",
              !isSameMonth(day, date) && "text-muted-foreground/50",
            )}
          >
            <span className={cn("text-xs font-medium", isToday(day) && "flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground")}>
              {format(day, "d")}
            </span>
            <div className="flex flex-col gap-0.5">
              {visible.map((a) => (
                <span key={a.id} className="truncate rounded bg-muted px-1 py-0.5 text-[11px]">
                  {format(new Date(a.scheduled_start), "HH:mm")} {a.patient?.last_name}
                </span>
              ))}
              {overflow > 0 && <span className="text-[11px] text-muted-foreground">+{overflow} more</span>}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
