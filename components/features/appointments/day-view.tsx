import { CalendarX } from "lucide-react";

import type { AppointmentWithNames } from "@/actions/appointments";
import { AppointmentRow } from "@/components/features/appointments/appointment-row";

export function DayView({ appointments }: { appointments: AppointmentWithNames[] }) {
  if (appointments.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-12 text-center">
        <CalendarX className="size-8 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Nothing scheduled for this day.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {appointments.map((a) => (
        <AppointmentRow key={a.id} appointment={a} />
      ))}
    </div>
  );
}
