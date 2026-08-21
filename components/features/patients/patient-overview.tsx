"use client";

import { differenceInYears, format, parseISO } from "date-fns";
import { Pencil, TriangleAlert } from "lucide-react";
import { useState } from "react";

import type { Patient } from "@/actions/patients";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PatientForm } from "@/components/features/patients/patient-form";
import { PatientStatusToggle } from "@/components/features/patients/patient-status-toggle";

const GENDER_LABEL: Record<Patient["gender"], string> = {
  male: "Male",
  female: "Female",
  other: "Other",
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value || <span className="text-muted-foreground">—</span>}</dd>
    </div>
  );
}

export function PatientOverview({ patient, canEdit }: { patient: Patient; canEdit: boolean }) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Edit patient</CardTitle>
        </CardHeader>
        <CardContent>
          <PatientForm patient={patient} />
          <Button variant="link" className="mt-2 px-0" onClick={() => setIsEditing(false)}>
            Cancel editing
          </Button>
        </CardContent>
      </Card>
    );
  }

  const age = differenceInYears(new Date(), parseISO(patient.date_of_birth));

  return (
    <div className="flex flex-col gap-4">
      {(patient.allergies || patient.chronic_conditions) && (
        <div className="flex items-start gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            {patient.allergies && (
              <p>
                <span className="font-medium text-amber-900 dark:text-amber-200">Allergies:</span> {patient.allergies}
              </p>
            )}
            {patient.chronic_conditions && (
              <p>
                <span className="font-medium text-amber-900 dark:text-amber-200">Chronic conditions:</span>{" "}
                {patient.chronic_conditions}
              </p>
            )}
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Patient details</CardTitle>
          {canEdit && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Pencil />
                Edit
              </Button>
              <PatientStatusToggle patient={patient} />
            </div>
          )}
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Patient number" value={<span className="font-mono">{patient.patient_number}</span>} />
            <Field label="Status" value={patient.is_active ? <Badge>Active</Badge> : <Badge variant="outline">Inactive</Badge>} />
            <Field label="Date of birth" value={`${format(parseISO(patient.date_of_birth), "d MMM yyyy")} (${age} yrs)`} />
            <Field label="Gender" value={GENDER_LABEL[patient.gender]} />
            <Field label="Phone" value={patient.phone} />
            <Field label="Email" value={patient.email} />
            <Field label="Blood group" value={patient.blood_group} />
            <Field label="National ID" value={patient.national_id} />
            <Field label="Address" value={patient.address} />
            <Field label="Emergency contact" value={patient.emergency_contact_name} />
            <Field label="Emergency phone" value={patient.emergency_contact_phone} />
            <Field label="Registered" value={format(parseISO(patient.created_at), "d MMM yyyy")} />
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
