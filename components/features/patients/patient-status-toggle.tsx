"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { setPatientActive, type Patient } from "@/actions/patients";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function PatientStatusToggle({ patient }: { patient: Patient }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function toggle() {
    startTransition(async () => {
      const result = await setPatientActive(patient.id, !patient.is_active);
      if (result.success) {
        toast.success(patient.is_active ? "Patient deactivated." : "Patient reactivated.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  if (!patient.is_active) {
    return (
      <Button variant="outline" onClick={toggle} disabled={isPending}>
        Reactivate patient
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" disabled={isPending}>
          Deactivate patient
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Deactivate {patient.first_name} {patient.last_name}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This hides them from the active patient list and blocks new bookings, but keeps their full
            history intact — nothing is deleted, and you can reactivate them at any time.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={toggle}>Deactivate</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
