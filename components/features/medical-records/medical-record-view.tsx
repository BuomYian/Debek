"use client";

import { format, parseISO } from "date-fns";
import { Pencil } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import type { MedicalRecordWithNames } from "@/actions/medical-records";
import type { PrescriptionWithDetails } from "@/actions/prescriptions";
import { ConsultationForm } from "@/components/features/medical-records/consultation-form";
import { IssuePrescriptionDialog } from "@/components/features/prescriptions/issue-prescription-dialog";
import { PrintButton } from "@/components/print-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CLINIC_NAME } from "@/lib/clinic";

function jsonVital(vitals: unknown, key: string): string {
  if (!vitals || typeof vitals !== "object") return "—";
  const value = (vitals as Record<string, unknown>)[key];
  return value === undefined || value === null || value === "" ? "—" : String(value);
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground print:text-black/60">{label}</dt>
      <dd className="text-sm whitespace-pre-wrap">{value || <span className="text-muted-foreground">—</span>}</dd>
    </div>
  );
}

export function MedicalRecordView({
  record,
  canEdit,
  prescriptions,
}: {
  record: MedicalRecordWithNames;
  canEdit: boolean;
  prescriptions: PrescriptionWithDetails[];
}) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Edit consultation</CardTitle>
        </CardHeader>
        <CardContent>
          <ConsultationForm record={record} />
          <Button variant="link" className="mt-2 px-0" onClick={() => setIsEditing(false)}>
            Cancel editing
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4 print:text-black">
      {/* Print-only clinic letterhead — invisible on screen, shown on paper. */}
      <div className="hidden print:block print:mb-4 print:border-b print:pb-3">
        <h1 className="text-lg font-semibold">{CLINIC_NAME} — Consultation Record</h1>
      </div>

      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-lg font-semibold">
            {record.patient ? `${record.patient.first_name} ${record.patient.last_name}` : "Consultation"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {format(parseISO(record.visit_date), "d MMMM yyyy")} · {record.doctor?.profile?.full_name}
          </p>
        </div>
        <div className="flex gap-2">
          <PrintButton />
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Pencil />
              Edit
            </Button>
          )}
        </div>
      </div>

      <Card className="print:border-none print:shadow-none">
        <CardHeader className="print:hidden">
          <CardTitle>Consultation</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field
              label="Patient"
              value={
                record.patient && (
                  <Link href={`/patients/${record.patient.id}`} className="hover:underline print:no-underline">
                    {record.patient.first_name} {record.patient.last_name} ({record.patient.patient_number})
                  </Link>
                )
              }
            />
            <Field label="Visit date" value={format(parseISO(record.visit_date), "d MMMM yyyy")} />
            <Field label="Doctor" value={`${record.doctor?.profile?.full_name} (${record.doctor?.specialization})`} />
            <Field label="Follow-up date" value={record.follow_up_date && format(parseISO(record.follow_up_date), "d MMMM yyyy")} />
          </dl>

          <div className="border-t pt-4">
            <dt className="mb-2 text-xs font-medium text-muted-foreground print:text-black/60">Vital signs</dt>
            <dl className="grid grid-cols-3 gap-4 sm:grid-cols-4">
              <Field label="BP" value={jsonVital(record.vital_signs, "bp")} />
              <Field label="Temp (°C)" value={jsonVital(record.vital_signs, "temp")} />
              <Field label="Pulse (bpm)" value={jsonVital(record.vital_signs, "pulse")} />
              <Field label="Resp. rate" value={jsonVital(record.vital_signs, "respiratory_rate")} />
              <Field label="O2 sat (%)" value={jsonVital(record.vital_signs, "o2_sat")} />
              <Field label="Weight (kg)" value={jsonVital(record.vital_signs, "weight")} />
              <Field label="Height (cm)" value={jsonVital(record.vital_signs, "height")} />
            </dl>
          </div>

          <div className="grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-2">
            <Field label="Chief complaint" value={record.chief_complaint} />
            <Field label="Symptoms" value={record.symptoms} />
            <Field label="Examination findings" value={record.examination_findings} />
            <Field label="Diagnosis" value={record.diagnosis} />
            <div className="col-span-full">
              <Field label="Treatment plan" value={record.treatment_plan} />
            </div>
            <div className="col-span-full">
              <Field label="Clinical notes" value={record.clinical_notes} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="print:hidden">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Prescriptions</CardTitle>
          {canEdit && <IssuePrescriptionDialog medicalRecordId={record.id} patientId={record.patient_id} />}
        </CardHeader>
        <CardContent>
          {prescriptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No prescriptions issued for this consultation.</p>
          ) : (
            <ul className="flex flex-col divide-y">
              {prescriptions.map((rx) => (
                <li key={rx.id} className="flex items-center justify-between gap-3 py-2">
                  <Link href={`/prescriptions/${rx.id}`} className="text-sm hover:underline">
                    {rx.items.map((i) => i.medication_name).join(", ")}
                  </Link>
                  <Badge variant={rx.status === "active" ? "default" : "outline"}>{rx.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
