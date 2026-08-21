"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { addTimeOff, removeTimeOff, type DoctorTimeOff } from "@/actions/doctors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { timeOffSchema, type TimeOffInput } from "@/lib/validations/doctors";

function AddTimeOffDialog({ doctorId }: { doctorId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const form = useForm<TimeOffInput>({
    resolver: zodResolver(timeOffSchema),
    defaultValues: { doctorId, startDatetime: "", endDatetime: "", reason: "" },
  });

  function onSubmit(values: TimeOffInput) {
    startTransition(async () => {
      const result = await addTimeOff(values);
      if (result.success) {
        toast.success("Time off added.");
        form.reset({ doctorId, startDatetime: "", endDatetime: "", reason: "" });
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
          <Plus />
          Add time off
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add time off</DialogTitle>
          <DialogDescription>Blocks slot generation for this window (Section 5.4).</DialogDescription>
        </DialogHeader>
        <form id="add-time-off-form" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Controller
                name="startDatetime"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Starts</FieldLabel>
                    <Input {...field} id={field.name} type="datetime-local" aria-invalid={fieldState.invalid} disabled={isPending} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="endDatetime"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Ends</FieldLabel>
                    <Input {...field} id={field.name} type="datetime-local" aria-invalid={fieldState.invalid} disabled={isPending} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>
            <Controller
              name="reason"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Reason (optional)</FieldLabel>
                  <Input {...field} id={field.name} placeholder="e.g. Annual leave" disabled={isPending} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button type="submit" form="add-time-off-form" disabled={isPending}>
            {isPending ? "Adding…" : "Add time off"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RemoveTimeOffButton({ id, doctorId }: { id: string; doctorId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function onRemove() {
    startTransition(async () => {
      const result = await removeTimeOff(id, doctorId);
      if (result.success) {
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Button variant="ghost" size="icon" onClick={onRemove} disabled={isPending} aria-label="Remove time off">
      <Trash2 className="size-4" />
    </Button>
  );
}

export function TimeOffEditor({ doctorId, entries, canEdit }: { doctorId: string; entries: DoctorTimeOff[]; canEdit: boolean }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Time off</CardTitle>
        {canEdit && <AddTimeOffDialog doctorId={doctorId} />}
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No time off scheduled.</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {entries.map((entry) => {
              const isPast = new Date(entry.end_datetime) < new Date();
              return (
                <li key={entry.id} className={`flex items-center justify-between gap-4 py-2 ${isPast ? "opacity-60" : ""}`}>
                  <div className="text-sm">
                    <span className="font-medium">
                      {format(parseISO(entry.start_datetime), "d MMM yyyy, HH:mm")} –{" "}
                      {format(parseISO(entry.end_datetime), "d MMM yyyy, HH:mm")}
                    </span>
                    {entry.reason && <span className="ml-2 text-muted-foreground">{entry.reason}</span>}
                  </div>
                  {canEdit && <RemoveTimeOffButton id={entry.id} doctorId={doctorId} />}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
