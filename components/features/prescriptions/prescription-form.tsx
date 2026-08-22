"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO } from "date-fns";
import { Plus, TriangleAlert, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { checkDuplicateActiveMedications, createPrescription } from "@/actions/prescriptions";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createPrescriptionSchema, type CreatePrescriptionInput } from "@/lib/validations/prescriptions";

const EMPTY_ITEM = { medicationName: "", dosage: "", frequency: "", duration: "", route: "", instructions: "" };

export function PrescriptionForm({
  medicalRecordId,
  patientId,
  onDone,
}: {
  medicalRecordId: string;
  patientId: string;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [duplicates, setDuplicates] = useState<{ medicationName: string; prescriptionId: string; issuedDate: string }[]>([]);
  const checkedRef = useRef<string>("");

  const form = useForm<CreatePrescriptionInput>({
    resolver: zodResolver(createPrescriptionSchema),
    defaultValues: { medicalRecordId, patientId, notes: "", items: [EMPTY_ITEM] },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });

  const items = useWatch({ control: form.control, name: "items" });
  const medicationNames = (items ?? []).map((i) => i.medicationName).filter(Boolean);
  const key = medicationNames.join("|");

  useEffect(() => {
    if (medicationNames.length === 0 || checkedRef.current === key) return;
    checkedRef.current = key;
    const timeout = setTimeout(async () => {
      const result = await checkDuplicateActiveMedications(patientId, medicationNames);
      setDuplicates(result.success ? result.data : []);
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, patientId]);

  function onSubmit(values: CreatePrescriptionInput) {
    startTransition(async () => {
      const result = await createPrescription(values);
      if (result.success) {
        toast.success("Prescription issued.");
        if (onDone) onDone();
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      {duplicates.length > 0 && (
        <div className="flex items-start gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden="true" />
          <div>
            <p className="font-medium text-amber-900 dark:text-amber-200">Possible duplicate active prescription</p>
            <ul className="mt-1 flex flex-col gap-0.5">
              {duplicates.map((d, i) => (
                <li key={i}>
                  <Link href={`/prescriptions/${d.prescriptionId}`} target="_blank" className="underline underline-offset-2">
                    {d.medicationName}
                  </Link>{" "}
                  <span className="text-muted-foreground">— already active, issued {format(parseISO(d.issuedDate), "d MMM yyyy")}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <FieldGroup>
        {fields.map((field, index) => (
          <div key={field.id} className="flex flex-col gap-3 rounded-md border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Medication {index + 1}</span>
              {fields.length > 1 && (
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} aria-label="Remove medication">
                  <X className="size-4" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Controller
                name={`items.${index}.medicationName`}
                control={form.control}
                render={({ field: f, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={f.name}>Medication</FieldLabel>
                    <Input {...f} id={f.name} disabled={isPending} aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name={`items.${index}.dosage`}
                control={form.control}
                render={({ field: f, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={f.name}>Dosage</FieldLabel>
                    <Input {...f} id={f.name} placeholder="e.g. 500mg" disabled={isPending} aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name={`items.${index}.frequency`}
                control={form.control}
                render={({ field: f, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={f.name}>Frequency</FieldLabel>
                    <Input {...f} id={f.name} placeholder="e.g. Twice daily" disabled={isPending} aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name={`items.${index}.duration`}
                control={form.control}
                render={({ field: f, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={f.name}>Duration</FieldLabel>
                    <Input {...f} id={f.name} placeholder="e.g. 7 days" disabled={isPending} aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name={`items.${index}.route`}
                control={form.control}
                render={({ field: f, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={f.name}>Route (optional)</FieldLabel>
                    <Input {...f} id={f.name} placeholder="e.g. Oral" disabled={isPending} aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name={`items.${index}.instructions`}
                control={form.control}
                render={({ field: f, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={f.name}>Instructions (optional)</FieldLabel>
                    <Input {...f} id={f.name} placeholder="e.g. Take with food" disabled={isPending} aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>
          </div>
        ))}

        <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => append(EMPTY_ITEM)}>
          <Plus />
          Add another medication
        </Button>

        <FieldSeparator />

        <Controller
          name="notes"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Notes (optional)</FieldLabel>
              <Textarea {...field} id={field.name} rows={2} disabled={isPending} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <div className="flex justify-end gap-2">
          {onDone && (
            <Button type="button" variant="outline" onClick={onDone} disabled={isPending}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isPending}>
            {isPending ? "Issuing…" : "Issue prescription"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
