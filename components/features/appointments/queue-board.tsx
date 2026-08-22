"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";

import { setAppointmentStatus, type AppointmentWithNames } from "@/actions/appointments";
import { QueueRow, scheduledAt, waitingSince, withDoctorSince } from "@/components/features/appointments/queue-row";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AppointmentStatus } from "@/lib/validations/appointments";

/**
 * Section 6: "optimistic UI for status changes." A check-in or start
 * moves the row to its new section immediately — useOptimistic applies
 * the new status to local state before the server round trip finishes,
 * and automatically discards that optimistic value (reverting the row)
 * if the transition it's wrapped in doesn't end in a matching real
 * update, e.g. because the server rejected it.
 *
 * Shared by /appointments/queue and the receptionist dashboard so the
 * two don't duplicate this logic.
 */
export function QueueBoard({ appointments }: { appointments: AppointmentWithNames[] }) {
  const [isPending, startTransition] = useTransition();
  const [optimisticAppointments, setOptimisticStatus] = useOptimistic(
    appointments,
    (state, { id, status }: { id: string; status: AppointmentStatus }) =>
      state.map((a) => (a.id === id ? { ...a, status } : a)),
  );

  function onQuickAction(id: string, status: AppointmentStatus) {
    startTransition(async () => {
      setOptimisticStatus({ id, status });
      const result = await setAppointmentStatus({ id, status });
      if (!result.success) toast.error(result.error);
    });
  }

  const waiting = optimisticAppointments.filter((a) => a.status === "checked_in");
  const withDoctor = optimisticAppointments.filter((a) => a.status === "in_progress");
  const upcoming = optimisticAppointments
    .filter((a) => a.status === "scheduled" || a.status === "confirmed")
    .sort((a, b) => a.scheduled_start.localeCompare(b.scheduled_start));

  return (
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
                onQuickAction={onQuickAction}
                disabled={isPending}
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
                onQuickAction={onQuickAction}
                disabled={isPending}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
