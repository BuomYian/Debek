"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { createDoctor, listUnlinkedDoctorProfiles } from "@/actions/doctors";
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
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createDoctorSchema, type CreateDoctorInput } from "@/lib/validations/doctors";

export function AddDoctorDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [candidates, setCandidates] = useState<{ id: string; fullName: string }[] | null>(null);
  const router = useRouter();

  const form = useForm<CreateDoctorInput>({
    resolver: zodResolver(createDoctorSchema),
    defaultValues: {
      profileId: "",
      specialization: "",
      licenseNumber: "",
      qualifications: "",
      consultationFee: 0,
      bio: "",
      isAcceptingAppointments: true,
    },
  });

  useEffect(() => {
    if (!open || candidates !== null) return;
    startTransition(async () => {
      const result = await listUnlinkedDoctorProfiles();
      setCandidates(result.success ? result.data : []);
    });
  }, [open, candidates]);

  function onSubmit(values: CreateDoctorInput) {
    startTransition(async () => {
      const result = await createDoctor(values);
      if (result.success) {
        toast.success("Doctor profile created.");
        setOpen(false);
        form.reset();
        setCandidates(null);
        router.refresh();
        router.push(`/doctors/${result.data.id}`);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus />
          Add doctor
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a doctor profile</DialogTitle>
          <DialogDescription>
            Links clinical details to a staff member already invited with the Doctor role.
          </DialogDescription>
        </DialogHeader>

        {candidates?.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No unlinked doctor accounts. Invite a staff member with the Doctor role from Staff & Users first.
          </p>
        ) : (
          <form id="add-doctor-form" onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <FieldGroup>
              <Controller
                name="profileId"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Staff member</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={isPending || !candidates}>
                      <SelectTrigger id={field.name} className="w-full">
                        <SelectValue placeholder={candidates ? "Select a staff member" : "Loading…"} />
                      </SelectTrigger>
                      <SelectContent>
                        {candidates?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
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
                    <FieldLabel htmlFor={field.name}>Consultation fee (SSP)</FieldLabel>
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
                    <FieldLabel htmlFor={field.name}>Qualifications (optional)</FieldLabel>
                    <Input {...field} id={field.name} disabled={isPending} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="bio"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Bio (optional)</FieldLabel>
                    <Textarea {...field} id={field.name} rows={2} disabled={isPending} />
                    <FieldDescription>Shown to reception and patients when choosing a doctor.</FieldDescription>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </FieldGroup>
          </form>
        )}

        <DialogFooter>
          <Button type="submit" form="add-doctor-form" disabled={isPending || candidates?.length === 0}>
            {isPending ? "Saving…" : "Create doctor profile"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
