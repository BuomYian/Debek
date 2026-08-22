import { format, parseISO } from "date-fns";
import Link from "next/link";

import type { AppointmentWithNames } from "@/actions/appointments";
import { AppointmentStatusBadge } from "@/components/features/appointments/appointment-status-badge";

export function AppointmentRow({ appointment, showDoctor = true }: { appointment: AppointmentWithNames; showDoctor?: boolean }) {
  return (
    <Link
      href={`/appointments/${appointment.id}`}
      className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent"
    >
      <div className="flex flex-col gap-0.5">
        <span className="font-medium">
          {format(parseISO(appointment.scheduled_start), "HH:mm")}–{format(parseISO(appointment.scheduled_end), "HH:mm")}{" "}
          {appointment.patient ? `${appointment.patient.first_name} ${appointment.patient.last_name}` : "Unknown patient"}
        </span>
        {showDoctor && (
          <span className="text-xs text-muted-foreground">
            {appointment.doctor?.profile?.full_name ?? "Unknown doctor"} · {appointment.doctor?.specialization}
          </span>
        )}
      </div>
      <AppointmentStatusBadge status={appointment.status} />
    </Link>
  );
}
