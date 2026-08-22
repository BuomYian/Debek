import { CalendarPlus, CalendarX } from "lucide-react";
import Link from "next/link";

import type { AppointmentWithNames } from "@/actions/appointments";
import { AppointmentRow } from "@/components/features/appointments/appointment-row";
import { Button } from "@/components/ui/button";

export function PatientAppointmentsTab({
  patientId,
  appointments,
  canBook,
}: {
  patientId: string;
  appointments: AppointmentWithNames[];
  canBook: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      {canBook && (
        <div className="flex justify-end">
          <Button asChild size="sm">
            <Link href={`/appointments/new?patientId=${patientId}`}>
              <CalendarPlus />
              Book appointment
            </Link>
          </Button>
        </div>
      )}
      {appointments.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center">
          <CalendarX className="size-6 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">No appointments yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {appointments.map((a) => (
            <AppointmentRow key={a.id} appointment={a} />
          ))}
        </div>
      )}
    </div>
  );
}
