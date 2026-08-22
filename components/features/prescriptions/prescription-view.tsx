"use client";

import { differenceInYears, format, parseISO } from "date-fns";

import type { PrescriptionWithDetails } from "@/actions/prescriptions";
import { PrescriptionStatusControl } from "@/components/features/prescriptions/prescription-status-control";
import { PrintButton } from "@/components/print-button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CLINIC_NAME } from "@/lib/clinic";

/** Section 5.6: "Printable prescription slip with clinic header, patient details, doctor name, license number, and date." */
export function PrescriptionView({ prescription, canEdit }: { prescription: PrescriptionWithDetails; canEdit: boolean }) {
  const age = prescription.patient ? differenceInYears(new Date(), parseISO(prescription.patient.date_of_birth)) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-lg font-semibold">Prescription</h1>
          <p className="text-sm text-muted-foreground">
            Issued {format(parseISO(prescription.issued_date), "d MMMM yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PrintButton />
          {canEdit && <PrescriptionStatusControl prescription={prescription} />}
        </div>
      </div>

      <Card className="print:border-none print:shadow-none">
        <CardContent className="flex flex-col gap-6 print:text-black">
          <div className="flex items-start justify-between border-b pb-4">
            <div>
              <h2 className="text-lg font-semibold">{CLINIC_NAME}</h2>
              <p className="text-sm text-muted-foreground print:text-black/70">Prescription</p>
            </div>
            <p className="text-sm text-muted-foreground print:text-black/70">
              {format(parseISO(prescription.issued_date), "d MMMM yyyy")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <dt className="text-xs text-muted-foreground print:text-black/60">Patient</dt>
              <dd className="text-sm font-medium">
                {prescription.patient?.first_name} {prescription.patient?.last_name}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground print:text-black/60">Age</dt>
              <dd className="text-sm">{age ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground print:text-black/60">Patient #</dt>
              <dd className="text-sm font-mono">{prescription.patient?.patient_number}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground print:text-black/60">Prescribing doctor</dt>
              <dd className="text-sm">
                {prescription.doctor?.profile?.full_name} — Lic. {prescription.doctor?.license_number}
              </dd>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medication</TableHead>
                  <TableHead>Dosage</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Instructions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prescription.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.medication_name}</TableCell>
                    <TableCell>{item.dosage}</TableCell>
                    <TableCell>{item.frequency}</TableCell>
                    <TableCell>{item.duration}</TableCell>
                    <TableCell>{item.route ?? "—"}</TableCell>
                    <TableCell>{item.instructions ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {prescription.notes && (
            <div>
              <dt className="text-xs text-muted-foreground print:text-black/60">Notes</dt>
              <dd className="text-sm whitespace-pre-wrap">{prescription.notes}</dd>
            </div>
          )}

          <p className="mt-4 border-t pt-4 text-xs text-muted-foreground print:text-black/60">
            {prescription.doctor?.profile?.full_name} · License No. {prescription.doctor?.license_number} ·{" "}
            {prescription.doctor?.specialization}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
