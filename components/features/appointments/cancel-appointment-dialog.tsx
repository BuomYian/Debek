"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { cancelAppointment } from "@/actions/appointments";
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
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { cancelAppointmentSchema, type CancelAppointmentInput } from "@/lib/validations/appointments";

export function CancelAppointmentDialog({ appointmentId }: { appointmentId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const form = useForm<CancelAppointmentInput>({
    resolver: zodResolver(cancelAppointmentSchema),
    defaultValues: { id: appointmentId, reason: "" },
  });

  function onSubmit(values: CancelAppointmentInput) {
    startTransition(async () => {
      const result = await cancelAppointment(values);
      if (result.success) {
        toast.success("Appointment cancelled.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Cancel appointment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel this appointment?</DialogTitle>
          <DialogDescription>The patient and doctor will show this as cancelled, with your reason attached.</DialogDescription>
        </DialogHeader>
        <form id="cancel-appointment-form" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <Controller
              name="reason"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Reason</FieldLabel>
                  <Textarea {...field} id={field.name} rows={3} aria-invalid={fieldState.invalid} disabled={isPending} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button type="submit" form="cancel-appointment-form" variant="destructive" disabled={isPending}>
            {isPending ? "Cancelling…" : "Cancel appointment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
