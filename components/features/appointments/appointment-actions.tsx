"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";

import { setAppointmentStatus, type AppointmentWithNames } from "@/actions/appointments";
import { CancelAppointmentDialog } from "@/components/features/appointments/cancel-appointment-dialog";
import { RescheduleAppointmentDialog } from "@/components/features/appointments/reschedule-appointment-dialog";
import { Button } from "@/components/ui/button";
import type { AppointmentStatus } from "@/lib/validations/appointments";

function StatusButton({ id, target, label }: { id: string; target: AppointmentStatus; label: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function onClick() {
    startTransition(async () => {
      const result = await setAppointmentStatus({ id, status: target });
      if (result.success) {
        toast.success(`Marked as ${label.toLowerCase()}.`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Button onClick={onClick} disabled={isPending} size="sm">
      {label}
    </Button>
  );
}

export function AppointmentActions({ appointment, canEdit }: { appointment: AppointmentWithNames; canEdit: boolean }) {
  if (!canEdit) return null;

  const { id, status } = appointment;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "scheduled" && <StatusButton id={id} target="confirmed" label="Confirm" />}
      {status === "confirmed" && <StatusButton id={id} target="checked_in" label="Check in" />}
      {status === "checked_in" && <StatusButton id={id} target="in_progress" label="Start consultation" />}
      {status === "in_progress" && (
        <>
          <Button asChild size="sm">
            {/* Jump into the consultation form (Section 5.4's "one-click
                jump"). Phase 7 doesn't exist yet, so this placeholder
                page can't complete the appointment as a side effect the
                way it should once it's real — the "Mark complete"
                button next to it is the stopgap until then. */}
            <Link href={`/medical-records/new?appointmentId=${id}`}>Start consultation</Link>
          </Button>
          <StatusButton id={id} target="completed" label="Mark complete" />
        </>
      )}
      {(status === "scheduled" || status === "confirmed") && <StatusButton id={id} target="no_show" label="Mark no-show" />}

      {(status === "scheduled" || status === "confirmed") && (
        <RescheduleAppointmentDialog appointment={appointment} />
      )}

      {(status === "scheduled" || status === "confirmed" || status === "checked_in" || status === "in_progress") && (
        <CancelAppointmentDialog appointmentId={id} />
      )}
    </div>
  );
}
