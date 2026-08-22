"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { setPrescriptionStatus, type PrescriptionWithDetails } from "@/actions/prescriptions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PrescriptionStatus } from "@/lib/validations/prescriptions";

const OPTIONS: { value: PrescriptionStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export function PrescriptionStatusControl({ prescription }: { prescription: PrescriptionWithDetails }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function onChange(status: string) {
    startTransition(async () => {
      const result = await setPrescriptionStatus({ id: prescription.id, status: status as PrescriptionStatus });
      if (result.success) {
        toast.success("Prescription updated.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Select value={prescription.status} onValueChange={onChange} disabled={isPending}>
      <SelectTrigger size="sm" className="w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
