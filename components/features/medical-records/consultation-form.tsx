"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { createMedicalRecord, updateMedicalRecord, type MedicalRecordWithNames } from "@/actions/medical-records";
import type { Patient } from "@/actions/patients";
import { PatientPicker } from "@/components/features/appointments/patient-picker";
import { VitalsInput } from "@/components/features/medical-records/vitals-input";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { medicalRecordFormSchema, type MedicalRecordFormInput } from "@/lib/validations/medical-records";

function jsonVital(vitals: unknown, key: string): string {
  if (!vitals || typeof vitals !== "object") return "";
  const value = (vitals as Record<string, unknown>)[key];
  return value === undefined || value === null ? "" : String(value);
}

function recordToFormValues(record: MedicalRecordWithNames): MedicalRecordFormInput {
  const [systolic, diastolic] = jsonVital(record.vital_signs, "bp").split("/");
  return {
    patientId: record.patient_id,
    appointmentId: record.appointment_id ?? undefined,
    visitDate: record.visit_date,
    chiefComplaint: record.chief_complaint,
    symptoms: record.symptoms ?? "",
    vitals: {
      systolic: systolic ? Number(systolic) : undefined,
      diastolic: diastolic ? Number(diastolic) : undefined,
      temp: jsonVital(record.vital_signs, "temp") ? Number(jsonVital(record.vital_signs, "temp")) : undefined,
      pulse: jsonVital(record.vital_signs, "pulse") ? Number(jsonVital(record.vital_signs, "pulse")) : undefined,
      weight: jsonVital(record.vital_signs, "weight") ? Number(jsonVital(record.vital_signs, "weight")) : undefined,
      height: jsonVital(record.vital_signs, "height") ? Number(jsonVital(record.vital_signs, "height")) : undefined,
      respiratoryRate: jsonVital(record.vital_signs, "respiratory_rate")
        ? Number(jsonVital(record.vital_signs, "respiratory_rate"))
        : undefined,
      o2Sat: jsonVital(record.vital_signs, "o2_sat") ? Number(jsonVital(record.vital_signs, "o2_sat")) : undefined,
    },
    examinationFindings: record.examination_findings ?? "",
    diagnosis: record.diagnosis ?? "",
    treatmentPlan: record.treatment_plan ?? "",
    clinicalNotes: record.clinical_notes ?? "",
    followUpDate: record.follow_up_date ?? "",
  };
}

export function ConsultationForm({
  record,
  fixedPatient,
  appointmentId,
}: {
  /** Provided when editing an existing record. */
  record?: MedicalRecordWithNames;
  /** Provided when launched from an appointment or a patient's chart — patient can't be changed. */
  fixedPatient?: Patient;
  appointmentId?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [patient, setPatient] = useState<Patient | null>(fixedPatient ?? null);

  const form = useForm<MedicalRecordFormInput>({
    resolver: zodResolver(medicalRecordFormSchema),
    defaultValues: record
      ? recordToFormValues(record)
      : {
          patientId: fixedPatient?.id ?? "",
          appointmentId,
          visitDate: format(new Date(), "yyyy-MM-dd"),
          chiefComplaint: "",
          symptoms: "",
          vitals: {},
          examinationFindings: "",
          diagnosis: "",
          treatmentPlan: "",
          clinicalNotes: "",
          followUpDate: "",
        },
  });

  function onSubmit(values: MedicalRecordFormInput) {
    startTransition(async () => {
      if (record) {
        const result = await updateMedicalRecord({ ...values, id: record.id });
        if (result.success) {
          toast.success("Consultation updated.");
          router.refresh();
        } else {
          toast.error(result.error);
        }
        return;
      }

      const result = await createMedicalRecord(values);
      if (result.success) {
        toast.success("Consultation saved.");
        router.push(`/medical-records/${result.data.id}`);
      } else {
        toast.error(result.error);
      }
    });
  }

  const patientLocked = Boolean(fixedPatient || record);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      <FieldGroup>
        {!patientLocked && (
          <Field>
            <FieldLabel>Patient</FieldLabel>
            <PatientPicker
              value={patient?.id}
              selected={patient}
              onSelect={(p) => {
                setPatient(p);
                form.setValue("patientId", p.id, { shouldValidate: true });
              }}
            />
          </Field>
        )}
        {patientLocked && patient && (
          <p className="text-sm text-muted-foreground">
            Patient: <span className="font-medium text-foreground">{patient.first_name} {patient.last_name}</span> (
            {patient.patient_number})
          </p>
        )}

        <Controller
          name="visitDate"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="max-w-xs">
              <FieldLabel htmlFor={field.name}>Visit date</FieldLabel>
              <Input {...field} id={field.name} type="date" aria-invalid={fieldState.invalid} disabled={isPending} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="chiefComplaint"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Chief complaint</FieldLabel>
              <Textarea {...field} id={field.name} rows={2} aria-invalid={fieldState.invalid} disabled={isPending} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="symptoms"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Symptoms</FieldLabel>
              <Textarea {...field} id={field.name} rows={2} disabled={isPending} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <FieldSeparator />

        <Field>
          <FieldLabel>Vital signs</FieldLabel>
          <VitalsInput control={form.control} disabled={isPending} />
        </Field>

        <FieldSeparator />

        <Controller
          name="examinationFindings"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Examination findings</FieldLabel>
              <Textarea {...field} id={field.name} rows={3} disabled={isPending} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="diagnosis"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Diagnosis</FieldLabel>
              <Textarea {...field} id={field.name} rows={2} disabled={isPending} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="treatmentPlan"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Treatment plan</FieldLabel>
              <Textarea {...field} id={field.name} rows={3} disabled={isPending} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="clinicalNotes"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Clinical notes</FieldLabel>
              <Textarea {...field} id={field.name} rows={3} disabled={isPending} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="followUpDate"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="max-w-xs">
              <FieldLabel htmlFor={field.name}>Follow-up date (optional)</FieldLabel>
              <Input {...field} id={field.name} type="date" aria-invalid={fieldState.invalid} disabled={isPending} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending || !patient}>
            {isPending ? "Saving…" : record ? "Save changes" : "Save consultation"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
