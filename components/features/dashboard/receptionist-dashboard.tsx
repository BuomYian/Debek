import { format, parseISO } from "date-fns";
import { CalendarPlus, Users } from "lucide-react";
import Link from "next/link";

import type { AppointmentWithNames } from "@/actions/appointments";
import { STATUS_LABEL } from "@/components/features/appointments/appointment-status-badge";
import { QueueBoard } from "@/components/features/appointments/queue-board";
import { CategoricalPieChart } from "@/components/features/reports/categorical-pie-chart";
import { SingleSeriesBarChart } from "@/components/features/reports/single-series-bar-chart";
import { Button } from "@/components/ui/button";
import type { AppointmentStatus } from "@/lib/validations/appointments";

function statusBreakdown(appointments: AppointmentWithNames[]): { label: string; value: number }[] {
  const counts = new Map<string, number>();
  for (const a of appointments) counts.set(a.status, (counts.get(a.status) ?? 0) + 1);
  return Array.from(counts.entries())
    .map(([status, value]) => ({ label: STATUS_LABEL[status as AppointmentStatus] ?? status, value }))
    .sort((a, b) => b.value - a.value);
}

function byHour(appointments: AppointmentWithNames[]): { label: string; value: number }[] {
  const counts = new Map<number, number>();
  for (const a of appointments) {
    const hour = parseISO(a.scheduled_start).getHours();
    counts.set(hour, (counts.get(hour) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([hour, value]) => ({ label: format(new Date(2000, 0, 1, hour), "ha"), value }));
}

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
        <>
          <QueueBoard appointments={appointments} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SingleSeriesBarChart title="Today's bookings by hour" data={byHour(appointments)} valueLabel="Appointments" />
            <CategoricalPieChart title="Today's appointments by status" data={statusBreakdown(appointments)} />
          </div>
        </>
      )}
    </div>
  );
}
