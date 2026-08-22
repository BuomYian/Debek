import { format, parseISO } from "date-fns";
import { Pill } from "lucide-react";
import Link from "next/link";

import type { PrescriptionWithDetails } from "@/actions/prescriptions";
import { Badge } from "@/components/ui/badge";

export function PatientPrescriptionsTab({ prescriptions }: { prescriptions: PrescriptionWithDetails[] }) {
  if (prescriptions.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center">
        <Pill className="size-6 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">No prescriptions yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {prescriptions.map((rx) => (
        <Link
          key={rx.id}
          href={`/prescriptions/${rx.id}`}
          className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent"
        >
          <div className="flex flex-col gap-0.5">
            <span className="font-medium">{rx.items.map((i) => i.medication_name).join(", ")}</span>
            <span className="text-xs text-muted-foreground">
              {format(parseISO(rx.issued_date), "d MMM yyyy")} · {rx.doctor?.profile?.full_name}
            </span>
          </div>
          <Badge variant={rx.status === "active" ? "default" : "outline"}>{rx.status}</Badge>
        </Link>
      ))}
    </div>
  );
}
