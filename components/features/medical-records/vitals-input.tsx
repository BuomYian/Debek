"use client";

import type { Control, ControllerRenderProps, FieldPath } from "react-hook-form";
import { Controller, useWatch } from "react-hook-form";

import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  checkDiastolic,
  checkO2Sat,
  checkPulse,
  checkRespiratoryRate,
  checkSystolic,
  checkTemp,
} from "@/lib/vitals";
import type { MedicalRecordFormInput } from "@/lib/validations/medical-records";

function Warning({ text }: { text: string | undefined }) {
  if (!text) return null;
  return <p className="text-xs text-amber-600 dark:text-amber-400">{text}</p>;
}

/**
 * A native `<input type="number">` always yields a string via its
 * change event; the form's `vitals.*` fields are typed as `number |
 * undefined` (see the comment in lib/validations/medical-records.ts on
 * why). This bridges the two explicitly rather than spreading `{...field}`
 * directly onto the input, which would let a raw string leak into form
 * state and disagree with the schema's declared type.
 */
type VitalFieldName = Extract<FieldPath<MedicalRecordFormInput>, `vitals.${string}`>;

function toNumberField(field: ControllerRenderProps<MedicalRecordFormInput, VitalFieldName>) {
  return {
    name: field.name,
    onBlur: field.onBlur,
    ref: field.ref,
    value: field.value ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      field.onChange(raw === "" ? undefined : Number(raw));
    },
  };
}

/** Structured vitals with basic range warnings (Section 5.5) — warnings are advisory only, never block submission. */
export function VitalsInput({ control, disabled }: { control: Control<MedicalRecordFormInput>; disabled?: boolean }) {
  const vitals = useWatch({ control, name: "vitals" });

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <Controller
        name="vitals.systolic"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel htmlFor={field.name}>BP systolic</FieldLabel>
            <Input {...toNumberField(field)} id={field.name} type="number" inputMode="numeric" disabled={disabled} />
            <Warning text={checkSystolic(vitals?.systolic)?.message} />
          </Field>
        )}
      />
      <Controller
        name="vitals.diastolic"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel htmlFor={field.name}>BP diastolic</FieldLabel>
            <Input {...toNumberField(field)} id={field.name} type="number" inputMode="numeric" disabled={disabled} />
            <Warning text={checkDiastolic(vitals?.diastolic)?.message} />
          </Field>
        )}
      />
      <Controller
        name="vitals.temp"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel htmlFor={field.name}>Temp (°C)</FieldLabel>
            <Input {...toNumberField(field)} id={field.name} type="number" step="0.1" inputMode="decimal" disabled={disabled} />
            <Warning text={checkTemp(vitals?.temp)?.message} />
          </Field>
        )}
      />
      <Controller
        name="vitals.pulse"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel htmlFor={field.name}>Pulse (bpm)</FieldLabel>
            <Input {...toNumberField(field)} id={field.name} type="number" inputMode="numeric" disabled={disabled} />
            <Warning text={checkPulse(vitals?.pulse)?.message} />
          </Field>
        )}
      />
      <Controller
        name="vitals.respiratoryRate"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel htmlFor={field.name}>Resp. rate</FieldLabel>
            <Input {...toNumberField(field)} id={field.name} type="number" inputMode="numeric" disabled={disabled} />
            <Warning text={checkRespiratoryRate(vitals?.respiratoryRate)?.message} />
          </Field>
        )}
      />
      <Controller
        name="vitals.o2Sat"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel htmlFor={field.name}>O2 sat (%)</FieldLabel>
            <Input {...toNumberField(field)} id={field.name} type="number" inputMode="numeric" disabled={disabled} />
            <Warning text={checkO2Sat(vitals?.o2Sat)?.message} />
          </Field>
        )}
      />
      <Controller
        name="vitals.weight"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel htmlFor={field.name}>Weight (kg)</FieldLabel>
            <Input {...toNumberField(field)} id={field.name} type="number" step="0.1" inputMode="decimal" disabled={disabled} />
          </Field>
        )}
      />
      <Controller
        name="vitals.height"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel htmlFor={field.name}>Height (cm)</FieldLabel>
            <Input {...toNumberField(field)} id={field.name} type="number" step="0.1" inputMode="decimal" disabled={disabled} />
            <FieldDescription className="sr-only">No standard range — recorded for reference only.</FieldDescription>
          </Field>
        )}
      />
    </div>
  );
}
