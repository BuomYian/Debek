import { format, parseISO } from "date-fns";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

import type { DoctorDashboard } from "@/actions/dashboard";
import { AppointmentStatusBadge } from "@/components/features/appointments/appointment-status-badge";
import { StatTile } from "@/components/features/reports/stat-tile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AppointmentStatus } from "@/lib/validations/appointments";

/** Section 5.9: "Doctor dashboard: today's schedule, patients seen this week, next appointment." */
export function DoctorDashboardView({ data }: { data: DoctorDashboard }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatTile label="Patients seen this week" value={String(data.patientsSeenThisWeek)} />
        {data.nextAppointment ? (
          <Card>
            <CardContent className="flex items-center justify-between gap-3 py-4">
              <div>
                <p className="text-xs text-muted-foreground">Next appointment</p>
                <p className="font-medium">{data.nextAppointment.patientName}</p>
                <p className="text-sm text-muted-foreground">
                  {format(parseISO(data.nextAppointment.scheduledStart), "EEEE, d MMM · HH:mm")}
                </p>
              </div>
              <Button asChild variant="outline" size="icon">
                <Link href={`/appointments/${data.nextAppointment.id}`} aria-label="View appointment">
                  <ArrowRight />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <StatTile label="Next appointment" value="None scheduled" />
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Today&apos;s schedule</CardTitle>
        </CardHeader>
        <CardContent>
          {data.todaysSchedule.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing scheduled today.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {data.todaysSchedule.map((appt) => (
                <Link
                  key={appt.id}
                  href={`/appointments/${appt.id}`}
                  className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent"
                >
                  <span className="font-medium">
                    {format(parseISO(appt.scheduledStart), "HH:mm")}–{format(parseISO(appt.scheduledEnd), "HH:mm")}{" "}
                    {appt.patientName}
                  </span>
                  <AppointmentStatusBadge status={appt.status as AppointmentStatus} />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
