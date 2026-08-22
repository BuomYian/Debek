"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { bookAppointment } from "@/actions/appointments";
import type { DoctorWithProfile } from "@/actions/doctors";
import type { Patient } from "@/actions/patients";
import { DoctorPicker } from "@/components/features/appointments/doctor-picker";
import { PatientPicker } from "@/components/features/appointments/patient-picker";
import { SlotPicker, type PickedSlot } from "@/components/features/appointments/slot-picker";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

/**
 * The booking flow (Section 5.4): patient (with inline register
 * shortcut) → doctor/specialization → date → live slots → confirm.
 */
export function BookingForm({ initialPatient }: { initialPatient?: Patient }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [patient, setPatient] = useState<Patient | null>(initialPatient ?? null);
  const [doctor, setDoctor] = useState<DoctorWithProfile | null>(null);
  const [slot, setSlot] = useState<PickedSlot | null>(null);
  const [reason, setReason] = useState("");

  const canSubmit = Boolean(patient && doctor && slot);

  function onSubmit() {
    if (!patient || !doctor || !slot) return;
    startTransition(async () => {
      const result = await bookAppointment({
        patientId: patient.id,
        doctorId: doctor.id,
        scheduledStart: slot.start,
        scheduledEnd: slot.end,
        reasonForVisit: reason,
      });
      if (result.success) {
        toast.success("Appointment booked.");
        router.push(`/appointments/${result.data.id}`);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <FieldGroup>
      <Field>
        <FieldLabel>Patient</FieldLabel>
        <PatientPicker value={patient?.id} selected={patient} onSelect={setPatient} />
      </Field>

      <FieldSeparator />

      <Field>
        <DoctorPicker
          value={doctor?.id}
          onSelect={(d) => {
            setDoctor(d);
            setSlot(null);
          }}
        />
      </Field>

      <FieldSeparator />

      <Field>
        <FieldLabel>Date & time</FieldLabel>
        <SlotPicker doctorId={doctor?.id} selected={slot} onSelect={setSlot} />
      </Field>

      <Field>
        <FieldLabel htmlFor="reason">Reason for visit (optional)</FieldLabel>
        <Textarea
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          disabled={isPending}
        />
      </Field>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
          Cancel
        </Button>
        <Button type="button" onClick={onSubmit} disabled={!canSubmit || isPending}>
          {isPending ? "Booking…" : "Book appointment"}
        </Button>
      </div>
    </FieldGroup>
  );
}
