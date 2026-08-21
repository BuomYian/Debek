"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { addAvailabilityRow, removeAvailabilityRow, type DoctorAvailability } from "@/actions/doctors";
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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { availabilityRowSchema, type AvailabilityRowInput } from "@/lib/validations/doctors";

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function AddAvailabilityDialog({ doctorId }: { doctorId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const form = useForm<AvailabilityRowInput>({
    resolver: zodResolver(availabilityRowSchema),
    defaultValues: { doctorId, dayOfWeek: 1, startTime: "09:00", endTime: "17:00", slotDurationMinutes: 30 },
  });

  function onSubmit(values: AvailabilityRowInput) {
    startTransition(async () => {
      const result = await addAvailabilityRow(values);
      if (result.success) {
        toast.success("Availability added.");
        form.reset({ doctorId, dayOfWeek: values.dayOfWeek, startTime: "09:00", endTime: "17:00", slotDurationMinutes: 30 });
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
          Add slot
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add availability</DialogTitle>
          <DialogDescription>A recurring weekly window this doctor can be booked in.</DialogDescription>
        </DialogHeader>
        <form id="add-availability-form" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <Controller
              name="dayOfWeek"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Day</FieldLabel>
                  <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))} disabled={isPending}>
                    <SelectTrigger id={field.name} className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAY_LABELS.map((label, dow) => (
                        <SelectItem key={dow} value={String(dow)}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <Controller
                name="startTime"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Start time</FieldLabel>
                    <Input {...field} id={field.name} type="time" aria-invalid={fieldState.invalid} disabled={isPending} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="endTime"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>End time</FieldLabel>
                    <Input {...field} id={field.name} type="time" aria-invalid={fieldState.invalid} disabled={isPending} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>
            <Controller
              name="slotDurationMinutes"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Slot length (minutes)</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="number"
                    min={5}
                    step={5}
                    aria-invalid={fieldState.invalid}
                    disabled={isPending}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button type="submit" form="add-availability-form" disabled={isPending}>
            {isPending ? "Adding…" : "Add slot"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RemoveAvailabilityButton({ id, doctorId }: { id: string; doctorId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function onRemove() {
    startTransition(async () => {
      const result = await removeAvailabilityRow(id, doctorId);
      if (result.success) {
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onRemove}
      disabled={isPending}
      aria-label="Remove this slot"
      className="text-muted-foreground hover:text-destructive disabled:opacity-50"
    >
      <Trash2 className="size-3.5" />
    </button>
  );
}

export function AvailabilityEditor({
  doctorId,
  rows,
  canEdit,
}: {
  doctorId: string;
  rows: DoctorAvailability[];
  canEdit: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Weekly availability</CardTitle>
        {canEdit && <AddAvailabilityDialog doctorId={doctorId} />}
      </CardHeader>
      <CardContent>
        <div className="flex flex-col divide-y">
          {DAY_LABELS.map((label, dow) => {
            const dayRows = rows.filter((r) => r.day_of_week === dow);
            return (
              <div key={dow} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <span className="w-28 shrink-0 text-sm font-medium">{label}</span>
                {dayRows.length === 0 ? (
                  <span className="flex-1 text-sm text-muted-foreground">Not available</span>
                ) : (
                  <div className="flex flex-1 flex-wrap gap-2">
                    {dayRows.map((r) => (
                      <div key={r.id} className="flex items-center gap-2 rounded-md border px-2 py-1 text-sm">
                        <span>
                          {r.start_time.slice(0, 5)}–{r.end_time.slice(0, 5)} · {r.slot_duration_minutes} min slots
                        </span>
                        {canEdit && <RemoveAvailabilityButton id={r.id} doctorId={doctorId} />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
