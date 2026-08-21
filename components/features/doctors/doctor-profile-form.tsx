"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { updateDoctor, type DoctorWithProfile } from "@/actions/doctors";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { doctorProfileSchema, type DoctorProfileInput } from "@/lib/validations/doctors";

export function DoctorProfileForm({ doctor, onDone }: { doctor: DoctorWithProfile; onDone: () => void }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const form = useForm<DoctorProfileInput>({
    resolver: zodResolver(doctorProfileSchema),
    defaultValues: {
      specialization: doctor.specialization,
      licenseNumber: doctor.license_number,
      qualifications: doctor.qualifications ?? "",
      consultationFee: doctor.consultation_fee,
      bio: doctor.bio ?? "",
      isAcceptingAppointments: doctor.is_accepting_appointments,
    },
  });

  function onSubmit(values: DoctorProfileInput) {
    startTransition(async () => {
      const result = await updateDoctor({ ...values, id: doctor.id });
      if (result.success) {
        toast.success("Profile updated.");
        router.refresh();
        onDone();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Controller
            name="specialization"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Specialization</FieldLabel>
                <Input {...field} id={field.name} aria-invalid={fieldState.invalid} disabled={isPending} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="licenseNumber"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>License number</FieldLabel>
                <Input {...field} id={field.name} aria-invalid={fieldState.invalid} disabled={isPending} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="consultationFee"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Consultation fee</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  type="number"
                  min={0}
                  step="0.01"
                  aria-invalid={fieldState.invalid}
                  disabled={isPending}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="qualifications"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Qualifications</FieldLabel>
                <Input {...field} id={field.name} aria-invalid={fieldState.invalid} disabled={isPending} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>
        <Controller
          name="bio"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Bio</FieldLabel>
              <Textarea {...field} id={field.name} rows={3} disabled={isPending} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="isAcceptingAppointments"
          control={form.control}
          render={({ field }) => (
            <Field orientation="horizontal">
              <div className="flex-1">
                <FieldLabel htmlFor={field.name}>Accepting appointments</FieldLabel>
                <FieldDescription>Turn off to hide this doctor from new bookings.</FieldDescription>
              </div>
              <Switch id={field.name} checked={field.value} onCheckedChange={field.onChange} disabled={isPending} />
            </Field>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onDone} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
