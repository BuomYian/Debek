"use client";

import { UserPlus } from "lucide-react";
import { useState } from "react";

import { PatientForm } from "@/components/features/patients/patient-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** The "register new patient" shortcut inline in the booking flow (Section 5.4). */
export function QuickRegisterPatientDialog({ onRegistered }: { onRegistered: (patientId: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="link" size="sm" className="h-auto px-0" onClick={() => setOpen(true)}>
        <UserPlus className="size-3.5" />
        Register a new patient
      </Button>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Register a new patient</DialogTitle>
          <DialogDescription>They&apos;ll be selected for this booking automatically.</DialogDescription>
        </DialogHeader>
        <PatientForm
          onCreated={(id) => {
            setOpen(false);
            onRegistered(id);
          }}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
