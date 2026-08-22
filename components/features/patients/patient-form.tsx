"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { checkDuplicatePatient, createPatient, updatePatient, type Patient } from "@/actions/patients";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { patientFormSchema, type PatientFormInput } from "@/lib/validations/patients";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

function toFormValues(patient: Patient): PatientFormInput {
  return {
    firstName: patient.first_name,
    lastName: patient.last_name,
    dateOfBirth: patient.date_of_birth,
    gender: patient.gender,
    phone: patient.phone,
    email: patient.email ?? "",
    address: patient.address ?? "",
    nationalId: patient.national_id ?? "",
    bloodGroup: (patient.blood_group as PatientFormInput["bloodGroup"]) ?? undefined,
    allergies: patient.allergies ?? "",
    chronicConditions: patient.chronic_conditions ?? "",
    emergencyContactName: patient.emergency_contact_name ?? "",
    emergencyContactPhone: patient.emergency_contact_phone ?? "",
  };
}

export function PatientForm({
  patient,
  onCreated,
  onCancel,
}: {
  patient?: Patient;
  /**
   * When provided, a successful *registration* (not edit) calls this
   * instead of navigating to the new patient's detail page — used by
   * the appointment booking flow's inline "register new patient"
   * shortcut (Section 5.4), which needs to stay on the booking form and
   * just select the patient it created.
   */
  onCreated?: (patientId: string) => void;
  /** Overrides the Cancel button's default router.back() — needed inline in a dialog. */
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [duplicates, setDuplicates] = useState<Patient[]>([]);
  const checkedRef = useRef<string>("");

  const form = useForm<PatientFormInput>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: patient
      ? toFormValues(patient)
      : {
          firstName: "",
          lastName: "",
          dateOfBirth: "",
          gender: undefined,
          phone: "",
          email: "",
          address: "",
          nationalId: "",
          bloodGroup: undefined,
          allergies: "",
          chronicConditions: "",
          emergencyContactName: "",
          emergencyContactPhone: "",
        },
  });

  const [firstName, lastName, dateOfBirth, phone] = useWatch({
    control: form.control,
    name: ["firstName", "lastName", "dateOfBirth", "phone"],
  });

  const readyForDuplicateCheck =
    !patient && firstName.trim().length > 1 && lastName.trim().length > 1 && Boolean(dateOfBirth);

  // Non-blocking duplicate warning (Section 5.2), only for new
  // registrations — editing an existing patient shouldn't warn about
  // itself. Deliberately doesn't clear `duplicates` when the fields
  // become not-ready again (e.g. the name is shortened) — the render
  // below gates on `readyForDuplicateCheck` too, so stale results just
  // stay hidden rather than needing a setState-in-effect to wipe them.
  useEffect(() => {
    if (!readyForDuplicateCheck) return;
    const key = `${firstName}|${lastName}|${dateOfBirth}|${phone}`;
    if (checkedRef.current === key) return;
    checkedRef.current = key;

    const timeout = setTimeout(async () => {
      const result = await checkDuplicatePatient({ firstName, lastName, dateOfBirth, phone });
      setDuplicates(result.success ? result.data : []);
    }, 400);
    return () => clearTimeout(timeout);
  }, [readyForDuplicateCheck, firstName, lastName, dateOfBirth, phone]);

  function onSubmit(values: PatientFormInput) {
    startTransition(async () => {
      if (patient) {
        const result = await updatePatient({ ...values, id: patient.id });
        if (result.success) {
          toast.success("Patient updated.");
          router.push(`/patients/${patient.id}`);
          router.refresh();
        } else {
          toast.error(result.error);
        }
        return;
      }

      const result = await createPatient(values);
      if (result.success) {
        toast.success("Patient registered.");
        if (onCreated) {
          onCreated(result.data.id);
          return;
        }
        router.push(`/patients/${result.data.id}`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      {readyForDuplicateCheck && duplicates.length > 0 && (
        <div className="flex items-start gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden="true" />
          <div>
            <p className="font-medium text-amber-900 dark:text-amber-200">
              Possible duplicate{duplicates.length > 1 ? "s" : ""} found
            </p>
            <ul className="mt-1 flex flex-col gap-0.5">
              {duplicates.map((d) => (
                <li key={d.id}>
                  <Link href={`/patients/${d.id}`} target="_blank" className="underline underline-offset-2">
                    {d.first_name} {d.last_name}
                  </Link>{" "}
                  <span className="text-muted-foreground">({d.patient_number}, {d.phone})</span>
                </li>
              ))}
            </ul>
            <p className="mt-1 text-muted-foreground">
              You can still continue if this is genuinely a different person.
            </p>
          </div>
        </div>
      )}

      <FieldGroup>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Controller
            name="firstName"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>First name</FieldLabel>
                <Input {...field} id={field.name} aria-invalid={fieldState.invalid} disabled={isPending} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="lastName"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Last name</FieldLabel>
                <Input {...field} id={field.name} aria-invalid={fieldState.invalid} disabled={isPending} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="dateOfBirth"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Date of birth</FieldLabel>
                <Input {...field} id={field.name} type="date" aria-invalid={fieldState.invalid} disabled={isPending} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="gender"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Gender</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                  <SelectTrigger id={field.name} className="w-full">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="phone"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Phone</FieldLabel>
                <Input {...field} id={field.name} type="tel" aria-invalid={fieldState.invalid} disabled={isPending} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Email (optional)</FieldLabel>
                <Input {...field} id={field.name} type="email" aria-invalid={fieldState.invalid} disabled={isPending} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>

        <Controller
          name="address"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Address</FieldLabel>
              <Textarea {...field} id={field.name} rows={2} disabled={isPending} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Controller
            name="nationalId"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>National ID (optional)</FieldLabel>
                <Input {...field} id={field.name} disabled={isPending} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="bloodGroup"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Blood group (optional)</FieldLabel>
                <Select value={field.value ?? ""} onValueChange={field.onChange} disabled={isPending}>
                  <SelectTrigger id={field.name} className="w-full">
                    <SelectValue placeholder="Unknown" />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOOD_GROUPS.map((bg) => (
                      <SelectItem key={bg} value={bg}>
                        {bg}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>

        <FieldSeparator />

        <Controller
          name="allergies"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Allergies</FieldLabel>
              <Textarea {...field} id={field.name} rows={2} placeholder="e.g. Penicillin, peanuts" disabled={isPending} />
              <FieldDescription>Shown as a medical alert on the patient&apos;s record.</FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="chronicConditions"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Chronic conditions</FieldLabel>
              <Textarea {...field} id={field.name} rows={2} placeholder="e.g. Type 2 diabetes" disabled={isPending} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <FieldSeparator />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Controller
            name="emergencyContactName"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Emergency contact name</FieldLabel>
                <Input {...field} id={field.name} disabled={isPending} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="emergencyContactPhone"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Emergency contact phone</FieldLabel>
                <Input {...field} id={field.name} type="tel" disabled={isPending} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel ?? (() => router.back())} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving…" : patient ? "Save changes" : "Register patient"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
