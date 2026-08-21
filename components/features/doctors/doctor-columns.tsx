"use client";

import { createColumnHelper } from "@tanstack/react-table";
import Link from "next/link";

import type { DoctorWithProfile } from "@/actions/doctors";
import { Badge } from "@/components/ui/badge";
import type { AppTableFeatures } from "@/lib/table";

const columnHelper = createColumnHelper<AppTableFeatures, DoctorWithProfile>();

export const doctorColumns = columnHelper.columns([
  columnHelper.display({
    id: "name",
    header: "Name",
    cell: ({ row }) => (
      <Link href={`/doctors/${row.original.id}`} className="font-medium hover:underline">
        {row.original.profile?.full_name ?? "—"}
      </Link>
    ),
  }),
  columnHelper.accessor("specialization", { header: "Specialization" }),
  columnHelper.accessor("license_number", {
    header: "License #",
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.license_number}</span>,
  }),
  columnHelper.accessor("consultation_fee", {
    header: "Fee",
    cell: ({ row }) => `$${Number(row.original.consultation_fee).toFixed(2)}`,
  }),
  columnHelper.accessor("is_accepting_appointments", {
    header: "Status",
    cell: ({ row }) =>
      row.original.is_accepting_appointments ? (
        <Badge>Accepting</Badge>
      ) : (
        <Badge variant="outline" className="text-muted-foreground">
          Not accepting
        </Badge>
      ),
  }),
]);
