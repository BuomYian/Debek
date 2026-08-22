import { CalendarPlus, Users } from "lucide-react";
import Link from "next/link";

import type { AppointmentWithNames } from "@/actions/appointments";
import { QueueBoard } from "@/components/features/appointments/queue-board";
import { Button } from "@/components/ui/button";

/** Section 5.9: "Receptionist dashboard: today's queue, check-in actions, quick-book button." */
export function ReceptionistDashboardView({ appointments }: { appointments: AppointmentWithNames[] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button asChild size="sm">
          <Link href="/appointments/new">
            <CalendarPlus />
            Quick book
          </Link>
        </Button>
      </div>

      {appointments.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-12 text-center">
          <Users className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">No appointments scheduled for today.</p>
        </div>
      ) : (
        <QueueBoard appointments={appointments} />
      )}
    </div>
  );
}
