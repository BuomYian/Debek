import { format, parseISO } from "date-fns";
import { FileHeart } from "lucide-react";
import Link from "next/link";

import type { MedicalRecordWithNames } from "@/actions/medical-records";

/** Chronological patient history timeline (Section 5.5). */
export function PatientMedicalRecordsTab({ records }: { records: MedicalRecordWithNames[] }) {
  if (records.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center">
        <FileHeart className="size-6 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">No medical records yet.</p>
      </div>
    );
  }

  return (
    <ol className="flex flex-col gap-3 border-l pl-4">
      {records.map((record) => (
        <li key={record.id} className="relative">
          <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full border-2 border-background bg-primary" />
          <Link href={`/medical-records/${record.id}`} className="flex flex-col gap-0.5 rounded-md p-2 hover:bg-accent">
            <span className="text-sm font-medium">
              {format(parseISO(record.visit_date), "d MMMM yyyy")} · {record.diagnosis || record.chief_complaint}
            </span>
            <span className="text-xs text-muted-foreground">
              {record.doctor?.profile?.full_name} · {record.doctor?.specialization}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
