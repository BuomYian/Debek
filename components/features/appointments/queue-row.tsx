"use client";

import { formatDistanceToNow, format, parseISO } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { setAppointmentStatus, type AppointmentWithNames } from "@/actions/appointments";
import { Button } from "@/components/ui/button";
import type { AppointmentStatus } from "@/lib/validations/appointments";

export function QueueRow({
  appointment,
  quickAction,
  timeLabel,
  onQuickAction,
  disabled,
}: {
  appointment: AppointmentWithNames;
  quickAction?: { target: AppointmentStatus; label: string };
  /** e.g. "Scheduled 09:30" or "Waiting 12 min" — caller decides what's most useful per section. */
  timeLabel: string;
  /**
   * When provided (QueueBoard does this, wrapping it in useOptimistic),
   * the row defers to the caller instead of managing its own
   * request/refresh — that's what makes the status change appear
   * instantly instead of waiting on a round trip. Omit it and the row
   * falls back to handling the mutation itself, for any standalone use.
   */
  onQuickAction?: (id: string, status: AppointmentStatus) => void;
  disabled?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function onClickQuickAction() {
    if (!quickAction) return;
    if (onQuickAction) {
      onQuickAction(appointment.id, quickAction.target);
      return;
    }
    startTransition(async () => {
      const result = await setAppointmentStatus({ id: appointment.id, status: quickAction.target });
      if (result.success) {
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
      <Link href={`/appointments/${appointment.id}`} className="flex flex-1 flex-col gap-0.5 hover:underline">
        <span className="text-sm font-medium">
          {appointment.patient ? `${appointment.patient.first_name} ${appointment.patient.last_name}` : "Unknown patient"}
        </span>
        <span className="text-xs text-muted-foreground">
          {appointment.doctor?.profile?.full_name} · {timeLabel}
        </span>
      </Link>
      {quickAction && (
        <Button size="sm" onClick={onClickQuickAction} disabled={disabled ?? isPending}>
          {quickAction.label}
        </Button>
      )}
    </div>
  );
}

export function waitingSince(appointment: AppointmentWithNames): string {
  return `Waiting ${formatDistanceToNow(parseISO(appointment.updated_at))}`;
}

export function withDoctorSince(appointment: AppointmentWithNames): string {
  return `With doctor ${formatDistanceToNow(parseISO(appointment.updated_at))}`;
}

export function scheduledAt(appointment: AppointmentWithNames): string {
  return `Scheduled ${format(parseISO(appointment.scheduled_start), "HH:mm")}`;
}
