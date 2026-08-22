"use client";

import { Pill } from "lucide-react";
import { useState } from "react";

import { PrescriptionForm } from "@/components/features/prescriptions/prescription-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** "Issued by doctors from within a consultation" (Section 5.6) — launched from the medical record view. */
export function IssuePrescriptionDialog({ medicalRecordId, patientId }: { medicalRecordId: string; patientId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Pill />
        Issue prescription
      </Button>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Issue prescription</DialogTitle>
          <DialogDescription>Add one or more medications for this consultation.</DialogDescription>
        </DialogHeader>
        <PrescriptionForm medicalRecordId={medicalRecordId} patientId={patientId} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
