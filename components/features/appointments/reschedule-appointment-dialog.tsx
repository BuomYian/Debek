"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { rescheduleAppointment, type AppointmentWithNames } from "@/actions/appointments";
import { SlotPicker, type PickedSlot } from "@/components/features/appointments/slot-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function RescheduleAppointmentDialog({ appointment }: { appointment: AppointmentWithNames }) {
  const [open, setOpen] = useState(false);
  const [slot, setSlot] = useState<PickedSlot | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function onConfirm() {
    if (!slot) return;
    startTransition(async () => {
      const result = await rescheduleAppointment({
        id: appointment.id,
        scheduledStart: slot.start,
        scheduledEnd: slot.end,
      });
      if (result.success) {
        toast.success("Appointment rescheduled.");
        setOpen(false);
        router.push(`/appointments/${result.data.id}`);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setSlot(null); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Reschedule
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reschedule appointment</DialogTitle>
          <DialogDescription>
            Same patient and doctor — the original stays on record as cancelled, linked to the new time.
          </DialogDescription>
        </DialogHeader>
        <SlotPicker doctorId={appointment.doctor_id} selected={slot} onSelect={setSlot} />
        <DialogFooter>
          <Button onClick={onConfirm} disabled={!slot || isPending}>
            {isPending ? "Rescheduling…" : "Confirm new time"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
