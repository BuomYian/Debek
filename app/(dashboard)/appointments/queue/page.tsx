import { Users } from "lucide-react";

import { listTodaysQueue } from "@/actions/appointments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QueueRow, scheduledAt, waitingSince, withDoctorSince } from "@/components/features/appointments/queue-row";
import { requireRole } from "@/lib/auth/guards";

export const metadata = { title: "Today's Queue" };

export default async function TodaysQueuePage() {
  await requireRole(["admin", "receptionist"]);

  const result = await listTodaysQueue();
  const appointments = result.success ? result.data : [];

  const waiting = appointments.filter((a) => a.status === "checked_in");
  const withDoctor = appointments.filter((a) => a.status === "in_progress");
  const upcoming = appointments
    .filter((a) => a.status === "scheduled" || a.status === "confirmed")
    .sort((a, b) => a.scheduled_start.localeCompare(b.scheduled_start));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Today&apos;s queue</h1>
        <p className="text-sm text-muted-foreground">Who&apos;s waiting, who&apos;s with a doctor, and who&apos;s next.</p>
      </div>

      {!result.success ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {result.error}
        </p>
      ) : appointments.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-12 text-center">
          <Users className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">No appointments scheduled for today.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Waiting ({waiting.length})</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {waiting.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nobody waiting.</p>
              ) : (
                waiting.map((a) => (
                  <QueueRow
                    key={a.id}
                    appointment={a}
                    timeLabel={waitingSince(a)}
                    quickAction={{ target: "in_progress", label: "Start" }}
                  />
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">With doctor ({withDoctor.length})</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {withDoctor.length === 0 ? (
                <p className="text-sm text-muted-foreground">No consultations in progress.</p>
              ) : (
                withDoctor.map((a) => <QueueRow key={a.id} appointment={a} timeLabel={withDoctorSince(a)} />)
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upcoming today ({upcoming.length})</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing else scheduled today.</p>
              ) : (
                upcoming.map((a) => (
                  <QueueRow
                    key={a.id}
                    appointment={a}
                    timeLabel={scheduledAt(a)}
                    quickAction={{ target: "checked_in", label: "Check in" }}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
