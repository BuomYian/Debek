"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { setStaffActive } from "@/actions/admin-users";
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
import type { StaffMember } from "@/actions/admin-users";

export function StaffStatusToggle({ staff, isSelf }: { staff: StaffMember; isSelf: boolean }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function toggle() {
    startTransition(async () => {
      const result = await setStaffActive(staff.id, !staff.isActive);
      if (result.success) {
        toast.success(staff.isActive ? `${staff.fullName} deactivated.` : `${staff.fullName} reactivated.`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  if (!staff.isActive) {
    // Reactivating isn't clinically destructive — no confirmation needed.
    return (
      <Button variant="outline" size="sm" onClick={toggle} disabled={isPending}>
        Reactivate
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={isPending || isSelf}>
          Deactivate
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Deactivate {staff.fullName}?</AlertDialogTitle>
          <AlertDialogDescription>
            They&apos;ll immediately lose access to Debek — this takes effect for any session they already have
            open, not just their next login. You can reactivate them at any time.
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
