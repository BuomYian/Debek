"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { differenceInYears, format, parseISO } from "date-fns";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { Patient } from "@/actions/patients";
import type { AppTableFeatures } from "@/lib/table";

const GENDER_LABEL: Record<Patient["gender"], string> = {
  male: "Male",
  female: "Female",
  other: "Other",
};

const columnHelper = createColumnHelper<AppTableFeatures, Patient>();

export const patientColumns = columnHelper.columns([
  columnHelper.accessor("patient_number", {
    header: "Patient #",
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.patient_number}</span>,
  }),
  columnHelper.display({
    id: "name",
    header: "Name",
    cell: ({ row }) => (
      <Link href={`/patients/${row.original.id}`} className="font-medium hover:underline">
        {row.original.first_name} {row.original.last_name}
      </Link>
    ),
  }),
  columnHelper.accessor("phone", { header: "Phone" }),
  columnHelper.display({
    id: "age",
    header: "Age / Gender",
    cell: ({ row }) => {
      const age = differenceInYears(new Date(), parseISO(row.original.date_of_birth));
      return `${age} · ${GENDER_LABEL[row.original.gender]}`;
    },
  }),
  columnHelper.display({
    id: "registered",
    header: "Registered",
    cell: ({ row }) => format(parseISO(row.original.created_at), "d MMM yyyy"),
  }),
  columnHelper.accessor("is_active", {
    header: "Status",
    cell: ({ row }) =>
      row.original.is_active ? (
        <Badge>Active</Badge>
      ) : (
        <Badge variant="outline" className="text-muted-foreground">
          Inactive
        </Badge>
      ),
  }),
]);
