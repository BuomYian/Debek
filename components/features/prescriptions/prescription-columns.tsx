"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { format, parseISO } from "date-fns";
import Link from "next/link";

import type { PrescriptionWithDetails } from "@/actions/prescriptions";
import { Badge } from "@/components/ui/badge";
import type { AppTableFeatures } from "@/lib/table";

const STATUS_VARIANT: Record<string, "default" | "outline" | "secondary"> = {
  active: "default",
  completed: "secondary",
  cancelled: "outline",
};

const columnHelper = createColumnHelper<AppTableFeatures, PrescriptionWithDetails>();

export const prescriptionColumns = columnHelper.columns([
  columnHelper.display({
    id: "patient",
    header: "Patient",
    cell: ({ row }) => (
      <Link href={`/prescriptions/${row.original.id}`} className="font-medium hover:underline">
        {row.original.patient ? `${row.original.patient.first_name} ${row.original.patient.last_name}` : "—"}
      </Link>
    ),
  }),
  columnHelper.display({
    id: "doctor",
    header: "Doctor",
    cell: ({ row }) => row.original.doctor?.profile?.full_name ?? "—",
  }),
  columnHelper.display({
    id: "medications",
    header: "Medications",
    cell: ({ row }) => row.original.items.map((i) => i.medication_name).join(", "),
  }),
  columnHelper.accessor("issued_date", {
    header: "Issued",
    cell: ({ row }) => format(parseISO(row.original.issued_date), "d MMM yyyy"),
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: ({ row }) => <Badge variant={STATUS_VARIANT[row.original.status]}>{row.original.status}</Badge>,
  }),
]);
